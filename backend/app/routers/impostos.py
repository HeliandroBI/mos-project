from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.models import Imposto as ImpostoModel
from app.schemas.schemas import Imposto, ImpostoCreate, ImpostoUpdate

router = APIRouter()

@router.get("/", response_model=List[Imposto])
def list_impostos(db: Session = Depends(get_db)):
    return db.query(ImpostoModel).filter(ImpostoModel.ativo == True).order_by(ImpostoModel.tipo, ImpostoModel.nome).all()

@router.get("/{id}", response_model=Imposto)
def get_imposto(id: int, db: Session = Depends(get_db)):
    obj = db.query(ImpostoModel).filter(ImpostoModel.id == id).first()
    if not obj: raise HTTPException(404, "Não encontrado")
    return obj

@router.post("/", response_model=Imposto, status_code=201)
def create_imposto(data: ImpostoCreate, db: Session = Depends(get_db)):
    obj = ImpostoModel(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/{id}", response_model=Imposto)
def update_imposto(id: int, data: ImpostoUpdate, db: Session = Depends(get_db)):
    obj = db.query(ImpostoModel).filter(ImpostoModel.id == id).first()
    if not obj: raise HTTPException(404)
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete_imposto(id: int, db: Session = Depends(get_db)):
    obj = db.query(ImpostoModel).filter(ImpostoModel.id == id).first()
    if not obj: raise HTTPException(404)
    obj.ativo = False; db.commit()
    return {"ok": True}
