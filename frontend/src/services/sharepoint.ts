import { msalInstance, SP_SCOPES } from '../auth/msalConfig';

const SITE = 'https://qualitechirmcom.sharepoint.com/sites/GLOBALAPPS';
const LIST = 'ListaWOs';

let initPromise: Promise<void> | null = null;

export function initMsal(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await msalInstance.initialize();
      const result = await msalInstance.handleRedirectPromise();
      if (result?.account) {
        msalInstance.setActiveAccount(result.account);
      }
    })();
  }
  return initPromise;
}

export function getSpAccount() {
  return msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null;
}

export async function loginSharePoint() {
  await initMsal();
  // Preserva a aba atual para restaurar após o redirect
  const currentTab = sessionStorage.getItem("mos-active-tab") || "contas";
  sessionStorage.setItem("mos-tab", currentTab);
  await msalInstance.loginRedirect({ scopes: SP_SCOPES });
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
  contract_category?: number;
  project_classification?: number;
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
    `${SITE}/_api/web/lists/getbytitle('${PROJ_LIST}')/items?$select=ID,IDWO,project_number,client_id,platform_id,contract_category,project_classification,IDCountry&$top=5000&$orderby=IDCountry,project_number`,
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
      contract_category: data.contract_category ?? null,
      project_classification: data.project_classification ?? null,
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
      contract_category: data.contract_category ?? null,
      project_classification: data.project_classification ?? null,
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
