import { msalInstance, SP_SCOPES } from '../auth/msalConfig';

const SITE = 'https://qualitechirmcom.sharepoint.com/sites/GLOBALAPPS';
const LIST = 'ListaWOs';

let initPromise: Promise<void> | null = null;

export function initMsal(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await msalInstance.initialize();
      try {
        const result = await msalInstance.handleRedirectPromise();
        if (result?.account) {
          msalInstance.setActiveAccount(result.account);
        }
      } catch (err: any) {
        // Estado "interaction_in_progress" preso de um redirect anterior
        // que não completou (ex.: reload no meio do login) — limpa e segue.
        if (err?.errorCode === 'interaction_in_progress') {
          sessionStorage.removeItem('msal.interaction.status');
          Object.keys(sessionStorage)
            .filter(k => k.includes('interaction.status'))
            .forEach(k => sessionStorage.removeItem(k));
        } else {
          throw err;
        }
      }
    })();
  }
  return initPromise;
}

export function getSpAccount() {
  return msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null;
}

let loginPromise: Promise<void> | null = null;

const isLocalhost = window.location.hostname === 'localhost';

export async function loginSharePoint() {
  if (isLocalhost) return;
  await initMsal();
  if (!loginPromise) {
    // Preserva a aba atual para restaurar após o redirect
    const currentTab = sessionStorage.getItem("mos-active-tab") || "contas";
    sessionStorage.setItem("mos-tab", currentTab);
    loginPromise = msalInstance.loginRedirect({ scopes: SP_SCOPES });
  }
  await loginPromise;
}

export async function logoutSharePoint() {
  const account = getSpAccount();
  if (account) await msalInstance.logoutRedirect({ account });
}

export async function getToken(): Promise<string> {
  const account = getSpAccount();
  if (!account) throw new Error('Não autenticado no SharePoint');
  try {
    const res = await msalInstance.acquireTokenSilent({ scopes: SP_SCOPES, account });
    return res.accessToken;
  } catch {
    const res = await msalInstance.acquireTokenPopup({ scopes: SP_SCOPES, account });
    return res.accessToken;
  }
}

export async function getListItems(listName: string): Promise<any[]> {
  await initMsal(); // garante que MSAL está inicializado antes de qualquer operação

  let account = getSpAccount();
  if (!account) {
    if (isLocalhost) return []; // sem login no localhost
    await loginSharePoint();   // redireciona para login M365
    return [];                 // após redirect, página recarrega
  }

  const token = await getToken();
  const response = await fetch(
    `${SITE}/_api/web/lists/getbytitle('${listName}')/items?$select=*&$top=5000`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=verbose' } }
  );
  if (!response.ok) throw new Error(`SharePoint GET: ${response.status}`);
  const result = await response.json();
  const items = result.d.results || [];
  if (items.length > 0) console.log('[SP] data_doc raw:', items[0].data_doc, '| vencimento raw:', items[0].vencimento);
  return items.map((item: any) => {
    const out: any = { ...item, id: item.ID };
    // SP usa Title como primeiro campo — mapeia para wo se wo estiver vazio
    if (!out.wo && item.Title) out.wo = item.Title;
    // draft_codigo pode vir como string "123" — converte para número
    if (out.draft_codigo) out.draft_codigo = Number(out.draft_codigo) || out.draft_codigo;
    // Converte datas SP /Date(ms)/ → YYYY-MM-DD
    for (const key of Object.keys(out)) {
      const v = out[key];
      if (typeof v === 'string') {
        const m = v.match(/^\/Date\((\d+)(?:[+-]\d+)?\)\/$/);
        if (m) {
          const d = new Date(parseInt(m[1]));
          out[key] = d.toISOString().slice(0, 10);
        }
      }
    }
    return out;
  });
}

function clearCache(listName: string) {
  sessionStorage.removeItem(`sp-list-${listName}`);
}

