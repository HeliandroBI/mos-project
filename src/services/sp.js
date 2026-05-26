import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest, SP_SITE } from "../config/auth";

// Singleton MSAL instance — inicializado uma vez, reutilizado por todas as páginas
let _msalInstance = null;
let _initPromise  = null;

async function getMsal() {
  if (_msalInstance) return _msalInstance;
  if (!_initPromise) {
    _msalInstance = new PublicClientApplication(msalConfig);
    _initPromise  = _msalInstance.initialize();
  }
  await _initPromise;
  return _msalInstance;
}

// Retorna access token — silent primeiro, popup como fallback
export async function getToken() {
  const msal     = await getMsal();
  const accounts = msal.getAllAccounts();

  if (accounts.length === 0) {
    const result = await msal.loginPopup(loginRequest);
    return result.accessToken;
  }

  try {
    const result = await msal.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
    return result.accessToken;
  } catch {
    const result = await msal.acquireTokenPopup({ ...loginRequest, account: accounts[0] });
    return result.accessToken;
  }
}

// Retorna o usuário logado (nome + email)
export async function getCurrentUser() {
  const msal     = await getMsal();
  const accounts = msal.getAllAccounts();
  if (accounts.length === 0) return null;
  return { name: accounts[0].name, email: accounts[0].username };
}

// Fetch genérico contra a REST API do SharePoint
async function spFetch(path) {
  const token = await getToken();
  const res   = await fetch(`${SP_SITE}/_api/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:        "application/json;odata=nometadata",
    },
  });
  if (!res.ok) throw new Error(`SharePoint ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.value ?? json;
}

// Busca todos os itens de uma lista (paginação automática até 5000)
export async function getListItems(listName, select = "") {
  let url = `web/lists/getbytitle('${listName}')/items?$top=5000`;
  if (select) url += `&$select=${select}`;
  return spFetch(url);
}

// Cria item na lista
export async function createListItem(listName, fields) {
  const token = await getToken();
  const res   = await fetch(`${SP_SITE}/_api/web/lists/getbytitle('${listName}')/items`, {
    method:  "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:        "application/json;odata=nometadata",
      "Content-Type": "application/json;odata=nometadata",
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`SP create failed ${res.status}: ${await res.text()}`);
  return res.json();
}

// Atualiza item na lista
export async function updateListItem(listName, itemId, fields) {
  const token = await getToken();
  const res   = await fetch(`${SP_SITE}/_api/web/lists/getbytitle('${listName}')/items(${itemId})`, {
    method:  "MERGE",
    headers: {
      Authorization:  `Bearer ${token}`,
      Accept:         "application/json;odata=nometadata",
      "Content-Type": "application/json;odata=nometadata",
      "IF-MATCH":     "*",
      "X-HTTP-Method": "MERGE",
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`SP update failed ${res.status}: ${await res.text()}`);
}

// Normaliza um item da lista fContasReceber para o formato do app
export function normalizeContaItem(item) {
  const vlBruto   = parseFloat(item.vl_bruto)   || 0;
  const vencimento = item.vencimento ? new Date(item.vencimento) : null;
  const hoje       = new Date();
  const statusText = item.status ?? "";
  const vencido    = vencimento && vencimento < hoje &&
                     !["Pago", "Cancelado", "Free Of Charge"].includes(statusText);

  return {
    // SP identity
    id:               item.ID ?? item.id,

    // Campos de lookup (texto + ID numérico para delegação)
    wo:               item.wo               ?? "",
    cliente:          item.cliente           ?? "",
    cliente_id:       Number(item.cliente_id) || null,
    plataforma:       item.plataforma        ?? "",
    plataforma_id:    Number(item.plataforma_id) || null,
    coord_focal:      item.coord_focal       ?? "",
    escopo:           item.escopo            ?? "",
    escopo_id:        Number(item.escopo_id) || null,
    faturado_por:     item.faturado_por      ?? "",
    faturado_por_id:  Number(item.faturado_por_id) || null,
    status:           statusText,
    status_id:        Number(item.status_id) || null,

    // Campos financeiros
    vl_bruto:         vlBruto,
    vl_liquido:       parseFloat(item.vl_liquido)   || 0,
    cofins_3:         parseFloat(item.cofins_3)      || 0,
    csll_1:           parseFloat(item.csll_1)        || 0,
    inss_11:          parseFloat(item.inss_11)       || 0,
    irpj_15:          parseFloat(item.irpj_15)       || 0,
    pis_065:          parseFloat(item.pis_065)       || 0,
    iss_retido:       parseFloat(item.iss_retido)    || 0,
    total_retido:     parseFloat(item.total_retido)  || 0,
    total_a_pagar:    parseFloat(item.total_a_pagar) || 0,
    exterior_com_iss: Number(item.exterior_com_iss)  || 0,

    // Datas
    data_draft:          item.data_draft          ?? null,
    data_doc:            item.data_doc            ?? null,
    vencimento:          item.vencimento          ?? null,
    data_pgto:           item.data_pgto           ?? null,
    data_inicio:         item.data_inicio         ?? null,
    data_fim:            item.data_fim            ?? null,
    data_envio_cliente:  item.data_envio_cliente  ?? null,
    prev_fat:            item.prev_fat            ?? null,
    prev_pag:            item.prev_pag            ?? null,

    // Aliases para compatibilidade com componentes existentes
    vlBruto,
    data:     item.data_doc   ?? null,
    dataDraft: item.data_draft ?? null,
    dataFim:  item.data_fim   ?? null,
    dataEnvio: item.data_envio_cliente ?? null,
    doc:      item.doc        ?? "Pendente",
    ano:      item.data_doc   ? new Date(item.data_doc).getFullYear() : null,
    vencido,

    // Outros campos
    proposta_comercial: item.proposta_comercial ?? "",
    po_contrato:        item.po_contrato        ?? "",
    draft_codigo:       item.draft_codigo       ?? "",
    obs:                item.obs                ?? "",
    num_doc:            item.num_doc            ?? "",
    id_ticket_req:      item.id_ticket_req      ?? "",
    focal:              item.focal              ?? "",
  };
}
