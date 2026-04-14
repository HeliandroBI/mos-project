import { useState, useEffect, useRef, useCallback } from "react";
import * as Chart from "chart.js";

Chart.Chart.register(
  Chart.CategoryScale, Chart.LinearScale, Chart.BarElement, Chart.LineElement,
  Chart.PointElement, Chart.ArcElement, Chart.Title, Chart.Tooltip, Chart.Legend,
  Chart.Filler
);

const STATUSES = ["Draft", "Enviado", "Em Análise", "Aprovado", "Faturado", "Cancelado"];
const PLATFORMS = ["Google", "Meta", "TikTok", "LinkedIn", "YouTube", "Programática", "OOH"];
const CLIENTS = ["Ambev", "Natura", "Embratel", "Vivo", "Bradesco", "Itaú", "Magazine Luiza", "Renner", "Lojas Americanas", "Havaianas"];

const STATUS_COLORS = {
  "Draft": "#94a3b8", "Enviado": "#60a5fa", "Em Análise": "#f59e0b",
  "Aprovado": "#34d399", "Faturado": "#10b981", "Cancelado": "#f87171"
};

const PAGES = [
  { id: "list", label: "Contas a Receber", icon: "📋" },
  { id: "kanban", label: "Kanban", icon: "🗂️" },
  { id: "status", label: "Status", icon: "📊" },
  { id: "faturar", label: "A Faturar", icon: "💰" },
  { id: "documentacao", label: "Documentação", icon: "📄" },
  { id: "resposta", label: "Resp. Cliente", icon: "💬" },
  { id: "mensal", label: "Faturamento Mensal", icon: "📅" },
  { id: "cliente", label: "Clientes", icon: "🏢" },
];

function generateData() {
  const data = [];
  for (let i = 1; i <= 80; i++) {
    const dataEmissao = new Date(2025, Math.floor(Math.random() * 14), Math.floor(Math.random() * 28) + 1);
    const diasAdicionais = [30, 45, 60, 90][Math.floor(Math.random() * 4)];
    const dataFim = new Date(dataEmissao);
    dataFim.setDate(dataFim.getDate() + diasAdicionais);
    const dataDraft = new Date(dataEmissao);
    dataDraft.setDate(dataDraft.getDate() - Math.floor(Math.random() * 10));
    const dataEnvio = new Date(dataEmissao);
    dataEnvio.setDate(dataEnvio.getDate() + Math.floor(Math.random() * 5));
    const vlBruto = Math.round((Math.random() * 200000 + 5000) * 100) / 100;
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const today = new Date(2026, 2, 2);
    const vencido = dataFim < today && status !== "Faturado" && status !== "Cancelado";
    data.push({
      id: i, cliente: CLIENTS[Math.floor(Math.random() * CLIENTS.length)],
      data: dataEmissao.toISOString().split("T")[0],
      dataDraft: dataDraft.toISOString().split("T")[0],
      dataEnvio: dataEnvio.toISOString().split("T")[0],
      dataFim: dataFim.toISOString().split("T")[0],
      status, vlBruto, wo: `WO-${String(2025000 + i).padStart(7, "0")}`,
      plataforma: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
      doc: Math.random() > 0.4 ? "OK" : "Pendente",
      diasAdicionais, ano: dataEmissao.getFullYear(), vencido,
    });
  }
  return data;
}

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "-";

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
          y: { ticks: { color: "#94a3b8", font: { size: 11 } }, grid: { color: "#f1f5f9" } }
        }
      }
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
      options: { responsive: true, maintainAspectRatio: false, cutout: "65%", plugins: { legend: { position: "bottom", labels: { color: "#64748b", font: { size: 11 }, padding: 12 } } } }
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
          y: { ticks: { color: "#94a3b8", font: { size: 11 } }, grid: { color: "#f1f5f9" } }
        }
      }
    });
    return () => chartRef.current?.destroy();
  }, [JSON.stringify(labels), JSON.stringify(datasets)]);
  return <canvas ref={ref} style={{ height }} />;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 28, minWidth: 480, maxWidth: 640, width: "90%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
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

