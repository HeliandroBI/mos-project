"""Testa inserção de 1 item na lista Projetos_Diarias"""
import msal, requests, sys

CLIENT_ID = "50f9ff64-511c-456a-a737-3d0afa3f24e7"
TENANT_ID = "ee54d570-e1f4-4080-b624-1b4673bbf349"
SP_SITE   = "https://qualitechirmcom.sharepoint.com/sites/GLOBALAPPS"
LIST_NAME = "Projetos_Diarias"
SCOPE     = ["https://qualitechirmcom.sharepoint.com/AllSites.Write"]

app = msal.PublicClientApplication(CLIENT_ID, authority=f"https://login.microsoftonline.com/{TENANT_ID}")
accounts = app.get_accounts()
token_result = app.acquire_token_silent(SCOPE, account=accounts[0]) if accounts else None

if not token_result:
    flow = app.initiate_device_flow(scopes=SCOPE)
    print(f"Acesse {flow['verification_uri']} e digite: {flow['user_code']}")
    token_result = app.acquire_token_by_device_flow(flow)

token = token_result["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json", "Accept": "application/json;odata=nometadata"}

# Ver internal names reais das colunas
print("=== COLUNAS (InternalName → Title → TypeAsString) ===")
r = requests.get(f"{SP_SITE}/_api/web/lists/getbytitle('{LIST_NAME}')/fields?$filter=Hidden eq false and ReadOnlyField eq false", headers=headers)
for f in r.json().get('value', []):
    print(f"  {f['InternalName']:30} | {f['Title']:20} | {f['TypeAsString']}")

# Testar inserção mínima
print("\n=== TESTANDO INSERÇÃO ===")
item = {
    "Title": "1001",
    "WO": 1001,
    "Cliente": "BW Offshore",
    "Plataforma": "Pioneer",
    "Coordenador": "",
    "TipoServico": "",
    "VlDiaria": None,
    "VlDiariaLocacao": None,
    "VlOutros": None,
    "Ativo": True,
}
r = requests.post(f"{SP_SITE}/_api/web/lists/getbytitle('{LIST_NAME}')/items", headers=headers, json=item)
print(f"Status: {r.status_code}")
print(f"Resposta: {r.text[:500]}")
