export const MOCK_CONTAS = [
  { id: 2156, wo: 3808, draft_id: 993, cliente: "Constellation", plataforma: "Brava Star", coord_focal: "AS", doc: "NFSe", num_doc: null, data_doc: "2026-03-05", escopo: "SERVIÇO", faturado_por: "", vl_bruto: 110075.79, total_retido: 6769.66, vl_liquido: 103306.13, vencimento: "2026-04-22", prev_pag: "2026-04-27", status: "Enviar NF", obs: "previa ok" },
  { id: 2155, wo: 3415, draft_id: 1121, cliente: "Modec", plataforma: "FPSO Bacalhau", coord_focal: "MS", doc: "NFSe", num_doc: null, data_doc: null, escopo: "SERVIÇO", faturado_por: null, vl_bruto: null, total_retido: 0, vl_liquido: null, vencimento: null, prev_pag: "2026-05-18", status: "Em andamento", obs: "Aguardando finalizar campanha e relatório final" },
  { id: 2154, wo: 3684, draft_id: null, cliente: "Foresea", plataforma: "Norbe VI", coord_focal: "AJ", doc: "FAT. LOC.", num_doc: null, data_doc: null, escopo: "LOCAÇÃO", faturado_por: null, vl_bruto: 81640.68, total_retido: 0, vl_liquido: 81640.68, vencimento: null, prev_pag: "2026-06-30", status: "Em andamento", obs: "verificar desmob material" },
  { id: 2153, wo: 3664, draft_id: null, cliente: "Foresea", plataforma: "ODN I", coord_focal: "AJ", doc: "FAT. LOC.", num_doc: null, data_doc: null, escopo: "LOCAÇÃO", faturado_por: null, vl_bruto: 72178.59, total_retido: 0, vl_liquido: 72178.59, vencimento: null, prev_pag: "2026-06-30", status: "Em andamento", obs: "verificar desmob material" },
  { id: 2152, wo: 3801, draft_id: 1114, cliente: "Transocean", plataforma: "Deepwater Mykonos", coord_focal: "GR", doc: "NFSe", num_doc: "1751", data_doc: "2026-03-05", escopo: "SERVIÇO", faturado_por: "Macaé", vl_bruto: 1636.17, total_retido: 133.35, vl_liquido: 1502.82, vencimento: "2026-04-22", prev_pag: "2026-04-27", status: "Enviar NF", obs: "Hora extra" },
  { id: 2151, wo: 3688, draft_id: 1117, cliente: "Valaris", plataforma: "DS - 17", coord_focal: "AJ", doc: "FAT. LOC.", num_doc: null, data_doc: null, escopo: "LOCAÇÃO", faturado_por: null, vl_bruto: 400.0, total_retido: 0, vl_liquido: 400.0, vencimento: null, prev_pag: null, status: "Aguardando Resposta do Cliente", obs: "Previa ok - aguardando coord" },
  { id: 2150, wo: 3688, draft_id: 1117, cliente: "Valaris", plataforma: "DS - 17", coord_focal: "AJ", doc: "NFSe", num_doc: null, data_doc: null, escopo: "SERVIÇO", faturado_por: null, vl_bruto: 6835.0, total_retido: 420.35, vl_liquido: 6414.65, vencimento: null, prev_pag: null, status: "Aguardando Resposta do Cliente", obs: "Previa ok - aguardando coord" },
  { id: 2149, wo: 3535, draft_id: 1111, cliente: "Trident", plataforma: "P65", coord_focal: "VR", doc: "NFSe", num_doc: null, data_doc: null, escopo: "SERVIÇO", faturado_por: null, vl_bruto: 50066.4, total_retido: 3079.08, vl_liquido: 46987.32, vencimento: null, prev_pag: null, status: "Aguardando Resposta do Cliente", obs: "André aprovador, pediu para separar DI" },
  { id: 2148, wo: 3800, draft_id: 1113, cliente: "Transocean", plataforma: "Deepwater Corcovado", coord_focal: "GR", doc: "NFSe", num_doc: "1750", data_doc: "2026-03-05", escopo: "SERVIÇO", faturado_por: "Macaé", vl_bruto: 172448.95, total_retido: 14054.59, vl_liquido: 158394.36, vencimento: "2026-04-22", prev_pag: "2026-04-27", status: "Aguardando Pagamento", obs: null },
  { id: 2147, wo: 3800, draft_id: 1113, cliente: "Transocean", plataforma: "Deepwater Corcovado", coord_focal: "GR", doc: "FAT. LOC.", num_doc: "1078", data_doc: "2026-03-05", escopo: "LOCAÇÃO", faturado_por: "Macaé", vl_bruto: 23891.51, total_retido: 0, vl_liquido: 23891.51, vencimento: "2026-04-22", prev_pag: "2026-04-27", status: "Aguardando Pagamento", obs: null },
];

export const MOCK_IMPOSTOS = [
  { id: 1, nome: "COFINS", tipo: "federal", aliquota: 0.03, vigencia_inicio: "2024-01-01", ativo: true },
  { id: 2, nome: "ISS", tipo: "municipal", cidade: "Rio de Janeiro", aliquota: 0.02, vigencia_inicio: "2024-01-01", ativo: true },
  { id: 3, nome: "IRPJ", tipo: "federal", aliquota: 0.015, vigencia_inicio: "2024-01-01", ativo: true },
];

export const MOCK_CLIENTES = [
  { id: 1, cliente: "Transocean", rec_doc: 5, medicao: 5, resp_cli: 30, vencimento: 30, cambio: 0, total_dias: 70, data_limite: 30 },
  { id: 2, cliente: "Constellation", rec_doc: 5, medicao: 5, resp_cli: 30, vencimento: 30, cambio: 0, total_dias: 70, data_limite: 30 },
  { id: 3, cliente: "Modec", rec_doc: 5, medicao: 5, resp_cli: 45, vencimento: 30, cambio: 0, total_dias: 85, data_limite: 45 },
];

export const MOCK_PROJETOS = [
  { id: 1, wo: 3808, cliente: "Constellation", plataforma: "Brava Star", coordenador: "Alexandre S.", tipo_servico: "SERVIÇO", ativo: true },
  { id: 2, wo: 3800, cliente: "Transocean", plataforma: "Deepwater Corcovado", coordenador: "Gustavo R.", tipo_servico: "SERVIÇO", ativo: true },
  { id: 3, wo: 3415, cliente: "Modec", plataforma: "FPSO Bacalhau", coordenador: "Mariana S.", tipo_servico: "SERVIÇO", ativo: true },
];

export const MOCK_DRAFTS = [
  { id: 993, codigo: 993, data_draft: "2026-02-01", descricao: "Brava Star - Campanha", ativo: true },
  { id: 1121, codigo: 1121, data_draft: "2026-03-05", descricao: "FPSO Bacalhau - Inspeção", ativo: true },
  { id: 1114, codigo: 1114, data_draft: "2026-02-12", descricao: "Deepwater Mykonos - Hora extra", ativo: true },
];

export const MOCK_FERIADOS = [
  { id: 1, data: "2026-04-21", nome: "Tiradentes", tipo: "nacional", pais: "Brasil" },
  { id: 2, data: "2026-05-01", nome: "Dia do Trabalho", tipo: "nacional", pais: "Brasil" },
  { id: 3, data: "2026-06-04", nome: "Corpus Christi", tipo: "nacional", pais: "Brasil" },
];