// ── CRUD ListaWOs ─────────────────────────────────────────────────────────────

export interface WOItem {
  ID?: number;
  WO: string;
  Client: string;
  Rig: string;
  Status?: string;
  ContractType?: string;
  Country?: string;
  Contract_Category?: string;
  client_id?: number;
  platform_id?: number;
  Country_ID?: string;
}

export async function getListFields(): Promise<any[]> {
  const token = await getToken();
  const response = await fetch(
    `${SITE}/_api/web/lists/getbytitle('${LIST}')/fields?$filter=Hidden eq false and ReadOnlyField eq false`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=verbose' } }
  );
  if (!response.ok) throw new Error(`SharePoint FIELDS: ${response.status}`);
  const result = await response.json();
  return (result.d.results || []).map((f: any) => ({ title: f.Title, internalName: f.InternalName, type: f.TypeAsString }));
}

export async function listWOs(): Promise<WOItem[]> {
  const token = await getToken();
  // Busca todos os campos para descobrir o que existe na lista
  const response = await fetch(
    `${SITE}/_api/web/lists/getbytitle('${LIST}')/items?$select=*&$top=5000`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=verbose' } }
  );
  if (!response.ok) throw new Error(`SharePoint GET: ${response.status}`);
  const result = await response.json();
  return result.d.results || [];
}

export async function createWO(data: Omit<WOItem, 'ID'>): Promise<WOItem> {
  const token = await getToken();

  // Busca o digest (form digest) necessário para escrita
  const digestRes = await fetch(`${SITE}/_api/contextinfo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=verbose' },
  });
  const digestJson = await digestRes.json();
  const digest = digestJson.d.GetContextWebInformation.FormDigestValue;

  const response = await fetch(`${SITE}/_api/web/lists/getbytitle('${LIST}')/items`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;odata=verbose',
      Accept: 'application/json;odata=verbose',
      'X-RequestDigest': digest,
    },
    body: JSON.stringify({
      __metadata: { type: 'SP.Data.ListaWOsListItem' },
      WO: String(data.WO ?? ''),
      Client: data.Client ?? '',
      Rig: data.Rig ?? '',
      Status: data.Status ?? '',
      ContractType: data.ContractType ?? '',
      Country: data.Country ?? '',
      Contract_Category: data.Contract_Category ?? '',
      client_id: data.client_id ?? null,
      platform_id: data.platform_id ?? null,
      Country_ID: data.Country_ID ?? '',
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SharePoint POST: ${response.status} — ${err.slice(0, 300)}`);
  }
  clearCache(LIST);
  return (await response.json()).d;
}

export async function updateWO(id: number, data: Omit<WOItem, 'ID'>): Promise<void> {
  const token = await getToken();

  const digestRes = await fetch(`${SITE}/_api/contextinfo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=verbose' },
  });
  const digestJson = await digestRes.json();
  const digest = digestJson.d.GetContextWebInformation.FormDigestValue;

  const response = await fetch(`${SITE}/_api/web/lists/getbytitle('${LIST}')/items(${id})`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;odata=verbose',
      Accept: 'application/json;odata=verbose',
      'X-RequestDigest': digest,
      'X-HTTP-Method': 'MERGE',
      'If-Match': '*',
    },
    body: JSON.stringify({
      __metadata: { type: 'SP.Data.ListaWOsListItem' },
      WO: String(data.WO ?? ''),
      Client: data.Client ?? '',
      Rig: data.Rig ?? '',
      Status: data.Status ?? '',
      ContractType: data.ContractType ?? '',
      Country: data.Country ?? '',
      Contract_Category: data.Contract_Category ?? '',
      client_id: data.client_id ?? null,
      platform_id: data.platform_id ?? null,
      Country_ID: data.Country_ID ?? '',
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SharePoint UPDATE: ${response.status} — ${err.slice(0, 300)}`);
  }
  clearCache(LIST);
}