function ListPage({ data, setData, addToast }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterPlat, setFilterPlat] = useState("Todas");
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState({ cliente: "", data: "", dataDraft: "", dataEnvio: "", dataFim: "", status: "Draft", vlBruto: "", wo: "", plataforma: "Google", doc: "Pendente", diasAdicionais: 30, ano: 2025 });
  const [sortCol, setSortCol] = useState("data");
  const [sortDir, setSortDir] = useState("desc");

  const filtered = data.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.cliente.toLowerCase().includes(q) || r.wo.toLowerCase().includes(q) || r.plataforma.toLowerCase().includes(q);
    return matchQ && (filterStatus === "Todos" || r.status === filterStatus) && (filterPlat === "Todas" || r.plataforma === filterPlat);
  }).sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === filtered.length ? [] : filtered.map(r => r.id));
  const startEdit = (row) => { setEditing(row.id); setEditForm({ ...row }); };
  const saveEdit = () => { setData(d => d.map(r => r.id === editing ? { ...editForm, vlBruto: parseFloat(editForm.vlBruto) || 0 } : r)); setEditing(null); addToast("Registro atualizado!"); };
  const deleteSelected = () => { setData(d => d.filter(r => !selected.includes(r.id))); addToast(`${selected.length} registro(s) removido(s).`); setSelected([]); };
  const addRow = () => { const id = Math.max(...data.map(r => r.id)) + 1; setData(d => [...d, { ...newRow, id, vlBruto: parseFloat(newRow.vlBruto) || 0 }]); setShowAdd(false); addToast("Registro adicionado!"); };

  const inp = { padding: "4px 8px", borderRadius: 5, border: "1px solid #e2e8f0", fontSize: 12, width: "100%", boxSizing: "border-box" };
  const th = (col) => ({ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", whiteSpace: "nowrap", background: sortCol === col ? "#f8fafc" : "transparent", userSelect: "none" });
  const td = { padding: "9px 12px", fontSize: 13, color: "#334155", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, WO, plataforma..." style={{ ...inp, width: 260 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inp, width: 140 }}>
          <option value="Todos">Todos os status</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterPlat} onChange={e => setFilterPlat(e.target.value)} style={{ ...inp, width: 150 }}>
          <option value="Todas">Todas plataformas</option>
          {PLATFORMS.map(p => <option key={p}>{p}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {selected.length > 0 && <button onClick={deleteSelected} style={{ padding: "6px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, color: "#dc2626", fontSize: 12, cursor: "pointer" }}>Excluir ({selected.length})</button>}
          <button onClick={() => setShowAdd(true)} style={{ padding: "6px 14px", background: "#6366f1", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>+ Novo Registro</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <Card title="Total Registros" value={filtered.length} color="#6366f1" />
        <Card title="Valor Total" value={fmt(filtered.reduce((s, r) => s + r.vlBruto, 0))} color="#10b981" />
        <Card title="Vencidos" value={filtered.filter(r => r.vencido).length} color="#f87171" />
        <Card title="Faturados" value={filtered.filter(r => r.status === "Faturado").length} color="#34d399" />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ ...th(""), width: 36 }}><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
              {[["cliente","Cliente"],["data","Data"],["dataFim","Data Fim"],["status","Status"],["vlBruto","Valor"],["wo","WO"],["plataforma","Plataforma"],["doc","Doc"]].map(([col, lbl]) => (
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
                    <td style={td}><input value={editForm.cliente} onChange={e => setEditForm(f => ({ ...f, cliente: e.target.value }))} style={inp} /></td>
                    <td style={td}><input type="date" value={editForm.data} onChange={e => setEditForm(f => ({ ...f, data: e.target.value }))} style={inp} /></td>
                    <td style={td}><input type="date" value={editForm.dataFim} onChange={e => setEditForm(f => ({ ...f, dataFim: e.target.value }))} style={inp} /></td>
                    <td style={td}><select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} style={inp}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></td>
                    <td style={td}><input type="number" value={editForm.vlBruto} onChange={e => setEditForm(f => ({ ...f, vlBruto: e.target.value }))} style={inp} /></td>
                    <td style={td}><input value={editForm.wo} onChange={e => setEditForm(f => ({ ...f, wo: e.target.value }))} style={inp} /></td>
                    <td style={td}><select value={editForm.plataforma} onChange={e => setEditForm(f => ({ ...f, plataforma: e.target.value }))} style={inp}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select></td>
                    <td style={td}><select value={editForm.doc} onChange={e => setEditForm(f => ({ ...f, doc: e.target.value }))} style={inp}><option>OK</option><option>Pendente</option></select></td>
                    <td style={td}>
                      <button onClick={saveEdit} style={{ padding: "3px 10px", background: "#10b981", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, marginRight: 4 }}>✓</button>
                      <button onClick={() => setEditing(null)} style={{ padding: "3px 10px", background: "#f1f5f9", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>✕</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ ...td, fontWeight: 500 }}>{row.cliente}</td>
                    <td style={td}>{fmtDate(row.data)}</td>
                    <td style={{ ...td, color: row.vencido ? "#dc2626" : td.color, fontWeight: row.vencido ? 600 : 400 }}>{fmtDate(row.dataFim)}</td>
                    <td style={td}><span style={{ background: STATUS_COLORS[row.status] + "22", color: STATUS_COLORS[row.status], padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{row.status}</span></td>
                    <td style={{ ...td, fontFamily: "monospace" }}>{fmt(row.vlBruto)}</td>
                    <td style={{ ...td, color: "#6366f1", fontFamily: "monospace", fontSize: 11 }}>{row.wo}</td>
                    <td style={td}>{row.plataforma}</td>
                    <td style={td}><span style={{ background: row.doc === "OK" ? "#f0fdf4" : "#fefce8", color: row.doc === "OK" ? "#16a34a" : "#ca8a04", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{row.doc}</span></td>
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
            {[["cliente","Cliente","text"],["data","Data Emissão","date"],["dataDraft","Data Draft","date"],["dataEnvio","Data Envio","date"],["dataFim","Data Fim","date"],["vlBruto","Valor Bruto","number"],["wo","WO","text"],["diasAdicionais","Dias Adicionais","number"]].map(([k,l,t]) => (
              <div key={k}><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>{l}</label><input type={t} value={newRow[k]} onChange={e => setNewRow(f => ({ ...f, [k]: e.target.value }))} style={inp} /></div>
            ))}
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Status</label><select value={newRow.status} onChange={e => setNewRow(f => ({ ...f, status: e.target.value }))} style={inp}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Plataforma</label><select value={newRow.plataforma} onChange={e => setNewRow(f => ({ ...f, plataforma: e.target.value }))} style={inp}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select></div>
            <div><label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Doc</label><select value={newRow.doc} onChange={e => setNewRow(f => ({ ...f, doc: e.target.value }))} style={inp}><option>OK</option><option>Pendente</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: "8px 20px", background: "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            <button onClick={addRow} style={{ padding: "8px 20px", background: "#6366f1", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Adicionar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function KanbanPage({ data, setData, addToast }) {
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);
  const onDragStart = (id) => setDragging(id);
  const onDragOver = (e, status) => { e.preventDefault(); setOver(status); };
  const onDrop = (status) => { if (dragging !== null) { setData(d => d.map(r => r.id === dragging ? { ...r, status } : r)); addToast(`Status → "${status}"`); setDragging(null); setOver(null); } };
  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
      {STATUSES.map(status => {
        const col = data.filter(r => r.status === status);
        const isOver = over === status;
        return (
          <div key={status} onDragOver={e => onDragOver(e, status)} onDrop={() => onDrop(status)}
            style={{ minWidth: 210, flex: "0 0 210px", background: isOver ? "#f0f4ff" : "#f8fafc", border: `2px solid ${isOver ? "#6366f1" : "#e2e8f0"}`, borderRadius: 10, padding: 12, transition: "all 0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLORS[status], display: "inline-block" }} />
              <span style={{ fontWeight: 700, fontSize: 12, color: "#334155" }}>{status}</span>
              <span style={{ marginLeft: "auto", background: "#e2e8f0", color: "#64748b", borderRadius: 20, padding: "1px 8px", fontSize: 11 }}>{col.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {col.map(row => (
                <div key={row.id} draggable onDragStart={() => onDragStart(row.id)}
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

function StatusPage({ data }) {
  const byStatus = STATUSES.map(s => ({ s, count: data.filter(r => r.status === s).length, value: data.filter(r => r.status === s).reduce((a, b) => a + b.vlBruto, 0) }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Registros por Status</h3>
        <DonutChart labels={STATUSES} data={STATUSES.map(s => data.filter(r => r.status === s).length)} colors={STATUSES.map(s => STATUS_COLORS[s])} />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Valor por Status</h3>
        <BarChart labels={STATUSES} datasets={[{ label: "Valor (R$)", data: byStatus.map(s => s.value), backgroundColor: STATUSES.map(s => STATUS_COLORS[s] + "cc") }]} />
      </div>
      <div style={{ gridColumn: "1/-1", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f8fafc" }}>{["Status","Quantidade","Valor Total","% do Total"].map(h => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
          <tbody>{byStatus.map(row => (<tr key={row.s} style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={{ padding: "10px 16px" }}><span style={{ background: STATUS_COLORS[row.s] + "22", color: STATUS_COLORS[row.s], padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{row.s}</span></td>
            <td style={{ padding: "10px 16px", fontSize: 13 }}>{row.count}</td>
            <td style={{ padding: "10px 16px", fontSize: 13, fontFamily: "monospace" }}>{fmt(row.value)}</td>
            <td style={{ padding: "10px 16px", fontSize: 13 }}>{data.length ? ((row.count / data.length) * 100).toFixed(1) : 0}%</td>
          </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

function FaturarPage({ data }) {
  const pending = data.filter(r => r.status !== "Faturado" && r.status !== "Cancelado");
  const overdue = pending.filter(r => r.vencido);
  const byPlat = PLATFORMS.map(p => ({ p, v: pending.filter(r => r.plataforma === p).reduce((a, b) => a + b.vlBruto, 0) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <Card title="A Faturar" value={pending.length} sub="Registros pendentes" color="#f59e0b" />
        <Card title="Valor Pendente" value={fmt(pending.reduce((a, b) => a + b.vlBruto, 0))} color="#6366f1" />
        <Card title="Em Atraso" value={overdue.length} sub={fmt(overdue.reduce((a, b) => a + b.vlBruto, 0))} color="#f87171" />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Por Plataforma</h3>
        <BarChart labels={byPlat.map(x => x.p)} datasets={[{ label: "Valor", data: byPlat.map(x => x.v), backgroundColor: "#6366f1aa" }]} horizontal />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Distribuição Status</h3>
        <DonutChart labels={["Draft","Enviado","Em Análise","Aprovado"]} data={["Draft","Enviado","Em Análise","Aprovado"].map(s => pending.filter(r => r.status === s).length)} colors={["#94a3b8","#60a5fa","#f59e0b","#34d399"]} />
      </div>
    </div>
  );
}

function DocPage({ data }) {
  const ok = data.filter(r => r.doc === "OK");
  const pend = data.filter(r => r.doc === "Pendente");
  const byClient = CLIENTS.map(c => ({ c, ok: data.filter(r => r.cliente === c && r.doc === "OK").length, pend: data.filter(r => r.cliente === c && r.doc === "Pendente").length })).filter(x => x.ok + x.pend > 0).sort((a, b) => b.pend - a.pend);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <Card title="Documentação OK" value={ok.length} sub={`${((ok.length / data.length) * 100).toFixed(0)}% do total`} color="#10b981" />
        <Card title="Pendente" value={pend.length} sub={fmt(pend.reduce((a, b) => a + b.vlBruto, 0))} color="#f59e0b" />
        <Card title="Taxa de Conclusão" value={`${((ok.length / data.length) * 100).toFixed(1)}%`} color="#6366f1" />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Status Documentação</h3>
        <DonutChart labels={["OK","Pendente"]} data={[ok.length, pend.length]} colors={["#10b981","#f59e0b"]} />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Por Cliente</h3>
        <BarChart labels={byClient.map(x => x.c)} datasets={[{ label: "OK", data: byClient.map(x => x.ok), backgroundColor: "#10b98188" }, { label: "Pendente", data: byClient.map(x => x.pend), backgroundColor: "#f59e0b88" }]} horizontal />
      </div>
    </div>
  );
}

function RespostaPage({ data }) {
  const enviado = data.filter(r => r.status === "Enviado");
  const analise = data.filter(r => r.status === "Em Análise");
  const aprovado = data.filter(r => r.status === "Aprovado");
  const byClient = CLIENTS.map(c => ({ c, env: data.filter(r => r.cliente === c && r.status === "Enviado").length, ana: data.filter(r => r.cliente === c && r.status === "Em Análise").length, apr: data.filter(r => r.cliente === c && r.status === "Aprovado").length })).filter(x => x.env + x.ana + x.apr > 0);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <Card title="Enviados" value={enviado.length} color="#60a5fa" />
        <Card title="Em Análise" value={analise.length} color="#f59e0b" />
        <Card title="Aprovados" value={aprovado.length} color="#10b981" />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Por Cliente</h3>
        <BarChart labels={byClient.map(x => x.c)} datasets={[
          { label: "Enviado", data: byClient.map(x => x.env), backgroundColor: "#60a5fa88" },
          { label: "Em Análise", data: byClient.map(x => x.ana), backgroundColor: "#f59e0b88" },
          { label: "Aprovado", data: byClient.map(x => x.apr), backgroundColor: "#34d39988" },
        ]} horizontal />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Distribuição</h3>
        <DonutChart labels={["Enviado","Em Análise","Aprovado"]} data={[enviado.length, analise.length, aprovado.length]} colors={["#60a5fa","#f59e0b","#34d399"]} />
      </div>
    </div>
  );
}

function MensalPage({ data }) {
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const getMonthVal = (y, m) => data.filter(r => { const d = new Date(r.data + "T00:00:00"); return d.getFullYear() === y && d.getMonth() === m; }).reduce((a, b) => a + b.vlBruto, 0);
  const getMonthCount = (y, m) => data.filter(r => { const d = new Date(r.data + "T00:00:00"); return d.getFullYear() === y && d.getMonth() === m; }).length;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <Card title="Faturado 2025" value={fmt(data.filter(r => r.status === "Faturado" && r.ano === 2025).reduce((a,b) => a+b.vlBruto,0))} color="#6366f1" />
        <Card title="Faturado 2026" value={fmt(data.filter(r => r.status === "Faturado" && r.ano === 2026).reduce((a,b) => a+b.vlBruto,0))} color="#10b981" />
        <Card title="Ticket Médio" value={fmt(data.reduce((a,b) => a+b.vlBruto,0) / data.length)} color="#f59e0b" />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Valor Mensal por Ano</h3>
        <LineChart labels={months} datasets={[
          { label: "2025", data: months.map((_, i) => getMonthVal(2025, i)), borderColor: "#6366f1", backgroundColor: "#6366f111", tension: 0.4, fill: true },
          { label: "2026", data: months.map((_, i) => getMonthVal(2026, i)), borderColor: "#10b981", backgroundColor: "#10b98111", tension: 0.4, fill: true },
        ]} />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Volume de Registros por Mês</h3>
        <BarChart labels={months} datasets={[
          { label: "2025", data: months.map((_, i) => getMonthCount(2025, i)), backgroundColor: "#6366f1aa" },
          { label: "2026", data: months.map((_, i) => getMonthCount(2026, i)), backgroundColor: "#10b981aa" },
        ]} />
      </div>
    </div>
  );
}

function ClientePage({ data }) {
  const byClient = CLIENTS.map(c => ({
    c, count: data.filter(r => r.cliente === c).length,
    value: data.filter(r => r.cliente === c).reduce((a, b) => a + b.vlBruto, 0),
    faturado: data.filter(r => r.cliente === c && r.status === "Faturado").reduce((a, b) => a + b.vlBruto, 0),
    vencido: data.filter(r => r.cliente === c && r.vencido).length,
  })).filter(x => x.count > 0).sort((a, b) => b.value - a.value);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Valor por Cliente</h3>
        <BarChart labels={byClient.map(x => x.c)} datasets={[{ label: "Valor Total", data: byClient.map(x => x.value), backgroundColor: "#6366f1aa" }]} horizontal />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#334155" }}>Registros por Cliente</h3>
        <DonutChart labels={byClient.map(x => x.c)} data={byClient.map(x => x.count)} colors={byClient.map((_, i) => `hsl(${(i * 36) % 360},65%,58%)`)} />
      </div>
      <div style={{ gridColumn: "1/-1", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f8fafc" }}>{["Cliente","Registros","Valor Total","Faturado","Vencidos"].map(h => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
          <tbody>{byClient.map(row => (<tr key={row.c} style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={{ padding: "10px 16px", fontWeight: 600, fontSize: 13 }}>{row.c}</td>
            <td style={{ padding: "10px 16px", fontSize: 13 }}>{row.count}</td>
            <td style={{ padding: "10px 16px", fontSize: 13, fontFamily: "monospace" }}>{fmt(row.value)}</td>
            <td style={{ padding: "10px 16px", fontSize: 13, color: "#10b981", fontFamily: "monospace" }}>{fmt(row.faturado)}</td>
            <td style={{ padding: "10px 16px" }}>{row.vencido > 0 ? <span style={{ background: "#fef2f2", color: "#dc2626", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{row.vencido}</span> : <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>}</td>
          </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(() => generateData());
  const [page, setPage] = useState("list");
  const [toasts, setToasts] = useState([]);
  const [dark, setDark] = useState(false);

  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: dark ? "#0f172a" : "#f8fafc", minHeight: "100vh", color: dark ? "#e2e8f0" : "#1e293b" }}>
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
        <button onClick={() => setDark(d => !d)} style={{ background: "none", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: dark ? "#94a3b8" : "#64748b", whiteSpace: "nowrap" }}>
          {dark ? "☀️" : "🌙"}
        </button>
      </div>
      <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{PAGES.find(p => p.id === page)?.label}</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: dark ? "#64748b" : "#94a3b8" }}>{data.length} registros · {fmt(data.reduce((a, b) => a + b.vlBruto, 0))} total</p>
        </div>
        {page === "list" && <ListPage data={data} setData={setData} addToast={addToast} />}
        {page === "kanban" && <KanbanPage data={data} setData={setData} addToast={addToast} />}
        {page === "status" && <StatusPage data={data} />}
        {page === "faturar" && <FaturarPage data={data} />}
        {page === "documentacao" && <DocPage data={data} />}
        {page === "resposta" && <RespostaPage data={data} />}
        {page === "mensal" && <MensalPage data={data} />}
        {page === "cliente" && <ClientePage data={data} />}
      </div>
      <Toast toasts={toasts} />
    </div>
  );
}
