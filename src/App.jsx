import { useState, useEffect, useRef, useCallback } from "react";
import * as Chart from "chart.js";
import { DataProvider, useData } from "./DataContext";

Chart.Chart.register(
  Chart.CategoryScale, Chart.LinearScale, Chart.BarElement, Chart.LineElement,
  Chart.PointElement, Chart.ArcElement, Chart.Title, Chart.Tooltip, Chart.Legend,
  Chart.Filler
);

// Cores por status — mapeadas pelo texto, fallback para cinza
const STATUS_COLOR_MAP = {
  "pago":                     "#10b981",
  "cancelado":                "#f87171",
  "free of charge":           "#94a3b8",
  "aguardando pagamento":     "#60a5fa",
  "faturado":                 "#34d399",
  "a faturar":                "#f59e0b",
  "em andamento":             "#a78bfa",
  "gerência":                 "#fb923c",
  "enviar nf":                "#e879f9",
  "aguardando po":            "#38bdf8",
  "aguardando ajuste da po":  "#fbbf24",
  "aguardando documentação":  "#c084fc",
  "aguardando relatório":     "#67e8f9",
  "aguardando inf. interna":  "#86efac",
  "aguardando resposta do cliente": "#fdba74",
  "devedores incobráveis":    "#dc2626",
  "a começar":                "#94a3b8",
};
const statusColor = (s) => STATUS_COLOR_MAP[(s ?? "").toLowerCase()] ?? "#94a3b8";

const PAGES = [
  { id: "list",        label: "Contas a Receber",  icon: "📋" },
  { id: "kanban",      label: "Kanban",             icon: "🗂️" },
  { id: "status",      label: "Status",             icon: "📊" },
  { id: "faturar",     label: "A Faturar",          icon: "💰" },
  { id: "documentacao",label: "Documentação",       icon: "📄" },
  { id: "resposta",    label: "Resp. Cliente",      icon: "💬" },
  { id: "mensal",      label: "Faturamento Mensal", icon: "📅" },
  { id: "cliente",     label: "Clientes",           icon: "🏢" },
];

// ── Formatação ────────────────────────────────────────────────────────────────
const fmt     = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

// ── Componentes de gráfico ────────────────────────────────────────────────────
function BarChart({ labels, datasets, horizontal = false, height = 250 }) {
  const ref = useRef(); const chartRef = useRef();
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();
    if (!ref.current) return;
    chartRef.current = new Chart.Chart(ref.current, {
      type: "bar", data: { labels, datasets },
      options: {
        indexAxis: horizontal ? "y" : "x", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: datasets.length > 1, labels: { color: "#64748b", font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: "#94a3b8", font: { size: 11 } }, grid: { color: "#f1f5f9" } },
          y: { ticks: { color: "#94a3b8", font: { size: 11 } }, grid: { color: "#f1f5f9" } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [JSON.stringify(labels), JSON.stringify(datasets), horizontal]);
  return <canvas ref={ref} style={{ height }} />;
}

function DonutChart({ labels, data, colors, height = 220 }) {
  const ref = useRef(); const chartRef = useRef();
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();
    if (!ref.current) return;
    chartRef.current = new Chart.Chart(ref.current, {
      type: "doughnut",
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "65%", plugins: { legend: { position: "bottom", labels: { color: "#64748b", font: { size: 11 }, padding: 12 } } } },
    });
    return () => chartRef.current?.destroy();
  }, [JSON.stringify(labels), JSON.stringify(data), JSON.stringify(colors)]);
  return <canvas ref={ref} style={{ height }} />;
}

