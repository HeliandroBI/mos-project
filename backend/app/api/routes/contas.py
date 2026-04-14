from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime
import csv, io

from app.db.database import get_db
from app.models.models import ContaReceber, Projeto, ClientePrazo

router = APIRouter()

def to_date(v):
    if not v or str(v).strip() == "": return None
    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"]:
        try: return datetime.strptime(str(v).strip(), fmt).date()
        except: pass
    return None

def to_float(v):
    if not v or str(v).strip() == "": return None
    try: return float(str(v).replace(",", "."))
    except: return None

def serialize(obj):
    d = {}
    for c in obj.__table__.columns:
        val = getattr(obj, c.name)
        if isinstance(val, date): d[c.name] = val.isoformat()
        else: d[c.name] = val
    return d

@router.get("/contas-receber/")
def list_contas(
    wo: Optional[str] = None, cliente: Optional[str] = None,
    plataforma: Optional[str] = None, doc: Optional[str] = None,
    status: Optional[str] = None, limit: int = 100, offset: int = 0,
    db: Session = Depends(get_db)
):
    q = db.query(ContaReceber)
    if wo: q = q.filter(ContaReceber.wo == wo)
    if doc: q = q.filter(ContaReceber.doc == doc)
    if status: q = q.filter(ContaReceber.status == status)
    if cliente: q = q.filter(ContaReceber.cliente.ilike(f"%{cliente}%"))
    if plataforma: q = q.filter(ContaReceber.plataforma.ilike(f"%{plataforma}%"))
    total = q.count()
    total_bruto = q.with_entities(func.sum(ContaReceber.vl_bruto)).scalar() or 0
    total_liquido = q.with_entities(func.sum(ContaReceber.vl_liquido)).scalar() or 0
    total_retido = q.with_entities(func.sum(ContaReceber.total_retido)).scalar() or 0
    items = q.order_by(ContaReceber.data_doc.desc()).offset(offset).limit(limit).all()
    return {"items": [serialize(c) for c in items], "total": total, "total_bruto": round(total_bruto, 2), "total_liquido": round(total_liquido, 2), "total_retido": round(total_retido, 2)}

@router.get("/contas-receber/{id}")
def get_conta(id: int, db: Session = Depends(get_db)):
    obj = db.query(ContaReceber).filter(ContaReceber.id == id).first()
    if not obj: raise HTTPException(404)
    return serialize(obj)

@router.post("/contas-receber/")
def create_conta(data: dict, db: Session = Depends(get_db)):
    obj = ContaReceber(**{k: v for k, v in data.items() if hasattr(ContaReceber, k)})
    db.add(obj); db.commit(); db.refresh(obj)
    return serialize(obj)

@router.put("/contas-receber/{id}")
def update_conta(id: int, data: dict, db: Session = Depends(get_db)):
    obj = db.query(ContaReceber).filter(ContaReceber.id == id).first()
    if not obj: raise HTTPException(404)
    for k, v in data.items():
        if hasattr(obj, k): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return serialize(obj)

@router.delete("/contas-receber/{id}")
def delete_conta(id: int, db: Session = Depends(get_db)):
    obj = db.query(ContaReceber).filter(ContaReceber.id == id).first()
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit()
    return {"ok": True}

@router.post("/contas-receber/import/csv")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try: text = content.decode("utf-8-sig")
    except: text = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text))
    inserted, errors = 0, []
    for i, row in enumerate(reader, start=2):
        try:
            obj = ContaReceber(
                wo=str(row.get("wo","")).strip() or None,
                draft_codigo=str(row.get("draft_codigo","")).strip() or None,
                data_draft=to_date(row.get("data_draft")),
                doc=row.get("doc","").strip() or None,
                num_doc=row.get("num_doc","").strip() or None,
                data_doc=to_date(row.get("data_doc")),
                escopo=row.get("escopo","").strip() or None,
                faturado_por=row.get("faturado_por","").strip() or None,
                vl_bruto=to_float(row.get("vl_bruto")),
                vencimento=to_date(row.get("vencimento")),
                status=row.get("status","").strip() or None,
                data_envio_cliente=to_date(row.get("data_envio_cliente")),
                obs=row.get("obs","").strip() or None,
                data_pgto=to_date(row.get("data_pgto")),
                data_inicio=to_date(row.get("data_inicio")),
                data_fim=to_date(row.get("data_fim")),
                focal=row.get("focal","").strip() or None,
                prev_fat=to_date(row.get("prev_fat")),
                prev_pag=to_date(row.get("prev_pag")),
                cliente=row.get("cliente","").strip() or None,
                plataforma=row.get("plataforma","").strip() or None,
            )
            db.add(obj); db.flush(); inserted += 1
        except Exception as e:
            errors.append(f"Linha {i}: {str(e)}")
    db.commit()
    return {"inserted": inserted, "errors": errors}

@router.get("/impostos/")
def list_impostos(db: Session = Depends(get_db)):
    from app.models.models import Imposto
    return [serialize(x) for x in db.query(Imposto).all()]

@router.get("/clientes-prazos/")
def list_prazos(db: Session = Depends(get_db)):
    return [serialize(x) for x in db.query(ClientePrazo).all()]

@router.get("/projetos/")
def list_projetos(db: Session = Depends(get_db)):
    return [serialize(x) for x in db.query(Projeto).all()]

@router.get("/drafts/")
def list_drafts(db: Session = Depends(get_db)):
    from app.models.models import Draft
    return [serialize(x) for x in db.query(Draft).all()]

@router.get("/feriados/")
def list_feriados(db: Session = Depends(get_db)):
    from app.models.models import Feriado
    return [serialize(x) for x in db.query(Feriado).all()]
