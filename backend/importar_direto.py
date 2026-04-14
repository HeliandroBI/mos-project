import sys
sys.path.insert(0, '.')
from app.db.database import SessionLocal
from app.models.models import ContaReceber
import csv
from datetime import datetime

def to_date(v):
    if not v or str(v).strip() in ('', 'None'): return None
    for fmt in ['%Y-%m-%d', '%d/%m/%Y']:
        try: return datetime.strptime(str(v).strip(), fmt).date()
        except: pass
    return None

def to_float(v):
    if not v or str(v).strip() in ('', 'None'): return None
    try: return float(str(v).replace(',', '.'))
    except: return None

def to_int(v):
    if not v or str(v).strip() in ('', 'None'): return None
    try: return int(float(str(v).strip()))
    except: return None

db = SessionLocal()
inserted = 0
errors = []

with open(r'C:\projetos\mos-project\contas_import.csv', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader, 2):
        try:
            obj = ContaReceber(
                wo=to_int(row.get('wo')),
                coord_focal=row.get('coord_focal') or None,
                cliente=row.get('cliente') or None,
                plataforma=row.get('plataforma') or None,
                proposta_comercial=row.get('proposta_comercial') or None,
                id_ticket_req=row.get('id_ticket_req') or None,
                po_contrato=row.get('po_contrato') or None,
                draft_id=to_int(row.get('draft_codigo')),
                data_draft=to_date(row.get('data_draft')),
                doc=row.get('doc') or None,
                num_doc=row.get('num_doc') or None,
                data_doc=to_date(row.get('data_doc')),
                escopo=row.get('escopo') or None,
                faturado_por=row.get('faturado_por') or None,
                exterior_com_iss=str(row.get('exterior_com_iss','0')) in ('1','True','true'),
                vl_bruto=to_float(row.get('vl_bruto')),
                cofins_3=to_float(row.get('cofins_3')),
                csll_1=to_float(row.get('csll_1')),
                inss_11=to_float(row.get('inss_11')),
                irpj_15=to_float(row.get('irpj_15')),
                pis_065=to_float(row.get('pis_065')),
                iss_retido=to_float(row.get('iss_retido')),
                total_retido=to_float(row.get('total_retido')),
                vl_liquido=to_float(row.get('vl_liquido')),
                cofins_76=to_float(row.get('cofins_76')),
                csll_288=to_float(row.get('csll_288')),
                icms_20=to_float(row.get('icms_20')),
                irpj_48=to_float(row.get('irpj_48')),
                pis_165=to_float(row.get('pis_165')),
                iss_pagar=to_float(row.get('iss_pagar')),
                total_a_pagar=to_float(row.get('total_a_pagar')),
                vencimento=to_date(row.get('vencimento')),
                status=row.get('status') or None,
                data_envio_cliente=to_date(row.get('data_envio_cliente')),
                obs=row.get('obs') or None,
                data_pgto=to_date(row.get('data_pgto')),
                data_inicio=to_date(row.get('data_inicio')),
                data_fim=to_date(row.get('data_fim')),
                focal=row.get('focal') or None,
                prev_fat=to_date(row.get('prev_fat')),
                prev_pag=to_date(row.get('prev_pag')),
            )
            db.add(obj)
            db.flush()
            inserted += 1
        except Exception as e:
            errors.append(f'Linha {i}: {e}')
            if len(errors) <= 3:
                print('Erro:', errors[-1])

db.commit()
db.close()
print(f'Inseridos: {inserted}')
print(f'Erros: {len(errors)}')
