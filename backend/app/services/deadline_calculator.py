"""
Calcula datas de vencimento e previsão de pagamento
baseado na tabela de prazos por cliente do Excel (aba Vencimentos).

Fórmula Prev.Pag Excel:
  Se WEEKDAY(prev_pag_temp, 2) > 5 (sáb/dom)
  → prev_pag_temp + (7 - WEEKDAY + 1)  [próxima segunda]
"""
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import ClientePrazo, Feriado

def next_business_day(d: date, db: Session) -> date:
    """Avança para o próximo dia útil (pula fim de semana e feriados)."""
    feriados = {f.data for f in db.query(Feriado).filter(Feriado.pais == "BR").all()}
    while d.weekday() >= 5 or d in feriados:  # 5=sáb, 6=dom
        d += timedelta(days=1)
    return d

def calcular_vencimento(
    data_doc: Optional[date],
    cliente: Optional[str],
    db: Session
) -> Optional[date]:
    if not data_doc or not cliente:
        return None
    prazo = db.query(ClientePrazo).filter(ClientePrazo.cliente == cliente).first()
    if not prazo:
        return None
    total_dias = prazo.rec_doc + prazo.medicao + prazo.resp_cli + prazo.vencimento + prazo.cambio
    venc = data_doc + timedelta(days=total_dias)
    return next_business_day(venc, db)

def calcular_prev_pag(
    vencimento: Optional[date],
    cliente: Optional[str],
    db: Session
) -> Optional[date]:
    if not vencimento:
        return None
    prazo = db.query(ClientePrazo).filter(ClientePrazo.cliente == cliente).first()
    data_limite = prazo.data_limite if prazo else 30
    prev = date(vencimento.year, vencimento.month, min(data_limite, 28))
    if prev < vencimento:
        # Próximo mês
        if vencimento.month == 12:
            prev = date(vencimento.year + 1, 1, min(data_limite, 28))
        else:
            prev = date(vencimento.year, vencimento.month + 1, min(data_limite, 28))
    return next_business_day(prev, db)

def calcular_prev_fat(
    data_fim: Optional[date],
    cliente: Optional[str],
    db: Session
) -> Optional[date]:
    """Previsão de faturamento = data_fim + dias de recebimento de docs (rec_doc)."""
    if not data_fim or not cliente:
        return None
    prazo = db.query(ClientePrazo).filter(ClientePrazo.cliente == cliente).first()
    if not prazo:
        return None
    prev = data_fim + timedelta(days=prazo.rec_doc)
    return next_business_day(prev, db)
