from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, extract, func
from typing import List, Optional
from datetime import date
import csv, io
from app.db.database import get_db
from app.models.models import ContaReceber as Model, Draft, Projeto
from app.schemas.schemas import ContaReceber, ContaReceberCreate, ContaReceberUpdate, ContaReceberListResponse, ImportCSVResponse
from app.services.tax_calculator import calcular_impostos
from app.services.deadline_calculator import calcular_vencimento, calcular_prev_pag, calcular_prev_fat
from app.models.models import Projeto as ProjetoModel

router = APIRouter()

def _calc_vl_bruto(wo, escopo, data_inicio, data_fim, db: Session):
    """Calcula vl_bruto a partir dos dados do projeto WO."""
    if not wo or not data_inicio or not data_fim:
        return None
    proj = db.query(ProjetoModel).filter(ProjetoModel.wo == wo).first()
    if not proj:
        return None
    try:
        dias = (data_fim - data_inicio).days + 1
    except Exception:
        return None
    if dias <= 0:
        return None
    escopo_up = (escopo or "").upper()
    if escopo_up == "SERVIÇO":
        return round(proj.vl_diaria * dias, 2) if proj.vl_diaria else None
    else:
        if proj.vl_diaria_locacao is None:
            return None
        return round(proj.vl_diaria_locacao * dias + (proj.vl_outros or 0), 2)

def aplicar_calculos(data: dict, db: Session, force: bool = False) -> dict:
    """Aplica cálculo de vl_bruto, impostos e prazos."""
    # 1. Calcular vl_bruto se não fornecido
    if not data.get("vl_bruto"):
        vb = _calc_vl_bruto(
            data.get("wo"), data.get("escopo"),
            data.get("data_inicio"), data.get("data_fim"), db
        )
        if vb:
            data["vl_bruto"] = vb

    # 2. Calcular impostos
    if data.get("vl_bruto"):
        taxes = calcular_impostos(
            vl_bruto=data["vl_bruto"],
            doc=data.get("doc"),
            tipo_servico=data.get("tipo_servico") or data.get("escopo"),
            faturado_por=data.get("faturado_por"),
            exterior_com_iss=data.get("exterior_com_iss", False),
            db=db
        )
        data.update(taxes)

    # 3. Vencimento (só recalcula se não preenchido ou force)
    if data.get("data_doc") and data.get("cliente") and (not data.get("vencimento") or force):
        venc = calcular_vencimento(data["data_doc"], data["cliente"], db)
        if venc:
            data["vencimento"] = venc

    # 4. Prev.Pag
    if data.get("vencimento") and data.get("cliente") and (not data.get("prev_pag") or force):
        prev = calcular_prev_pag(data["vencimento"], data["cliente"], db)
        if prev:
            data["prev_pag"] = prev
            data["mes_prev_pag"] = prev.month
            data["ano"] = prev.year

    # 5. Prev.Fat = data_fim + rec_doc dias úteis
    if data.get("data_fim") and data.get("cliente") and (not data.get("prev_fat") or force):
        pf = calcular_prev_fat(data["data_fim"], data["cliente"], db)
        if pf:
            data["prev_fat"] = pf

    return data

@router.get("/", response_model=ContaReceberListResponse)
def list_contas(
    db: Session = Depends(get_db),
    wo: Optional[str] = None,
    cliente: Optional[str] = None,
    plataforma: Optional[str] = None,
    draft_id: Optional[int] = None,
    draft_codigo: Optional[str] = None,
    doc: Optional[str] = None,
    num_doc: Optional[str] = None,
    status: Optional[str] = None,
    escopo: Optional[str] = None,
    faturado_por: Optional[str] = None,
    data_doc: Optional[str] = None,
    data_doc_de: Optional[str] = None,
    data_doc_ate: Optional[str] = None,
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    skip: int = 0,
    limit: int = 500,
):
    from datetime import datetime as dt
    def _d(v: Optional[str]):
        if not v: return None
        for fmt in ["%Y-%m-%d", "%d/%m/%Y"]:
            try: return dt.strptime(v, fmt).date()
            except: pass
        return None

    q = db.query(Model).filter(Model.ativo == True)
    if wo: q = q.filter(Model.wo == int(wo))
    if cliente: q = q.filter(Model.cliente.ilike(f"%{cliente}%"))
    if plataforma: q = q.filter(Model.plataforma.ilike(f"%{plataforma}%"))
    if draft_id: q = q.filter(Model.draft_id == draft_id)
    if draft_codigo:
        d = db.query(Draft).filter(Draft.codigo == int(draft_codigo)).first()
        if d: q = q.filter(Model.draft_id == d.id)
        else: q = q.filter(False)
    if doc: q = q.filter(Model.doc == doc)
    if num_doc: q = q.filter(Model.num_doc.ilike(f"%{num_doc}%"))
    if status: q = q.filter(Model.status == status)
    if escopo: q = q.filter(Model.escopo == escopo)
    if faturado_por: q = q.filter(Model.faturado_por == faturado_por)
    if data_doc: q = q.filter(Model.data_doc == _d(data_doc))
    if data_doc_de: q = q.filter(Model.data_doc >= _d(data_doc_de))
    if data_doc_ate: q = q.filter(Model.data_doc <= _d(data_doc_ate))
    if mes: q = q.filter(Model.mes_prev_pag == mes)
    if ano: q = q.filter(Model.ano == ano)

    total = q.count()
    total_bruto = q.with_entities(func.sum(Model.vl_bruto)).scalar() or 0
    total_liquido = q.with_entities(func.sum(Model.vl_liquido)).scalar() or 0
    items = q.options(joinedload(Model.draft)).order_by(Model.data_doc.desc()).offset(skip).limit(limit).all()
    return ContaReceberListResponse(total=total, total_bruto=round(float(total_bruto),2), total_liquido=round(float(total_liquido),2), items=items)

