from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base
from app.routers import (
    impostos, clientes_prazos, projetos, drafts,
    feriados, contas_receber
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MOS - Contas a Receber API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(impostos.router,         prefix="/api/impostos",         tags=["Impostos"])
app.include_router(clientes_prazos.router,  prefix="/api/clientes-prazos",  tags=["Clientes e Prazos"])
app.include_router(projetos.router,         prefix="/api/projetos",         tags=["Projetos (WO)"])
app.include_router(drafts.router,           prefix="/api/drafts",           tags=["Drafts"])
app.include_router(feriados.router,         prefix="/api/feriados",         tags=["Feriados"])
app.include_router(contas_receber.router,   prefix="/api/contas-receber",   tags=["Contas a Receber"])

@app.get("/")
def root():
    return {"status": "ok", "app": "MOS Contas a Receber"}