export async function deleteWO(id: number): Promise<void> {
  const token = await getToken();

  const digestRes = await fetch(`${SITE}/_api/contextinfo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=verbose' },
  });
  const digestJson = await digestRes.json();
  const digest = digestJson.d.GetContextWebInformation.FormDigestValue;

  const response = await fetch(`${SITE}/_api/web/lists/getbytitle('${LIST}')/items(${id})`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-RequestDigest': digest,
      'X-HTTP-Method': 'DELETE',
      'If-Match': '*',
    },
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SharePoint DELETE: ${response.status} — ${err.slice(0, 300)}`);
  }
  clearCache(LIST);
}

// mantida para compatibilidade com ContaForm
export async function postWOToSharePoint(data: { wo?: number; cliente?: string; plataforma?: string }) {
  return createWO({ WO: String(data.wo ?? ''), Client: data.cliente ?? '', Rig: data.plataforma ?? '' });
}

// ── project_list CRUD ─────────────────────────────────────────────────────────

const PROJ_LIST = 'project_list';
const ID_COUNTRY_BRASIL = 10;

export interface ProjectItem {
  ID?: number;
  IDWO?: string;           // IDCountry + project_number concatenado
  project_number: number;
  client_id?: number;
  platform_id?: number;
  contract_category_id?: number;
  project_classification_id?: number;
  IDCountry?: number;
}

async function getDigest(): Promise<string> {
  const token = await getToken();
  const r = await fetch(`${SITE}/_api/contextinfo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=verbose' },
  });
  const json = await r.json();
  return json.d.GetContextWebInformation.FormDigestValue;
}

export async function listProjects(): Promise<ProjectItem[]> {
  const token = await getToken();
  const response = await fetch(
    `${SITE}/_api/web/lists/getbytitle('${PROJ_LIST}')/items?$select=ID,IDWO,project_number,client_id,platform_id,contract_category_id,project_classification_id,IDCountry&$top=5000&$orderby=IDCountry,project_number`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=verbose' } }
  );
  if (!response.ok) throw new Error(`SharePoint GET project_list: ${response.status}`);
  const result = await response.json();
  return result.d.results || [];
}

export async function createProject(data: Omit<ProjectItem, 'ID'>): Promise<ProjectItem> {
  const token = await getToken();
  const digest = await getDigest();
  // IDWO = IDCountry concatenado com project_number
  const idCountry = data.IDCountry ?? ID_COUNTRY_BRASIL;
  const idwo = String(idCountry) + String(data.project_number);

  const response = await fetch(`${SITE}/_api/web/lists/getbytitle('${PROJ_LIST}')/items`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;odata=verbose',
      Accept: 'application/json;odata=verbose',
      'X-RequestDigest': digest,
    },
    body: JSON.stringify({
      __metadata: { type: 'SP.Data.Project_x005f_listListItem' },
      IDWO: idwo,
      project_number: data.project_number,
      client_id: data.client_id ?? null,
      platform_id: data.platform_id ?? null,
      contract_category_id: data.contract_category_id ?? null,
      project_classification_id: data.project_classification_id ?? null,
      IDCountry: idCountry,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SharePoint POST project_list: ${response.status} — ${err.slice(0, 300)}`);
  }
  clearCache(PROJ_LIST);
  return (await response.json()).d;
}