@router.post("/recalcular")
def recalcular_tudo(db: Session = Depends(get_db)):
    """Recalcula vl_bruto, impostos, vencimento, prev_fat e prev_pag de todos os registros ativos."""
    items = db.query(Model).filter(Model.ativo == True).all()
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

@router.post("/", response_model=ContaReceber, status_code=201)
def create_conta(data: ContaReceberCreate, db: Session = Depends(get_db)):
    d = aplicar_calculos(data.dict(), db)
    obj = Model(**d)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/{id}", response_model=ContaReceber)
def get_conta(id: int, db: Session = Depends(get_db)):
    obj = db.query(Model).filter(Model.id == id).first()
    if not obj: raise HTTPException(404)
    return obj

@router.put("/{id}", response_model=ContaReceber)
def update_conta(id: int, data: ContaReceberUpdate, db: Session = Depends(get_db)):
    obj = db.query(Model).filter(Model.id == id).first()
    if not obj: raise HTTPException(404)
    d = aplicar_calculos(data.dict(exclude_unset=False), db)
    for k, v in d.items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete_conta(id: int, db: Session = Depends(get_db)):
    obj = db.query(Model).filter(Model.id == id).first()
    if not obj: raise HTTPException(404)
    obj.ativo = False; db.commit()
    return {"ok": True}

@router.get("/modelo-csv/download")
def download_modelo_csv():
    """Baixa o modelo CSV para importação do histórico."""
    headers_csv = [
        "wo","draft_codigo","data_draft","cliente","plataforma","coord_focal",
        "tipo_servico","exterior_com_iss","proposta_comercial","po_contrato",
        "doc","num_doc","data_doc","escopo","faturado_por","vl_bruto",
        "status","focal","obs","id_ticket_req",
        "data_rec_doc","data_inicio","data_fim","data_envio_cliente","data_pgto",
        "vencimento","prev_fat","prev_pag"
    ]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers_csv)
    writer.writerow([
        "3253","4433","2025-01-13","Maersk","AMAZON CONQUEROR","João Silva",
        "SERVIÇO","","QT-4596 Rev.0","PO123456",
        "NFSe","862","2025-02-06","SERVIÇO","Rio","166159.80",
        "PAGO","VC","Observação","BM01",
        "","2025-01-01","2025-01-31","2025-02-10","2025-03-08",
        "2025-03-08","","2025-03-31"
    ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=modelo_contas_receber.csv"}
    )

@router.post("/importar-csv", response_model=ImportCSVResponse)
async def importar_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    importados, erros, mensagens = 0, 0, []
    for i, row in enumerate(reader, 1):
        try:
            # Resolver draft_id pelo codigo
            draft_id = None
            if row.get("draft_codigo"):
                draft = db.query(Draft).filter(Draft.codigo == int(row["draft_codigo"])).first()
                if draft: draft_id = draft.id

            def parse_date(v):
                if v and v.strip():
                    try: return date.fromisoformat(v.strip())
                    except: return None
                return None

            d = {
                "wo": int(row["wo"]) if row.get("wo") else None,
                "draft_id": draft_id,
                "data_draft": parse_date(row.get("data_draft")),
                "cliente": row.get("cliente","").strip() or None,
                "plataforma": row.get("plataforma","").strip() or None,
                "coord_focal": row.get("coord_focal","").strip() or None,
                "tipo_servico": row.get("tipo_servico","").strip() or None,
                "exterior_com_iss": row.get("exterior_com_iss","").upper() in ("X","TRUE","1","SIM"),
                "proposta_comercial": row.get("proposta_comercial","").strip() or None,
                "po_contrato": row.get("po_contrato","").strip() or None,
                "doc": row.get("doc","").strip() or None,
                "num_doc": row.get("num_doc","").strip() or None,
                "data_doc": parse_date(row.get("data_doc")),
                "escopo": row.get("escopo","").strip() or None,
                "faturado_por": row.get("faturado_por","").strip() or None,
                "vl_bruto": float(row["vl_bruto"].replace(",",".")) if row.get("vl_bruto","").strip() else None,
                "status": row.get("status","Programado").strip() or "Programado",
                "focal": row.get("focal","").strip() or None,
                "obs": row.get("obs","").strip() or None,
                "id_ticket_req": row.get("id_ticket_req","").strip() or None,
                "data_rec_doc": parse_date(row.get("data_rec_doc")),
                "data_inicio": parse_date(row.get("data_inicio")),
                "data_fim": parse_date(row.get("data_fim")),
                "data_envio_cliente": parse_date(row.get("data_envio_cliente")),
                "data_pgto": parse_date(row.get("data_pgto")),
                "vencimento": parse_date(row.get("vencimento")),
                "prev_fat": parse_date(row.get("prev_fat")),
                "prev_pag": parse_date(row.get("prev_pag")),
            }
            d = aplicar_calculos(d, db)
            db.add(Model(**d))
            importados += 1
        except Exception as e:
            erros += 1
            mensagens.append(f"Linha {i+1}: {str(e)}")
    db.commit()
    return ImportCSVResponse(importados=importados, erros=erros, mensagens=mensagens[:20])
