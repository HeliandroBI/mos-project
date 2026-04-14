from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import SessionLocal, Base, engine
from app.api.routes import setup, contas, qualtech
from app.models.models import Imposto, ClientePrazo, Draft, Feriado
from datetime import date

app = FastAPI(title="MOS - Offshore Workboard", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(setup.router, prefix="/setup", tags=["Setup"])
app.include_router(contas.router, prefix="/api", tags=["Contas a Receber"])
app.include_router(qualtech.router, prefix="/qualtech", tags=["Qualtech API"])

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    seed_initial_data()

def seed_initial_data():
    db = SessionLocal()
    try:
        if db.query(Imposto).count() == 0:
            impostos = [
                Imposto(nome="COFINS", tipo="retido_fonte", tipo_documento="NFSe", aliquota=0.03, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="CSLL", tipo="retido_fonte", tipo_documento="NFSe", aliquota=0.01, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="IRPJ", tipo="retido_fonte", tipo_documento="NFSe", aliquota=0.015, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="PIS", tipo="retido_fonte", tipo_documento="NFSe", aliquota=0.0065, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="COFINS", tipo="a_pagar", aliquota=0.076, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="CSLL", tipo="a_pagar", aliquota=0.0288, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="ICMS", tipo="a_pagar", tipo_documento="DANFE", aliquota=0.20, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="IRPJ", tipo="a_pagar", aliquota=0.048, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="PIS", tipo="a_pagar", aliquota=0.0165, vigencia_inicio=date(2020,1,1)),
            ]
            db.add_all(impostos)

        if db.query(ClientePrazo).count() == 0:
            clientes = [
                ("Transocean",5,3,10,30,0,25), ("Seadrill",5,3,10,30,0,25),
                ("Constellation",5,3,10,30,0,25), ("Foresea",5,5,15,60,0,22),
                ("Etesco",3,3,5,30,0,30), ("Helix",5,3,10,45,0,23),
                ("Ventura",5,3,10,30,0,25), ("Archerwell",5,3,20,30,0,30),
                ("Modec",5,3,15,45,0,27), ("Ocyan",5,3,15,60,0,22),
            ]
            for c in clientes:
                db.add(ClientePrazo(
                    cliente=c[0], rec_doc=c[1], medicao=c[2],
                    resp_cli=c[3], vencimento=c[4], cambio=c[5],
                    data_limite=c[6], total_dias=c[1]+c[2]+c[3]+c[4]+c[5]
                ))

        if db.query(Feriado).count() == 0:
            feriados = [
                (date(2025,1,1),"Confraternizacao Universal","nacional",None),
                (date(2025,4,21),"Tiradentes","nacional",None),
                (date(2025,5,1),"Dia do Trabalho","nacional",None),
                (date(2025,9,7),"Independencia do Brasil","nacional",None),
                (date(2025,12,25),"Natal","nacional",None),
            ]
            for h in feriados:
                db.add(Feriado(data=h[0], nome=h[1], tipo=h[2], estado=h[3]))

        db.commit()
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "MOS API - Offshore Workboard", "docs": "/docs"}
