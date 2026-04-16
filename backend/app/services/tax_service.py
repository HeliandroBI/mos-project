"""
Serviço de cálculo de impostos e previsão de pagamentos
Baseado nas fórmulas do Excel Contas_a_Receber_3_0.xlsx
"""
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import TaxRate, Holiday, ClientPaymentTerm


def get_next_business_day(d: date, db: Session) -> date:
    """Avança para próximo dia útil (pula fins de semana e feriados)"""
    holidays = {h.date for h in db.query(Holiday).filter(Holiday.country == "Brasil").all()}
    while d.weekday() >= 5 or d in holidays:
        d += timedelta(days=1)
    return d


def get_active_rate(db: Session, tax_name: str, category: str,
                    service_type: Optional[str] = None,
                    doc_type: Optional[str] = None,
                    faturado_por: Optional[str] = None,
                    ref_date: Optional[date] = None) -> float:
    """Busca alíquota vigente para um imposto na data de referência"""
    if ref_date is None:
        ref_date = date.today()

    query = db.query(TaxRate).filter(
        TaxRate.tax_name == tax_name,
        TaxRate.category == category,
        TaxRate.valid_from <= ref_date,
    ).filter(
        (TaxRate.valid_to == None) | (TaxRate.valid_to >= ref_date)
    )

    # Filtrar pelo mais específico disponível
    rates = query.all()
    best = None
    for r in rates:
        match_score = 0
        if r.service_type and r.service_type == service_type:
            match_score += 1
        elif r.service_type and r.service_type != service_type:
            continue
        if r.doc_type and r.doc_type == doc_type:
            match_score += 1
        elif r.doc_type and r.doc_type != doc_type:
            continue
        if r.faturado_por and r.faturado_por == faturado_por:
            match_score += 1
        elif r.faturado_por and r.faturado_por != faturado_por:
            continue
        if best is None or match_score > best[0]:
            best = (match_score, r)

    return best[1].rate if best else 0.0


def calc_impostos_retidos(vl_bruto: float, doc_type: str, service_type: str,
                           faturado_por: str, db: Session, ref_date: Optional[date] = None):
    """
    Calcula impostos retidos na fonte.
    Equivale às colunas X:AD do Excel.
    """
    is_nfse = doc_type == "NFSe"
    is_contrato = service_type == "CONTRATO" or service_type == "SERVIÇO"
    is_rio = faturado_por == "Rio"
    is_macae = faturado_por == "Macaé"

    # COFINS 3% - só NFSe
    cofins = vl_bruto * get_active_rate(db, "COFINS", "retido", ref_date=ref_date) if is_nfse else 0
    # CSLL 1% - só NFSe
    csll = vl_bruto * get_active_rate(db, "CSLL", "retido", ref_date=ref_date) if is_nfse else 0
    # INSS 11% - NFSe + CONTRATO
    inss = vl_bruto * get_active_rate(db, "INSS", "retido", ref_date=ref_date) if (is_nfse and is_contrato) else 0
    # IRPJ 1.5% - só NFSe
    irpj = vl_bruto * get_active_rate(db, "IRPJ", "retido", ref_date=ref_date) if is_nfse else 0
    # PIS 0.65% - só NFSe
    pis = vl_bruto * get_active_rate(db, "PIS", "retido", ref_date=ref_date) if is_nfse else 0
    # ISS - NFSe, depende do município
    if is_nfse and is_rio:
        iss = vl_bruto * get_active_rate(db, "ISS-Rio", "retido", ref_date=ref_date)
    elif is_nfse and is_macae:
        iss = vl_bruto * get_active_rate(db, "ISS-Macaé", "retido", ref_date=ref_date)
    else:
        iss = 0

    total = cofins + csll + irpj + pis + iss
    vl_liquido = vl_bruto - total

    return {
        "cofins_retido": round(cofins, 4),
        "csll_retido": round(csll, 4),
        "inss_retido": round(inss, 4),
        "irpj_retido": round(irpj, 4),
        "pis_retido": round(pis, 4),
        "iss_retido": round(iss, 4),
        "total_retido": round(total, 4),
        "vl_liquido": round(vl_liquido, 4),
    }


def calc_impostos_pagar(vl_bruto: float, doc_type: str, exterior_com_iss: bool,
                         impostos_retidos: dict, db: Session, ref_date: Optional[date] = None):
    """
    Calcula impostos a pagar (= alíquota cheia - retido).
    Equivale às colunas AF:AK do Excel.
    """
    is_danfe = doc_type == "DANFE"
    is_nfse = doc_type == "NFSe"

    cofins_r = get_active_rate(db, "COFINS", "a_pagar", ref_date=ref_date)
    csll_r = get_active_rate(db, "CSLL", "a_pagar", ref_date=ref_date)
    icms_r = get_active_rate(db, "ICMS", "a_pagar", ref_date=ref_date)
    irpj_r = get_active_rate(db, "IRPJ", "a_pagar", ref_date=ref_date)
    pis_r = get_active_rate(db, "PIS", "a_pagar", ref_date=ref_date)
    iss_r = get_active_rate(db, "ISS-Rio", "a_pagar", ref_date=ref_date)

    cofins_p = (vl_bruto * cofins_r) - impostos_retidos.get("cofins_retido", 0)
    csll_p = (vl_bruto * csll_r) - impostos_retidos.get("csll_retido", 0)
    icms_p = (vl_bruto * icms_r) if is_danfe else 0
    irpj_p = (vl_bruto * irpj_r) - impostos_retidos.get("irpj_retido", 0)
    pis_p = (vl_bruto * pis_r) - impostos_retidos.get("pis_retido", 0)
    iss_p = ((vl_bruto * iss_r) - impostos_retidos.get("iss_retido", 0)) if (is_nfse or exterior_com_iss) else 0

    total_pagar = cofins_p + csll_p + icms_p + irpj_p + pis_p + iss_p

    return {
        "cofins_pagar": round(cofins_p, 4),
        "csll_pagar": round(csll_p, 4),
        "icms_pagar": round(icms_p, 4),
        "irpj_pagar": round(irpj_p, 4),
        "pis_pagar": round(pis_p, 4),
        "iss_pagar": round(iss_p, 4),
        "total_impostos_pagar": round(total_pagar, 4),
    }


