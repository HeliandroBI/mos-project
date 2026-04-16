from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime, timedelta
import csv, io

from app.db.database import get_db
from app.models.models import ContaReceber, Projeto, ClientePrazo
from app.services.tax_calculator import calcular_impostos

router = APIRouter()

# ─── helpers ──────────────────────────────────────────────────────────────────

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

def _next_business_day(d: date, feriados: set) -> date:
    while d.weekday() >= 5 or d in feriados:
        d += timedelta(days=1)
    return d

def _get_feriados(db: Session) -> set:
    from app.models.models import Feriado
    return {f.data for f in db.query(Feriado).filter(Feriado.pais == "BR").all()}

def _calc_vl_bruto(wo, escopo, data_inicio, data_fim, db: Session):
    if not wo or not data_inicio or not data_fim:
        return None
    di = to_date(data_inicio) if isinstance(data_inicio, str) else data_inicio
    df = to_date(data_fim) if isinstance(data_fim, str) else data_fim
    if not di or not df:
        return None
    dias = (df - di).days + 1
    if dias <= 0:
        return None
    proj = db.query(Projeto).filter(Projeto.wo == int(wo)).first()
    if not proj:
        return None
    escopo_up = (escopo or "").upper()
    if escopo_up == "SERVIÇO":
        return round(proj.vl_diaria * dias, 2) if proj.vl_diaria else None
    else:
        if proj.vl_diaria_locacao is None:
            return None
        return round(proj.vl_diaria_locacao * dias + (proj.vl_outros or 0), 2)

def aplicar_calculos(data: dict, db: Session, force: bool = False) -> dict:
    """Calcula vl_bruto, impostos, vencimento, prev_fat e prev_pag."""
    feriados = _get_feriados(db)

    # 1. vl_bruto automático
    if not data.get("vl_bruto"):
        vb = _calc_vl_bruto(
            data.get("wo"), data.get("escopo"),
            data.get("data_inicio"), data.get("data_fim"), db
        )
        if vb:
            data["vl_bruto"] = vb

    # 2. Impostos
    if data.get("vl_bruto"):
        taxes = calcular_impostos(
            vl_bruto=float(data["vl_bruto"]),
            doc=data.get("doc"),
            tipo_servico=data.get("tipo_servico") or data.get("escopo"),
            faturado_por=data.get("faturado_por"),
            exterior_com_iss=bool(data.get("exterior_com_iss", False)),
            db=db,
        )
        data.update(taxes)

    # 3. Vencimento
    if data.get("data_doc") and data.get("cliente") and (not data.get("vencimento") or force):
        prazo = db.query(ClientePrazo).filter(ClientePrazo.cliente == data["cliente"]).first()
        if prazo:
            dd = to_date(data["data_doc"]) if isinstance(data["data_doc"], str) else data["data_doc"]
            if dd:
                total = prazo.rec_doc + prazo.medicao + prazo.resp_cli + prazo.vencimento + prazo.cambio
                data["vencimento"] = _next_business_day(dd + timedelta(days=total), feriados)

    # 4. Prev.Pag
    if data.get("vencimento") and data.get("cliente") and (not data.get("prev_pag") or force):
        prazo = db.query(ClientePrazo).filter(ClientePrazo.cliente == data["cliente"]).first()
        dl = prazo.data_limite if prazo else 30
        venc = to_date(data["vencimento"]) if isinstance(data["vencimento"], str) else data["vencimento"]
        if venc:
            prev = date(venc.year, venc.month, min(dl, 28))
            if prev < venc:
                m = venc.month % 12 + 1
                y = venc.year + (1 if venc.month == 12 else 0)
                prev = date(y, m, min(dl, 28))
            prev = _next_business_day(prev, feriados)
            data["prev_pag"] = prev
            data["mes_prev_pag"] = prev.month
            data["ano"] = prev.year

    # 5. Prev.Fat = data_fim + rec_doc dias úteis
    if data.get("data_fim") and data.get("cliente") and (not data.get("prev_fat") or force):
        prazo = db.query(ClientePrazo).filter(ClientePrazo.cliente == data["cliente"]).first()
        if prazo:
            df = to_date(data["data_fim"]) if isinstance(data["data_fim"], str) else data["data_fim"]
            if df:
                data["prev_fat"] = _next_business_day(df + timedelta(days=prazo.rec_doc), feriados)

    return data

