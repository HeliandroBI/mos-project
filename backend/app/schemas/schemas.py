from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

# --- IMPOSTOS ---
class ImpostoBase(BaseModel):
    nome: str
    tipo: str
    tipo_servico: Optional[str] = None
    tipo_documento: Optional[str] = None
    cidade: Optional[str] = None
    aliquota: float
    vigencia_inicio: date
    vigencia_fim: Optional[date] = None
    ativo: bool = True

class ImpostoCreate(ImpostoBase): pass
class ImpostoUpdate(ImpostoBase): pass
class Imposto(ImpostoBase):
    id: int
    criado_em: Optional[datetime] = None
    class Config: from_attributes = True

# --- CLIENTES PRAZOS ---
class ClientePrazoBase(BaseModel):
    cliente: str
    rec_doc: int = 5
    medicao: int = 3
    resp_cli: int = 10
    vencimento: int = 30
    cambio: int = 0
    data_limite: int = 30

class ClientePrazoCreate(ClientePrazoBase): pass
class ClientePrazoUpdate(ClientePrazoBase): pass
class ClientePrazo(ClientePrazoBase):
    id: int
    total_dias: Optional[int] = None
    criado_em: Optional[datetime] = None
    atualizado_em: Optional[datetime] = None
    class Config: from_attributes = True

# --- PROJETOS ---
class ProjetoBase(BaseModel):
    wo: int
    cliente: Optional[str] = None
    plataforma: Optional[str] = None
    coordenador: Optional[str] = None
    api_project_id: Optional[int] = None
    api_client_id: Optional[int] = None
    api_platform_id: Optional[int] = None
    tipo_servico: Optional[str] = None
    exterior_com_iss: bool = False
    vl_diaria: Optional[float] = None
    vl_diaria_locacao: Optional[float] = None
    vl_outros: Optional[float] = None
    ativo: bool = True

class ProjetoCreate(ProjetoBase): pass
class ProjetoUpdate(ProjetoBase): pass
class Projeto(ProjetoBase):
    id: int
    criado_em: Optional[datetime] = None
    class Config: from_attributes = True

# --- DRAFTS ---
class DraftBase(BaseModel):
    codigo: int
    data_draft: Optional[date] = None
    descricao: Optional[str] = None
    ativo: bool = True

class DraftCreate(DraftBase): pass
class DraftUpdate(DraftBase): pass
class Draft(DraftBase):
    id: int
    criado_em: Optional[datetime] = None
    class Config: from_attributes = True

# --- FERIADOS ---
class FeriadoBase(BaseModel):
    data: date
    nome: str
    tipo: str = "nacional"
    estado: Optional[str] = None
    municipio: Optional[str] = None
    pais: str = "BR"
    recorrente: bool = True

class FeriadoCreate(FeriadoBase): pass
class FeriadoUpdate(FeriadoBase): pass
class Feriado(FeriadoBase):
    id: int
    criado_em: Optional[datetime] = None
    class Config: from_attributes = True

# --- CONTAS A RECEBER ---
class ContaReceberBase(BaseModel):
    wo: Optional[int] = None
    draft_id: Optional[int] = None
    cliente: Optional[str] = None
    plataforma: Optional[str] = None
    coord_focal: Optional[str] = None
    tipo_servico: Optional[str] = None
    exterior_com_iss: bool = False
    proposta_comercial: Optional[str] = None
    po_contrato: Optional[str] = None
    doc: Optional[str] = None
    num_doc: Optional[str] = None
    data_doc: Optional[date] = None
    data_draft: Optional[date] = None
    escopo: Optional[str] = None
    faturado_por: Optional[str] = None
    vl_bruto: Optional[float] = None
    status: str = "Programado"
    obs: Optional[str] = None
    id_ticket_req: Optional[str] = None
    data_rec_doc: Optional[date] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    data_envio_cliente: Optional[date] = None
    data_pgto: Optional[date] = None
    vencimento: Optional[date] = None
    prev_fat: Optional[date] = None
    prev_pag: Optional[date] = None

class ContaReceberCreate(ContaReceberBase): pass
class ContaReceberUpdate(ContaReceberBase): pass
class ContaReceber(ContaReceberBase):
    id: int
    draft_codigo: Optional[int] = None
    cofins_3: float = 0
    csll_1: float = 0
    inss_11: float = 0
    irpj_15: float = 0
    pis_065: float = 0
    iss_retido: float = 0
    total_retido: float = 0
    vl_liquido: Optional[float] = None
    mes_prev_pag: Optional[int] = None
    ano: Optional[int] = None
    criado_em: Optional[datetime] = None
    atualizado_em: Optional[datetime] = None
    class Config: from_attributes = True

class ContaReceberListResponse(BaseModel):
    total: int
    total_bruto: float
    total_liquido: float
    items: List[ContaReceber]

class ImportCSVResponse(BaseModel):
    importados: int
    erros: int
    mensagens: List[str]
