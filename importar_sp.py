"""
Importa contas_import.csv → lista fContasReceber no SharePoint
Autenticação via device code flow (abre URL no browser, digita o código)
"""
import subprocess, sys

for pkg in ['msal', 'pandas', 'requests']:
    try:
        __import__(pkg)
    except ImportError:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', pkg, '-q'])

import msal, pandas as pd, requests, json, time
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
CLIENT_ID = "50f9ff64-511c-456a-a737-3d0afa3f24e7"
TENANT_ID = "ee54d570-e1f4-4080-b624-1b4673bbf349"
SP_SITE   = "https://qualitechirmcom.sharepoint.com/sites/GLOBALAPPS"
LIST_NAME = "fContasReceber"
SCOPE     = ["https://qualitechirmcom.sharepoint.com/AllSites.Write"]
CSV_PATH  = r"c:\projetos\mos-project\contas_import.csv"

# ── Autenticação device code ──────────────────────────────────────────────────
app = msal.PublicClientApplication(CLIENT_ID, authority=f"https://login.microsoftonline.com/{TENANT_ID}")

# Tenta cache primeiro
accounts = app.get_accounts()
token_result = None
if accounts:
    token_result = app.acquire_token_silent(SCOPE, account=accounts[0])

if not token_result:
    flow = app.initiate_device_flow(scopes=SCOPE)
    print("\n" + "="*60)
    print("AUTENTICAÇÃO NECESSÁRIA")
    print("="*60)
    print(flow["message"])
    print("="*60 + "\n")
    token_result = app.acquire_token_by_device_flow(flow)

if "access_token" not in token_result:
    print("ERRO:", token_result.get("error_description"))
    sys.exit(1)

TOKEN = token_result["access_token"]
print("✓ Autenticado com sucesso!\n")

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept":        "application/json;odata=nometadata",
    "Content-Type":  "application/json;odata=nometadata",
}

