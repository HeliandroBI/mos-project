import { msalInstance, SP_SCOPES } from '../auth/msalConfig';

const SITE = 'https://qualitechirmcom.sharepoint.com/sites/GLOBALAPPS';
const LIST = 'ListaWOs';

let initialized = false;

export async function initMsal() {
  if (!initialized) {
    await msalInstance.initialize();
    const result = await msalInstance.handleRedirectPromise();
    // Se voltou de um loginRedirect, a conta já está disponível
    if (result?.account) {
      msalInstance.setActiveAccount(result.account);
    }
    initialized = true;
  }
}

export function getSpAccount() {
  return msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null;
}

export async function loginSharePoint() {
  await initMsal();
  // Salva a aba ativa antes do redirect para restaurar ao voltar
  sessionStorage.setItem("mos-tab", "sp_lista_wos");
  await msalInstance.loginRedirect({ scopes: SP_SCOPES });
}

export async function logoutSharePoint() {
  const account = getSpAccount();
  if (account) await msalInstance.logoutRedirect({ account });
}

async function getToken(): Promise<string> {
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
  const account = getSpAccount();
  if (!account) return [];

  const cacheKey = `sp-list-${listName}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < 5 * 60 * 1000) return data;
  }

  const token = await getToken();
  const response = await fetch(
    `${SITE}/_api/web/lists/getbytitle('${listName}')/items?$select=*&$top=5000`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=verbose' } }
  );
  if (!response.ok) throw new Error(`SharePoint GET: ${response.status}`);
  const result = await response.json();
  const items = result.d.results || [];
  sessionStorage.setItem(cacheKey, JSON.stringify({ data: items, timestamp: Date.now() }));
  return items;
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
  Coordinator?: string;
  ServiceType?: string;
  Status?: string;
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
      Coordinator: data.Coordinator ?? '',
      ServiceType: data.ServiceType ?? '',
      Status: data.Status ?? '',
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
      Coordinator: data.Coordinator ?? '',
      ServiceType: data.ServiceType ?? '',
      Status: data.Status ?? '',
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
