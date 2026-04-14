"""
Lógica de cálculo de impostos baseada nas fórmulas do Excel:
Retidos na Fonte (X:AD):
  COFINS 3%  : se DOC = NFSe  → VL_BRUTO * 0.03
  CSLL 1%    : se DOC = NFSe  → VL_BRUTO * 0.01
  INSS 11%   : se DOC = NFSe E TIPO = CONTRATO → VL_BRUTO * 0.11
  IRPJ 1,5%  : se DOC = NFSe  → VL_BRUTO * 0.015
  PIS 0,65%  : se DOC = NFSe  → VL_BRUTO * 0.0065
  ISS        : se DOC = NFSe E FAT_POR = Rio → * 0.05 | Macaé → * 0.02
  TOTAL_RETIDO = SUM(acima)
  VL_LIQUIDO = VL_BRUTO - TOTAL_RETIDO

A Pagar (AF:AK):
  COFINS 7,6%: (VL_BRUTO * 0.076) - COFINS_RETIDO
  CSLL 2,88% : (VL_BRUTO * 0.0288) - CSLL_RETIDO
  ICMS 20%   : se DOC = DANFE → VL_BRUTO * 0.20
  IRPJ 4,8%  : (VL_BRUTO * 0.048) - IRPJ_RETIDO
  PIS 1,65%  : (VL_BRUTO * 0.0165) - PIS_RETIDO
  ISS (pagar): se DOC=NFSe OU exterior_com_iss=X → (VL_BRUTO * iss_rate) - ISS_RETIDO
"""
from typing import Optional
from datetime import date
from sqlalchemy.orm import Session
from app.models.models import Imposto

def get_iss_rate(faturado_por: Optional[str]) -> float:
    if faturado_por and "macaé" in faturado_por.lower():
        return 0.02
    return 0.05  # Rio ou default

def calcular_impostos(
    vl_bruto: float,
    doc: Optional[str],
    tipo_servico: Optional[str],
    faturado_por: Optional[str],
    exterior_com_iss: bool = False,
    db: Session = None
):
    """Calcula todos os impostos baseado nas fórmulas do Excel."""
    if not vl_bruto:
        return _zero_taxes()

    doc_nfse = doc and doc.upper() in ("NFSE", "NFSe")
    doc_danfe = doc and doc.upper() == "DANFE"
    is_contrato = tipo_servico and tipo_servico.upper() == "CONTRATO"
    iss_rate = get_iss_rate(faturado_por)

    # --- RETIDOS NA FONTE ---
    cofins_3  = vl_bruto * 0.03   if doc_nfse else 0
    csll_1    = vl_bruto * 0.01   if doc_nfse else 0
    inss_11   = vl_bruto * 0.11   if (doc_nfse and is_contrato) else 0
    irpj_15   = vl_bruto * 0.015  if doc_nfse else 0
    pis_065   = vl_bruto * 0.0065 if doc_nfse else 0
    iss_local = vl_bruto * iss_rate if (doc_nfse and faturado_por and faturado_por.lower() in ("rio","macaé","macae")) else 0

    total_retido = cofins_3 + csll_1 + inss_11 + irpj_15 + pis_065 + iss_local
    vl_liquido   = vl_bruto - total_retido

    # --- A PAGAR ---
    cofins_76 = max((vl_bruto * 0.076) - cofins_3, 0)
    csll_288  = max((vl_bruto * 0.0288) - csll_1, 0)
    icms_20   = vl_bruto * 0.20 if doc_danfe else 0
    irpj_48   = max((vl_bruto * 0.048) - irpj_15, 0)
    pis_165   = max((vl_bruto * 0.0165) - pis_065, 0)
    iss_pagar = max((vl_bruto * iss_rate) - iss_local, 0) if (doc_nfse or exterior_com_iss) else 0

    total_a_pagar = cofins_76 + csll_288 + icms_20 + irpj_48 + pis_165 + iss_pagar

    return {
        "cofins_3": round(cofins_3, 2),
        "csll_1": round(csll_1, 2),
        "inss_11": round(inss_11, 2),
        "irpj_15": round(irpj_15, 2),
        "pis_065": round(pis_065, 2),
        "iss_retido": round(iss_local, 2),
        "total_retido": round(total_retido, 2),
        "vl_liquido": round(vl_liquido, 2),
        "cofins_76": round(cofins_76, 2),
        "csll_288": round(csll_288, 2),
        "icms_20": round(icms_20, 2),
        "irpj_48": round(irpj_48, 2),
        "pis_165": round(pis_165, 2),
        "iss_pagar": round(iss_pagar, 2),
        "outros": 0,
        "total_a_pagar": round(total_a_pagar, 2),
    }

def _zero_taxes():
    return {k: 0 for k in ["cofins_3","csll_1","inss_11","irpj_15","pis_065",
        "iss_retido","total_retido","vl_liquido","cofins_76","csll_288",
        "icms_20","irpj_48","pis_165","iss_pagar","outros","total_a_pagar"]}