export async function updateProject(id: number, data: Omit<ProjectItem, 'ID'>): Promise<void> {
  const token = await getToken();
  const digest = await getDigest();
  const idCountry = data.IDCountry ?? ID_COUNTRY_BRASIL;
  const idwo = String(idCountry) + String(data.project_number);

  const response = await fetch(`${SITE}/_api/web/lists/getbytitle('${PROJ_LIST}')/items(${id})`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;odata=verbose',
      Accept: 'application/json;odata=verbose',
      'X-RequestDigest': digest,
      'X-HTTP-Method': 'MERGE',
      'If-Match': '*',
    },
    body: JSON.stringify({
      __metadata: { type: 'SP.Data.Project_x005f_listListItem' },
      IDWO: idwo,
      project_number: data.project_number,
      client_id: data.client_id ?? null,
      platform_id: data.platform_id ?? null,
      contract_category_id: data.contract_category_id ?? null,
      project_classification_id: data.project_classification_id ?? null,
      IDCountry: idCountry,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SharePoint UPDATE project_list: ${response.status} — ${err.slice(0, 300)}`);
  }
  clearCache(PROJ_LIST);
}

export async function deleteProject(id: number): Promise<void> {
  const token = await getToken();
  const digest = await getDigest();
  const response = await fetch(`${SITE}/_api/web/lists/getbytitle('${PROJ_LIST}')/items(${id})`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-RequestDigest': digest,
      'X-HTTP-Method': 'DELETE',
      'If-Match': '*',
    },
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SharePoint DELETE project_list: ${response.status} — ${err.slice(0, 300)}`);
  }
  clearCache(PROJ_LIST);
}

export const ID_COUNTRY_BR = ID_COUNTRY_BRASIL;

// ── BD_Producao CRUD ──────────────────────────────────────────────────────────
const PRODUCAO_LIST = 'BD_Producao';

export interface ProducaoItem {
  id?: number;
  IDWO?: string;
  Month_Producao?: number;
  Year_Producao?: number;
  E_Or_F?: string;
  WO_Producao?: number;
  ID_Country?: number;
  Contract_Category_Producao?: string;
  ID_Contract_Category_Producao?: number;
  ID_Client_Producao?: number;
  Nome_Cliente_Producao?: string;
  Rig_Producao?: string;
  ID_Rig_Producao?: number;
  Quote_Producao?: string;
  Start_Date_Producao?: string;
  End_Date_Producao?: string;
  Amount_Charget_Producao?: number;
  Value_Producao?: number;
  Pending_Producao?: number;
  DI_Producao?: string;
  DI_Date_Producao?: string;
  Number_Of_Invoice_Producao?: string;
  Invoice_Total_Value_Producao?: number;
  Invoice_Date_Producao?: string;
  Days_NF_Des_Producao?: number;
  Rental_Equipment_Invoice_REI_Pro?: string;
  Rental_Equipment_Invoice_Value_P?: number;
  REI_Date_Producao?: string;
  Days_FL_Des_Producao?: number;
  WIP_Producao?: number;
  Daily_Producao?: number;
  Stand_By_Producao?: number;
  Total_Daily_Producao?: number;
  Personal_Producao?: number;
  Personel_Logistics_Producao?: number;
  Hotel_Meal_Producao?: number;
  Equipment_In_Transit_Producao?: number;
  Material_Producao?: number;
  Log_De_Materiais_Producao?: number;
  Exchange_Rate_Variation_Producao?: number;
  LOP_Producao?: number;
  Tags_Slings_Producao?: number;
  Extra_Time_Producao?: number;
  Others_Producao?: number;
  ART_Technical_Responsibility_Pro?: number;
  Engineering_Producao?: number;
  Total_Producao?: number;
  Ticket_Medio_Producao?: number;
  Day_Stand_By_Producao?: number;
  Data_Competencia?: string;
}

