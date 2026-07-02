"""
Corrige o campo Country_ID (texto) na lista ListaWOs para todos os registros
onde ele está vazio, usando o valor de ID_Country (número) como referência.
Isso é necessário porque o campo calculado IDWO depende de Country_ID (texto).
"""
import msal, requests, json, time

CLIENT_ID = "50f9ff64-511c-456a-a737-3d0afa3f24e7"
TENANT_ID = "ee54d570-e1f4-4080-b624-1b4673bbf349"
SP_SITE   = "https://qualitechirmcom.sharepoint.com/sites/GLOBALAPPS"
LIST_NAME = "ListaWOs"
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

def get_digest():
    r = requests.post(f"{SP_SITE}/_api/contextinfo", headers=headers)
    return r.json()["FormDigestValue"]

print("Buscando todos os itens da ListaWOs...")
all_items = []
url = f"{SP_SITE}/_api/web/lists/getbytitle('{LIST_NAME}')/items?$top=5000&$select=ID,WO,IDWO,ID_Country,Country_ID"
while url:
    r = requests.get(url, headers=headers)
    if r.status_code != 200:
        print(f"Erro: {r.status_code} - {r.text[:300]}")
        break
    data = r.json()
    all_items.extend(data.get("value", []))
    url = data.get("odata.nextLink")

print(f"Total de itens: {len(all_items)}")

# Itens sem Country_ID (texto) preenchido, mas com ID_Country (número) disponível
sem_country_id = [it for it in all_items if not it.get("Country_ID") and it.get("ID_Country")]
print(f"Itens sem Country_ID mas com ID_Country: {len(sem_country_id)}")

# Itens sem NENHUM dos dois (precisam de decisão manual)
sem_nenhum = [it for it in all_items if not it.get("Country_ID") and not it.get("ID_Country")]
print(f"Itens sem Country_ID E sem ID_Country (não dá pra corrigir automaticamente): {len(sem_nenhum)}")
if sem_nenhum:
    print("Exemplos:", [{"ID": it["ID"], "WO": it.get("WO")} for it in sem_nenhum[:10]])

if not sem_country_id:
    print("Nada para corrigir.")
    exit()

digest = get_digest()
post_headers = {**headers, "Content-Type": "application/json", "X-RequestDigest": digest}

corrigidos = 0
erros = 0
for it in sem_country_id:
    item_id = it["ID"]
    country_id_str = str(int(it["ID_Country"]))
    r = requests.post(
        f"{SP_SITE}/_api/web/lists/getbytitle('{LIST_NAME}')/items({item_id})",
        headers={**post_headers, "X-HTTP-Method": "MERGE", "If-Match": "*"},
        json={"Country_ID": country_id_str},
    )
    if r.status_code in (200, 204):
        corrigidos += 1
    else:
        erros += 1
        print(f"  ❌ Erro no item {item_id} (WO {it.get('WO')}): {r.status_code} - {r.text[:150]}")
    if corrigidos % 50 == 0 and corrigidos > 0:
        print(f"  ... {corrigidos} corrigidos")
    time.sleep(0.05)

print(f"\n{'='*50}")
print(f"✅ Corrigidos: {corrigidos}")
print(f"❌ Erros:      {erros}")
print(f"⚠️  Sem dados para corrigir automaticamente: {len(sem_nenhum)}")
print(f"{'='*50}")
