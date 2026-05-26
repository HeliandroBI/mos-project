import { PublicClientApplication, type Configuration } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: 'f9d4c86a-76d1-46a1-be68-32d25e565701',
    authority: 'https://login.microsoftonline.com/ee54d570-e1f4-4080-b624-1b4673bbf349',
    redirectUri: window.location.origin + (window.location.pathname.startsWith('/mos-project') ? '/mos-project/' : '/'),
  },
  cache: { cacheLocation: 'sessionStorage' },
};

export const msalInstance = new PublicClientApplication(msalConfig);
export const SP_SCOPES = ['https://qualitechirmcom.sharepoint.com/AllSites.Write'];
