import subprocess, sys

for pkg in ['pandas', 'openpyxl']:
    try:
        __import__(pkg)
    except ImportError:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', pkg, '-q'])

import pandas as pd

CSV_PATH = r'c:\projetos\mos-project\contas_import.csv'
OUT_PATH = r'c:\projetos\mos-project\ContasReceber_SP_v2.xlsx'

df = pd.read_csv(CSV_PATH, encoding='utf-8-sig', dtype=str)

# Remove rows with no WO
df = df[df['wo'].notna() & (df['wo'].str.strip() != '')]

# ── Normalize text fields ─────────────────────────────────────────────────────
def normalize(series):
    return series.str.strip() if series.dtype == object else series

for col in df.select_dtypes(include='object').columns:
    df[col] = df[col].str.strip()

# Normalize status case (PAGO/Pago/pago → mesmo valor)
df['status'] = df['status'].str.strip()
canonical_status = {}
for v in df['status'].dropna():
    key = v.lower()
    if key not in canonical_status:
        canonical_status[key] = v.title() if v.isupper() else v
df['status'] = df['status'].map(lambda x: canonical_status.get(x.lower(), x) if pd.notna(x) else x)

# ── Build dimension tables ────────────────────────────────────────────────────
def make_dim(series, id_col, text_col):
    vals = sorted(series.dropna().unique())
    return pd.DataFrame({id_col: range(1, len(vals) + 1), text_col: vals})

dim_status    = make_dim(df['status'],      'StatusID',    'Status')
dim_escopo    = make_dim(df['escopo'],      'EscopoID',    'Escopo')
dim_empresa   = make_dim(df['faturado_por'],'EmpresaFatID','EmpresaFat')
dim_cliente   = make_dim(df['cliente'],     'ClienteID',   'Cliente')
dim_plataforma= make_dim(df['plataforma'],  'PlataformaID','Plataforma')

# ── Map IDs back into main table ──────────────────────────────────────────────
def add_id(df, dim, df_col, dim_text_col, dim_id_col, new_col):
    mapping = dict(zip(dim[dim_text_col], dim[dim_id_col]))
    df[new_col] = df[df_col].map(mapping)
    return df

df = add_id(df, dim_status,     'status',      'Status',     'StatusID',     'status_id')
df = add_id(df, dim_escopo,     'escopo',      'Escopo',     'EscopoID',     'escopo_id')
df = add_id(df, dim_empresa,    'faturado_por','EmpresaFat', 'EmpresaFatID', 'faturado_por_id')
df = add_id(df, dim_cliente,    'cliente',     'Cliente',    'ClienteID',    'cliente_id')
df = add_id(df, dim_plataforma, 'plataforma',  'Plataforma', 'PlataformaID', 'plataforma_id')


# ── Reorder columns: ID right after its text field ───────────────────────────
def insert_after(cols, anchor, new_col):
    if anchor in cols and new_col in cols:
        cols.remove(new_col)
        cols.insert(cols.index(anchor) + 1, new_col)
    return cols

cols = list(df.columns)
for anchor, id_col in [
    ('cliente',     'cliente_id'),
    ('plataforma',  'plataforma_id'),
    ('escopo',      'escopo_id'),
    ('faturado_por','faturado_por_id'),
    ('status',      'status_id'),
]:
    cols = insert_after(cols, anchor, id_col)
df = df[cols]

# ── Numeric columns ───────────────────────────────────────────────────────────
numeric_cols = [
    'vl_bruto','cofins_3','csll_1','inss_11','irpj_15','pis_065',
    'iss_retido','total_retido','vl_liquido',
    'cofins_76','csll_288','icms_20','irpj_48','pis_165','iss_pagar',
    'total_a_pagar','exterior_com_iss',
    'status_id','escopo_id','faturado_por_id','cliente_id','plataforma_id',
]
for col in numeric_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')

# ── Date columns ──────────────────────────────────────────────────────────────
date_cols = ['data_draft','data_doc','vencimento','data_envio_cliente',
             'data_pgto','data_inicio','data_fim','prev_fat','prev_pag']
for col in date_cols:
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], errors='coerce').dt.date

# ── Write Excel ───────────────────────────────────────────────────────────────
with pd.ExcelWriter(OUT_PATH, engine='openpyxl', date_format='DD/MM/YYYY') as writer:
    df.to_excel(writer, sheet_name='ContasReceber', index=False)
    dim_status.to_excel(writer, sheet_name='Dim_Status', index=False)
    dim_escopo.to_excel(writer, sheet_name='Dim_Escopo', index=False)
    dim_empresa.to_excel(writer, sheet_name='Dim_EmpresaFat', index=False)
    dim_cliente.to_excel(writer, sheet_name='Dim_Cliente', index=False)
    dim_plataforma.to_excel(writer, sheet_name='Dim_Plataforma', index=False)

    for sheet_name in writer.sheets:
        ws = writer.sheets[sheet_name]
        for col_cells in ws.columns:
            max_len = max((len(str(c.value)) if c.value is not None else 0) for c in col_cells)
            ws.column_dimensions[col_cells[0].column_letter].width = min(max_len + 2, 45)

print(f'Gerado: {OUT_PATH}')
print(f'Linhas ContasReceber: {len(df)}')
print()
for name, dim, id_col, text_col in [
    ('Dim_Status',     dim_status,     'StatusID',     'Status'),
    ('Dim_Escopo',     dim_escopo,     'EscopoID',     'Escopo'),
    ('Dim_EmpresaFat', dim_empresa,    'EmpresaFatID', 'EmpresaFat'),
    ('Dim_Cliente',    dim_cliente,    'ClienteID',    'Cliente'),
    ('Dim_Plataforma', dim_plataforma, 'PlataformaID', 'Plataforma'),
]:
    print(f'{name}: {len(dim)} registros')
