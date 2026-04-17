"""Insere feriados nacionais de 2026 e 2027 no banco."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import SessionLocal
from app.models.models import Feriado
from datetime import date

feriados = [
    # ── 2026 ──────────────────────────────────────────────────
    (date(2026,1,1),   "Confraternização Universal",  "nacional", None),
    (date(2026,2,16),  "Carnaval (segunda)",           "nacional", None),
    (date(2026,2,17),  "Carnaval (terça)",             "nacional", None),
    (date(2026,4,3),   "Sexta-Feira Santa",            "nacional", None),
    (date(2026,4,5),   "Páscoa",                       "nacional", None),
    (date(2026,4,21),  "Tiradentes",                   "nacional", None),
    (date(2026,5,1),   "Dia do Trabalho",              "nacional", None),
    (date(2026,6,4),   "Corpus Christi",               "nacional", None),
    (date(2026,9,7),   "Independência do Brasil",      "nacional", None),
    (date(2026,10,12), "Nossa Senhora Aparecida",      "nacional", None),
    (date(2026,11,2),  "Finados",                      "nacional", None),
    (date(2026,11,15), "Proclamação da República",     "nacional", None),
    (date(2026,11,20), "Consciência Negra",            "nacional", None),
    (date(2026,12,25), "Natal",                        "nacional", None),
    # ── 2027 ──────────────────────────────────────────────────
    (date(2027,1,1),   "Confraternização Universal",   "nacional", None),
    (date(2027,3,1),   "Carnaval (segunda)",           "nacional", None),
    (date(2027,3,2),   "Carnaval (terça)",             "nacional", None),
    (date(2027,3,26),  "Sexta-Feira Santa",            "nacional", None),
    (date(2027,3,28),  "Páscoa",                       "nacional", None),
    (date(2027,4,21),  "Tiradentes",                   "nacional", None),
    (date(2027,5,1),   "Dia do Trabalho",              "nacional", None),
    (date(2027,5,27),  "Corpus Christi",               "nacional", None),
    (date(2027,9,7),   "Independência do Brasil",      "nacional", None),
    (date(2027,10,12), "Nossa Senhora Aparecida",      "nacional", None),
    (date(2027,11,2),  "Finados",                      "nacional", None),
    (date(2027,11,15), "Proclamação da República",     "nacional", None),
    (date(2027,11,20), "Consciência Negra",            "nacional", None),
    (date(2027,12,25), "Natal",                        "nacional", None),
]

db = SessionLocal()
try:
    datas_existentes = {f.data for f in db.query(Feriado.data).all()}
    inseridos = 0
    for data, nome, tipo, estado in feriados:
        if data not in datas_existentes:
            db.add(Feriado(data=data, nome=nome, tipo=tipo, estado=estado, pais="BR"))
            inseridos += 1
    db.commit()
    print(f"OK: {inseridos} feriados inseridos.")
finally:
    db.close()