function mapSpToProducao(item: any): ProducaoItem {
  const n = (v: any) => { if (v == null) return undefined; const x = parseFloat(v); return isNaN(x) ? undefined : x; };
  const d = (v: any) => {
    if (!v) return undefined;
    const m = String(v).match(/\/Date\((-?\d+)(?:[+-]\d+)?\)\//);
    if (m) return new Date(parseInt(m[1])).toISOString().slice(0, 10);
    if (String(v).includes('T')) return String(v).slice(0, 10);
    return v;
  };
  return {
    id: item.ID,
    IDWO: item.IDWO ?? item.Title ?? undefined,
    Month_Producao: n(item.Month_Producao),
    Year_Producao: n(item.Year_Producao),
    E_Or_F: item.E_Or_F,
    WO_Producao: n(item.WO_Producao),
    ID_Country: n(item.ID_Country),
    Contract_Category_Producao: item.Contract_Category_Producao,
    ID_Contract_Category_Producao: n(item.ID_Contract_Category_Producao),
    ID_Client_Producao: n(item.ID_Client_Producao),
    Nome_Cliente_Producao: item.Nome_Cliente_Producao,
    Rig_Producao: item.Rig_Producao,
    ID_Rig_Producao: n(item.ID_Rig_Producao),
    Quote_Producao: item.Quote_Producao,
    Start_Date_Producao: d(item.Start_Date_Producao),
    End_Date_Producao: d(item.End_Date_Producao),
    Amount_Charget_Producao: n(item.Amount_Charget_Producao),
    Value_Producao: n(item.Value_Producao),
    Pending_Producao: n(item.Pending_Producao),
    DI_Producao: item.DI_Producao,
    DI_Date_Producao: d(item.DI_Date_Producao),
    Number_Of_Invoice_Producao: item.Number_Of_Invoice_Producao,
    Invoice_Total_Value_Producao: n(item.Invoice_Total_Value_Producao),
    Invoice_Date_Producao: d(item.Invoice_Date_Producao),
    Days_NF_Des_Producao: n(item.Days_NF_Des_Producao),
    Rental_Equipment_Invoice_REI_Pro: item.Rental_Equipment_Invoice_REI_Pro,
    Rental_Equipment_Invoice_Value_P: n(item.Rental_Equipment_Invoice_Value_P),
    REI_Date_Producao: d(item.REI_Date_Producao),
    Days_FL_Des_Producao: n(item.Days_FL_Des_Producao),
    WIP_Producao: n(item.WIP_Producao),
    Daily_Producao: n(item.Daily_Producao),
    Stand_By_Producao: n(item.Stand_By_Producao),
    Total_Daily_Producao: n(item.Total_Daily_Producao),
    Personal_Producao: n(item.Personal_Producao),
    Personel_Logistics_Producao: n(item.Personel_Logistics_Producao),
    Hotel_Meal_Producao: n(item.Hotel_Meal_Producao),
    Equipment_In_Transit_Producao: n(item.Equipment_In_Transit_Producao),
    Material_Producao: n(item.Material_Producao),
    Log_De_Materiais_Producao: n(item.Log_De_Materiais_Producao),
    Exchange_Rate_Variation_Producao: n(item.Exchange_Rate_Variation_Producao),
    LOP_Producao: n(item.LOP_Producao),
    Tags_Slings_Producao: n(item.Tags_Slings_Producao),
    Extra_Time_Producao: n(item.Extra_Time_Producao),
    Others_Producao: n(item.Others_Producao),
    ART_Technical_Responsibility_Pro: n(item.ART_Technical_Responsibility_Pro),
    Engineering_Producao: n(item.Engineering_Producao),
    Total_Producao: n(item.Total_Producao),
    Ticket_Medio_Producao: n(item.Ticket_Medio_Producao),
    Day_Stand_By_Producao: n(item.Day_Stand_By_Producao),
    Data_Competencia: d(item.Data_Competencia),
  };
}

function producaoToSp(p: ProducaoItem): Record<string, any> {
  const idwo = p.ID_Country != null && p.WO_Producao != null
    ? `${p.ID_Country}${Math.round(p.WO_Producao)}`
    : (p.IDWO ?? '');
  const payload: Record<string, any> = {
    Title: idwo || String(p.WO_Producao ?? ''),
    IDWO: idwo || null,
    Month_Producao: p.Month_Producao ?? null,
    Year_Producao: p.Year_Producao ?? null,
    E_Or_F: p.E_Or_F ?? null,
    WO_Producao: p.WO_Producao ?? null,
    ID_Country: p.ID_Country ?? null,
    Contract_Category_Producao: p.Contract_Category_Producao ?? null,
    ID_Contract_Category_Producao: p.ID_Contract_Category_Producao ?? null,
    ID_Client_Producao: p.ID_Client_Producao ?? null,
    Nome_Cliente_Producao: p.Nome_Cliente_Producao ?? null,
    Rig_Producao: p.Rig_Producao ?? null,
    ID_Rig_Producao: p.ID_Rig_Producao ?? null,
    Quote_Producao: p.Quote_Producao ?? null,
    Start_Date_Producao: p.Start_Date_Producao ?? null,
    End_Date_Producao: p.End_Date_Producao ?? null,
    Amount_Charget_Producao: p.Amount_Charget_Producao ?? null,
    Value_Producao: p.Value_Producao ?? null,
    Pending_Producao: p.Pending_Producao ?? null,
    DI_Producao: p.DI_Producao ?? null,
    DI_Date_Producao: p.DI_Date_Producao ?? null,
    Number_Of_Invoice_Producao: p.Number_Of_Invoice_Producao ?? null,
    Invoice_Total_Value_Producao: p.Invoice_Total_Value_Producao ?? null,
    Invoice_Date_Producao: p.Invoice_Date_Producao ?? null,
    Days_NF_Des_Producao: p.Days_NF_Des_Producao ?? null,
    Rental_Equipment_Invoice_REI_Pro: p.Rental_Equipment_Invoice_REI_Pro ?? null,
    Rental_Equipment_Invoice_Value_P: p.Rental_Equipment_Invoice_Value_P ?? null,
    REI_Date_Producao: p.REI_Date_Producao ?? null,
    Days_FL_Des_Producao: p.Days_FL_Des_Producao ?? null,
    WIP_Producao: p.WIP_Producao ?? null,
    Daily_Producao: p.Daily_Producao ?? null,
    Stand_By_Producao: p.Stand_By_Producao ?? null,
    Total_Daily_Producao: p.Total_Daily_Producao ?? null,
    Personal_Producao: p.Personal_Producao ?? null,
    Personel_Logistics_Producao: p.Personel_Logistics_Producao ?? null,
    Hotel_Meal_Producao: p.Hotel_Meal_Producao ?? null,
    Equipment_In_Transit_Producao: p.Equipment_In_Transit_Producao ?? null,
    Material_Producao: p.Material_Producao ?? null,
    Log_De_Materiais_Producao: p.Log_De_Materiais_Producao ?? null,
    Exchange_Rate_Variation_Producao: p.Exchange_Rate_Variation_Producao ?? null,
    LOP_Producao: p.LOP_Producao ?? null,
    Tags_Slings_Producao: p.Tags_Slings_Producao ?? null,
    Extra_Time_Producao: p.Extra_Time_Producao ?? null,
    Others_Producao: p.Others_Producao ?? null,
    ART_Technical_Responsibility_Pro: p.ART_Technical_Responsibility_Pro ?? null,
    Engineering_Producao: p.Engineering_Producao ?? null,
    Total_Producao: p.Total_Producao ?? null,
    Ticket_Medio_Producao: p.Ticket_Medio_Producao ?? null,
    Day_Stand_By_Producao: p.Day_Stand_By_Producao ?? null,
    Data_Competencia: p.Data_Competencia ?? null,
  };
  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

export async function listProducaoFromSP(): Promise<ProducaoItem[]> {
  const token = await getToken();
  let all: any[] = [];
  let url: string | null = `${SITE}/_api/web/lists/getbytitle('${PRODUCAO_LIST}')/items?$top=2000&$orderby=Year_Producao desc,Month_Producao desc,WO_Producao asc`;
  while (url) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=nometadata' } });
    if (!r.ok) throw new Error(`SP listProducao: ${r.status}`);
    const json = await r.json();
    all = all.concat(json.value || []);
    url = json['odata.nextLink'] || null;
  }
  return all.map(mapSpToProducao);
}

export async function createProducao(p: ProducaoItem): Promise<void> {
  const token = await getToken();
  const digest = await getDigest();
  const r = await fetch(`${SITE}/_api/web/lists/getbytitle('${PRODUCAO_LIST}')/items`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-RequestDigest': digest, 'Content-Type': 'application/json', Accept: 'application/json;odata=nometadata' },
    body: JSON.stringify(producaoToSp(p)),
  });
  if (!r.ok) throw new Error(`SP createProducao: ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

export async function updateProducao(id: number, p: ProducaoItem): Promise<void> {
  const token = await getToken();
  const digest = await getDigest();
  const r = await fetch(`${SITE}/_api/web/lists/getbytitle('${PRODUCAO_LIST}')/items(${id})`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-RequestDigest': digest, 'Content-Type': 'application/json', Accept: 'application/json;odata=nometadata', 'X-HTTP-Method': 'MERGE', 'If-Match': '*' },
    body: JSON.stringify(producaoToSp(p)),
  });
  if (!r.ok) throw new Error(`SP updateProducao: ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

export async function deleteProducao(id: number): Promise<void> {
  const token = await getToken();
  const digest = await getDigest();
  const r = await fetch(`${SITE}/_api/web/lists/getbytitle('${PRODUCAO_LIST}')/items(${id})`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-RequestDigest': digest, 'X-HTTP-Method': 'DELETE', 'If-Match': '*' },
  });
  if (!r.ok) throw new Error(`SP deleteProducao: ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── fContasReceber CRUD ───────────────────────────────────────────────────────
const CONTAS_LIST = 'fContasReceber';

export async function createConta(data: Record<string, any>): Promise<any> {
  const token = await getToken();
  const digest = await getDigest();
  const response = await fetch(`${SITE}/_api/web/lists/getbytitle('${CONTAS_LIST}')/items`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;odata=nometadata',
      Accept: 'application/json;odata=nometadata',
      'X-RequestDigest': digest,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SP create conta: ${response.status} — ${err.slice(0, 300)}`);
  }
  clearCache(CONTAS_LIST);
  return response.json();
}

