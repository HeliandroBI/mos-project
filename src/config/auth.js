// App Registration já existente — mesmo usado pela ListaWOs
export const CLIENT_ID = "50f9ff64-511c-456a-a737-3d0afa3f24e7";
export const TENANT_ID = "ee54d570-e1f4-4080-b624-1b4673bbf349";

export const SP_SITE  = "https://qualitechirmcom.sharepoint.com/sites/GLOBALAPPS";
export const SP_SCOPE = "https://qualitechirmcom.sharepoint.com/AllSites.Write";

export const msalConfig = {
  auth: {
    clientId:    CLIENT_ID,
    authority:   `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation:        "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = { scopes: [SP_SCOPE] };
