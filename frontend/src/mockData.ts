// Dados fictícios usados apenas no build de demonstração (VITE_DEMO=true / GitHub Pages)
export const MOCK_CONTAS = [
  { id: 1, wo: 1001, draft_id: 101, cliente: "Cliente A", plataforma: "Plataforma 1", coord_focal: "AS", doc: "NFSe", num_doc: null, data_doc: "2026-03-05", escopo: "SERVIÇO", faturado_por: "", vl_bruto: 1100.76, total_retido: 67.70, vl_liquido: 1033.06, vencimento: "2026-04-22", prev_pag: "2026-04-27", status: "Enviar NF", obs: "exemplo" },
  { id: 2, wo: 1002, draft_id: 102, cliente: "Cliente B", plataforma: "Plataforma 2", coord_focal: "MS", doc: "NFSe", num_doc: null, data_doc: null, escopo: "SERVIÇO", faturado_por: null, vl_bruto: null, total_retido: 0, vl_liquido: null, vencimento: null, prev_pag: "2026-05-18", status: "Em andamento", obs: "exemplo" },
  { id: 3, wo: 1003, draft_id: null, cliente: "Cliente C", plataforma: "Plataforma 3", coord_focal: "AJ", doc: "FAT. LOC.", num_doc: null, data_doc: null, escopo: "LOCAÇÃO", faturado_por: null, vl_bruto: 816.41, total_retido: 0, vl_liquido: 816.41, vencimento: null, prev_pag: "2026-06-30", status: "Em andamento", obs: "exemplo" },
  { id: 4, wo: 1004, draft_id: null, cliente: "Cliente C", plataforma: "Plataforma 4", coord_focal: "AJ", doc: "FAT. LOC.", num_doc: null, data_doc: null, escopo: "LOCAÇÃO", faturado_por: null, vl_bruto: 721.79, total_retido: 0, vl_liquido: 721.79, vencimento: null, prev_pag: "2026-06-30", status: "Em andamento", obs: "exemplo" },
  { id: 5, wo: 1005, draft_id: 103, cliente: "Cliente D", plataforma: "Plataforma 5", coord_focal: "GR", doc: "NFSe", num_doc: "9001", data_doc: "2026-03-05", escopo: "SERVIÇO", faturado_por: "Base 1", vl_bruto: 16.36, total_retido: 1.33, vl_liquido: 15.03, vencimento: "2026-04-22", prev_pag: "2026-04-27", status: "Enviar NF", obs: "exemplo" },
  { id: 6, wo: 1006, draft_id: 104, cliente: "Cliente E", plataforma: "Plataforma 6", coord_focal: "AJ", doc: "FAT. LOC.", num_doc: null, data_doc: null, escopo: "LOCAÇÃO", faturado_por: null, vl_bruto: 4.0, total_retido: 0, vl_liquido: 4.0, vencimento: null, prev_pag: null, status: "Aguardando Resposta do Cliente", obs: "exemplo" },
  { id: 7, wo: 1006, draft_id: 104, cliente: "Cliente E", plataforma: "Plataforma 6", coord_focal: "AJ", doc: "NFSe", num_doc: null, data_doc: null, escopo: "SERVIÇO", faturado_por: null, vl_bruto: 68.35, total_retido: 4.20, vl_liquido: 64.15, vencimento: null, prev_pag: null, status: "Aguardando Resposta do Cliente", obs: "exemplo" },
  { id: 8, wo: 1007, draft_id: 105, cliente: "Cliente F", plataforma: "Plataforma 7", coord_focal: "VR", doc: "NFSe", num_doc: null, data_doc: null, escopo: "SERVIÇO", faturado_por: null, vl_bruto: 500.66, total_retido: 30.79, vl_liquido: 469.87, vencimento: null, prev_pag: null, status: "Aguardando Resposta do Cliente", obs: "exemplo" },
  { id: 9, wo: 1008, draft_id: 106, cliente: "Cliente D", plataforma: "Plataforma 8", coord_focal: "GR", doc: "NFSe", num_doc: "9002", data_doc: "2026-03-05", escopo: "SERVIÇO", faturado_por: "Base 1", vl_bruto: 1724.49, total_retido: 140.55, vl_liquido: 1583.94, vencimento: "2026-04-22", prev_pag: "2026-04-27", status: "Aguardando Pagamento", obs: null },
  { id: 10, wo: 1008, draft_id: 106, cliente: "Cliente D", plataforma: "Plataforma 8", coord_focal: "GR", doc: "FAT. LOC.", num_doc: "9003", data_doc: "2026-03-05", escopo: "LOCAÇÃO", faturado_por: "Base 1", vl_bruto: 238.92, total_retido: 0, vl_liquido: 238.92, vencimento: "2026-04-22", prev_pag: "2026-04-27", status: "Aguardando Pagamento", obs: null },
];

export const MOCK_IMPOSTOS = [
  { id: 1, nome: "COFINS", tipo: "federal", aliquota: 0.03, vigencia_inicio: "2024-01-01", ativo: true },
  { id: 2, nome: "ISS", tipo: "municipal", cidade: "Cidade Exemplo", aliquota: 0.02, vigencia_inicio: "2024-01-01", ativo: true },
  { id: 3, nome: "IRPJ", tipo: "federal", aliquota: 0.015, vigencia_inicio: "2024-01-01", ativo: true },
];

export const MOCK_CLIENTES = [
  { id: 1, cliente: "Cliente A", rec_doc: 5, medicao: 5, resp_cli: 30, vencimento: 30, cambio: 0, total_dias: 70, data_limite: 30 },
  { id: 2, cliente: "Cliente B", rec_doc: 5, medicao: 5, resp_cli: 30, vencimento: 30, cambio: 0, total_dias: 70, data_limite: 30 },
  { id: 3, cliente: "Cliente C", rec_doc: 5, medicao: 5, resp_cli: 45, vencimento: 30, cambio: 0, total_dias: 85, data_limite: 45 },
];

export const MOCK_PROJETOS = [
  { id: 1, wo: 1001, cliente: "Cliente A", plataforma: "Plataforma 1", coordenador: "Coordenador A", tipo_servico: "SERVIÇO", ativo: true },
  { id: 2, wo: 1008, cliente: "Cliente D", plataforma: "Plataforma 8", coordenador: "Coordenador B", tipo_servico: "SERVIÇO", ativo: true },
  { id: 3, wo: 1002, cliente: "Cliente B", plataforma: "Plataforma 2", coordenador: "Coordenador C", tipo_servico: "SERVIÇO", ativo: true },
];

export const MOCK_DRAFTS = [
  { id: 101, codigo: 101, data_draft: "2026-02-01", descricao: "Plataforma 1 - Campanha", ativo: true },
  { id: 102, codigo: 102, data_draft: "2026-03-05", descricao: "Plataforma 2 - Inspeção", ativo: true },
  { id: 103, codigo: 103, data_draft: "2026-02-12", descricao: "Plataforma 5 - Serviço extra", ativo: true },
];

export const MOCK_FERIADOS = [
  { id: 1, data: "2026-04-21", nome: "Feriado Nacional 1", tipo: "nacional", pais: "Brasil" },
  { id: 2, data: "2026-05-01", nome: "Feriado Nacional 2", tipo: "nacional", pais: "Brasil" },
  { id: 3, data: "2026-06-04", nome: "Feriado Nacional 3", tipo: "nacional", pais: "Brasil" },
];