export async function updateConta(id: number, data: Record<string, any>): Promise<void> {
  const token = await getToken();
  const digest = await getDigest();
  const response = await fetch(`${SITE}/_api/web/lists/getbytitle('${CONTAS_LIST}')/items(${id})`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;odata=nometadata',
      Accept: 'application/json;odata=nometadata',
      'X-RequestDigest': digest,
      'X-HTTP-Method': 'MERGE',
      'If-Match': '*',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SP update conta: ${response.status} — ${err.slice(0, 300)}`);
  }
  clearCache(CONTAS_LIST);
}

export async function deleteConta(id: number): Promise<void> {
  const token = await getToken();
  const digest = await getDigest();
  const response = await fetch(`${SITE}/_api/web/lists/getbytitle('${CONTAS_LIST}')/items(${id})`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-RequestDigest': digest,
      'X-HTTP-Method': 'DELETE',
      'If-Match': '*',
    },
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SP delete conta: ${response.status} — ${err.slice(0, 300)}`);
  }
  clearCache(CONTAS_LIST);
}

// ── Projetos / WO (lista projetosdiarias) ────────────────────────────────────
const PROJDIARIAS_LIST = 'projetosdiarias';

function mapSpToProjeto(item: any) {
  const parseNum = (v: any) => {
    if (v == null || v === '' || v === '0') return undefined;
    let s = String(v).trim();
    // Formato brasileiro "7.667,00": remove separador de milhar (.) antes de trocar a vírgula decimal
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? undefined : n;
  };
  const parseStr = (v: any) => {
    if (v == null || String(v).trim() === '0') return '';
    return String(v).trim();
  };
  return {
    id: item.ID,
    wo: item.WO ? Math.round(item.WO) : 0,
    cliente: parseStr(item.CLIENTE),
    plataforma: parseStr(item.PLATAFORMA),
    coordenador: parseStr(item['COORD_x0020_FOCAL']),
    tipo_servico: parseStr(item['TIPO_x0020_DE_x0020_SERVI_x00c7_']),
    ativo: true,
    vl_diaria: parseNum(item['VL_x002e__x0020_DI_x00c1_RIA']),
    vl_diaria_locacao: parseNum(item['VL_x002e__x0020_DI_x00c1_RIA_x00']),
    vl_outros: parseNum(item['VL_x002e__x0020_OUTROS']),
  };
}

