import msal, requests, json

CLIENT_ID = "50f9ff64-511c-456a-a737-3d0afa3f24e7"
TENANT_ID = "ee54d570-e1f4-4080-b624-1b4673bbf349"
SP_SITE   = "https://qualitechirmcom.sharepoint.com/sites/GLOBALAPPS"
SCOPE     = ["https://qualitechirmcom.sharepoint.com/AllSites.Write"]

app = msal.PublicClientApplication(CLIENT_ID, authority=f"https://login.microsoftonline.com/{TENANT_ID}")
accounts = app.get_accounts()
token_result = app.acquire_token_silent(SCOPE, account=accounts[0]) if accounts else None
if not token_result:
    flow = app.initiate_device_flow(scopes=SCOPE)
    print(f"Acesse {flow['verification_uri']} e digite: {flow['user_code']}")
    token_result = app.acquire_token_by_device_flow(flow)

token = token_result["access_token"]
headers = {"Authorization": f"Bearer {token}", "Accept": "application/json;odata=nometadata"}
r = requests.get(f"{SP_SITE}/_api/web/lists/getbytitle('ListaWOs')/items(2055)", headers=headers)
print(json.dumps(r.json(), indent=2, ensure_ascii=False))
