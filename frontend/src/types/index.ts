// ─── API Enums ────────────────────────────────────────────────────────────────

export const DOC_TYPES = ["NFSe","FAT. LOC.","DANFE","NFSe(ex)","Nota de Débito","DANFE(ex)","FAT.LOC.(ex)","Crédito"] as const
export const ESCOPOS = ["SERVIÇO","LOCAÇÃO","VENDA","CRÉDITO"] as const
export const FATURADO_POR = ["Rio","Macaé"] as const
export const STATUS_LIST = [
  "Gerência","Programado","a começar","em andamento","Confeccionar DI",
  "Aguardando Resposta do Cliente","Aguardando Documentação","aguardando PO",
  "Aguardando Inf. Interna","Aguardando Relatório","aguardando ajuste da PO",
  "Devedores Incobráveis","Free Of Charge","Enviar NF","Aguardando Custo Log",
  "Aguardando Liberação do Portal","AGUARDANDO PAGAMENTO","PAGO",
  "Aguardando Aprovação Interna","Enviar DI ao Cliente","Aprovado em Data de Corte",
  "Previsão","em negociação","finalizar","Aguardando Aprovação Gerencial",
  "aguardando custo hospedagem"
] as const

// ─── Models ───────────────────────────────────────────────────────────────────

export interface TaxRate {
  id: number
  tax_name: string
  category: 'retido' | 'a_pagar'
  service_type?: string
  doc_type?: string
  faturado_por?: string
  rate: number
  valid_from: string
  valid_to?: string
  country: string
  notes?: string
  created_at: string
}

export interface ClientPaymentTerm {
  id: number
  client_name: string
  rec_doc: number
  medicao: number
  resp_cli: number
  vencimento: number
  cambio: number
  total_dias?: number
  data_limite: number
  created_at: string
  updated_at: string
}

export interface Draft {
  id: number
  draft_code: number
  draft_date?: string
  notes?: string
  created_at: string
}

export interface Holiday {
  id: number
  date: string
  name: string
  type: string
  state?: string
  city?: string
  country: string
  recurring: boolean
}

export interface Project {
  id: number
  wo: number
  api_project_id?: number
  client_id?: number
  platform_id?: number
  client_name?: string
  platform_name?: string
  coordinator_name?: string
  service_type?: string
  exterior_com_iss: boolean
  po_contrato?: string
  proposta_comercial?: string
  created_at: string
  updated_at: string
}

export interface ContaReceber {
  id: number
  wo: number
  draft_code?: number
  draft_date?: string
  // Lookup from project
  cliente?: string
  plataforma?: string
  focal?: string
  coord_focal?: string
  tipo_servico?: string
  exterior_com_iss?: string
  // Document
  doc_type?: string
  num_doc?: string
  data_doc?: string
  escopo?: string
  faturado_por?: string
  id_ticket_req?: string
  po_contrato?: string
  num_proposta?: string
  // Values
  vl_bruto?: number
  vencimento?: string
  status?: string
  data_envio_cliente?: string
  obs?: string
  data_pgto?: string
  data_inicio?: string
  data_fim?: string
  data_rec_doc?: string
  adicional_dias: number
  // Calculated taxes
  cofins_retido?: number
  csll_retido?: number
  inss_retido?: number
  irpj_retido?: number
  pis_retido?: number
  iss_retido?: number
  total_retido?: number
  vl_liquido?: number
  cofins_pagar?: number
  csll_pagar?: number
  icms_pagar?: number
  irpj_pagar?: number
  pis_pagar?: number
  iss_pagar?: number
  total_impostos_pagar?: number
  // Forecast
  prev_fat?: string
  prev_pag?: string
  mes_prev_pag?: string
  ano_prev_pag?: number
  // Payment terms
  rec_doc?: number
  medicao?: number
  resp_cli?: number
  vencimento_dias?: number
  cambio?: number
  total_dias?: number
  created_at: string
  updated_at: string
}

export interface Totais {
  total_bruto: number
  total_retido: number
  total_liquido: number
  total_a_pagar: number
  count: number
}

export interface ContasListResponse {
  items: ContaReceber[]
  total: number
  page: number
  page_size: number
  totais: Totais
}

export interface ApiProject {
  id: number
  project_number: number
  user_id?: number
  client_id?: number
  platform_id?: number
}