function projetoToSp(p: any) {
  return {
    Title: String(p.wo),
    WO: p.wo,
    CLIENTE: p.cliente || '',
    PLATAFORMA: p.plataforma || '',
    COORD_x0020_FOCAL: p.coordenador || '',
    'TIPO_x0020_DE_x0020_SERVI_x00c7_': p.tipo_servico || '',
    'VL_x002e__x0020_DI_x00c1_RIA': p.vl_diaria != null ? String(p.vl_diaria) : null,
    'VL_x002e__x0020_DI_x00c1_RIA_x00': p.vl_diaria_locacao != null ? String(p.vl_diaria_locacao) : null,
    'VL_x002e__x0020_OUTROS': p.vl_outros != null ? String(p.vl_outros) : null,
  };
}

let _projetosCache: any[] | null = null;

export async function listProjetosFromSP(): Promise<any[]> {
  if (_projetosCache) return _projetosCache;
  const token = await getToken();
  let all: any[] = [];
  let url: string | null = `${SITE}/_api/web/lists/getbytitle('${PROJDIARIAS_LIST}')/items?$top=2000&$orderby=WO asc`;
  while (url) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=nometadata' } });
    if (!r.ok) throw new Error(`SP listProjetos: ${r.status}`);
    const json = await r.json();
    all = all.concat(json.value || []);
    url = json['odata.nextLink'] || null;
  }
  _projetosCache = all.map(mapSpToProjeto);
  return _projetosCache;
}

