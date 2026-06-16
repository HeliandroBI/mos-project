"""
Importa Dados/Custos Projetos.xlsx → lista Projetos_Diarias no SharePoint
Autenticação via device code flow (abre URL no browser)
"""
import subprocess, sys

for pkg in ['msal', 'pandas', 'requests', 'openpyxl']:
    try:
        __import__(pkg)
    except ImportError:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', pkg, '-q'])

import msal, pandas as pd, requests, time

# ── Config ────────────────────────────────────────────────────────────────────
CLIENT_ID = "50f9ff64-511c-456a-a737-3d0afa3f24e7"
TENANT_ID = "ee54d570-e1f4-4080-b624-1b4673bbf349"
SP_SITE   = "https://qualitechirmcom.sharepoint.com/sites/GLOBALAPPS"
LIST_NAME = "Projetos_Diarias"
SCOPE     = ["https://qualitechirmcom.sharepoint.com/AllSites.Write"]
XLSX_PATH = r"c:\projetos\mos-project\Dados\Custos Projetos.xlsx"

# ── Autenticação device code ──────────────────────────────────────────────────
app = msal.PublicClientApplication(CLIENT_ID, authority=f"https://login.microsoftonline.com/{TENANT_ID}")

accounts = app.get_accounts()
token_result = None
if accounts:
    token_result = app.acquire_token_silent(SCOPE, account=accounts[0])

if not token_result:
    flow = app.initiate_device_flow(scopes=SCOPE)
    print("\n" + "="*60)
    print("AUTENTICAÇÃO NECESSÁRIA")
    print(f"  1. Acesse: {flow['verification_uri']}")
    print(f"  2. Digite o código: {flow['user_code']}")
    print("="*60 + "\n")
    token_result = app.acquire_token_by_device_flow(flow)

if "access_token" not in token_result:
    print("Erro na autenticação:", token_result.get("error_description"))
    sys.exit(1)

token = token_result["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json", "Accept": "application/json;odata=nometadata"}

print("✅ Autenticado com sucesso!\n")

# ── Ler Excel ─────────────────────────────────────────────────────────────────
print(f"Lendo {XLSX_PATH}...")
df = pd.read_excel(XLSX_PATH, sheet_name='Cadastro')

# Mapear colunas
df = df.rename(columns={
    'WO':                    'WO',
    'CLIENTE':               'Cliente',
    'PLATAFORMA':            'Plataforma',
    'COORD FOCAL':           'Coordenador',
    'TIPO DE SERVIÇO':       'TipoServico',
    ' VL. DIÁRIA ':          'VlDiaria',
    ' VL. DIÁRIA LOCAÇÃO ':  'VlDiariaLocacao',
    ' VL. OUTROS ':          'VlOutros',
})

# Filtrar só colunas que existem
cols = ['WO', 'Cliente', 'Plataforma', 'Coordenador', 'TipoServico', 'VlDiaria', 'VlDiariaLocacao', 'VlOutros']
df = df[[c for c in cols if c in df.columns]]

# Limpar dados
df = df[df['WO'].notna() & (df['WO'] != 0)]
df['WO'] = pd.to_numeric(df['WO'], errors='coerce')
df = df[df['WO'].notna()]
df['WO'] = df['WO'].astype(int)

for col in ['VlDiaria', 'VlDiariaLocacao', 'VlOutros']:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')

for col in ['Cliente', 'Plataforma', 'Coordenador', 'TipoServico']:
    if col in df.columns:
        df[col] = df[col].fillna('').astype(str).str.strip()

print(f"Total de projetos a importar: {len(df)}\n")

# ── Verificar colunas existentes na lista ─────────────────────────────────────
fields_url = f"{SP_SITE}/_api/web/lists/getbytitle('{LIST_NAME}')/fields?$filter=Hidden eq false and ReadOnlyField eq false"
r = requests.get(fields_url, headers=headers)
if r.status_code != 200:
    print(f"Erro ao acessar lista '{LIST_NAME}': {r.status_code} - {r.text[:200]}")
    sys.exit(1)

sp_fields = {f['InternalName'] for f in r.json().get('value', [])}
print(f"Colunas encontradas na lista: {sorted(sp_fields)}\n")

# ── Importar ──────────────────────────────────────────────────────────────────
url = f"{SP_SITE}/_api/web/lists/getbytitle('{LIST_NAME}')/items"
ok = 0
erros = 0
total = len(df)

for i, row in df.iterrows():
    item = {'Title': str(int(row['WO'])), 'Ativo': 'Sim'}
    for col in cols:
        if col in sp_fields and col in df.columns:
            val = row.get(col)
            if pd.isna(val) or val == '':
                continue  # omite campo nulo em vez de enviar None
            item[col] = val

    r = requests.post(url, headers=headers, json=item)
    num = ok + erros + 1

    if r.status_code in (200, 201):
        ok += 1
        if ok % 50 == 0:
            print(f"  {ok}/{total} importados...")
    else:
        erros += 1
        print(f"  ❌ Erro WO {row.get('WO')}: {r.status_code} - {r.text[:120]}")
        if erros > 10:
            print("Muitos erros — verifique os nomes das colunas e tente novamente.")
            break

    time.sleep(0.05)  # evitar throttling

print(f"\n{'='*50}")
print(f"✅ Importados: {ok}")
print(f"❌ Erros:     {erros}")
print(f"{'='*50}")
