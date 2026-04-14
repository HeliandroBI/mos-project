from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, extract
from typing import List, Optional
from datetime import date
import csv, io
from app.db.database import get_db
from app.models.models import ContaReceber as Model, Draft, Projeto
from app.schemas.schemas import ContaReceber, ContaReceberCreate, ContaReceberUpdate, ContaReceberListResponse, ImportCSVResponse
from app.services.tax_calculator import calcular_impostos
from app.services.deadline_calculator import calcular_vencimento, calcular_prev_pag

router = APIRouter()

def aplicar_calculos(data: dict, db: Session) -> dict:
    """Aplica cálculo de impostos e prazos a um dict de conta."""
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
    if data.get("data_doc") and data.get("cliente") and not data.get("vencimento"):
        venc = calcular_vencimento(data["data_doc"], data["cliente"], db)
        if venc: data["vencimento"] = venc
    if data.get("vencimento") and data.get("cliente") and not data.get("prev_pag"):
        prev = calcular_prev_pag(data["vencimento"], data["cliente"], db)
        if prev:
            data["prev_pag"] = prev
            data["mes_prev_pag"] = prev.month
            data["ano"] = prev.year
    return data

@router.get("/", response_model=ContaReceberListResponse)
def list_contas(
    db: Session = Depends(get_db),
    wo: Optional[int] = None,
    cliente: Optional[str] = None,
    plataforma: Optional[str] = None,
    draft_id: Optional[int] = None,
    doc: Optional[str] = None,
    status: Optional[str] = None,
    focal: Optional[str] = None,
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    skip: int = 0,
    limit: int = 500,
):
    q = db.query(Model).filter(Model.ativo == True)
    if wo: q = q.filter(Model.wo == wo)
    if cliente: q = q.filter(Model.cliente.ilike(f"%{cliente}%"))
    if plataforma: q = q.filter(Model.plataforma.ilike(f"%{plataforma}%"))
    if draft_id: q = q.filter(Model.draft_id == draft_id)
    if doc: q = q.filter(Model.doc == doc)
    if status: q = q.filter(Model.status == status)
    if focal: q = q.filter(Model.focal == focal)
    if mes: q = q.filter(Model.mes_prev_pag == mes)
    if ano: q = q.filter(Model.ano == ano)
    if data_inicio: q = q.filter(Model.data_doc >= data_inicio)
    if data_fim: q = q.filter(Model.data_doc <= data_fim)

    total = q.count()
    items = q.order_by(Model.data_doc.desc()).offset(skip).limit(limit).all()
    total_bruto = sum(i.vl_bruto or 0 for i in items)
    total_liquido = sum(i.vl_liquido or 0 for i in items)
    return ContaReceberListResponse(total=total, total_bruto=round(total_bruto,2), total_liquido=round(total_liquido,2), items=items)

@router.get("/{id}", response_model=ContaReceber)
def get_conta(id: int, db: Session = Depends(get_db)):
    obj = db.query(Model).filter(Model.id == id).first()
    if not obj: raise HTTPException(404)
    return obj

@router.post("/", response_model=ContaReceber, status_code=201)
def create_conta(data: ContaReceberCreate, db: Session = Depends(get_db)):
    d = aplicar_calculos(data.dict(), db)
    # Buscar draft_id se vier codigo de draft
    obj = Model(**d)
    db.add(obj); db.commit(); db.refresh(obj)
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
