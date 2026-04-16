from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.db.database import get_db
from app.models.models import Draft as Model
from app.schemas.schemas import Draft, DraftCreate, DraftUpdate

router = APIRouter()

@router.get("/", response_model=List[Draft])
def list_drafts(db: Session = Depends(get_db)):
    return db.query(Model).filter(Model.ativo == True).order_by(Model.codigo.desc()).all()

@router.get("/proximo")
def proximo_draft(db: Session = Depends(get_db)):
    last = db.query(Model).filter(Model.ativo == True).order_by(Model.codigo.desc()).first()
    return {"proximo": (last.codigo + 1) if last else 1}

@router.post("/", response_model=Draft, status_code=201)
def create_draft(data: DraftCreate, db: Session = Depends(get_db)):
    exists = db.query(Model).filter(Model.codigo == data.codigo).first()
    if exists: raise HTTPException(400, f"Draft {data.codigo} já existe")
    obj = Model(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/{id}", response_model=Draft)
def update_draft(id: int, data: DraftUpdate, db: Session = Depends(get_db)):
    obj = db.query(Model).filter(Model.id == id).first()
    if not obj: raise HTTPException(404)
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete_draft(id: int, db: Session = Depends(get_db)):
    obj = db.query(Model).filter(Model.id == id).first()
    if not obj: raise HTTPException(404)
    obj.ativo = False; db.commit()
    return {"ok": True}

@router.post("/sincronizar")
def sincronizar_drafts(db: Session = Depends(get_db)):
    """Cria registros na tabela drafts a partir dos draft_ids usados nas contas a receber."""
    from app.models.models import ContaReceber as CR

    # Busca todos os draft_id únicos usados nas contas (atualmente armazenam o código, não o id real)
    codigos = sorted([
        r[0] for r in db.query(CR.draft_id).filter(CR.draft_id != None).distinct().all()
    ])

    criados = 0
    atualizados_contas = 0

    for codigo in codigos:
        draft = db.query(Model).filter(Model.codigo == codigo).first()
        if not draft:
            data_draft = db.query(func.min(CR.data_draft)).filter(CR.draft_id == codigo).scalar()
            draft = Model(codigo=codigo, data_draft=data_draft, ativo=True)
            db.add(draft)
            db.flush()  # garante que draft.id seja gerado
            criados += 1

        # Atualiza as contas para apontar ao id real do draft (se ainda apontando para o código)
        if draft.id != codigo:
            n = db.query(CR).filter(CR.draft_id == codigo).update({"draft_id": draft.id})
            atualizados_contas += n

    db.commit()
    return {"criados": criados, "total_codigos": len(codigos), "contas_atualizadas": atualizados_contas}
