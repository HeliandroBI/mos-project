from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx, os
from app.db.database import get_db
from app.models.models import Projeto as Model
from app.schemas.schemas import Projeto, ProjetoCreate, ProjetoUpdate

router = APIRouter()
API_BASE = os.getenv("QUALTECH_API", "https://api.qualitechirm.online")

@router.get("/", response_model=List[Projeto])
def list_projetos(db: Session = Depends(get_db)):
    return db.query(Model).filter(Model.ativo == True).order_by(Model.wo.desc()).all()

@router.get("/buscar-wo/{wo}")
def buscar_wo_api(wo: int, token: str = Query(...)):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        r = httpx.get(f"{API_BASE}/project/full-project/list/{wo}", headers=headers, timeout=10)
        if r.status_code == 200:
            return r.json()
        return {"error": f"WO {wo} não encontrada", "status": r.status_code}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/", response_model=Projeto, status_code=201)
def create_projeto(data: ProjetoCreate, db: Session = Depends(get_db)):
    exists = db.query(Model).filter(Model.wo == data.wo).first()
    if exists: raise HTTPException(400, f"WO {data.wo} já cadastrada")
    obj = Model(**data.dict())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/{id}", response_model=Projeto)
def update_projeto(id: int, data: ProjetoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Model).filter(Model.id == id).first()
    if not obj: raise HTTPException(404)
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/{id}")
def delete_projeto(id: int, db: Session = Depends(get_db)):
    obj = db.query(Model).filter(Model.id == id).first()
    if not obj: raise HTTPException(404)
    obj.ativo = False; db.commit()
    return {"ok": True}
