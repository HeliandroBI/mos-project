from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.models import ClientePrazo as Model
from app.schemas.schemas import ClientePrazo, ClientePrazoCreate, ClientePrazoUpdate

router = APIRouter()

@router.get("/", response_model=List[ClientePrazo])
def list_clientes(db: Session = Depends(get_db)):
    return db.query(Model).order_by(Model.cliente).all()

@router.post("/", response_model=ClientePrazo, status_code=201)
def create_cliente(data: ClientePrazoCreate, db: Session = Depends(get_db)):
    d = data.dict()
    d["total_dias"] = d["rec_doc"] + d["medicao"] + d["resp_cli"] + d["vencimento"] + d["cambio"]
    obj = Model(**d)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/{id}", response_model=ClientePrazo)
def update_cliente(id: int, data: ClientePrazoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Model).filter(Model.id == id).first()
    if not obj: raise HTTPException(404)
    d = data.dict()
    d["total_dias"] = d["rec_doc"] + d["medicao"] + d["resp_cli"] + d["vencimento"] + d["cambio"]
    for k, v in d.items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete_cliente(id: int, db: Session = Depends(get_db)):
    obj = db.query(Model).filter(Model.id == id).first()
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit()
    return {"ok": True}
