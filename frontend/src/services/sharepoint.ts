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
    const n = parseFloat(String(v).replace(',', '.'));
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
  let url: string | null = `${SITE}/_api/web/lists/getbytitle('${PROJ_LIST}')/items?$top=2000&$orderby=WO asc`;
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
  const r = await fetch(`${SITE}/_api/web/lists/getbytitle('${PROJ_LIST}')/items`, {
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
  const r = await fetch(`${SITE}/_api/web/lists/getbytitle('${PROJ_LIST}')/items(${id})`, {
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
  const r = await fetch(`${SITE}/_api/web/lists/getbytitle('${PROJ_LIST}')/items(${id})`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-RequestDigest': digest, 'X-HTTP-Method': 'DELETE', 'If-Match': '*' },
  });
  if (!r.ok) throw new Error(`SP deleteProjeto: ${r.status} — ${(await r.text()).slice(0, 200)}`);
  _projetosCache = null;
}