# ── Busca digest para escrita ─────────────────────────────────────────────────
digest_res = requests.post(f"{SP_SITE}/_api/contextinfo",
    headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/json;odata=nometadata"})
DIGEST = digest_res.json().get("FormDigestValue", "")
HEADERS["X-RequestDigest"] = DIGEST

# ── Carrega CSV ───────────────────────────────────────────────────────────────
df = pd.read_csv(CSV_PATH, encoding="utf-8-sig", dtype=str)
df = df[df["wo"].notna() & (df["wo"].str.strip() != "")]

# Normaliza status
canonical = {}
for v in df["status"].dropna():
    k = v.lower().strip()
    if k not in canonical:
        canonical[k] = v.title() if v.isupper() else v.strip()
df["status"] = df["status"].map(lambda x: canonical.get(x.lower().strip(), x.strip()) if pd.notna(x) else x)

# Colunas numéricas
NUM_COLS = ["vl_bruto","cofins_3","csll_1","inss_11","irpj_15","pis_065",
            "iss_retido","total_retido","vl_liquido","cofins_76","csll_288",
            "icms_20","irpj_48","pis_165","iss_pagar","total_a_pagar","exterior_com_iss"]

# Dim Status → ID
status_map = {}
dim_status_url = f"{SP_SITE}/_api/web/lists/getbytitle('Dim_StatusCR')/items?$select=StatusID,Status&$top=100"
dim_res = requests.get(dim_status_url, headers=HEADERS)
if dim_res.ok:
    for item in dim_res.json().get("value", []):
        status_map[item["Status"].lower()] = item["StatusID"]

dim_escopo_map = {}
dim_escopo_url = f"{SP_SITE}/_api/web/lists/getbytitle('Dim_EspocoCR')/items?$select=EscopoID,Escopo&$top=20"
dim_res2 = requests.get(dim_escopo_url, headers=HEADERS)
if dim_res2.ok:
    for item in dim_res2.json().get("value", []):
        dim_escopo_map[item["Escopo"].lower()] = item["EscopoID"]

dim_emp_map = {}
dim_emp_url = f"{SP_SITE}/_api/web/lists/getbytitle('Dim_EmpresaFatCR')/items?$select=EmpresaFatID,EmpresaFat&$top=20"
dim_res3 = requests.get(dim_emp_url, headers=HEADERS)
if dim_res3.ok:
    for item in dim_res3.json().get("value", []):
        dim_emp_map[item["EmpresaFat"].lower()] = item["EmpresaFatID"]

print(f"Dim_StatusCR: {len(status_map)} status mapeados")
print(f"Dim_EspocoCR: {len(dim_escopo_map)} escopos mapeados")
print(f"Dim_EmpresaFatCR: {len(dim_emp_map)} empresas mapeadas")
print(f"\nTotal de registros a importar: {len(df)}\n")

LIST_URL = f"{SP_SITE}/_api/web/lists/getbytitle('{LIST_NAME}')/items"

def to_num(val):
    try: return float(str(val).replace(",", ".").strip())
    except: return None

def to_date(val):
    if pd.isna(val) or str(val).strip() in ("", "nan"): return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try: return datetime.strptime(str(val).strip(), fmt).strftime("%Y-%m-%dT00:00:00Z")
        except: pass
    return None

# ── Importação ────────────────────────────────────────────────────────────────
ok_count  = 0
err_count = 0
errors    = []

for i, row in df.iterrows():
    status_text = str(row.get("status", "") or "").strip()
    escopo_text = str(row.get("escopo", "") or "").strip()
    emp_text    = str(row.get("faturado_por", "") or "").strip()

    body = {
        "wo":               str(row.get("wo", "") or "").strip(),
        "coord_focal":      str(row.get("coord_focal", "") or "").strip(),
        "cliente":          str(row.get("cliente", "") or "").strip(),
        "plataforma":       str(row.get("plataforma", "") or "").strip(),
        "proposta_comercial": str(row.get("proposta_comercial", "") or "").strip(),
        "id_ticket_req":    str(row.get("id_ticket_req", "") or "").strip(),
        "po_contrato":      str(row.get("po_contrato", "") or "").strip(),
        "draft_codigo":     str(row.get("draft_codigo", "") or "").strip(),
        "doc":              str(row.get("doc", "") or "").strip(),
        "num_doc":          str(row.get("num_doc", "") or "").strip(),
        "escopo":           escopo_text,
        "faturado_por":     emp_text,
        "status":           status_text,
        "obs":              str(row.get("obs", "") or "").strip(),
        "focal":            str(row.get("focal", "") or "").strip(),
        # IDs numéricos para delegação
        "status_id":        status_map.get(status_text.lower()),
        "escopo_id":        dim_escopo_map.get(escopo_text.lower()),
        "faturado_por_id":  dim_emp_map.get(emp_text.lower()),
        # Datas
        "data_draft":       to_date(row.get("data_draft")),
        "data_doc":         to_date(row.get("data_doc")),
        "vencimento":       to_date(row.get("vencimento")),
        "data_pgto":        to_date(row.get("data_pgto")),
        "data_inicio":      to_date(row.get("data_inicio")),
        "data_fim":         to_date(row.get("data_fim")),
        "data_envio_cliente": to_date(row.get("data_envio_cliente")),
        "prev_fat":         to_date(row.get("prev_fat")),
        "prev_pag":         to_date(row.get("prev_pag")),
    }

    # Campos numéricos — só inclui se não for None
    for col in NUM_COLS:
        v = to_num(row.get(col))
        if v is not None:
            body[col] = v

    # Remove campos None para não dar erro no SP
    body = {k: v for k, v in body.items() if v is not None and v != ""}

    res = requests.post(LIST_URL, headers=HEADERS, json=body)

    if res.ok:
        ok_count += 1
    else:
        err_count += 1
        errors.append({"row": i, "wo": row.get("wo"), "status": res.status_code, "msg": res.text[:200]})

    # Progresso a cada 50
    if (ok_count + err_count) % 50 == 0:
        print(f"  Progresso: {ok_count + err_count}/{len(df)} | ✓ {ok_count} | ✗ {err_count}")

    # Pausa leve para não throttling
    time.sleep(0.05)

print(f"\n{'='*50}")
print(f"CONCLUÍDO")
print(f"  Importados: {ok_count}")
print(f"  Erros:      {err_count}")

if errors:
    with open(r"c:\projetos\mos-project\import_errors.json", "w", encoding="utf-8") as f:
        json.dump(errors, f, ensure_ascii=False, indent=2)
    print(f"  Erros salvos em: import_errors.json")
    print("\nPrimeiros 3 erros:")
    for e in errors[:3]:
        print(f"  WO {e['wo']}: {e['status']} — {e['msg'][:100]}")
