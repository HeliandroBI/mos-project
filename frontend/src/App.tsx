import Dashboard from "./Dashboard";
import { useState, useEffect, useCallback } from "react";

const API = (process.env.REACT_APP_API_URL || "http://localhost:8000") + "/api";

type Tab = "contas" | "dashboard" | "impostos" | "clientes" | "projetos" | "drafts" | "feriados";

interface ContaReceber {
  id?: number; wo?: number; draft_id?: number; draft_codigo?: number;
  cliente?: string; plataforma?: string; coord_focal?: string; tipo_servico?: string;
  exterior_com_iss?: boolean; proposta_comercial?: string; po_contrato?: string;
  doc?: string; num_doc?: string; data_doc?: string; data_draft?: string;
  escopo?: string; faturado_por?: string; vl_bruto?: number;
  cofins_3?: number; csll_1?: number; inss_11?: number; irpj_15?: number;
  pis_065?: number; iss_retido?: number; total_retido?: number; vl_liquido?: number;
  cofins_76?: number; csll_288?: number; icms_20?: number; irpj_48?: number;
  pis_165?: number; iss_pagar?: number; total_a_pagar?: number;
  status?: string; focal?: string; obs?: string; id_ticket_req?: string;
  data_envio_cliente?: string; data_pgto?: string; vencimento?: string;
  prev_fat?: string; prev_pag?: string; data_inicio?: string; data_fim?: string;
}
interface Imposto { id?: number; nome: string; tipo: string; tipo_documento?: string; tipo_servico?: string; cidade?: string; aliquota: number; vigencia_inicio: string; vigencia_fim?: string; ativo?: boolean; }
interface ClientePrazo { id?: number; cliente: string; rec_doc: number; medicao: number; resp_cli: number; vencimento: number; cambio: number; total_dias?: number; data_limite: number; }
interface Projeto { id?: number; wo: number; cliente?: string; plataforma?: string; coordenador?: string; tipo_servico?: string; ativo?: boolean; }
interface Draft { id?: number; codigo: number; data_draft?: string; descricao?: string; ativo?: boolean; }
interface Feriado { id?: number; data: string; nome: string; tipo: string; estado?: string; municipio?: string; pais: string; }

