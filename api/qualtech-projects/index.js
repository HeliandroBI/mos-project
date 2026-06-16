const fetch = require("node-fetch");

const API_BASE = "https://api.qualitechirm.online";
const QT_USER = process.env.QUALTECH_USER;
const QT_PASS = process.env.QUALTECH_PASS;

let _token = null;
let _tokenExpiry = 0;

async function getToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const r = await fetch(`${API_BASE}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `username=${encodeURIComponent(QT_USER)}&password=${encodeURIComponent(QT_PASS)}`,
  });
  if (!r.ok) throw new Error("Auth failed: " + r.status);
  const data = await r.json();
  _token = data.access_token;
  _tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23h
  return _token;
}

async function qtFetch(path, method = "GET", body = null) {
  const token = await getToken();
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${API_BASE}${path}`, opts);
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: r.status, body: json };
}

module.exports = async function (context, req) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: cors, body: "" };
    return;
  }

  try {
    // id vem como query param ou no body
    const id = req.query.id;
    let result;

    if (req.method === "GET") {
      // Listar projetos com dados enriquecidos
      const [projects, clients, platforms, classifications, categories] = await Promise.all([
        qtFetch("/project/project-number/list"),
        qtFetch("/client/list"),
        qtFetch("/platform/list"),
        qtFetch("/project_classification/list"),
        qtFetch("/contract_category/list"),
      ]);

      const clientMap = Object.fromEntries((clients.body || []).map(c => [c.id, c.client_name]));
      const platMap   = Object.fromEntries((platforms.body || []).map(p => [p.id, p.platform_name]));
      const classMap  = Object.fromEntries((classifications.body || []).map(c => [c.id, c.description]));
      const catMap    = Object.fromEntries((categories.body || []).map(c => [c.id, c.description]));

      const enriched = (projects.body || []).map(p => ({
        id: p.id,
        project_number: p.project_number,
        cliente:            clientMap[p.client_id] || null,
        plataforma:         platMap[p.platform_id] || null,
        classificacao:      classMap[p.project_classification_id] || null,
        categoria_contrato: catMap[p.contract_category_id] || null,
        // IDs originais para edição
        client_id: p.client_id,
        platform_id: p.platform_id,
        project_classification_id: p.project_classification_id,
        contract_category_id: p.contract_category_id,
      }));

      result = { status: 200, body: enriched };

    } else if (req.method === "POST") {
      result = await qtFetch("/project/add", "POST", req.body);

    } else if (req.method === "PUT") {
      if (!id) { context.res = { status: 400, headers: cors, body: { error: "id required" } }; return; }
      result = await qtFetch(`/project/update/${id}`, "PUT", req.body);

    } else if (req.method === "DELETE") {
      if (!id) { context.res = { status: 400, headers: cors, body: { error: "id required" } }; return; }
      result = await qtFetch(`/project/delete/project-number/${id}`, "DELETE");
    }

    context.res = { status: result.status, headers: { ...cors, "Content-Type": "application/json" }, body: result.body };
  } catch (err) {
    context.res = { status: 500, headers: cors, body: { error: String(err) } };
  }
};