export async function createProjeto(p: any): Promise<void> {
  const token = await getToken();
  const digest = await getDigest();
  const r = await fetch(`${SITE}/_api/web/lists/getbytitle('${PROJDIARIAS_LIST}')/items`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-RequestDigest': digest, 'Content-Type': 'application/json', Accept: 'application/json;odata=nometadata' },
    body: JSON.stringify(projetoToSp(p)),
  });
  if (!r.ok) throw new Error(`SP createProjeto: ${r.status} — ${(await r.text()).slice(0, 200)}`);
  _projetosCache = null;
}

export async function updateProjeto(id: number, p: any): Promise<void> {
  const token = await getToken();
  const digest = await getDigest();
  const r = await fetch(`${SITE}/_api/web/lists/getbytitle('${PROJDIARIAS_LIST}')/items(${id})`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-RequestDigest': digest, 'Content-Type': 'application/json', Accept: 'application/json;odata=nometadata', 'X-HTTP-Method': 'MERGE', 'If-Match': '*' },
    body: JSON.stringify(projetoToSp(p)),
  });
  if (!r.ok) throw new Error(`SP updateProjeto: ${r.status} — ${(await r.text()).slice(0, 200)}`);
  _projetosCache = null;
}

export async function deleteProjeto(id: number): Promise<void> {
  const token = await getToken();
  const digest = await getDigest();
  const r = await fetch(`${SITE}/_api/web/lists/getbytitle('${PROJDIARIAS_LIST}')/items(${id})`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-RequestDigest': digest, 'X-HTTP-Method': 'DELETE', 'If-Match': '*' },
  });
  if (!r.ok) throw new Error(`SP deleteProjeto: ${r.status} — ${(await r.text()).slice(0, 200)}`);
  _projetosCache = null;
}
