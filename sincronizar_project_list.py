"""
Sincroniza ListaWOs -> project_list no SharePoint.
Para cada item da ListaWOs cujo IDWO ainda não existe em project_list, insere um novo registro.
"""
import msal, requests, json, time

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

def get_digest():
    r = requests.post(f"{SP_SITE}/_api/contextinfo", headers=headers)
    return r.json()["FormDigestValue"]

def fetch_all(list_name, select):
    items = []
    url = f"{SP_SITE}/_api/web/lists/getbytitle('{list_name}')/items?$top=5000&$select={select}"
    while url:
        r = requests.get(url, headers=headers)
        if r.status_code != 200:
            print(f"Erro ao buscar {list_name}: {r.status_code} - {r.text[:300]}")
            break
        data = r.json()
        items.extend(data.get("value", []))
        url = data.get("odata.nextLink")
    return items

# 1) IDWOs já existentes em project_list (campo Title)
print("Buscando IDWOs existentes em project_list...")
pl_items = fetch_all("project_list", "ID,Title")
existing_idwos = {it["Title"] for it in pl_items if it.get("Title")}
print(f"project_list: {len(pl_items)} itens, {len(existing_idwos)} IDWOs únicos")

# 2) Todos os itens da ListaWOs
print("\nBuscando itens da ListaWOs...")
wo_items = fetch_all("ListaWOs", "ID,WO,IDWO,client_id,platform_id,ID_Contract_Category,ID_Country")
print(f"ListaWOs: {len(wo_items)} itens")

# 3) Filtrar apenas os que faltam
faltando = [it for it in wo_items if it.get("IDWO") and str(it["IDWO"]) not in existing_idwos]
print(f"\nIDWOs a inserir em project_list: {len(faltando)}")

if not faltando:
    print("Nada para inserir. project_list já está atualizada.")
    exit()

digest = get_digest()
post_headers = {**headers, "Content-Type": "application/json", "X-RequestDigest": digest}

criados = 0
erros = 0

for it in faltando:
    idwo = str(it["IDWO"])
    wo_raw = it.get("WO")
    try:
        project_number = str(int(float(wo_raw))).zfill(4) if wo_raw is not None else ""
    except (ValueError, TypeError):
        project_number = str(wo_raw)

    payload = {
        "Title": idwo,
        "project_number": project_number,
    }
    if it.get("client_id") is not None:
        payload["client_id"] = int(it["client_id"])
    if it.get("platform_id") is not None:
        payload["platform_id"] = int(it["platform_id"])
    if it.get("ID_Contract_Category") is not None:
        payload["contract_category_id"] = int(it["ID_Contract_Category"])
    if it.get("ID_Country") is not None:
        payload["IDCountry"] = int(it["ID_Country"])

    r = requests.post(
        f"{SP_SITE}/_api/web/lists/getbytitle('project_list')/items",
        headers=post_headers,
        json=payload,
    )
    if r.status_code in (200, 201):
        criados += 1
    else:
        erros += 1
        print(f"  ❌ Erro IDWO {idwo} (WO {wo_raw}): {r.status_code} - {r.text[:200]}")

    if criados % 50 == 0 and criados > 0:
        print(f"  ... {criados} inseridos até agora")

    time.sleep(0.05)

print(f"\n{'='*50}")
print(f"✅ Inseridos: {criados}")
print(f"⏭️  Já existiam: {len(existing_idwos)}")
print(f"❌ Erros:     {erros}")
print(f"{'='*50}")
