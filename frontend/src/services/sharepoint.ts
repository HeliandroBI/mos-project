import { msalInstance, SP_SCOPES } from '../auth/msalConfig';

const SITE = 'https://qualitechirmcom.sharepoint.com/sites/GLOBALAPPS';
const LIST = 'ListaWOs';

let initialized = false;

export async function initMsal() {
  if (!initialized) {
    await msalInstance.initialize();
    await msalInstance.handleRedirectPromise();
    initialized = true;
  }
}

export function getSpAccount() {
  return msalInstance.getAllAccounts()[0] ?? null;
}

export async function loginSharePoint() {
  await initMsal();
  const result = await msalInstance.loginPopup({ scopes: SP_SCOPES });
  return result.account;
}

export async function logoutSharePoint() {
  const account = getSpAccount();
  if (account) await msalInstance.logoutPopup({ account });
}

export async function postWOToSharePoint(data: { wo?: number; cliente?: string; plataforma?: string }) {
  const account = getSpAccount();
  if (!account) throw new Error('Não autenticado no SharePoint');

  let token: string;
  try {
    const res = await msalInstance.acquireTokenSilent({ scopes: SP_SCOPES, account });
    token = res.accessToken;
  } catch {
    const res = await msalInstance.acquireTokenPopup({ scopes: SP_SCOPES, account });
    token = res.accessToken;
  }

  const response = await fetch(`${SITE}/_api/web/lists/getbytitle('${LIST}')/items`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;odata=verbose',
      Accept: 'application/json;odata=verbose',
    },
    body: JSON.stringify({
      __metadata: { type: 'SP.Data.ListaWOsListItem' },
      WO: String(data.wo ?? ''),
      Client: data.cliente ?? '',
      Rig: data.plataforma ?? '',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SharePoint: ${response.status} — ${err.slice(0, 200)}`);
  }
  return response.json();
}