def calc_previsao_faturamento(status: str, data_fim: Optional[date], data_draft: Optional[date],
                               data_doc: Optional[date], prazos: dict,
                               adicional_dias: int, db: Session) -> Optional[date]:
    """
    Calcula previsão de faturamento.
    Baseado na fórmula BI5 do Excel (Prev. Fat._temp).
    """
    STATUS_IGNORAR = ["PAGO", "Devedores Incobráveis", "Free Of Charge",
                      "Gerência", "Previsão", "Cancelado"]
    if status in STATUS_IGNORAR:
        return None

    rec_doc = prazos.get("rec_doc", 5)
    medicao = prazos.get("medicao", 3)
    resp_cli = prazos.get("resp_cli", 10)
    vencimento_dias = prazos.get("vencimento", 30)
    cambio = prazos.get("cambio", 0)
    data_limite_dia = prazos.get("data_limite", 25)

    today = date.today()
    prev = None

    if status in ["finalizar", "Aguardando Aprovação Gerencial", "Aguardando Documentação"]:
        if data_fim:
            prev = data_fim + timedelta(days=medicao + resp_cli + adicional_dias)
    elif status == "em negociação":
        if data_fim:
            prev = data_fim + timedelta(days=resp_cli + adicional_dias)
    elif status == "Aprovado em Data de Corte":
        # início do próximo mês
        import calendar
        last_day = calendar.monthrange(today.year, today.month)[1]
        prev = date(today.year, today.month, last_day) + timedelta(days=1)
    elif status in ["aguardando PO", "aguardando ajuste da PO"]:
        if data_fim:
            prev = data_fim + timedelta(days=resp_cli + vencimento_dias + cambio + adicional_dias + 20)
    elif status == "aguardando custo hospedagem":
        if data_fim:
            prev = data_fim + timedelta(days=resp_cli + vencimento_dias + cambio + adicional_dias + 10)
    elif status == "Enviar DI ao Cliente":
        prev = today + timedelta(days=resp_cli + adicional_dias)
    elif status in ["em andamento", "a começar"]:
        if data_fim:
            prev = data_fim + timedelta(days=rec_doc + medicao + resp_cli + adicional_dias)
    elif status == "Enviar NF":
        prev = today
    elif status == "AGUARDANDO PAGAMENTO":
        prev = data_doc
    else:
        if data_draft:
            candidate = data_draft + timedelta(days=resp_cli)
            if candidate >= today:
                prev = candidate + timedelta(days=adicional_dias)
            else:
                prev = today + timedelta(days=1 + adicional_dias)

    if prev is None:
        return None

    # Ajusta data limite do mês para faturamento
    if data_limite_dia:
        from datetime import date as dt
        import calendar
        first_of_month = dt(prev.year, prev.month, 1)
        data_limite = first_of_month + timedelta(days=data_limite_dia - 1)
        if data_doc:
            return data_doc
        if prev < data_limite:
            pass  # mantém
        else:
            last = calendar.monthrange(prev.year, prev.month)[1]
            prev = dt(prev.year, prev.month, last) + timedelta(days=1)

    # Ajusta para dia útil
    return get_next_business_day(prev, db)


def calc_previsao_pagamento(status: str, prev_fat: Optional[date], vencimento: Optional[date],
                             prazos: dict, db: Session) -> Optional[date]:
    """
    Calcula previsão de pagamento a partir da previsão de faturamento.
    Baseado na fórmula BL5 do Excel (Prev. Pag._temp).
    """
    if prev_fat is None:
        return None

    STATUS_IGNORAR = ["PAGO", "Devedores Incobráveis", "Free Of Charge",
                      "Gerência", "Previsão", "Cancelado"]
    if status in STATUS_IGNORAR:
        return None

    vencimento_dias = prazos.get("vencimento", 30)
    cambio = prazos.get("cambio", 0)
    today = date.today()

    if status == "Enviar NF":
        prev = vencimento
    elif status == "AGUARDANDO PAGAMENTO":
        prev = vencimento
    elif status in ["finalizar", "em negociação", "em andamento", "a começar"]:
        prev = prev_fat + timedelta(days=vencimento_dias + cambio)
    elif prev_fat <= today:
        prev = today + timedelta(days=vencimento_dias + cambio)
    else:
        prev = prev_fat + timedelta(days=vencimento_dias + cambio)

    if prev is None:
        return None

    return get_next_business_day(prev, db)