# ─── rotas (específicas antes de /{id}) ───────────────────────────────────────

@router.get("/contas-receber/")
def list_contas(
    wo: Optional[str] = None, cliente: Optional[str] = None,
    plataforma: Optional[str] = None, doc: Optional[str] = None,
    status: Optional[str] = None, draft_codigo: Optional[str] = None,
    num_doc: Optional[str] = None, data_doc: Optional[str] = None,
    data_doc_de: Optional[str] = None, data_doc_ate: Optional[str] = None,
    escopo: Optional[str] = None, faturado_por: Optional[str] = None,
    limit: int = 500, offset: int = 0,
    db: Session = Depends(get_db)
):
    from app.models.models import Draft
    q = db.query(ContaReceber)
    if wo: q = q.filter(ContaReceber.wo == wo)
    if doc: q = q.filter(ContaReceber.doc == doc)
    if status: q = q.filter(ContaReceber.status == status)
    if cliente: q = q.filter(ContaReceber.cliente.ilike(f"%{cliente}%"))
    if plataforma: q = q.filter(ContaReceber.plataforma.ilike(f"%{plataforma}%"))
    if draft_codigo: q = q.join(Draft, ContaReceber.draft_id == Draft.id).filter(Draft.codigo == int(draft_codigo))
    if num_doc: q = q.filter(ContaReceber.num_doc.ilike(f"%{num_doc}%"))
    if data_doc: q = q.filter(ContaReceber.data_doc == to_date(data_doc))
    if data_doc_de: q = q.filter(ContaReceber.data_doc >= to_date(data_doc_de))
    if data_doc_ate: q = q.filter(ContaReceber.data_doc <= to_date(data_doc_ate))
    if escopo: q = q.filter(ContaReceber.escopo == escopo)
    if faturado_por: q = q.filter(ContaReceber.faturado_por == faturado_por)
    total = q.count()
    total_bruto = q.with_entities(func.sum(ContaReceber.vl_bruto)).scalar() or 0
    total_liquido = q.with_entities(func.sum(ContaReceber.vl_liquido)).scalar() or 0
    total_retido = q.with_entities(func.sum(ContaReceber.total_retido)).scalar() or 0
    items = q.order_by(ContaReceber.data_doc.desc()).offset(offset).limit(limit).all()
    return {
        "items": [serialize(c) for c in items],
        "total": total,
        "total_bruto": round(total_bruto, 2),
        "total_liquido": round(total_liquido, 2),
        "total_retido": round(total_retido, 2),
    }

@router.post("/contas-receber/recalcular")
def recalcular_tudo(db: Session = Depends(get_db)):
    """Recalcula vl_bruto, impostos, vencimento, prev_fat e prev_pag de todos os registros."""
    items = db.query(ContaReceber).all()
    atualizados = 0
    for obj in items:
        d = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
        d = aplicar_calculos(d, db, force=True)
        for k, v in d.items():
            if hasattr(obj, k):
                setattr(obj, k, v)
        atualizados += 1
    db.commit()
    return {"atualizados": atualizados}

@router.post("/contas-receber/")
def create_conta(data: dict, db: Session = Depends(get_db)):
    data = aplicar_calculos(data, db)
    obj = ContaReceber(**{k: v for k, v in data.items() if hasattr(ContaReceber, k)})
    db.add(obj); db.commit(); db.refresh(obj)
    return serialize(obj)

@router.get("/contas-receber/{id}")
def get_conta(id: int, db: Session = Depends(get_db)):
    obj = db.query(ContaReceber).filter(ContaReceber.id == id).first()
    if not obj: raise HTTPException(404)
    return serialize(obj)

@router.put("/contas-receber/{id}")
def update_conta(id: int, data: dict, db: Session = Depends(get_db)):
    obj = db.query(ContaReceber).filter(ContaReceber.id == id).first()
    if not obj: raise HTTPException(404)
    data = aplicar_calculos(data, db)
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
