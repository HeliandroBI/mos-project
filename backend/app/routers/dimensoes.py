from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.models import (
    Cliente as ClienteModel,
    Plataforma as PlataformaModel,
    Coordenador as CoordenadorModel,
    TipoServicoD as TipoServicoModel,
    StatusConta as StatusContaModel,
    EmpresaFaturamento as EmpresaModel,
)
from app.schemas.schemas import (
    ClienteCreate, ClienteUpdate, ClienteOut,
    PlataformaCreate, PlataformaUpdate, PlataformaOut,
    CoordenadorCreate, CoordenadorUpdate, CoordenadorOut,
    TipoServicoCreate, TipoServicoUpdate, TipoServicoOut,
    StatusContaCreate, StatusContaUpdate, StatusContaOut,
    EmpresaFaturamentoCreate, EmpresaFaturamentoUpdate, EmpresaFaturamentoOut,
)

router = APIRouter()

def _get_or_404(db, model, id):
    obj = db.query(model).filter(model.id == id).first()
    if not obj:
        raise HTTPException(404, "Não encontrado")
    return obj

def _crud(router, prefix, model, SchemaOut, SchemaCreate, SchemaUpdate, order_by=None):
    @router.get(f"/{prefix}/", response_model=List[SchemaOut])
    def list_(db: Session = Depends(get_db)):
        q = db.query(model).filter(model.ativo == True)
        if order_by:
            q = q.order_by(order_by)
        return q.all()

    @router.get(f"/{prefix}/todos", response_model=List[SchemaOut])
    def list_todos(db: Session = Depends(get_db)):
        q = db.query(model)
        if order_by:
            q = q.order_by(order_by)
        return q.all()

    @router.get(f"/{prefix}/{{id}}", response_model=SchemaOut)
    def get_(id: int, db: Session = Depends(get_db)):
        return _get_or_404(db, model, id)

    @router.post(f"/{prefix}/", response_model=SchemaOut, status_code=201)
    def create_(data: SchemaCreate, db: Session = Depends(get_db)):
        obj = model(**data.dict())
        db.add(obj); db.commit(); db.refresh(obj)
        return obj

    @router.put(f"/{prefix}/{{id}}", response_model=SchemaOut)
    def update_(id: int, data: SchemaUpdate, db: Session = Depends(get_db)):
        obj = _get_or_404(db, model, id)
        for k, v in data.dict().items():
            setattr(obj, k, v)
        db.commit(); db.refresh(obj)
        return obj

    @router.delete(f"/{prefix}/{{id}}")
    def delete_(id: int, db: Session = Depends(get_db)):
        obj = _get_or_404(db, model, id)
        obj.ativo = False
        db.commit()
        return {"ok": True}

_crud(router, "clientes",   ClienteModel,      ClienteOut,             ClienteCreate,             ClienteUpdate,             ClienteModel.nome)
_crud(router, "plataformas",PlataformaModel,   PlataformaOut,          PlataformaCreate,          PlataformaUpdate,          PlataformaModel.nome)
_crud(router, "coordenadores", CoordenadorModel, CoordenadorOut,       CoordenadorCreate,         CoordenadorUpdate,         CoordenadorModel.nome)
_crud(router, "tipos-servico", TipoServicoModel, TipoServicoOut,       TipoServicoCreate,         TipoServicoUpdate,         TipoServicoModel.codigo)
_crud(router, "status",     StatusContaModel,  StatusContaOut,         StatusContaCreate,         StatusContaUpdate,         StatusContaModel.ordem)
_crud(router, "empresas",   EmpresaModel,      EmpresaFaturamentoOut,  EmpresaFaturamentoCreate,  EmpresaFaturamentoUpdate,  EmpresaModel.nome)

# Plataforma expõe nome do cliente junto
@router.get("/plataformas-full/", response_model=List[PlataformaOut])
def list_plataformas_full(db: Session = Depends(get_db)):
    rows = db.query(PlataformaModel).filter(PlataformaModel.ativo == True).order_by(PlataformaModel.nome).all()
    result = []
    for r in rows:
        out = PlataformaOut.from_orm(r)
        out.cliente_nome = r.cliente.nome if r.cliente else None
        result.append(out)
    return result
