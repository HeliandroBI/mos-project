from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum

class TipoImposto(str, enum.Enum):
    retido_fonte = "retido_fonte"
    a_pagar = "a_pagar"

class TipoServico(str, enum.Enum):
    servico = "SERVIÇO"
    locacao = "LOCAÇÃO"
    venda = "VENDA"
    credito = "CRÉDITO"

class Imposto(Base):
    __tablename__ = "impostos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(50), nullable=False)
    tipo = Column(String(20), nullable=False)  # retido_fonte | a_pagar
    tipo_servico = Column(String(20), nullable=True)  # SERVIÇO | LOCAÇÃO | ambos
    tipo_documento = Column(String(20), nullable=True)  # NFSe | DANFE | FAT.LOC. | todos
    cidade = Column(String(50), nullable=True)  # Rio | Macaé | None
    aliquota = Column(Float, nullable=False)
    vigencia_inicio = Column(Date, nullable=False)
    vigencia_fim = Column(Date, nullable=True)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

class ClientePrazo(Base):
    __tablename__ = "clientes_prazos"
    id = Column(Integer, primary_key=True, index=True)
    cliente = Column(String(100), nullable=False, unique=True)
    rec_doc = Column(Integer, default=5)
    medicao = Column(Integer, default=3)
    resp_cli = Column(Integer, default=10)
    vencimento = Column(Integer, default=30)
    cambio = Column(Integer, default=0)
    total_dias = Column(Integer, nullable=True)
    data_limite = Column(Integer, default=30)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())

class Projeto(Base):
    __tablename__ = "projetos"
    id = Column(Integer, primary_key=True, index=True)
    wo = Column(Integer, nullable=False, unique=True, index=True)
    cliente = Column(String(100), nullable=True)
    plataforma = Column(String(100), nullable=True)
    coordenador = Column(String(100), nullable=True)
    # IDs da API externa (para performance)
    api_project_id = Column(Integer, nullable=True)
    api_client_id = Column(Integer, nullable=True)
    api_platform_id = Column(Integer, nullable=True)
    api_coordinator_id = Column(Integer, nullable=True)
    tipo_servico = Column(String(20), nullable=True)
    exterior_com_iss = Column(Boolean, default=False)
    vl_diaria = Column(Float, nullable=True)
    vl_diaria_locacao = Column(Float, nullable=True)
    vl_outros = Column(Float, nullable=True)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    contas = relationship("ContaReceber", back_populates="projeto")

class Draft(Base):
    __tablename__ = "drafts"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(Integer, nullable=False, unique=True, index=True)
    data_draft = Column(Date, nullable=True)
    descricao = Column(String(200), nullable=True)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    contas = relationship("ContaReceber", back_populates="draft")

class Feriado(Base):
    __tablename__ = "feriados"
    id = Column(Integer, primary_key=True, index=True)
    data = Column(Date, nullable=False)
    nome = Column(String(200), nullable=False)
    tipo = Column(String(20), default="nacional")  # nacional | estadual | municipal
    estado = Column(String(5), nullable=True)
    municipio = Column(String(100), nullable=True)
    pais = Column(String(5), default="BR")
    recorrente = Column(Boolean, default=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

class ContaReceber(Base):
    __tablename__ = "contas_receber"
    id = Column(Integer, primary_key=True, index=True)
    # Chaves
    wo = Column(Integer, ForeignKey("projetos.wo"), nullable=True, index=True)
    draft_id = Column(Integer, ForeignKey("drafts.id"), nullable=True)
    # Lookup via WO (texto, resolvido na hora do cadastro)
    cliente = Column(String(100), nullable=True)
    plataforma = Column(String(100), nullable=True)
    coord_focal = Column(String(100), nullable=True)
    tipo_servico = Column(String(20), nullable=True)
    exterior_com_iss = Column(Boolean, default=False)
    # Proposta / Contrato
    proposta_comercial = Column(String(100), nullable=True)
    po_contrato = Column(String(200), nullable=True)
    # Documento
    doc = Column(String(30), nullable=True)        # NFSe | FAT.LOC. | DANFE | etc
    num_doc = Column(String(50), nullable=True)
    data_doc = Column(Date, nullable=True)
    data_draft = Column(Date, nullable=True)
    escopo = Column(String(20), nullable=True)     # SERVIÇO | LOCAÇÃO | VENDA | CRÉDITO
    faturado_por = Column(String(30), nullable=True)  # Rio | Macaé
    # Valores
    vl_bruto = Column(Float, nullable=True)
    # Impostos retidos (calculados/gravados)
    cofins_3 = Column(Float, default=0)
    csll_1 = Column(Float, default=0)
    inss_11 = Column(Float, default=0)
    irpj_15 = Column(Float, default=0)
    pis_065 = Column(Float, default=0)
    iss_retido = Column(Float, default=0)
    total_retido = Column(Float, default=0)
    vl_liquido = Column(Float, nullable=True)
    # Prazos / Datas
    data_rec_doc = Column(Date, nullable=True)
    data_inicio = Column(Date, nullable=True)
    data_fim = Column(Date, nullable=True)
    vencimento = Column(Date, nullable=True)
    data_envio_cliente = Column(Date, nullable=True)
    data_pgto = Column(Date, nullable=True)
    prev_fat = Column(Date, nullable=True)
    prev_pag = Column(Date, nullable=True)
    mes_prev_pag = Column(Integer, nullable=True)
    ano = Column(Integer, nullable=True)
    # Status e outros campos
    status = Column(String(80), default="Programado")
    obs = Column(Text, nullable=True)
    id_ticket_req = Column(String(100), nullable=True)
    # Controle
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())
    # Relacionamentos
    projeto = relationship("Projeto", back_populates="contas")
    draft = relationship("Draft", back_populates="contas")

    @property
    def draft_codigo(self):
        return self.draft.codigo if self.draft else None

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    tabela = Column(String(100), nullable=False)          # nome da tabela afetada
    registro_id = Column(Integer, nullable=False)         # id do registro excluído
    resumo = Column(Text, nullable=True)                  # dados principais do registro
    responsavel = Column(String(200), nullable=False)     # nome de quem solicitou
    motivo = Column(Text, nullable=True)                  # motivo informado
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
