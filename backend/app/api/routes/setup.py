from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Imposto, ClientePrazo, Draft, Feriado, Projeto, AuditLog
import json

router = APIRouter()

# ── AUDIT LOG ─────────────────────────────────────────────────────────────────
@router.get("/audit-log")
def list_audit_log(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.criado_em.desc()).limit(200).all()
    return [{"id": l.id, "tabela": l.tabela, "registro_id": l.registro_id,
             "resumo": l.resumo, "responsavel": l.responsavel,
             "motivo": l.motivo,
             "criado_em": l.criado_em.isoformat() if l.criado_em else None} for l in logs]

@router.post("/audit-log")
def create_audit_log(data: dict, db: Session = Depends(get_db)):
    log = AuditLog(
        tabela=data.get("tabela", ""),
        registro_id=data.get("registro_id", 0),
        resumo=data.get("resumo"),
        responsavel=data.get("responsavel", ""),
        motivo=data.get("motivo"),
    )
    db.add(log); db.commit()
    return {"ok": True}

@router.get("/impostos")
def list_impostos(db: Session = Depends(get_db)):
    return db.query(Imposto).all()

@router.post("/impostos")
def create_imposto(data: dict, db: Session = Depends(get_db)):
    obj = Imposto(**{k: v for k, v in data.items() if hasattr(Imposto, k)})
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.delete("/impostos/{id}")
def delete_imposto(id: int, db: Session = Depends(get_db)):
    obj = db.query(Imposto).filter(Imposto.id == id).first()
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit(); return {"ok": True}

@router.get("/clientes-prazos-setup")
def list_prazos(db: Session = Depends(get_db)):
    return db.query(ClientePrazo).all()

@router.post("/clientes-prazos-setup")
def create_prazo(data: dict, db: Session = Depends(get_db)):
    obj = ClientePrazo(**{k: v for k, v in data.items() if hasattr(ClientePrazo, k)})
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.delete("/clientes-prazos-setup/{id}")
def delete_prazo(id: int, db: Session = Depends(get_db)):
    obj = db.query(ClientePrazo).filter(ClientePrazo.id == id).first()
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit(); return {"ok": True}

@router.get("/drafts-setup")
def list_drafts(db: Session = Depends(get_db)):
    return db.query(Draft).all()

@router.delete("/drafts-setup/{id}")
def delete_draft(id: int, db: Session = Depends(get_db)):
    obj = db.query(Draft).filter(Draft.id == id).first()
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit(); return {"ok": True}

@router.get("/feriados-setup")
def list_feriados(db: Session = Depends(get_db)):
    return db.query(Feriado).all()

@router.delete("/feriados-setup/{id}")
def delete_feriado(id: int, db: Session = Depends(get_db)):
    obj = db.query(Feriado).filter(Feriado.id == id).first()
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit(); return {"ok": True}

@router.get("/projetos-setup")
def list_projetos(db: Session = Depends(get_db)):
    return db.query(Projeto).all()

@router.delete("/projetos-setup/{wo}")
def delete_projeto(wo: str, db: Session = Depends(get_db)):
    obj = db.query(Projeto).filter(Projeto.wo == wo).first()
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit(); return {"ok": True}