function LineChart({ labels, datasets, height = 280 }) {
  const ref = useRef(); const chartRef = useRef();
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();
    if (!ref.current) return;
    chartRef.current = new Chart.Chart(ref.current, {
      type: "line", data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#64748b", font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: "#94a3b8", font: { size: 11 } }, grid: { color: "#f1f5f9" } },
          y: { ticks: { color: "#94a3b8", font: { size: 11 } }, grid: { color: "#f1f5f9" } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [JSON.stringify(labels), JSON.stringify(datasets)]);
  return <canvas ref={ref} style={{ height }} />;
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 28, minWidth: 480, maxWidth: 700, width: "90%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1e293b" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 2000, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: t.type === "error" ? "#fef2f2" : "#f0fdf4", border: `1px solid ${t.type === "error" ? "#fca5a5" : "#86efac"}`, borderRadius: 8, padding: "10px 16px", fontSize: 13, color: t.type === "error" ? "#dc2626" : "#16a34a", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function Card({ title, value, sub, color = "#6366f1" }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "18px 22px", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// Aviso de delegação — aparece em filtros de texto não-delegáveis
function DelegationWarning({ show }) {
  if (!show) return null;
  return (
    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#92400e", display: "inline-flex", alignItems: "center", gap: 4 }}>
      ⚠ Filtro nos primeiros 2.000 registros
    </div>
  );
}

// ── Tela de loading / erro ────────────────────────────────────────────────────
function LoadingScreen({ msg }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", gap: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 18, color: "#6366f1", letterSpacing: "-0.02em" }}>● CONTAS A RECEBER</div>
      <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 13, color: "#94a3b8" }}>{msg}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorScreen({ msg }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", gap: 12 }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#dc2626" }}>Erro ao conectar ao SharePoint</div>
      <div style={{ fontSize: 13, color: "#94a3b8", maxWidth: 480, textAlign: "center" }}>{msg}</div>
      <div style={{ fontSize: 12, color: "#64748b", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 20px", maxWidth: 480 }}>
        Verifique se o <strong>CLIENT_ID</strong> e <strong>TENANT_ID</strong> em <code>src/config/auth.js</code> estão preenchidos corretamente.
      </div>
      <button onClick={() => window.location.reload()} style={{ padding: "8px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
        Tentar novamente
      </button>
    </div>
  );
}

// ── Páginas ───────────────────────────────────────────────────────────────────
function ListPage({ addToast }) {
  const { contas: data, setContas: setData, updateConta, addConta, statusList, clienteList, plataformaList, escopoList, empresaList } = useData();

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState(0);
  const [filterPlat,   setFilterPlat]   = useState("");
  const [selected,     setSelected]     = useState([]);
  const [editing,      setEditing]      = useState(null);
  const [editForm,     setEditForm]     = useState({});
  const [showAdd,      setShowAdd]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [sortCol,      setSortCol]      = useState("data_doc");
  const [sortDir,      setSortDir]      = useState("desc");
  const [newRow,       setNewRow]       = useState({ wo: "", cliente: "", plataforma: "", status_id: "", faturado_por_id: "", escopo_id: "", vl_bruto: "", data_doc: "", data_draft: "", vencimento: "" });

  const textSearch = search.toLowerCase();
  // Aviso: busca de texto é não-delegável (SP limita a 2000 registros)
  const showDelegationWarn = search.length > 0;

  const filtered = data.filter(r => {
    const matchText = !textSearch ||
      r.cliente.toLowerCase().includes(textSearch) ||
      r.wo.toLowerCase().includes(textSearch) ||
      r.plataforma.toLowerCase().includes(textSearch);
    const matchStatus = !filterStatus || r.status_id === filterStatus;
    const matchPlat   = !filterPlat   || r.plataforma === filterPlat;
    return matchText && matchStatus && matchPlat;
  }).sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll    = () => setSelected(s => s.length === filtered.length ? [] : filtered.map(r => r.id));

  const startEdit = (row) => { setEditing(row.id); setEditForm({ ...row }); };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateConta(editing, {
        status_id:       editForm.status_id,
        status:          editForm.status,
        vl_bruto:        parseFloat(editForm.vl_bruto) || 0,
        vencimento:      editForm.vencimento,
        obs:             editForm.obs,
        data_pgto:       editForm.data_pgto,
        faturado_por_id: editForm.faturado_por_id,
      });
      setEditing(null);
      addToast("Registro atualizado!");
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const addRow = async () => {
    setSaving(true);
    try {
      await addConta({ ...newRow, vl_bruto: parseFloat(newRow.vl_bruto) || 0 });
      setShowAdd(false);
      addToast("Registro adicionado!");
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const inp = { padding: "4px 8px", borderRadius: 5, border: "1px solid #e2e8f0", fontSize: 12, width: "100%", boxSizing: "border-box" };
  const th  = (col) => ({ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", whiteSpace: "nowrap", background: sortCol === col ? "#f8fafc" : "transparent", userSelect: "none" });
  const td  = { padding: "9px 12px", fontSize: 13, color: "#334155", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, WO, plataforma..." style={{ ...inp, width: 260 }} />
        {/* Filtro por status usa ID numérico → delegável */}
        <select value={filterStatus} onChange={e => setFilterStatus(Number(e.target.value))} style={{ ...inp, width: 170 }}>
          <option value={0}>Todos os status</option>
          {statusList.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {/* Filtro por plataforma usa texto → não-delegável, mas aceitável */}
        <select value={filterPlat} onChange={e => setFilterPlat(e.target.value)} style={{ ...inp, width: 180 }}>
          <option value="">Todas plataformas</option>
          {plataformaList.map(p => <option key={p}>{p}</option>)}
        </select>
        <DelegationWarning show={showDelegationWarn} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => setShowAdd(true)} style={{ padding: "6px 14px", background: "#6366f1", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>+ Novo</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <Card title="Total Registros" value={filtered.length} color="#6366f1" />
        <Card title="Valor Total"     value={fmt(filtered.reduce((s, r) => s + r.vlBruto, 0))} color="#10b981" />
        <Card title="Vencidos"        value={filtered.filter(r => r.vencido).length} color="#f87171" />
        <Card title="Pagos"           value={filtered.filter(r => (r.status ?? "").toLowerCase() === "pago").length} color="#34d399" />
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ ...th(""), width: 36 }}><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
              {[["wo","WO"],["cliente","Cliente"],["plataforma","Plataforma"],["data_doc","Data Doc"],["vencimento","Vencimento"],["status","Status"],["vl_bruto","Valor Bruto"],["vl_liquido","Valor Líq."],["faturado_por","Fat. Por"]].map(([col, lbl]) => (
                <th key={col} style={th(col)} onClick={() => toggleSort(col)}>{lbl} {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
              ))}
              <th style={th("")}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} style={{ background: selected.includes(row.id) ? "#f0f9ff" : row.vencido ? "#fff8f8" : "#fff" }}>
                <td style={td}><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                {editing === row.id ? (
                  <>
                    <td style={td} colSpan={6}><em style={{ color: "#94a3b8", fontSize: 12 }}>Editando…</em></td>
                    <td style={td}>
                      <select value={editForm.status_id ?? ""} onChange={e => {
                        const found = statusList.find(s => s.id === Number(e.target.value));
                        setEditForm(f => ({ ...f, status_id: Number(e.target.value), status: found?.label ?? "" }));
                      }} style={inp}>
                        {statusList.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </td>
                    <td style={td}><input type="number" value={editForm.vl_bruto ?? ""} onChange={e => setEditForm(f => ({ ...f, vl_bruto: e.target.value }))} style={inp} /></td>
                    <td style={td}><input type="number" value={editForm.vl_liquido ?? ""} onChange={e => setEditForm(f => ({ ...f, vl_liquido: e.target.value }))} style={inp} /></td>
                    <td style={td}>
                      <select value={editForm.faturado_por_id ?? ""} onChange={e => setEditForm(f => ({ ...f, faturado_por_id: Number(e.target.value) }))} style={inp}>
                        {empresaList.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                      </select>
                    </td>
                    <td style={td}>
                      <button onClick={saveEdit} disabled={saving} style={{ padding: "3px 10px", background: "#10b981", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, marginRight: 4 }}>✓</button>
                      <button onClick={() => setEditing(null)} style={{ padding: "3px 10px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>✕</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ ...td, color: "#6366f1", fontFamily: "monospace", fontSize: 11 }}>{row.wo}</td>
                    <td style={{ ...td, fontWeight: 500 }}>{row.cliente}</td>
                    <td style={td}>{row.plataforma}</td>
                    <td style={td}>{fmtDate(row.data_doc)}</td>
                    <td style={{ ...td, color: row.vencido ? "#dc2626" : td.color, fontWeight: row.vencido ? 600 : 400 }}>{fmtDate(row.vencimento)}</td>
                    <td style={td}>
                      <span style={{ background: statusColor(row.status) + "22", color: statusColor(row.status), padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ ...td, fontFamily: "monospace" }}>{fmt(row.vl_bruto)}</td>
                    <td style={{ ...td, fontFamily: "monospace" }}>{fmt(row.vl_liquido)}</td>
                    <td style={td}>{row.faturado_por}</td>
                    <td style={td}><button onClick={() => startEdit(row)} style={{ padding: "3px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>✏️</button></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 14 }}>Nenhum registro encontrado</div>}
      </div>

      {showAdd && (
        <Modal title="Novo Registro" onClose={() => setShowAdd(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>WO</label><input value={newRow.wo} onChange={e => setNewRow(f => ({ ...f, wo: e.target.value }))} style={inp} /></div>
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Cliente</label>
              <select value={newRow.cliente_id ?? ""} onChange={e => {
                const c = clienteList.find(x => x === e.target.value);
                setNewRow(f => ({ ...f, cliente: c ?? "", cliente_id: e.target.value }));
              }} style={inp}>
                <option value="">Selecione...</option>
                {clienteList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Plataforma</label>
              <select value={newRow.plataforma ?? ""} onChange={e => setNewRow(f => ({ ...f, plataforma: e.target.value }))} style={inp}>
                <option value="">Selecione...</option>
                {plataformaList.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Status</label>
              <select value={newRow.status_id ?? ""} onChange={e => {
                const s = statusList.find(x => x.id === Number(e.target.value));
                setNewRow(f => ({ ...f, status_id: Number(e.target.value), status: s?.label ?? "" }));
              }} style={inp}>
                <option value="">Selecione...</option>
                {statusList.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Escopo</label>
              <select value={newRow.escopo_id ?? ""} onChange={e => {
                const s = escopoList.find(x => x.id === Number(e.target.value));
                setNewRow(f => ({ ...f, escopo_id: Number(e.target.value), escopo: s?.label ?? "" }));
              }} style={inp}>
                <option value="">Selecione...</option>
                {escopoList.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Faturado Por</label>
              <select value={newRow.faturado_por_id ?? ""} onChange={e => {
                const s = empresaList.find(x => x.id === Number(e.target.value));
                setNewRow(f => ({ ...f, faturado_por_id: Number(e.target.value), faturado_por: s?.label ?? "" }));
              }} style={inp}>
                <option value="">Selecione...</option>
                {empresaList.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Valor Bruto</label><input type="number" value={newRow.vl_bruto} onChange={e => setNewRow(f => ({ ...f, vl_bruto: e.target.value }))} style={inp} /></div>
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Data Doc.</label><input type="date" value={newRow.data_doc} onChange={e => setNewRow(f => ({ ...f, data_doc: e.target.value }))} style={inp} /></div>
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Data Draft</label><input type="date" value={newRow.data_draft} onChange={e => setNewRow(f => ({ ...f, data_draft: e.target.value }))} style={inp} /></div>
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Vencimento</label><input type="date" value={newRow.vencimento} onChange={e => setNewRow(f => ({ ...f, vencimento: e.target.value }))} style={inp} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: "8px 20px", background: "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            <button onClick={addRow} disabled={saving} style={{ padding: "8px 20px", background: "#6366f1", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {saving ? "Salvando..." : "Adicionar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function KanbanPage({ addToast }) {
  const { contas: data, statusList, updateConta } = useData();
  const [dragging, setDragging] = useState(null);
  const [over,     setOver]     = useState(null);

  const onDrop = async (statusId, statusLabel) => {
    if (dragging === null) return;
    try {
      await updateConta(dragging, { status_id: statusId, status: statusLabel });
      addToast(`Status → "${statusLabel}"`);
    } catch (e) {
      addToast(e.message, "error");
    }
    setDragging(null); setOver(null);
  };

  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
      {statusList.map(({ id, label }) => {
        const col    = data.filter(r => r.status_id === id);
        const isOver = over === id;
        return (
          <div key={id} onDragOver={e => { e.preventDefault(); setOver(id); }} onDrop={() => onDrop(id, label)}
            style={{ minWidth: 210, flex: "0 0 210px", background: isOver ? "#f0f4ff" : "#f8fafc", border: `2px solid ${isOver ? "#6366f1" : "#e2e8f0"}`, borderRadius: 10, padding: 12, transition: "all 0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor(label), display: "inline-block" }} />
              <span style={{ fontWeight: 700, fontSize: 12, color: "#334155" }}>{label}</span>
              <span style={{ marginLeft: "auto", background: "#e2e8f0", color: "#64748b", borderRadius: 20, padding: "1px 8px", fontSize: 11 }}>{col.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {col.map(row => (
                <div key={row.id} draggable onDragStart={() => setDragging(row.id)}
                  style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", cursor: "grab", opacity: dragging === row.id ? 0.5 : 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "#1e293b", marginBottom: 4 }}>{row.cliente}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontFamily: "monospace" }}>{row.wo}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6366f1" }}>{fmt(row.vlBruto)}</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>{row.plataforma}</span>
                  </div>
                  {row.vencido && <div style={{ marginTop: 6, fontSize: 10, color: "#dc2626", fontWeight: 600 }}>⚠ Vencido</div>}
                </div>
              ))}
              {col.length === 0 && <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: 12, padding: "20px 0" }}>Arraste aqui</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusPage() {
  const { contas: data, statusList } = useData();
  const byStatus = statusList.map(({ id, label }) => ({
    label, count: data.filter(r => r.status_id === id).length,
    value: data.filter(r => r.status_id === id).reduce((a, b) => a + b.vlBruto, 0),
  }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Registros por Status</h3>
        <DonutChart labels={byStatus.map(s => s.label)} data={byStatus.map(s => s.count)} colors={byStatus.map(s => statusColor(s.label))} />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Valor por Status</h3>
        <BarChart labels={byStatus.map(s => s.label)} datasets={[{ label: "Valor (R$)", data: byStatus.map(s => s.value), backgroundColor: byStatus.map(s => statusColor(s.label) + "cc") }]} />
      </div>
      <div style={{ gridColumn: "1/-1", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f8fafc" }}>{["Status","Qtd","Valor Total","% do Total"].map(h => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
          <tbody>{byStatus.map(row => (
            <tr key={row.label} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "10px 16px" }}><span style={{ background: statusColor(row.label) + "22", color: statusColor(row.label), padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{row.label}</span></td>
              <td style={{ padding: "10px 16px", fontSize: 13 }}>{row.count}</td>
              <td style={{ padding: "10px 16px", fontSize: 13, fontFamily: "monospace" }}>{fmt(row.value)}</td>
              <td style={{ padding: "10px 16px", fontSize: 13 }}>{data.length ? ((row.count / data.length) * 100).toFixed(1) : 0}%</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function FaturarPage() {
  const { contas: data, plataformaList } = useData();
  const NFAT = ["Pago","Cancelado","Free Of Charge"];
  const pending = data.filter(r => !NFAT.includes(r.status));
  const overdue = pending.filter(r => r.vencido);
  const byPlat  = plataformaList.map(p => ({ p, v: pending.filter(r => r.plataforma === p).reduce((a, b) => a + b.vlBruto, 0) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <Card title="A Faturar"     value={pending.length} sub="Registros pendentes" color="#f59e0b" />
        <Card title="Valor Pendente" value={fmt(pending.reduce((a, b) => a + b.vlBruto, 0))} color="#6366f1" />
        <Card title="Em Atraso"     value={overdue.length} sub={fmt(overdue.reduce((a, b) => a + b.vlBruto, 0))} color="#f87171" />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Por Plataforma</h3>
        <BarChart labels={byPlat.map(x => x.p)} datasets={[{ label: "Valor", data: byPlat.map(x => x.v), backgroundColor: "#6366f1aa" }]} horizontal />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Distribuição Status</h3>
        <DonutChart
          labels={[...new Set(pending.map(r => r.status))]}
          data={[...new Set(pending.map(r => r.status))].map(s => pending.filter(r => r.status === s).length)}
          colors={[...new Set(pending.map(r => r.status))].map(s => statusColor(s))}
        />
      </div>
    </div>
  );
}

function DocPage() {
  const { contas: data, clienteList } = useData();
  const ok   = data.filter(r => r.doc === "OK");
  const pend = data.filter(r => r.doc !== "OK");
  const byClient = clienteList.map(c => ({ c, ok: data.filter(r => r.cliente === c && r.doc === "OK").length, pend: data.filter(r => r.cliente === c && r.doc !== "OK").length })).filter(x => x.ok + x.pend > 0).sort((a, b) => b.pend - a.pend).slice(0, 15);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <Card title="Documentação OK" value={ok.length} sub={`${data.length ? ((ok.length/data.length)*100).toFixed(0) : 0}% do total`} color="#10b981" />
        <Card title="Pendente"        value={pend.length} sub={fmt(pend.reduce((a,b) => a+b.vlBruto,0))} color="#f59e0b" />
        <Card title="Taxa Conclusão"  value={`${data.length ? ((ok.length/data.length)*100).toFixed(1) : 0}%`} color="#6366f1" />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Status Documentação</h3>
        <DonutChart labels={["OK","Pendente"]} data={[ok.length, pend.length]} colors={["#10b981","#f59e0b"]} />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Por Cliente (top 15)</h3>
        <BarChart labels={byClient.map(x => x.c)} datasets={[{ label: "OK", data: byClient.map(x => x.ok), backgroundColor: "#10b98188" }, { label: "Pendente", data: byClient.map(x => x.pend), backgroundColor: "#f59e0b88" }]} horizontal />
      </div>
    </div>
  );
}

function RespostaPage() {
  const { contas: data, statusList } = useData();
  const RESP_STATUS = ["Aguardando Pagamento","Aguardando Resposta do Cliente","Em andamento"];
  const relevant = data.filter(r => RESP_STATUS.includes(r.status));
  const byStatus = RESP_STATUS.map(s => ({ s, count: relevant.filter(r => r.status === s).length }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: `repeat(${RESP_STATUS.length},1fr)`, gap: 12 }}>
        {byStatus.map(({ s, count }) => <Card key={s} title={s} value={count} color={statusColor(s)} />)}
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Distribuição</h3>
        <DonutChart labels={byStatus.map(x => x.s)} data={byStatus.map(x => x.count)} colors={byStatus.map(x => statusColor(x.s))} />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, overflowY: "auto", maxHeight: 320 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Registros pendentes</h3>
        {relevant.sort((a,b) => (a.vencimento??'').localeCompare(b.vencimento??'')).map(r => (
          <div key={r.id} style={{ borderBottom: "1px solid #f1f5f9", padding: "8px 0", fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: "#1e293b" }}>{r.wo}</span> — {r.cliente} — <span style={{ color: statusColor(r.status) }}>{r.status}</span>
            {r.vencimento && <span style={{ color: "#94a3b8", marginLeft: 8 }}>Venc. {fmtDate(r.vencimento)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MensalPage() {
  const { contas: data } = useData();
  const months  = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const years   = [...new Set(data.map(r => r.ano).filter(Boolean))].sort();
  const getVal  = (y,m) => data.filter(r => { const d = r.data_doc ? new Date(r.data_doc + "T00:00:00") : null; return d && d.getFullYear()===y && d.getMonth()===m; }).reduce((a,b) => a+b.vlBruto, 0);
  const getCnt  = (y,m) => data.filter(r => { const d = r.data_doc ? new Date(r.data_doc + "T00:00:00") : null; return d && d.getFullYear()===y && d.getMonth()===m; }).length;
  const COLORS  = ["#6366f1","#10b981","#f59e0b","#f87171","#60a5fa"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {years.slice(-2).map((y,i) => <Card key={y} title={`Total ${y}`} value={fmt(data.filter(r => r.ano===y).reduce((a,b)=>a+b.vlBruto,0))} color={COLORS[i]} />)}
        <Card title="Ticket Médio" value={fmt(data.length ? data.reduce((a,b)=>a+b.vlBruto,0)/data.length : 0)} color="#f59e0b" />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Valor Mensal por Ano</h3>
        <LineChart labels={months} datasets={years.slice(-3).map((y,i) => ({ label: String(y), data: months.map((_,m) => getVal(y,m)), borderColor: COLORS[i], backgroundColor: COLORS[i]+"11", tension: 0.4, fill: true }))} />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Volume de Registros por Mês</h3>
        <BarChart labels={months} datasets={years.slice(-3).map((y,i) => ({ label: String(y), data: months.map((_,m) => getCnt(y,m)), backgroundColor: COLORS[i]+"aa" }))} />
      </div>
    </div>
  );
}

function ClientePage() {
  const { contas: data, clienteList } = useData();
  const byClient = clienteList.map(c => ({
    c,
    count:    data.filter(r => r.cliente === c).length,
    value:    data.filter(r => r.cliente === c).reduce((a,b) => a+b.vlBruto, 0),
    liquido:  data.filter(r => r.cliente === c).reduce((a,b) => a+b.vl_liquido, 0),
    vencido:  data.filter(r => r.cliente === c && r.vencido).length,
  })).filter(x => x.count > 0).sort((a,b) => b.value - a.value);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Valor Bruto por Cliente</h3>
        <BarChart labels={byClient.slice(0,15).map(x => x.c)} datasets={[{ label: "Valor Total", data: byClient.slice(0,15).map(x => x.value), backgroundColor: "#6366f1aa" }]} horizontal />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Registros por Cliente</h3>
        <DonutChart labels={byClient.slice(0,12).map(x => x.c)} data={byClient.slice(0,12).map(x => x.count)} colors={byClient.slice(0,12).map((_,i) => `hsl(${(i*30)%360},65%,58%)`)} />
      </div>
      <div style={{ gridColumn: "1/-1", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f8fafc" }}>{["Cliente","Registros","Valor Bruto","Valor Líq.","Vencidos"].map(h => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
          <tbody>{byClient.map(row => (
            <tr key={row.c} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "10px 16px", fontWeight: 600, fontSize: 13 }}>{row.c}</td>
              <td style={{ padding: "10px 16px", fontSize: 13 }}>{row.count}</td>
              <td style={{ padding: "10px 16px", fontSize: 13, fontFamily: "monospace" }}>{fmt(row.value)}</td>
              <td style={{ padding: "10px 16px", fontSize: 13, fontFamily: "monospace", color: "#10b981" }}>{fmt(row.liquido)}</td>
              <td style={{ padding: "10px 16px" }}>{row.vencido > 0 ? <span style={{ background: "#fef2f2", color: "#dc2626", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{row.vencido}</span> : <span style={{ color: "#94a3b8" }}>—</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── Shell principal (dentro do DataProvider) ──────────────────────────────────
function AppShell() {
  const { loading, loadingMsg, error, user, contas } = useData();
  const [page,   setPage]   = useState("list");
  const [toasts, setToasts] = useState([]);
  const [dark,   setDark]   = useState(false);

  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  if (loading) return <LoadingScreen msg={loadingMsg} />;
  if (error)   return <ErrorScreen  msg={error} />;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: dark ? "#0f172a" : "#f8fafc", minHeight: "100vh", color: dark ? "#e2e8f0" : "#1e293b" }}>
      {/* Header */}
      <div style={{ background: dark ? "#1e293b" : "#fff", borderBottom: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, padding: "0 20px", display: "flex", alignItems: "center", gap: 16, height: 52, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#6366f1", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>● CONTAS A RECEBER</div>
        <nav style={{ display: "flex", gap: 2, flex: 1, overflowX: "auto" }}>
          {PAGES.map(p => (
            <button key={p.id} onClick={() => setPage(p.id)}
              style={{ padding: "5px 12px", background: page === p.id ? "#6366f1" : "transparent", color: page === p.id ? "#fff" : dark ? "#94a3b8" : "#64748b", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: page === p.id ? 700 : 500, whiteSpace: "nowrap" }}>
              {p.icon} {p.label}
            </button>
          ))}
        </nav>
        {user && <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>👤 {user.name}</div>}
        <button onClick={() => setDark(d => !d)} style={{ background: "none", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: dark ? "#94a3b8" : "#64748b", whiteSpace: "nowrap" }}>
          {dark ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Conteúdo */}
      <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{PAGES.find(p => p.id === page)?.label}</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: dark ? "#64748b" : "#94a3b8" }}>
            {contas.length} registros · {fmt(contas.reduce((a,b) => a+b.vlBruto, 0))} total
          </p>
        </div>

        {page === "list"         && <ListPage     addToast={addToast} />}
        {page === "kanban"       && <KanbanPage   addToast={addToast} />}
        {page === "status"       && <StatusPage   />}
        {page === "faturar"      && <FaturarPage  />}
        {page === "documentacao" && <DocPage      />}
        {page === "resposta"     && <RespostaPage />}
        {page === "mensal"       && <MensalPage   />}
        {page === "cliente"      && <ClientePage  />}
      </div>

      <Toast toasts={toasts} />
    </div>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}