const apiFetch = {
  get: (url: string) => fetch(`${API}${url}`).then(r => r.json()),
  post: (url: string, data: any) => fetch(`${API}${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  put: (url: string, data: any) => fetch(`${API}${url}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  del: (url: string) => fetch(`${API}${url}`, { method: "DELETE" }).then(r => r.json()),
};

const fmt = {
  brl: (v?: number) => v != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "-",
  pct: (v?: number) => v != null ? `${(v * 100).toFixed(2)}%` : "-",
  date: (v?: string) => v ? new Date(v + "T00:00:00").toLocaleDateString("pt-BR") : "-",
  num: (v?: number) => v != null ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "",
};

const N = {
  bg: "#e8edf2", card: "#edf0f5", shadowD: "#c8cdd6", shadowL: "#ffffff",
  text: "#1e293b", muted: "#64748b", accent: "#1a5ea8",
};
const neo = `5px 5px 12px ${N.shadowD}, -3px -3px 8px ${N.shadowL}`;
const inset = `inset 3px 3px 8px ${N.shadowD}, inset -2px -2px 6px ${N.shadowL}`;

const S: Record<string, React.CSSProperties> = {
  app: { fontFamily: "Inter, Segoe UI, sans-serif", background: N.bg, minHeight: "100vh", fontSize: 13, color: N.text },
  header: { background: N.card, boxShadow: neo, borderRadius: 14, padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, margin: "12px 16px 0" },
  nav: { background: N.card, boxShadow: neo, borderRadius: 10, display: "flex", padding: "4px 8px", overflowX: "auto" as const, gap: 4, margin: "8px 16px" },
  page: { padding: "0 16px 16px" },
  card: { background: N.card, borderRadius: 14, boxShadow: neo, marginBottom: 16, overflow: "hidden" },
  cardHeader: { background: N.bg, borderBottom: `1px solid ${N.shadowD}`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontWeight: 700, color: N.text, fontSize: 13 },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12 },
  th: { background: "transparent", color: N.muted, padding: "8px 10px", textAlign: "left" as const, fontWeight: 700, whiteSpace: "nowrap" as const, borderBottom: `1px solid ${N.shadowD}`, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  td: { padding: "7px 10px", borderBottom: `1px solid ${N.bg}`, verticalAlign: "middle" as const, color: N.text },
  input: { width: "100%", padding: "7px 10px", border: "none", borderRadius: 10, fontSize: 12, boxSizing: "border-box" as const, background: N.bg, boxShadow: inset, color: N.text },
  select: { width: "100%", padding: "7px 10px", border: "none", borderRadius: 10, fontSize: 12, background: N.bg, boxShadow: inset, color: N.text, boxSizing: "border-box" as const },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: N.muted, marginBottom: 4 },
  stat: { background: N.card, borderRadius: 14, padding: "12px 16px", boxShadow: neo, flex: 1 },
  modal: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalBox: { background: N.card, borderRadius: 14, width: "min(900px,95vw)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 50px rgba(0,0,0,.4)" },
  filters: { background: N.card, borderRadius: 14, boxShadow: neo, padding: "12px 16px", marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" as const, alignItems: "flex-end" },
};

const btn = (color?: string): React.CSSProperties => ({ background: color || N.accent, color: "#fff", border: "none", padding: "7px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, boxShadow: `3px 3px 8px ${N.shadowD}, -2px -2px 6px ${N.shadowL}` });
const btnSm = (color?: string): React.CSSProperties => ({ background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: "2px 5px", color: color || N.accent, lineHeight: 1 });
const grid = (cols: number): React.CSSProperties => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 });
const navBtn = (active: boolean): React.CSSProperties => ({ background: active ? N.accent : "transparent", color: active ? "#fff" : N.muted, border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400, whiteSpace: "nowrap" as const, boxShadow: active ? `inset 2px 2px 6px rgba(0,0,0,.2)` : "none", transition: "all .15s" });

const STATUS_COLORS: Record<string, [string, string]> = {
  "PAGO": ["#dcfce7", "#166534"], "Programado": ["#dbeafe", "#1e40af"],
  "Aguardando Pagamento": ["#fef9c3", "#854d0e"], "Em andamento": ["#e0f2fe", "#0c4a6e"],
  "Previsão": ["#f3e8ff", "#6b21a8"], "Enviar NF": ["#ffedd5", "#9a3412"],
};

const Badge = ({ text, doc }: { text: string; doc?: boolean }) => {
  const [bg, color] = doc ? ["#dbeafe", "#1e40af"] : (STATUS_COLORS[text] || ["#f1f5f9", "#475569"]);
  return <span style={{ background: bg, color, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" as const }}>{text}</span>;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label style={S.label}>{label}</label>{children}</div>
);

const Section = ({ title }: { title: string }) => (
  <div style={{ gridColumn: "1/-1", background: "#f1f5f9", borderRadius: 6, padding: "5px 10px", fontWeight: 700, fontSize: 11, color: "#475569", textTransform: "uppercase" as const, marginTop: 4 }}>{title}</div>
);

function calcImpostos(f: ContaReceber): Partial<ContaReceber> {
  const vl = f.vl_bruto || 0;
  const isNFSe = f.doc === "NFSe" || f.doc === "NFSe(ex)";
  const isDanfe = f.doc === "DANFE";
  const isMacae = (f.faturado_por || "").toLowerCase().includes("mac");
  const issRate = isMacae ? 0.02 : 0.05;
  const cofins_3 = isNFSe ? vl * 0.03 : 0;
  const csll_1 = isNFSe ? vl * 0.01 : 0;
  const irpj_15 = isNFSe ? vl * 0.015 : 0;
  const pis_065 = isNFSe ? vl * 0.0065 : 0;
  const iss_retido = isNFSe ? vl * issRate : 0;
  const total_retido = cofins_3 + csll_1 + irpj_15 + pis_065 + iss_retido;
  const vl_liquido = vl - total_retido;
  const cofins_76 = Math.max(vl * 0.076 - cofins_3, 0);
  const csll_288 = Math.max(vl * 0.0288 - csll_1, 0);
  const icms_20 = isDanfe ? vl * 0.2 : 0;
  const irpj_48 = Math.max(vl * 0.048 - irpj_15, 0);
  const pis_165 = Math.max(vl * 0.0165 - pis_065, 0);
  const iss_pagar = isNFSe ? Math.max(vl * issRate - iss_retido, 0) : 0;
  const total_a_pagar = cofins_76 + csll_288 + icms_20 + irpj_48 + pis_165 + iss_pagar;
  const r = (x: number) => +x.toFixed(2);
  return { cofins_3: r(cofins_3), csll_1: r(csll_1), irpj_15: r(irpj_15), pis_065: r(pis_065), iss_retido: r(iss_retido), total_retido: r(total_retido), vl_liquido: r(vl_liquido), cofins_76: r(cofins_76), csll_288: r(csll_288), icms_20: r(icms_20), irpj_48: r(irpj_48), pis_165: r(pis_165), iss_pagar: r(iss_pagar), total_a_pagar: r(total_a_pagar) };
}

// ===== CONTA FORM =====
function ContaForm({ conta, onSave, onClose, drafts, projetos }: { conta: ContaReceber; onSave: (c: ContaReceber) => void; onClose: () => void; drafts: Draft[]; projetos: Projeto[] }) {
  const [form, setForm] = useState<ContaReceber>(conta);

  const handleChange = (k: keyof ContaReceber, v: any) => {
    const updated = { ...form, [k]: v };
    if (["vl_bruto", "doc", "faturado_por"].includes(k as string)) {
      setForm({ ...updated, ...calcImpostos(updated) });
    } else {
      setForm(updated);
    }
  };

  const lookupWO = () => {
    const proj = projetos.find(p => p.wo === form.wo);
    if (proj) setForm(prev => ({ ...prev, cliente: proj.cliente, plataforma: proj.plataforma, coord_focal: proj.coordenador }));
  };

  const nextDraft = drafts[0] ? drafts[0].codigo + 1 : "?";

  return (
    <div style={S.modal} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.modalBox}>
        <div style={{ ...S.cardHeader, background: N.accent }}>
          <span style={{ ...S.cardTitle, color: "#fff" }}>{form.id ? `✏️ Editar #${form.id}` : "➕ Nova Conta a Receber"}</span>
          <button style={btn("#dc2626")} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={grid(4)}>
            <Section title="WO / Projeto" />
            <Field label="WO (Project Number)">
              <div style={{ display: "flex", gap: 4 }}>
                <input type="number" style={S.input} value={form.wo || ""} onChange={e => handleChange("wo", +e.target.value)} placeholder="ex: 3253" />
                <button style={btn("#059669")} onClick={lookupWO}>🔍</button>
              </div>
            </Field>
            <Field label="Cliente"><input style={S.input} value={form.cliente || ""} onChange={e => handleChange("cliente", e.target.value)} /></Field>
            <Field label="Plataforma"><input style={S.input} value={form.plataforma || ""} onChange={e => handleChange("plataforma", e.target.value)} /></Field>
            <Field label="Coord. Focal"><input style={S.input} value={form.coord_focal || ""} onChange={e => handleChange("coord_focal", e.target.value)} /></Field>

            <Section title="Documento / Draft" />
            <Field label={`Draft (próximo: #${nextDraft})`}>
              <select style={S.select} value={form.draft_id || ""} onChange={e => handleChange("draft_id", +e.target.value)}>
                <option value="">Selecione...</option>
                {drafts.map(d => <option key={d.id} value={d.id}>#{d.codigo}{d.data_draft ? ` — ${fmt.date(d.data_draft)}` : ""}</option>)}
              </select>
            </Field>
            <Field label="Data Draft"><input type="date" style={S.input} value={form.data_draft || ""} onChange={e => handleChange("data_draft", e.target.value)} /></Field>
            <Field label="Doc">
              <select style={S.select} value={form.doc || ""} onChange={e => handleChange("doc", e.target.value)}>
                <option value="">—</option>
                {["NFSe", "FAT. LOC.", "DANFE", "NFSe(ex)", "DANFE(ex)", "FAT.LOC.(ex)", "Nota de Débito", "Crédito"].map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Nº Doc"><input style={S.input} value={form.num_doc || ""} onChange={e => handleChange("num_doc", e.target.value)} /></Field>
            <Field label="Data Doc"><input type="date" style={S.input} value={form.data_doc || ""} onChange={e => handleChange("data_doc", e.target.value)} /></Field>
            <Field label="Escopo">
              <select style={S.select} value={form.escopo || ""} onChange={e => handleChange("escopo", e.target.value)}>
                <option value="">—</option>
                {["SERVIÇO", "LOCAÇÃO", "VENDA", "CRÉDITO"].map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Faturado por">
              <select style={S.select} value={form.faturado_por || ""} onChange={e => handleChange("faturado_por", e.target.value)}>
                <option value="">—</option>
                <option>Rio</option><option>Macaé</option>
              </select>
            </Field>
            <Field label="PO/Contrato"><input style={S.input} value={form.po_contrato || ""} onChange={e => handleChange("po_contrato", e.target.value)} /></Field>

            <Section title="Valores e Impostos" />
            <Field label="Valor Bruto (R$)">
              <input type="number" step="0.01" style={{ ...S.input, fontWeight: 700 }} value={form.vl_bruto || ""} onChange={e => handleChange("vl_bruto", +e.target.value)} />
            </Field>
            <Field label="Total Retido"><input readOnly style={{ ...S.input, background: "#f1f5f9", fontWeight: 700, color: "#dc2626" }} value={fmt.num(form.total_retido)} /></Field>
            <Field label="Valor Líquido"><input readOnly style={{ ...S.input, background: "#f1f5f9", fontWeight: 700, color: "#059669" }} value={fmt.num(form.vl_liquido)} /></Field>
            <Field label="Total a Pagar"><input readOnly style={{ ...S.input, background: "#f1f5f9", fontWeight: 700, color: "#f59e0b" }} value={fmt.num(form.total_a_pagar)} /></Field>

            {form.vl_bruto ? (
              <div style={{ gridColumn: "1/-1", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
                  {[["COFINS 3%", form.cofins_3], ["CSLL 1%", form.csll_1], ["IRPJ 1.5%", form.irpj_15], ["PIS 0.65%", form.pis_065], ["ISS Ret.", form.iss_retido], ["COFINS 7.6%", form.cofins_76], ["ICMS 20%", form.icms_20]].map(([l, v]) => (
                    <div key={l as string} style={{ textAlign: "center" as const }}>
                      <div style={{ fontSize: 9, color: "#64748b" }}>{l}</div>
                      <div style={{ fontWeight: 700, color: "#dc2626" }}>{fmt.brl(v as number)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <Section title="Status e Datas" />
            <Field label="Status">
              <select style={S.select} value={form.status || "Programado"} onChange={e => handleChange("status", e.target.value)}>
                {["Programado", "Em andamento", "Aguardando Pagamento", "Aguardando Resposta do Cliente", "Aguardando Documentação", "Aguardando PO", "Enviar NF", "PAGO", "Previsão", "Free Of Charge"].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Focal">
              <select style={S.select} value={form.focal || ""} onChange={e => handleChange("focal", e.target.value)}>
                <option value="">—</option>
                {["VC", "DT", "AS", "VR"].map(f => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Vencimento"><input type="date" style={S.input} value={form.vencimento || ""} onChange={e => handleChange("vencimento", e.target.value)} /></Field>
            <Field label="Prev. Fat."><input type="date" style={S.input} value={form.prev_fat || ""} onChange={e => handleChange("prev_fat", e.target.value)} /></Field>
            <Field label="Prev. Pag."><input type="date" style={S.input} value={form.prev_pag || ""} onChange={e => handleChange("prev_pag", e.target.value)} /></Field>
            <Field label="Data Pagto."><input type="date" style={S.input} value={form.data_pgto || ""} onChange={e => handleChange("data_pgto", e.target.value)} /></Field>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={S.label}>Observações</label>
              <textarea style={{ ...S.input, minHeight: 60 }} value={form.obs || ""} onChange={e => handleChange("obs", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btn("#64748b")} onClick={onClose}>Cancelar</button>
            <button style={btn("#059669")} onClick={() => onSave(form)}>💾 Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== CONTAS PAGE =====
function ContasPage({ drafts, projetos }: { drafts: Draft[]; projetos: Projeto[] }) {
  const [items, setItems] = useState<ContaReceber[]>([]);
  const [total, setTotal] = useState({ total: 0, total_bruto: 0, total_liquido: 0 });
  const [filters, setFilters] = useState<any>({});
  const [editing, setEditing] = useState<ContaReceber | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [delTarget, setDelTarget] = useState<ContaReceber | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
      params.append("limit", "500");
      const r = await fetch(`${API}/contas-receber/?${params}`);
      const data = await r.json();
      if (Array.isArray(data)) {
        setItems(data);
        setTotal({ total: data.length, total_bruto: data.reduce((s: number, x: ContaReceber) => s + (x.vl_bruto || 0), 0), total_liquido: data.reduce((s: number, x: ContaReceber) => s + (x.vl_liquido || 0), 0) });
      } else if (data.items) {
        setItems(data.items); setTotal({ total: data.total, total_bruto: data.total_bruto, total_liquido: data.total_liquido });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const save = async (conta: ContaReceber) => {
    if (conta.id) await apiFetch.put(`/contas-receber/${conta.id}`, conta);
    else await apiFetch.post("/contas-receber/", conta);
    setEditing(null); load();
  };

  const del = async (responsavel: string, motivo: string) => {
    if (!delTarget?.id) return;
    const resumo = `WO ${delTarget.wo} | ${delTarget.cliente} | ${delTarget.plataforma} | ${delTarget.doc} | ${delTarget.status}`;
    await logAndDelete("contas-receber", delTarget.id, resumo, responsavel, motivo);
    setDelTarget(null); load();
  };

  const uploadCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(`${API}/contas-receber/importar-csv`, { method: "POST", body: fd });
    const res = await r.json();
    alert(`Importados: ${res.importados}, Erros: ${res.erros}`); load();
  };

  return (
    <div style={S.page}>
      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {[["Total registros", total.total, "#0f172a"], ["Total Bruto", fmt.brl(total.total_bruto), "#0284c7"], ["Total Líquido", fmt.brl(total.total_liquido), "#059669"], ["Total Retido", fmt.brl(total.total_bruto - total.total_liquido), "#dc2626"]].map(([l, v, c]) => (
          <div key={l as string} style={S.stat}><div style={{ fontSize: 19, fontWeight: 800, color: c as string }}>{v}</div><div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{l}</div></div>
        ))}
      </div>

      {/* Filtros */}
      <div style={S.filters}>
        {[["WO", "wo", 75], ["Cliente", "cliente", 110], ["Plataforma", "plataforma", 110]].map(([lb, k, w]) => (
          <div key={k as string}><label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>{lb}</label>
            <input style={{ ...S.input, width: w as number }} value={filters[k] || ""} onChange={e => setFilters({ ...filters, [k as string]: e.target.value })} /></div>
        ))}
        <div><label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>Status</label>
          <select style={{ ...S.select, width: 160 }} value={filters.status || ""} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Todos</option>
            {["Programado", "Em andamento", "Aguardando Pagamento", "PAGO", "Previsão", "Enviar NF"].map(s => <option key={s}>{s}</option>)}
          </select></div>
        <div><label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>Doc</label>
          <select style={{ ...S.select, width: 100 }} value={filters.doc || ""} onChange={e => setFilters({ ...filters, doc: e.target.value })}>
            <option value="">Todos</option>
            {["NFSe", "FAT. LOC.", "DANFE"].map(s => <option key={s}>{s}</option>)}
          </select></div>
        <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
          <button style={btn()} onClick={load}>🔍 Filtrar</button>
          <button style={btn("#64748b")} onClick={() => setFilters({})}>✕ Limpar</button>
        </div>
      </div>

      {/* Tabela */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>📋 Contas a Receber · {total.total} registros {loading && "⏳"}</span>
          <div style={{ display: "flex", gap: 5 }}>
            <button style={btn("#059669")} onClick={() => setEditing({})}>➕ Novo</button>
            <button style={btn("#6366f1")} onClick={() => window.open(`${API}/contas-receber/modelo-csv/download`)}>⬇ Modelo CSV</button>
            <label style={{ ...btn("#f59e0b"), cursor: "pointer" }}>📤 Importar CSV<input type="file" accept=".csv" style={{ display: "none" }} onChange={uploadCSV} /></label>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead><tr>
              <th style={{ ...S.th, width: 28 }}></th>
              <th style={{ ...S.th, width: 70 }}>Ações</th>
              {["WO", "Draft", "Cliente", "Plataforma", "Doc", "Nº", "Data", "Escopo", "Fat.Por", "Vl. Bruto", "Retido", "Líquido", "A Pagar", "Vencimento", "Prev. Pag", "Status", "Focal"].map(h => <th key={h} style={S.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr><td colSpan={20} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: 40 }}>
                  Nenhum registro. Clique em "➕ Novo" ou "📤 Importar CSV".
                </td></tr>
              )}
              {items.map((row, i) => {
                const isExp = expanded === row.id;
                return [
                  <tr key={row.id} style={{ background: i % 2 === 0 ? N.card : N.bg }}>
                    <td style={S.td}><button onClick={() => setExpanded(isExp ? null : row.id!)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>{isExp ? "▼" : "▶"}</button></td>
                    <td style={S.td}><div style={{ display: "flex", gap: 2 }}>
                      <button style={btnSm(N.accent)} title="Editar" onClick={() => setEditing(row)}>✏️</button>
                      <button style={btnSm("#dc2626")} title="Excluir" onClick={() => setDelTarget(row)}>🗑</button>
                    </div></td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{row.wo || "-"}</td>
                    <td style={S.td}>{row.draft_codigo || row.draft_id || "-"}</td>
                    <td style={S.td}>{row.cliente || "-"}</td>
                    <td style={S.td}>{row.plataforma || "-"}</td>
                    <td style={S.td}><Badge text={row.doc || "-"} doc /></td>
                    <td style={S.td}>{row.num_doc || "-"}</td>
                    <td style={S.td}>{fmt.date(row.data_doc)}</td>
                    <td style={S.td}>{row.escopo || "-"}</td>
                    <td style={S.td}>{row.faturado_por || "-"}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{fmt.brl(row.vl_bruto)}</td>
                    <td style={{ ...S.td, color: "#dc2626" }}>{fmt.brl(row.total_retido)}</td>
                    <td style={{ ...S.td, color: "#059669", fontWeight: 700 }}>{fmt.brl(row.vl_liquido)}</td>
                    <td style={{ ...S.td, color: "#f59e0b" }}>{fmt.brl(row.total_a_pagar)}</td>
                    <td style={S.td}>{fmt.date(row.vencimento)}</td>
                    <td style={S.td}>{fmt.date(row.prev_pag)}</td>
                    <td style={S.td}><Badge text={row.status || "-"} /></td>
                    <td style={S.td}>{row.focal || "-"}</td>
                  </tr>,
                  isExp && <tr key={`exp-${row.id}`}>
                    <td colSpan={20} style={{ background: N.bg, padding: "10px 16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 6, fontSize: 11 }}>
                        {[["COFINS 3%", row.cofins_3], ["CSLL 1%", row.csll_1], ["IRPJ 1.5%", row.irpj_15], ["PIS 0.65%", row.pis_065], ["ISS Ret.", row.iss_retido], ["COFINS 7.6%", row.cofins_76], ["CSLL 2.88%", row.csll_288], ["ICMS 20%", row.icms_20], ["IRPJ 4.8%", row.irpj_48], ["PIS 1.65%", row.pis_165], ["ISS Pagar", row.iss_pagar], ["PO/Contrato", row.po_contrato], ["Prev. Fat.", fmt.date(row.prev_fat)], ["Data Pgto.", fmt.date(row.data_pgto)], ["Obs", row.obs]].map(([l, v]) => (
                          <div key={l as string} style={{ background: N.card, borderRadius: 8, padding: "4px 8px", boxShadow: `2px 2px 5px ${N.shadowD}, -1px -1px 3px ${N.shadowL}` }}>
                            <div style={{ color: N.muted, fontSize: 9, fontWeight: 700 }}>{l}</div>
                            <div style={{ fontWeight: 600, color: N.text }}>{typeof v === "number" ? fmt.brl(v) : (v || "-")}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
      {editing !== null && <ContaForm conta={editing} onSave={save} onClose={() => setEditing(null)} drafts={drafts} projetos={projetos} />}
      {delTarget && (
        <DeleteModal
          info={`WO ${delTarget.wo} | ${delTarget.cliente} | ${delTarget.plataforma} | ${delTarget.doc || "-"} | Status: ${delTarget.status}`}
          onConfirm={del}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}

// ===== GENERIC CRUD =====
function CRUDPage<T extends { id?: number }>({ title, icon, endpoint, columns, emptyItem, renderForm }: {
  title: string; icon: string; endpoint: string;
  columns: { key: string; label: string; render?: (v: any, row: T) => React.ReactNode }[];
  emptyItem: T; renderForm: (form: T, set: (k: keyof T, v: any) => void) => React.ReactNode;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<T>(emptyItem);
  const [delTarget, setDelTarget] = useState<T | null>(null);
  const load = () => apiFetch.get(`/${endpoint}/`).then(data => setItems(Array.isArray(data) ? data : data.items || []));
  useEffect(() => { load(); }, []);
  const setField = (k: keyof T, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const save = async () => {
    if (form.id) await apiFetch.put(`/${endpoint}/${form.id}`, form);
    else await apiFetch.post(`/${endpoint}/`, form);
    setEditing(null); load();
  };
  const del = async (responsavel: string, motivo: string) => {
    if (!delTarget?.id) return;
    const resumo = Object.entries(delTarget as any).filter(([k]) => !["id","criado_em","atualizado_em"].includes(k)).map(([k,v]) => `${k}: ${v}`).join(" | ").slice(0, 300);
    await logAndDelete(endpoint, delTarget.id, resumo, responsavel, motivo);
    setDelTarget(null); load();
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>{icon} {title} ({items.length})</span>
          <button style={btn("#059669")} onClick={() => { setForm({ ...emptyItem }); setEditing({ ...emptyItem }); }}>➕ Novo</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead><tr>
              <th style={{ ...S.th, width: 70 }}>Ações</th>
              {columns.map(c => <th key={c.key} style={S.th}>{c.label}</th>)}
            </tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={columns.length + 1} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: 24 }}>Sem registros</td></tr>}
              {items.map((row, i) => (
                <tr key={row.id || i} style={{ background: i % 2 === 0 ? N.card : N.bg }}>
                  <td style={S.td}><div style={{ display: "flex", gap: 2 }}>
                    <button style={btnSm(N.accent)} title="Editar" onClick={() => { setForm({ ...row }); setEditing(row); }}>✏️</button>
                    <button style={btnSm("#dc2626")} title="Excluir" onClick={() => setDelTarget(row)}>🗑</button>
                  </div></td>
                  {columns.map(c => <td key={c.key} style={S.td}>{c.render ? c.render((row as any)[c.key], row) : String((row as any)[c.key] ?? "-")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editing !== null && (
        <div style={S.modal} onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div style={{ ...S.modalBox, maxWidth: 600 }}>
            <div style={{ ...S.cardHeader, background: N.accent }}>
              <span style={{ ...S.cardTitle, color: "#fff" }}>{form.id ? "✏️ Editar" : "➕ Novo"} — {title}</span>
              <button style={btn("#dc2626")} onClick={() => setEditing(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={grid(2)}>{renderForm(form, setField)}</div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button style={btn("#64748b")} onClick={() => setEditing(null)}>Cancelar</button>
                <button style={btn("#059669")} onClick={save}>💾 Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {delTarget && (
        <DeleteModal
          info={Object.entries(delTarget as any).filter(([k]) => !["id","criado_em","atualizado_em"].includes(k)).slice(0,5).map(([k,v]) => `${k}: ${v}`).join(" | ")}
          onConfirm={del}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}

// ===== DELETE CONFIRM MODAL =====
function DeleteModal({ info, onConfirm, onCancel }: {
  info: string;
  onConfirm: (responsavel: string, motivo: string) => void;
  onCancel: () => void;
}) {
  const [resp, setResp] = useState("");
  const [motivo, setMotivo] = useState("");
  return (
    <div style={S.modal} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ ...S.modalBox, maxWidth: 420 }}>
        <div style={{ ...S.cardHeader, background: "#dc2626" }}>
          <span style={{ ...S.cardTitle, color: "#fff" }}>🗑 Confirmar Exclusão</span>
          <button style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }} onClick={onCancel}>✕</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: N.bg, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: N.muted, boxShadow: `inset 2px 2px 6px ${N.shadowD}` }}>
            {info}
          </div>
          <div>
            <label style={S.label}>Seu nome (responsável) *</label>
            <input style={S.input} placeholder="Ex: João Silva" value={resp} onChange={e => setResp(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Motivo da exclusão</label>
            <input style={S.input} placeholder="Ex: Registro duplicado" value={motivo} onChange={e => setMotivo(e.target.value)} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button style={btn("#64748b")} onClick={onCancel}>Cancelar</button>
            <button style={btn("#dc2626")} disabled={!resp.trim()} onClick={() => onConfirm(resp.trim(), motivo.trim())}>
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function logAndDelete(endpoint: string, id: number, resumo: string, responsavel: string, motivo: string) {
  await apiFetch.post("/setup/audit-log", {
    tabela: endpoint,
    registro_id: id,
    resumo,
    responsavel,
    motivo,
  });
  await apiFetch.del(`/${endpoint}/${id}`);
}

// ===== APP =====
export default function App() {
  const [tab, setTab] = useState<Tab>("contas");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);

  useEffect(() => {
    apiFetch.get("/drafts/").then(d => setDrafts(Array.isArray(d) ? d : [])).catch(() => {});
    apiFetch.get("/projetos/").then(d => setProjetos(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "📊 Dashboard" }, { key: "contas", label: "📋 Contas a Receber" },
    { key: "impostos", label: "⚙️ Impostos" },
    { key: "clientes", label: "👥 Clientes / Prazos" },
    { key: "projetos", label: "🏗 Projetos (WO)" },
    { key: "drafts", label: "📝 Drafts" },
    { key: "feriados", label: "📅 Feriados" },
  ];

  return (
    <div style={S.app}>
      <div style={S.header}>
        <img src="/logo-full.png" alt="Qualitech" style={{ height: 36, objectFit: "contain" }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: N.text }}>MOS — Contas a Receber</div>
          <div style={{ fontSize: 11, color: N.muted }}>Offshore Workboard · Qualtech IRM</div>
        </div>
      </div>
      <div style={S.nav}>
        {tabs.map(t => <button key={t.key} style={navBtn(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {tab === "dashboard" && <Dashboard />}
      {tab === "contas" && <ContasPage drafts={drafts} projetos={projetos} />}

      {tab === "impostos" && <CRUDPage<Imposto> title="Impostos" icon="🧾" endpoint="impostos"
        columns={[{ key: "nome", label: "Imposto" }, { key: "tipo", label: "Tipo", render: v => <Badge text={v === "retido_fonte" ? "Retido" : "A Pagar"} /> }, { key: "tipo_documento", label: "Documento" }, { key: "tipo_servico", label: "Tipo Serviço" }, { key: "cidade", label: "Cidade" }, { key: "aliquota", label: "Alíquota", render: v => <strong style={{ color: "#dc2626" }}>{fmt.pct(v)}</strong> }, { key: "vigencia_inicio", label: "Vigência", render: v => fmt.date(v) }]}
        emptyItem={{ nome: "", tipo: "retido_fonte", aliquota: 0, vigencia_inicio: "2020-01-01", ativo: true }}
        renderForm={(f, set) => (<>
          <Field label="Nome"><input style={S.input} value={f.nome} onChange={e => set("nome", e.target.value)} /></Field>
          <Field label="Tipo"><select style={S.select} value={f.tipo} onChange={e => set("tipo", e.target.value)}><option value="retido_fonte">Retido na Fonte</option><option value="a_pagar">A Pagar</option></select></Field>
          <Field label="Alíquota (ex: 0.03)"><input type="number" step="0.0001" style={S.input} value={f.aliquota} onChange={e => set("aliquota", +e.target.value)} /></Field>
          <Field label="Documento"><select style={S.select} value={f.tipo_documento || ""} onChange={e => set("tipo_documento", e.target.value)}><option value="">Todos</option>{["NFSe", "DANFE", "FAT. LOC."].map(d => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Cidade"><select style={S.select} value={f.cidade || ""} onChange={e => set("cidade", e.target.value)}><option value="">—</option><option>Rio</option><option>Macaé</option></select></Field>
          <Field label="Vigência Início"><input type="date" style={S.input} value={f.vigencia_inicio} onChange={e => set("vigencia_inicio", e.target.value)} /></Field>
        </>)} />}

      {tab === "clientes" && <CRUDPage<ClientePrazo> title="Prazos por Cliente" icon="👥" endpoint="clientes-prazos"
        columns={[{ key: "cliente", label: "Cliente" }, { key: "rec_doc", label: "Rec. Doc", render: v => `${v}d` }, { key: "medicao", label: "Medição", render: v => `${v}d` }, { key: "resp_cli", label: "Resp. Cli", render: v => `${v}d` }, { key: "vencimento", label: "Vencimento", render: v => `${v}d` }, { key: "cambio", label: "Câmbio", render: v => `${v}d` }, { key: "total_dias", label: "Total", render: v => <strong>{v}d</strong> }, { key: "data_limite", label: "Dia Limite", render: v => `dia ${v}` }]}
        emptyItem={{ cliente: "", rec_doc: 5, medicao: 3, resp_cli: 10, vencimento: 30, cambio: 0, data_limite: 30 }}
        renderForm={(f, set) => (<>
          <Field label="Cliente"><input style={S.input} value={f.cliente} onChange={e => set("cliente", e.target.value)} /></Field>
          {(["rec_doc", "medicao", "resp_cli", "vencimento", "cambio", "data_limite"] as const).map(k => (
            <Field key={k} label={k}><input type="number" style={S.input} value={f[k]} onChange={e => set(k, +e.target.value)} /></Field>
          ))}
        </>)} />}

      {tab === "projetos" && <CRUDPage<Projeto> title="Projetos / WO" icon="🏗" endpoint="projetos"
        columns={[{ key: "wo", label: "WO", render: v => <strong>#{v}</strong> }, { key: "cliente", label: "Cliente" }, { key: "plataforma", label: "Plataforma" }, { key: "coordenador", label: "Coordenador" }, { key: "tipo_servico", label: "Tipo Serviço" }, { key: "ativo", label: "Ativo", render: v => v ? "✅" : "❌" }]}
        emptyItem={{ wo: 0, cliente: "", plataforma: "", coordenador: "", tipo_servico: "", ativo: true }}
        renderForm={(f, set) => (<>
          <Field label="WO"><input type="number" style={S.input} value={f.wo || ""} onChange={e => set("wo", +e.target.value)} /></Field>
          <Field label="Cliente"><input style={S.input} value={f.cliente || ""} onChange={e => set("cliente", e.target.value)} /></Field>
          <Field label="Plataforma"><input style={S.input} value={f.plataforma || ""} onChange={e => set("plataforma", e.target.value)} /></Field>
          <Field label="Coordenador"><input style={S.input} value={f.coordenador || ""} onChange={e => set("coordenador", e.target.value)} /></Field>
          <Field label="Tipo Serviço"><select style={S.select} value={f.tipo_servico || ""} onChange={e => set("tipo_servico", e.target.value)}><option value="">—</option>{["SERVIÇO", "LOCAÇÃO", "CONTRATO", "VENDA"].map(d => <option key={d}>{d}</option>)}</select></Field>
        </>)} />}

      {tab === "drafts" && <CRUDPage<Draft> title="Drafts" icon="📝" endpoint="drafts"
        columns={[{ key: "codigo", label: "Código", render: v => <strong>#{v}</strong> }, { key: "data_draft", label: "Data", render: v => fmt.date(v) }, { key: "descricao", label: "Descrição" }, { key: "ativo", label: "Ativo", render: v => v ? "✅" : "❌" }]}
        emptyItem={{ codigo: 0, data_draft: "", descricao: "", ativo: true }}
        renderForm={(f, set) => (<>
          <Field label="Código Draft"><input type="number" style={S.input} value={f.codigo || ""} onChange={e => set("codigo", +e.target.value)} /></Field>
          <Field label="Data Draft"><input type="date" style={S.input} value={f.data_draft || ""} onChange={e => set("data_draft", e.target.value)} /></Field>
          <div style={{ gridColumn: "1/-1" }}><Field label="Descrição (opcional)"><input style={S.input} value={f.descricao || ""} onChange={e => set("descricao", e.target.value)} /></Field></div>
        </>)} />}

      {tab === "feriados" && <CRUDPage<Feriado> title="Feriados" icon="📅" endpoint="feriados"
        columns={[{ key: "data", label: "Data", render: v => fmt.date(v) }, { key: "nome", label: "Nome" }, { key: "tipo", label: "Tipo", render: v => <Badge text={v} /> }, { key: "estado", label: "Estado" }, { key: "municipio", label: "Município" }, { key: "pais", label: "País" }]}
        emptyItem={{ data: "", nome: "", tipo: "nacional", pais: "BR" }}
        renderForm={(f, set) => (<>
          <Field label="Data"><input type="date" style={S.input} value={f.data} onChange={e => set("data", e.target.value)} /></Field>
          <Field label="Nome"><input style={S.input} value={f.nome} onChange={e => set("nome", e.target.value)} /></Field>
          <Field label="Tipo"><select style={S.select} value={f.tipo} onChange={e => set("tipo", e.target.value)}><option value="nacional">Nacional</option><option value="estadual">Estadual</option><option value="municipal">Municipal</option></select></Field>
          <Field label="País"><input style={S.input} value={f.pais} onChange={e => set("pais", e.target.value)} /></Field>
          <Field label="Estado (UF)"><input style={S.input} maxLength={2} value={f.estado || ""} onChange={e => set("estado", e.target.value.toUpperCase())} /></Field>
          <Field label="Município"><input style={S.input} value={f.municipio || ""} onChange={e => set("municipio", e.target.value)} /></Field>
        </>)} />}
    </div>
  );
}
