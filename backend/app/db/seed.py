"""Seed inicial com dados do Excel: impostos, clientes/prazos, drafts, feriados."""
from datetime import date
from app.db.database import SessionLocal, engine, Base
from app.models.models import Imposto, ClientePrazo, Draft, Feriado

Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    try:
        # --- IMPOSTOS RETIDOS NA FONTE ---
        if not db.query(Imposto).first():
            impostos = [
                # Retidos na Fonte
                Imposto(nome="COFINS", tipo="retido_fonte", tipo_documento="NFSe", aliquota=0.03, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="CSLL", tipo="retido_fonte", tipo_documento="NFSe", aliquota=0.01, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="INSS", tipo="retido_fonte", tipo_documento="NFSe", tipo_servico="CONTRATO", aliquota=0.11, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="IRPJ", tipo="retido_fonte", tipo_documento="NFSe", aliquota=0.015, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="PIS", tipo="retido_fonte", tipo_documento="NFSe", aliquota=0.0065, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="ISS - Rio", tipo="retido_fonte", tipo_documento="NFSe", cidade="Rio", aliquota=0.05, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="ISS - Macaé", tipo="retido_fonte", tipo_documento="NFSe", cidade="Macaé", aliquota=0.02, vigencia_inicio=date(2020,1,1)),
                # A Pagar
                Imposto(nome="COFINS", tipo="a_pagar", aliquota=0.076, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="CSLL", tipo="a_pagar", aliquota=0.0288, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="ICMS", tipo="a_pagar", tipo_documento="DANFE", aliquota=0.20, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="IRPJ", tipo="a_pagar", aliquota=0.048, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="PIS", tipo="a_pagar", aliquota=0.0165, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="ISS - Rio", tipo="a_pagar", cidade="Rio", aliquota=0.05, vigencia_inicio=date(2020,1,1)),
                Imposto(nome="ISS - Macaé", tipo="a_pagar", cidade="Macaé", aliquota=0.02, vigencia_inicio=date(2020,1,1)),
            ]
            db.add_all(impostos)

        # --- CLIENTES E PRAZOS (da aba Vencimentos) ---
        if not db.query(ClientePrazo).first():
            clientes = [
                ClientePrazo(cliente="Altera", rec_doc=5, medicao=3, resp_cli=10, vencimento=60, cambio=0, total_dias=78, data_limite=25),
                ClientePrazo(cliente="Altera&Ocyan", rec_doc=5, medicao=3, resp_cli=10, vencimento=60, cambio=0, total_dias=78, data_limite=25),
                ClientePrazo(cliente="Archerwell", rec_doc=5, medicao=3, resp_cli=20, vencimento=30, cambio=0, total_dias=58, data_limite=30),
                ClientePrazo(cliente="Brasdrill", rec_doc=5, medicao=3, resp_cli=7, vencimento=30, cambio=0, total_dias=45, data_limite=30),
                ClientePrazo(cliente="Equinor", rec_doc=5, medicao=3, resp_cli=20, vencimento=30, cambio=0, total_dias=58, data_limite=30),
                ClientePrazo(cliente="Etesco", rec_doc=3, medicao=3, resp_cli=5, vencimento=30, cambio=0, total_dias=41, data_limite=30),
                ClientePrazo(cliente="Foresea", rec_doc=5, medicao=5, resp_cli=15, vencimento=60, cambio=0, total_dias=85, data_limite=22),
                ClientePrazo(cliente="GranIHC", rec_doc=5, medicao=3, resp_cli=10, vencimento=30, cambio=0, total_dias=48, data_limite=20),
                ClientePrazo(cliente="Helix do Brasil", rec_doc=5, medicao=3, resp_cli=10, vencimento=45, cambio=0, total_dias=63, data_limite=23),
                ClientePrazo(cliente="Helix International", rec_doc=5, medicao=3, resp_cli=10, vencimento=30, cambio=3, total_dias=51, data_limite=30),
                ClientePrazo(cliente="Janeiro Offshore", rec_doc=5, medicao=5, resp_cli=10, vencimento=30, cambio=0, total_dias=50, data_limite=20),
                ClientePrazo(cliente="K.Lund", rec_doc=5, medicao=5, resp_cli=10, vencimento=45, cambio=0, total_dias=65, data_limite=20),
                ClientePrazo(cliente="Karpowership", rec_doc=5, medicao=5, resp_cli=10, vencimento=30, cambio=0, total_dias=50, data_limite=30),
                ClientePrazo(cliente="Maersk", rec_doc=5, medicao=3, resp_cli=10, vencimento=30, cambio=0, total_dias=48, data_limite=20),
                ClientePrazo(cliente="Modec", rec_doc=5, medicao=3, resp_cli=15, vencimento=45, cambio=0, total_dias=68, data_limite=27),
                ClientePrazo(cliente="Oceaneering", rec_doc=5, medicao=5, resp_cli=10, vencimento=30, cambio=0, total_dias=50, data_limite=25),
                ClientePrazo(cliente="Ocyan", rec_doc=5, medicao=3, resp_cli=15, vencimento=60, cambio=0, total_dias=83, data_limite=22),
                ClientePrazo(cliente="PetroRio", rec_doc=5, medicao=5, resp_cli=10, vencimento=30, cambio=0, total_dias=50, data_limite=20),
                ClientePrazo(cliente="Prosafe", rec_doc=5, medicao=3, resp_cli=10, vencimento=30, cambio=0, total_dias=48, data_limite=25),
                ClientePrazo(cliente="Qualitech MX", rec_doc=365, medicao=0, resp_cli=365, vencimento=30, cambio=3, total_dias=763, data_limite=30),
                ClientePrazo(cliente="Sapura", rec_doc=5, medicao=5, resp_cli=10, vencimento=30, cambio=0, total_dias=50, data_limite=20),
                ClientePrazo(cliente="SBM", rec_doc=5, medicao=5, resp_cli=10, vencimento=30, cambio=0, total_dias=50, data_limite=20),
                ClientePrazo(cliente="Schlumberger", rec_doc=5, medicao=3, resp_cli=10, vencimento=30, cambio=0, total_dias=48, data_limite=25),
                ClientePrazo(cliente="Subsea 7", rec_doc=5, medicao=3, resp_cli=10, vencimento=30, cambio=0, total_dias=48, data_limite=25),
                ClientePrazo(cliente="Transocean", rec_doc=5, medicao=3, resp_cli=10, vencimento=30, cambio=0, total_dias=48, data_limite=25),
                ClientePrazo(cliente="Constellation", rec_doc=5, medicao=3, resp_cli=10, vencimento=30, cambio=0, total_dias=48, data_limite=25),
                ClientePrazo(cliente="Helix", rec_doc=5, medicao=3, resp_cli=10, vencimento=30, cambio=0, total_dias=48, data_limite=25),
            ]
            db.add_all(clientes)

        # --- FERIADOS BRASIL 2026 ---
        if not db.query(Feriado).first():
            feriados = [
                # Nacionais 2026
                Feriado(data=date(2026,1,1), nome="Confraternização Universal", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,2,16), nome="Carnaval (ponto facultativo)", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,2,17), nome="Carnaval", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,2,18), nome="Quarta-feira de Cinzas (meio dia)", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,4,3), nome="Sexta-feira Santa", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,4,5), nome="Páscoa", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,4,21), nome="Tiradentes", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,5,1), nome="Dia do Trabalho", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,6,4), nome="Corpus Christi", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,9,7), nome="Independência do Brasil", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,10,12), nome="Nossa Senhora Aparecida", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,11,2), nome="Finados", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,11,15), nome="Proclamação da República", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,11,20), nome="Consciência Negra", tipo="nacional", pais="BR"),
                Feriado(data=date(2026,12,25), nome="Natal", tipo="nacional", pais="BR"),
                # Estaduais RJ 2026
                Feriado(data=date(2026,1,20), nome="São Sebastião (Rio de Janeiro)", tipo="estadual", estado="RJ", municipio="Rio de Janeiro", pais="BR"),
                Feriado(data=date(2026,4,23), nome="São Jorge", tipo="estadual", estado="RJ", municipio="Rio de Janeiro", pais="BR"),
                Feriado(data=date(2026,11,20), nome="Zumbi dos Palmares (RJ)", tipo="estadual", estado="RJ", pais="BR"),
            ]
            db.add_all(feriados)

        db.commit()
        print("Seed concluído!")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
