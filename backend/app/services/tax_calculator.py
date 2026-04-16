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

def get_aliquota(db: Session, nome: str, tipo_servico: Optional[str] = None,
                 tipo_documento: Optional[str] = None, ref_date: Optional[date] = None) -> float:
    """Busca alíquota vigente na tabela Imposto, respeitando data de corte."""
    if db is None:
        return 0.0
    ref = ref_date or date.today()
    q = db.query(Imposto).filter(
        Imposto.nome == nome,
        Imposto.tipo == "retido_fonte",
        Imposto.ativo == True,
        Imposto.vigencia_inicio <= ref,
    ).filter(
        (Imposto.vigencia_fim == None) | (Imposto.vigencia_fim >= ref)
    )
    rows = q.all()
    # Escolhe o mais específico (tipo_servico + tipo_documento batem melhor)
    best, best_score = None, -1
    for r in rows:
        score = 0
        if r.tipo_servico and r.tipo_servico == tipo_servico:
            score += 2
        elif r.tipo_servico and r.tipo_servico != tipo_servico:
            continue  # filtro incompatível
        if r.tipo_documento and r.tipo_documento == tipo_documento:
            score += 1
        elif r.tipo_documento and r.tipo_documento != tipo_documento:
            continue  # filtro incompatível
        if score > best_score:
            best, best_score = r, score
    return best.aliquota if best else 0.0

def calcular_impostos(
    vl_bruto: float,
    doc: Optional[str],
    tipo_servico: Optional[str],
    faturado_por: Optional[str],
    exterior_com_iss: bool = False,
    db: Session = None,
    ref_date: Optional[date] = None,
):
    """Calcula todos os impostos baseado nas fórmulas do Excel."""
    if not vl_bruto:
        return _zero_taxes()

    doc_nfse  = doc and doc.upper() in ("NFSE", "NFSE(EX)")
    is_contrato = tipo_servico and tipo_servico.upper() == "CONTRATO"
    iss_rate  = get_iss_rate(faturado_por)

    # --- RETIDOS NA FONTE (alíquotas do banco) ---
    cofins_3  = vl_bruto * get_aliquota(db, "COFINS",  tipo_documento="NFSe", ref_date=ref_date) if doc_nfse else 0
    csll_1    = vl_bruto * get_aliquota(db, "CSLL",    tipo_documento="NFSe", ref_date=ref_date) if doc_nfse else 0
    irpj_15   = vl_bruto * get_aliquota(db, "IRPJ",    tipo_documento="NFSe", ref_date=ref_date) if doc_nfse else 0
    pis_065   = vl_bruto * get_aliquota(db, "PIS",     tipo_documento="NFSe", ref_date=ref_date) if doc_nfse else 0
    inss_11   = vl_bruto * get_aliquota(db, "INSS", tipo_servico="CONTRATO", tipo_documento="NFSe", ref_date=ref_date) \
                if (doc_nfse and is_contrato) else 0
    iss_local = vl_bruto * iss_rate if (doc_nfse and faturado_por and faturado_por.lower() in ("rio","macaé","macae")) else 0

    total_retido = cofins_3 + csll_1 + irpj_15 + pis_065 + iss_local
    vl_liquido   = vl_bruto - total_retido

    return {
        "cofins_3": round(cofins_3, 2),
        "csll_1": round(csll_1, 2),
        "inss_11": round(inss_11, 2),
        "irpj_15": round(irpj_15, 2),
        "pis_065": round(pis_065, 2),
        "iss_retido": round(iss_local, 2),
        "total_retido": round(total_retido, 2),
        "vl_liquido": round(vl_liquido, 2),
    }

def _zero_taxes():
    return {k: 0 for k in ["cofins_3","csll_1","inss_11","irpj_15","pis_065",
        "iss_retido","total_retido","vl_liquido"]}
