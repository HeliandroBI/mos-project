import msal, requests, json

CLIENT_ID = "50f9ff64-511c-456a-a737-3d0afa3f24e7"
TENANT_ID = "ee54d570-e1f4-4080-b624-1b4673bbf349"
SP_SITE   = "https://qualitechirmcom.sharepoint.com/sites/GLOBALAPPS"
LIST_NAME = "projetosdiarias"
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

print("=== COLUNAS ===")
r = requests.get(f"{SP_SITE}/_api/web/lists/getbytitle('{LIST_NAME}')/fields?$filter=Hidden eq false and ReadOnlyField eq false", headers=headers)
for f in r.json().get("value", []):
    print(f"  {f['InternalName']:45} | {f['Title']:25} | {f['TypeAsString']}")

print("\n=== 1 ITEM DE EXEMPLO ===")
r2 = requests.get(f"{SP_SITE}/_api/web/lists/getbytitle('{LIST_NAME}')/items?$top=1", headers=headers)
items = r2.json().get("value", [])
if items:
    print(json.dumps(items[0], ensure_ascii=False, indent=2))
