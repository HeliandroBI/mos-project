from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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
