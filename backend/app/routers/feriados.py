from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.models import Feriado as Model
from app.schemas.schemas import Feriado, FeriadoCreate, FeriadoUpdate

router = APIRouter()

@router.get("/", response_model=List[Feriado])
def list_feriados(pais: str = "BR", db: Session = Depends(get_db)):
    return db.query(Model).filter(Model.pais == pais).order_by(Model.data).all()

@router.post("/", response_model=Feriado, status_code=201)
def create_feriado(data: FeriadoCreate, db: Session = Depends(get_db)):
    obj = Model(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/{id}", response_model=Feriado)
def update_feriado(id: int, data: FeriadoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Model).filter(Model.id == id).first()
    if not obj: raise HTTPException(404)
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete_feriado(id: int, db: Session = Depends(get_db)):
    obj = db.query(Model).filter(Model.id == id).first()
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit()
    return {"ok": True}
