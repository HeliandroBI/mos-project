import { PublicClientApplication, type Configuration } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: '50f9ff64-511c-456a-a737-3d0afa3f24e7',
    authority: 'https://login.microsoftonline.com/ee54d570-e1f4-4080-b624-1b4673bbf349',
    redirectUri: window.location.origin + (window.location.pathname.startsWith('/mos-project') ? '/mos-project/' : '/'),
  },
  cache: { cacheLocation: 'sessionStorage' },
};

export const msalInstance = new PublicClientApplication(msalConfig);
export const SP_SCOPES = ['https://qualitechirmcom.sharepoint.com/AllSites.Write'];
