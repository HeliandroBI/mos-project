"""
Sincroniza Dados/Wos da Receita.xlsx -> lista ListaWOs no SharePoint
Usa os IDs (client_id, platform_id, contract_category_id) já mapeados em tmp_wos_final.json
Para WOs que já existem (por IDWO): atualiza os IDs
Para WOs novas: cria registro novo
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

def get_digest():
    r = requests.post(f"{SP_SITE}/_api/contextinfo", headers={"Authorization": f"Bearer {token}", "Accept": "application/json;odata=nometadata"})
    return r.json()["FormDigestValue"]

headers = {"Authorization": f"Bearer {token}", "Accept": "application/json;odata=nometadata"}

# Carrega dados mapeados
with open("tmp_wos_final.json", "r", encoding="utf-8") as f:
    wos = json.load(f)

print(f"Total de WOs a sincronizar: {len(wos)}")

# Busca todos os itens existentes da ListaWOs (paginado)
print("Buscando itens existentes na ListaWOs...")
existing = {}
url = f"{SP_SITE}/_api/web/lists/getbytitle('{LIST_NAME}')/items?$top=5000&$select=ID,IDWO"
while url:
    r = requests.get(url, headers=headers)
    if r.status_code != 200:
        print(f"Erro ao buscar lista: {r.status_code} - {r.text[:300]}")
        break
    data = r.json()
    for it in data.get("value", []):
        idwo = it.get("IDWO")
        if idwo:
            existing[str(idwo)] = it["ID"]
    url = data.get("odata.nextLink")

print(f"Itens existentes na lista: {len(existing)}")

digest = get_digest()
post_headers = {**headers, "Content-Type": "application/json", "X-RequestDigest": digest}

criados = 0
pulados = 0
erros = 0

for w in wos:
    idwo = w["IDWO"]

    if idwo in existing:
        pulados += 1
        continue

    payload = {
        "WO": w["WO"],
        "IDWO": idwo,
        "client_id": w["client_id"],
        "platform_id": w["platform_id"],
        "ID_Contract_Category": w["contract_category_id"],
        "ID_Country": w["country_id"],
    }
    r = requests.post(
        f"{SP_SITE}/_api/web/lists/getbytitle('{LIST_NAME}')/items",
        headers=post_headers,
        json=payload,
    )
    if r.status_code in (200, 201):
        criados += 1
    else:
        erros += 1
        print(f"  ❌ Erro ao criar WO {w['WO']} (IDWO {idwo}): {r.status_code} - {r.text[:150]}")

    if criados % 100 == 0 and criados > 0:
        print(f"  ... {criados} criados até agora")

    time.sleep(0.05)

print(f"\n{'='*50}")
print(f"✅ Criados: {criados}")
print(f"⏭️  Pulados (já existiam): {pulados}")
print(f"❌ Erros:   {erros}")
print(f"{'='*50}")
