import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, ReferenceLine
} from "recharts";

/* ── inject drill animation CSS once ── */
(() => {
  if (typeof document === "undefined") return;
  if (document.getElementById("__mos_drill__")) return;
  const s = document.createElement("style");
  s.id = "__mos_drill__";
  s.textContent = "@keyframes drillIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}";
  document.head.appendChild(s);
})();

/* ========== THEME ========== */
const LIGHT = {
  bg: "#e8edf2", card: "#edf0f5", shadowD: "#c8cdd6", shadowL: "#ffffff",
  text: "#1e293b", muted: "#64748b", accent: "#1a5ea8", accent2: "#0ea5e9",
  border: "rgba(255,255,255,0.8)",
};
const DARK = {
  bg: "#151924", card: "#1b2030", shadowD: "#10131c", shadowL: "#222840",
  text: "#e2e8f0", muted: "#94a3b8", accent: "#60a5fa", accent2: "#38bdf8",
  border: "rgba(255,255,255,0.04)",
};

/* ========== TYPES ========== */
interface Conta {
  id?: number; wo?: string; cliente?: string; plataforma?: string;
  doc?: string; num_doc?: string; data_doc?: string; data_draft?: string;
  escopo?: string; faturado_por?: string; vl_bruto?: number; vl_liquido?: number;
  total_retido?: number; total_a_pagar?: number; vencimento?: string;
  status?: string; data_envio_cliente?: string; data_pgto?: string;
  data_inicio?: string; data_fim?: string; focal?: string;
  prev_fat?: string; prev_pag?: string; adicional_dias?: number;
  draft_codigo?: string; obs?: string;
}
interface DashFilters {
  ano: string; mes: string; cliente: string; plataforma: string;
  doc: string; status: string; escopo: string; faturado_por: string;
}
type Page = "status" | "faturar" | "doc" | "resposta" | "draft" | "mensal" | "cliente";
type DrillState = { cliente?: string; plataforma?: string };

/* ========== UTILS ========== */
const API = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api";
const fmtK = (v: number) => {
  if (v >= 1e6) return `R$${(v / 1e6).toFixed(1)}Mi`;
  if (v >= 1e3) return `R$${(v / 1e3).toFixed(0)}K`;
  return `R$${v.toFixed(0)}`;
};
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const today = new Date();
const diffDays = (d?: string) => d ? Math.round((today.getTime() - new Date(d).getTime()) / 86400000) : 0;
const rangeBucket = (d: number) => d <= 10 ? "0-10" : d <= 20 ? "11-20" : d <= 30 ? "21-30" : "30+";

const STATUS_COLOR: Record<string, string> = {
  "PAGO": "#10b981", "Aguardando Pagamento": "#3b82f6", "A Começar": "#8b5cf6",
  "Em andamento": "#0ea5e9", "Gerência": "#f59e0b",
  "Aguardando Resposta do Cliente": "#f97316", "Cancelado": "#6b7280",
  "cancelado": "#6b7280", "Aguardando Inf. Interna": "#ec4899",
  "Aguardando Ajuste da PO": "#14b8a6", "Free Of Charge": "#94a3b8",
  "Enviar NF": "#ef4444", "Aguardando PO": "#a855f7",
  "Aguardando Documentação": "#f43f5e", "Aguardando Relatório": "#84cc16",
};
const sc = (s: string) => STATUS_COLOR[s] ?? "#94a3b8";

const RANGE_C = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
const TM_C = ["#8b5cf6","#f43f5e","#14b8a6","#f59e0b","#3b82f6","#10b981","#ec4899","#a855f7","#0ea5e9","#f97316"];
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

/* ========== STYLES ========== */
const mkStyles = (t: typeof LIGHT) => ({
  wrap: { minHeight: "100vh", background: t.bg, padding: 16, fontFamily: "'DM Sans',system-ui,sans-serif", color: t.text, transition: "all .3s" } as React.CSSProperties,
  neo: { background: t.card, borderRadius: 14, boxShadow: `5px 5px 12px ${t.shadowD}, -3px -3px 8px ${t.shadowL}`, border: `1px solid ${t.border}` } as React.CSSProperties,
  inset: { background: t.bg, borderRadius: 10, boxShadow: `inset 3px 3px 8px ${t.shadowD}, inset -2px -2px 6px ${t.shadowL}` } as React.CSSProperties,
  btn: (active?: boolean): React.CSSProperties => ({
    background: t.card, borderRadius: 10, border: `1px solid ${t.border}`, cursor: "pointer", color: active ? t.accent : t.muted,
    boxShadow: active ? `inset 2px 2px 6px ${t.shadowD}, inset -1px -1px 4px ${t.shadowL}` : `3px 3px 8px ${t.shadowD}, -2px -2px 6px ${t.shadowL}`,
    fontWeight: active ? 700 : 400, transition: "all .15s",
  }),
  sel: { background: t.bg, borderRadius: 10, boxShadow: `inset 2px 2px 6px ${t.shadowD}, inset -1px -1px 4px ${t.shadowL}`, border: `1px solid ${t.border}`, color: t.text, fontFamily: "inherit" } as React.CSSProperties,
  th: { padding: "7px 10px", color: t.muted, fontWeight: 700, borderBottom: `1px solid ${t.shadowD}`, fontSize: 10, textAlign: "left" as const, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  td: { padding: "5px 10px", fontSize: 11, verticalAlign: "middle" as const },
  tr: (i: number): React.CSSProperties => ({ background: i % 2 === 0 ? "transparent" : t.bg }),
  label: { fontSize: 9, fontWeight: 700, color: t.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 },
  h3: { fontWeight: 800, fontSize: 13, color: t.text, marginBottom: 14, fontFamily: "'Syne',sans-serif" } as React.CSSProperties,
  badge: (s: string): React.CSSProperties => ({
    background: sc(s) + "22", color: sc(s), padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
  }),
});

/* ========== TREEMAP ========== */
function Treemap({ items, h = 300 }: { items: { label: string; value: number; color: string }[]; h?: number }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, x) => s + x.value, 0);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, height: h, overflow: "hidden" }}>
      {sorted.map((x, i) => {
        const pct = total > 0 ? x.value / total : 0;
        return (
          <div key={i} title={`${x.label}: ${fmtBRL(x.value)}`}
            style={{ flex: `${pct * 100} 0 ${pct > .3 ? "44%" : pct > .1 ? "29%" : pct > .05 ? "19%" : "13%"}`, background: x.color, borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", minHeight: 36, cursor: "default" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.9)", fontWeight: 600, lineHeight: 1.2 }}>{x.label}</div>
            <div style={{ fontSize: 12, color: "#fff", fontWeight: 800 }}>{fmtK(x.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ========== STAT CARD ========== */
function StatCard({ label, value, color, icon, S }: { label: string; value: number | string; color?: string; icon?: string; S: ReturnType<typeof mkStyles> }) {
  return (
    <div style={{ ...S.neo, padding: "14px 16px" }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 21, color: color ?? "var(--acc)", fontFamily: "'Syne',sans-serif" }}>
        {typeof value === "number" ? fmtK(value) : value}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ========== DRILL BREADCRUMB ========== */
function DrillBreadcrumb({ drill, onDrill, T }: { drill: DrillState; onDrill: (d: DrillState) => void; T: typeof LIGHT }) {
  if (!drill.cliente) return null;
  const btn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: T.accent, fontWeight: 700, fontSize: 11, padding: "1px 5px", borderRadius: 4 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
      <button style={btn} onClick={() => onDrill({})}>← Todos</button>
      <span style={{ color: T.muted, fontSize: 12 }}>›</span>
      {drill.plataforma ? (
        <>
          <button style={btn} onClick={() => onDrill({ cliente: drill.cliente })}>{drill.cliente}</button>
          <span style={{ color: T.muted, fontSize: 12 }}>›</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{drill.plataforma}</span>
        </>
      ) : (
        <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{drill.cliente}</span>
      )}
    </div>
  );
}

/* ========== DRILL BAR CHART ========== */
function DrillBarChart({ data, S, T, title = "📊 Por Cliente / Plataforma / WO" }: {
  data: Conta[]; S: ReturnType<typeof mkStyles>; T: typeof LIGHT; title?: string;
}) {
  const [drill, setDrill] = useState<DrillState>({});
  const drillKey = `${drill.cliente ?? ""}-${drill.plataforma ?? ""}`;

  const { chartData, level } = useMemo(() => {
    let filtered = data;
    const level = !drill.cliente ? "cliente" : !drill.plataforma ? "plataforma" : "wo";
    if (drill.cliente) filtered = filtered.filter(c => c.cliente === drill.cliente);
    if (drill.plataforma) filtered = filtered.filter(c => c.plataforma === drill.plataforma);
    const map: Record<string, number> = {};
    filtered.forEach(c => {
      const key = level === "cliente" ? (c.cliente ?? "—")
        : level === "plataforma" ? (c.plataforma ?? "—")
        : `WO ${c.wo ?? "—"}`;
      map[key] = (map[key] ?? 0) + (c.vl_bruto ?? 0);
    });
    return {
      chartData: Object.entries(map).map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, 15),
      level
    };
  }, [data, drill]);

  const canDrill = level !== "wo";
  const barH = Math.max(160, Math.min(chartData.length * 26, 340));

  const handleClick = (entry: { name: string }) => {
    if (!canDrill) return;
    if (!drill.cliente) setDrill({ cliente: entry.name });
    else setDrill({ ...drill, plataforma: entry.name });
  };

  return (
    <div style={{ ...S.neo, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
        <div style={{ ...S.h3, marginBottom: 0 }}>{title}</div>
        <DrillBreadcrumb drill={drill} onDrill={setDrill} T={T} />
      </div>
      <div key={drillKey} style={{ animation: "drillIn 0.22s ease-out" }}>
        <ResponsiveContainer width="100%" height={barH}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 130, right: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.shadowD} horizontal={false} />
            <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 9, fill: T.muted }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: T.muted }} width={130} />
            <Tooltip formatter={(v: number) => [fmtBRL(v), "Valor"]} contentStyle={{ background: T.card, border: "none", borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor={canDrill ? "pointer" : "default"}
              onClick={(entry) => handleClick(entry)}>
              {chartData.map((_, i) => <Cell key={i} fill={`hsl(${210 + i * 9},65%,${58 - i}%)`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {canDrill && chartData.length > 0 && (
          <div style={{ fontSize: 10, color: T.muted, marginTop: 6, textAlign: "center" }}>
            💡 Clique em uma barra para detalhar por {level === "cliente" ? "plataforma" : "WO"}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== MONTH CALENDAR ========== */
function MonthCalendar({ year, month, dayMap, maxVal, T }: {
  year: number; month: number; dayMap: Record<string, number>; maxVal: number; T: typeof LIGHT;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const total = Array.from({ length: daysInMonth }, (_, i) => {
    const k = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    return dayMap[k] ?? 0;
  }).reduce((a, b) => a + b, 0);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: T.text }}>{MESES[month]} {year}</div>
        {total > 0 && <div style={{ fontSize: 9, color: T.accent, fontWeight: 700 }}>{fmtK(total)}</div>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {["D","S","T","Q","Q","S","S"].map((d, i) => (
          <div key={i} style={{ fontSize: 7, color: T.muted, textAlign: "center", fontWeight: 700, paddingBottom: 2 }}>{d}</div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={i} />;
          const k = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const val = dayMap[k] ?? 0;
          const pct = val > 0 ? Math.min(val / maxVal, 1) : 0;
          const isToday = k === today.toISOString().slice(0, 10);
          return (
            <div key={i} title={val > 0 ? `${k}: ${fmtBRL(val)}` : k}
              style={{
                borderRadius: 3, cursor: "default", display: "flex", alignItems: "center", justifyContent: "center",
                aspectRatio: "1",
                background: pct > 0 ? `rgba(59,130,246,${0.15 + pct * 0.85})` : T.bg,
                outline: isToday ? `2px solid ${T.accent}` : "none",
                fontSize: 7, fontWeight: val > 0 ? 700 : 400,
                color: pct > 0.5 ? "#fff" : pct > 0 ? T.accent : T.muted,
              }}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========== CALENDAR HEATMAP SIDEBAR ========== */
function CalendarHeatmap({ data, filters, S, T }: {
  data: Conta[]; filters: DashFilters; S: ReturnType<typeof mkStyles>; T: typeof LIGHT;
}) {
  const { dayMap, months, maxVal } = useMemo(() => {
    const dayMap: Record<string, number> = {};
    data.forEach(c => {
      const d = c.data_doc;
      if (d) dayMap[d.slice(0, 10)] = (dayMap[d.slice(0, 10)] ?? 0) + (c.vl_bruto ?? 0);
    });
    const maxVal = Math.max(...Object.values(dayMap), 1);

    let months: { year: number; month: number }[];
    if (filters.ano && filters.mes) {
      months = [{ year: parseInt(filters.ano), month: parseInt(filters.mes) - 1 }];
    } else if (filters.ano) {
      months = Array.from({ length: 12 }, (_, i) => ({ year: parseInt(filters.ano), month: i }));
    } else {
      const now = new Date();
      months = [-2, -1, 0].map(offset => {
        const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
      });
    }
    return { dayMap, months, maxVal };
  }, [data, filters.ano, filters.mes]);

  return (
    <div style={{ ...S.neo, padding: "14px 14px 10px", position: "sticky", top: 8 }}>
      <div style={{ ...S.h3, marginBottom: 12 }}>📆 Calendário</div>
      <div style={{ maxHeight: "calc(100vh - 160px)", overflowY: "auto", paddingRight: 2 }}>
        {months.map(({ year, month }) => (
          <MonthCalendar key={`${year}-${month}`} year={year} month={month} dayMap={dayMap} maxVal={maxVal} T={T} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 8, color: T.muted }}>Baixo</span>
        {[0.15, 0.4, 0.65, 0.9].map(o => (
          <div key={o} style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(59,130,246,${o})` }} />
        ))}
        <span style={{ fontSize: 8, color: T.muted }}>Alto</span>
      </div>
    </div>
  );
}

/* ========== PAGE STATUS ========== */
function PageStatus({ data, S, T }: { data: Conta[]; S: ReturnType<typeof mkStyles>; T: typeof LIGHT }) {
  const { byStatus, kpi, rangeRows } = useMemo(() => {
    const map: Record<string, number> = {};
    let t = 0, pg = 0, af = 0, pend = 0;
    data.forEach(c => {
      const s = c.status ?? ""; map[s] = (map[s] ?? 0) + (c.vl_bruto ?? 0);
      t += (c.vl_bruto ?? 0);
      if (s === "PAGO") pg += (c.vl_bruto ?? 0);
      else if (["A Começar","Em andamento"].includes(s)) af += (c.vl_bruto ?? 0);
      else pend += (c.vl_bruto ?? 0);
    });
    const byStatus = Object.entries(map).map(([s, v]) => ({ s, v })).sort((a, b) => b.v - a.v);
    const rangeMap: Record<string, Record<string, number>> = {};
    data.forEach(c => {
      const s = c.status ?? ""; const d = diffDays(c.data_doc);
      const r = rangeBucket(d);
      if (!rangeMap[s]) rangeMap[s] = {};
      rangeMap[s][r] = (rangeMap[s][r] ?? 0) + (c.vl_bruto ?? 0);
    });
    const rangeRows = Object.entries(rangeMap).filter(([, v]) => Object.values(v).some(x => x > 0))
      .map(([s, r]) => ({ s, ...r })).sort((a, b) => ((b as any)["30+"] ?? 0) - ((a as any)["30+"] ?? 0)).slice(0, 10);
    return { byStatus, kpi: { t, pg, af, pend }, rangeRows };
  }, [data]);

  const tpData = byStatus.slice(0, 8).map(x => ({ name: x.s.replace("Aguardando ","Ag. "), value: x.v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <StatCard label="Total Geral" value={kpi.t} icon="💼" S={S} color={T.accent} />
        <StatCard label="Pago" value={kpi.pg} icon="✅" S={S} color="#10b981" />
        <StatCard label="A Faturar" value={kpi.af} icon="🚀" S={S} color="#8b5cf6" />
        <StatCard label="Pendências" value={kpi.pend} icon="⏳" S={S} color="#f59e0b" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...S.neo, padding: 16 }}>
          <div style={S.h3}>💰 Valor Bruto por Status</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byStatus.slice(0,10).map(x => ({ name: x.s.replace("Aguardando ","Ag. "), value: x.v }))} layout="vertical" margin={{ left: 90, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.shadowD} horizontal={false} />
              <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 9, fill: T.muted }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: T.muted }} width={90} />
              <Tooltip formatter={(v: number) => [fmtBRL(v),"Valor"]} contentStyle={{ background: T.card, border: "none", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="value" radius={[0,6,6,0]}>{byStatus.slice(0,10).map((x,i) => <Cell key={i} fill={sc(x.s)} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...S.neo, padding: 16 }}>
          <div style={S.h3}>📊 % por Status</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={tpData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={52} paddingAngle={2}>
                {tpData.map((x,i) => <Cell key={i} fill={sc(byStatus[i]?.s ?? "")} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [fmtBRL(v)]} contentStyle={{ background: T.card, border: "none", borderRadius: 8, fontSize: 11 }} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 10, color: T.text }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ ...S.neo, padding: 16, overflowX: "auto" }}>
        <div style={S.h3}>📅 Status × Faixas de Dias</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={S.th}>Status</th>
            {["0-10","11-20","21-30","30+"].map((r,i) => <th key={r} style={{ ...S.th, textAlign: "right", color: RANGE_C[i] }}>{r} dias</th>)}
          </tr></thead>
          <tbody>
            {rangeRows.map((row, i) => (
              <tr key={i} style={S.tr(i)}>
                <td style={{ ...S.td, fontWeight: 600 }}><span style={S.badge(row.s)}>{row.s}</span></td>
                {(["0-10","11-20","21-30","30+"] as const).map((r, ri) => (
                  <td key={r} style={{ ...S.td, textAlign: "right", color: RANGE_C[ri] }}>
                    {(row as any)[r] ? fmtK((row as any)[r]) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DrillBarChart data={data} S={S} T={T} title="👥 Cliente / Plataforma / WO — por Status" />
    </div>
  );
}

/* ========== PAGE FATURAR ========== */
const FATURAR_S = ["A Começar","Aguardando Ajuste da PO","Aguardando Documentação","Aguardando Inf. Interna","Aguardando PO","Aguardando Relatório","Em andamento","Enviar NF","Gerência"];

function PageFaturar({ data, S, T }: { data: Conta[]; S: ReturnType<typeof mkStyles>; T: typeof LIGHT }) {
  const { rows, totals } = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    data.filter(c => FATURAR_S.includes(c.status ?? "")).forEach(c => {
      const cl = c.cliente ?? ""; const s = c.status ?? "";
      if (!map[cl]) map[cl] = {};
      map[cl][s] = (map[cl][s] ?? 0) + (c.vl_bruto ?? 0);
    });
    const rows = Object.entries(map).map(([cl, sv]) => ({ cl, sv, total: Object.values(sv).reduce((a,b) => a+b, 0) })).sort((a,b) => b.total - a.total);
    const totals: Record<string,number> = {};
    FATURAR_S.forEach(s => { totals[s] = rows.reduce((a, r) => a + (r.sv[s] ?? 0), 0); });
    return { rows, totals };
  }, [data]);

  const activeSt = FATURAR_S.filter(s => (totals[s] ?? 0) > 0);
  const chartD = activeSt.map((s, i) => ({ name: s.replace("Aguardando ","Ag. "), v: totals[s], c: TM_C[i] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...S.neo, padding: 16 }}>
        <div style={S.h3}>💰 Por Tipo de Status</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartD}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.shadowD} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: T.muted }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 9, fill: T.muted }} />
            <Tooltip formatter={(v: number) => [fmtBRL(v),"Valor"]} contentStyle={{ background: T.card, border: "none", borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="v" radius={[6,6,0,0]}>{chartD.map((d,i) => <Cell key={i} fill={d.c} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ ...S.neo, padding: 16, overflowX: "auto" }}>
        <div style={S.h3}>📋 Cliente × Status de Faturamento</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={S.th}>Cliente</th>
            {activeSt.map((s,i) => <th key={s} style={{ ...S.th, textAlign: "right", color: TM_C[i], whiteSpace: "nowrap" }}>{s.replace("Aguardando ","Ag. ")}</th>)}
            <th style={{ ...S.th, textAlign: "right", color: T.accent }}>Total</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={S.tr(i)}>
                <td style={{ ...S.td, fontWeight: 600 }}>{r.cl}</td>
                {activeSt.map(s => <td key={s} style={{ ...S.td, textAlign: "right", color: T.muted }}>{r.sv[s] ? fmtK(r.sv[s]) : "—"}</td>)}
                <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: T.accent }}>{fmtK(r.total)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${T.shadowD}` }}>
              <td style={{ ...S.td, fontWeight: 800 }}>Total</td>
              {activeSt.map((s,i) => <td key={s} style={{ ...S.td, textAlign: "right", fontWeight: 800, color: TM_C[i] }}>{fmtK(totals[s])}</td>)}
              <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: T.accent }}>{fmtK(rows.reduce((a,r) => a+r.total, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <DrillBarChart data={data.filter(c => FATURAR_S.includes(c.status ?? ""))} S={S} T={T} title="👥 A Faturar — Cliente / Plataforma / WO" />
    </div>
  );
}

/* ========== PAGE DOC ========== */
function PageDoc({ data, S, T }: { data: Conta[]; S: ReturnType<typeof mkStyles>; T: typeof LIGHT }) {
  const { rows, tm, total } = useMemo(() => {
    const filtered = data.filter(c => c.status === "Aguardando Documentação");
    const map: Record<string, number> = {};
    filtered.forEach(c => { if (c.cliente) map[c.cliente] = (map[c.cliente] ?? 0) + (c.vl_bruto ?? 0); });
    const rows = Object.entries(map).sort((a,b) => b[1] - a[1]);
    const tm = rows.map(([l, v], i) => ({ label: l, value: v, color: TM_C[i % TM_C.length] }));
    return { rows, tm, total: filtered.reduce((s,c) => s + (c.vl_bruto ?? 0), 0) };
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...S.neo, padding: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 24, color: "#f43f5e", fontFamily: "'Syne',sans-serif" }}>{fmtK(total)}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Total aguardando documentação</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...S.neo, padding: 16, overflowX: "auto" }}>
          <div style={S.h3}>📋 Por Cliente</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={S.th}>Cliente</th>
              <th style={{ ...S.th, textAlign: "right" }}>Valor</th>
              <th style={{ ...S.th, textAlign: "right" }}>%</th>
            </tr></thead>
            <tbody>
              {rows.map(([cl, v], i) => (
                <tr key={i} style={S.tr(i)}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{cl}</td>
                  <td style={{ ...S.td, textAlign: "right", color: TM_C[i % TM_C.length], fontWeight: 700 }}>{fmtBRL(v)}</td>
                  <td style={{ ...S.td, textAlign: "right", color: T.muted }}>{total > 0 ? ((v/total)*100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ ...S.neo, padding: 16 }}>
          <div style={S.h3}>🗺️ Distribuição</div>
          {tm.length > 0 ? <Treemap items={tm} h={280} /> : <div style={{ color: T.muted, fontSize: 12 }}>Sem dados</div>}
        </div>
      </div>
      <DrillBarChart data={data.filter(c => c.status === "Aguardando Documentação")} S={S} T={T} title="👥 Ag. Documentação — Cliente / Plataforma / WO" />
    </div>
  );
}

/* ========== PAGE RESPOSTA ========== */
function PageResposta({ data, S, T }: { data: Conta[]; S: ReturnType<typeof mkStyles>; T: typeof LIGHT }) {
  const { rows, tm, total } = useMemo(() => {
    const filtered = data.filter(c => c.status === "Aguardando Resposta do Cliente");
    const cmap: Record<string, Record<string, number>> = {};
    const ctot: Record<string, number> = {};
    filtered.forEach(c => {
      if (!c.cliente) return;
      const d = diffDays(c.data_envio_cliente); const r = rangeBucket(d);
      if (!cmap[c.cliente]) cmap[c.cliente] = {};
      cmap[c.cliente][r] = (cmap[c.cliente][r] ?? 0) + (c.vl_bruto ?? 0);
      ctot[c.cliente] = (ctot[c.cliente] ?? 0) + (c.vl_bruto ?? 0);
    });
    const rows = Object.entries(cmap).map(([cl, rv]) => ({ cl, rv, total: ctot[cl] ?? 0 })).sort((a,b) => b.total - a.total);
    const tm = Object.entries(ctot).sort((a,b) => b[1]-a[1]).map(([l,v],i) => ({ label: l, value: v, color: TM_C[i % TM_C.length] }));
    return { rows, tm, total: filtered.reduce((s,c) => s + (c.vl_bruto ?? 0), 0) };
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...S.neo, padding: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 24, color: "#f97316", fontFamily: "'Syne',sans-serif" }}>{fmtK(total)}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Aguardando resposta do cliente</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...S.neo, padding: 16, overflowX: "auto" }}>
          <div style={S.h3}>📊 Cliente × Faixas de Dias</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={S.th}>Cliente</th>
              {["0-10","11-20","21-30","30+"].map((r,i) => <th key={r} style={{ ...S.th, textAlign: "right", color: RANGE_C[i] }}>{r}</th>)}
              <th style={{ ...S.th, textAlign: "right", color: T.accent }}>Total</th>
            </tr></thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={S.tr(i)}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{row.cl}</td>
                  {(["0-10","11-20","21-30","30+"] as const).map((r,ri) => (
                    <td key={r} style={{ ...S.td, textAlign: "right", color: RANGE_C[ri] }}>{row.rv[r] ? fmtK(row.rv[r]) : "—"}</td>
                  ))}
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: T.accent }}>{fmtK(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ ...S.neo, padding: 16 }}>
          <div style={S.h3}>🗺️ Treemap por Cliente</div>
          {tm.length > 0 ? <Treemap items={tm} h={280} /> : <div style={{ color: T.muted, fontSize: 12 }}>Sem dados</div>}
        </div>
      </div>
      <DrillBarChart data={data.filter(c => c.status === "Aguardando Resposta do Cliente")} S={S} T={T} title="👥 Ag. Resposta — Cliente / Plataforma / WO" />
    </div>
  );
}

/* ========== PAGE DRAFT ========== */
function PageDraft({ data, S, T }: { data: Conta[]; S: ReturnType<typeof mkStyles>; T: typeof LIGHT }) {
  const { rows, tm, rangeTot, grand } = useMemo(() => {
    const cmap: Record<string, Record<string, number>> = {};
    const ctot: Record<string, number> = {};
    const rangeTot: Record<string, number> = { "0-10": 0, "11-20": 0, "21-30": 0, "30+": 0 };
    data.filter(c => c.data_draft).forEach(c => {
      if (!c.cliente) return;
      const d = diffDays(c.data_draft); const r = rangeBucket(d);
      if (!cmap[c.cliente]) cmap[c.cliente] = {};
      cmap[c.cliente][r] = (cmap[c.cliente][r] ?? 0) + (c.vl_bruto ?? 0);
      ctot[c.cliente] = (ctot[c.cliente] ?? 0) + (c.vl_bruto ?? 0);
      rangeTot[r] += (c.vl_bruto ?? 0);
    });
    const rows = Object.entries(cmap).map(([cl, rv]) => ({ cl, rv, total: ctot[cl] ?? 0 })).sort((a,b) => b.total - a.total);
    const tm = Object.entries(ctot).sort((a,b) => b[1]-a[1]).map(([l,v],i) => ({ label: l, value: v, color: TM_C[i % TM_C.length] }));
    return { rows, tm, rangeTot, grand: Object.values(rangeTot).reduce((a,b) => a+b, 0) };
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {(["0-10","11-20","21-30","30+"] as const).map((r,i) => (
          <div key={r} style={{ ...S.neo, padding: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: RANGE_C[i], fontFamily: "'Syne',sans-serif" }}>{fmtK(rangeTot[r] ?? 0)}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{r} dias</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...S.neo, padding: 16, overflowX: "auto" }}>
          <div style={S.h3}>📝 Draft × Faixas de Dias</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={S.th}>Cliente</th>
              {["0-10","11-20","21-30","30+"].map((r,i) => <th key={r} style={{ ...S.th, textAlign: "right", color: RANGE_C[i] }}>{r}</th>)}
              <th style={{ ...S.th, textAlign: "right", color: T.accent }}>Total</th>
            </tr></thead>
            <tbody>
              {rows.slice(0,20).map((row, i) => (
                <tr key={i} style={S.tr(i)}>
                  <td style={{ ...S.td, fontWeight: 600, whiteSpace: "nowrap" }}>{row.cl}</td>
                  {(["0-10","11-20","21-30","30+"] as const).map((r,ri) => (
                    <td key={r} style={{ ...S.td, textAlign: "right", color: RANGE_C[ri] }}>{row.rv[r] ? fmtK(row.rv[r]) : "—"}</td>
                  ))}
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: T.accent }}>{fmtK(row.total)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: `2px solid ${T.shadowD}` }}>
                <td style={{ ...S.td, fontWeight: 800 }}>Total</td>
                {(["0-10","11-20","21-30","30+"] as const).map((r,ri) => (
                  <td key={r} style={{ ...S.td, textAlign: "right", fontWeight: 800, color: RANGE_C[ri] }}>{fmtK(rangeTot[r] ?? 0)}</td>
                ))}
                <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: T.accent }}>{fmtK(grand)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ ...S.neo, padding: 16 }}>
          <div style={S.h3}>🗺️ Draft × Faturamento</div>
          {tm.length > 0 ? <Treemap items={tm} h={300} /> : <div style={{ color: T.muted, fontSize: 12 }}>Sem dados</div>}
        </div>
      </div>
      <DrillBarChart data={data.filter(c => !!c.data_draft)} S={S} T={T} title="👥 Drafts — Cliente / Plataforma / WO" />
    </div>
  );
}

/* ========== PAGE MENSAL ========== */
function PageMensal({ data, S, T }: { data: Conta[]; S: ReturnType<typeof mkStyles>; T: typeof LIGHT }) {
  const { dailyD, matrix, meses, avg } = useMemo(() => {
    const dayMap: Record<string,number> = {};
    const cmm: Record<string, Record<string,number>> = {};
    const mesSet = new Set<string>();
    const clSet = new Set<string>();
    data.forEach(c => {
      const d = c.data_doc ?? c.prev_fat; if (!d) return;
      const day = d.slice(0,10), mes = d.slice(0,7);
      dayMap[day] = (dayMap[day] ?? 0) + (c.vl_bruto ?? 0);
      if (c.cliente) {
        clSet.add(c.cliente); mesSet.add(mes);
        if (!cmm[c.cliente]) cmm[c.cliente] = {};
        cmm[c.cliente][mes] = (cmm[c.cliente][mes] ?? 0) + (c.vl_bruto ?? 0);
      }
    });
    const dailyD = Object.entries(dayMap).sort(([a],[b]) => a.localeCompare(b)).map(([d,v]) => ({ d: d.slice(5), v }));
    const avg = dailyD.length > 0 ? dailyD.reduce((s,x) => s + x.v, 0) / dailyD.length : 0;
    const meses = [...mesSet].sort();
    const matrix = [...clSet].sort().map(cl => ({ cl, mv: Object.fromEntries(meses.map(m => [m, cmm[cl]?.[m] ?? 0])), total: meses.reduce((s,m) => s + (cmm[cl]?.[m] ?? 0), 0) })).sort((a,b) => b.total - a.total);
    return { dailyD, matrix, meses, avg };
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...S.neo, padding: 16 }}>
        <div style={S.h3}>📅 Faturamento por Dia</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyD} barSize={5}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.shadowD} vertical={false} />
            <XAxis dataKey="d" tick={{ fontSize: 8, fill: T.muted }} interval={6} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 9, fill: T.muted }} />
            <Tooltip formatter={(v: number) => [fmtBRL(v),"Valor"]} contentStyle={{ background: T.card, border: "none", borderRadius: 8, fontSize: 11 }} />
            <ReferenceLine y={avg} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Média: ${fmtK(avg)}`, fill: "#f59e0b", fontSize: 9, position: "right" }} />
            <Bar dataKey="v" fill="#3b82f6" radius={[2,2,0,0]} fillOpacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ ...S.neo, padding: 16, overflowX: "auto" }}>
        <div style={S.h3}>📊 Cliente × Mês</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={S.th}>Cliente</th>
            {meses.map(m => {
              const [, mm] = m.split("-");
              return <th key={m} style={{ ...S.th, textAlign: "right", whiteSpace: "nowrap" }}>{MESES[parseInt(mm)-1]} {m.slice(0,4)}</th>;
            })}
            <th style={{ ...S.th, textAlign: "right", color: T.accent }}>Total</th>
          </tr></thead>
          <tbody>
            {matrix.slice(0,20).map((row, i) => (
              <tr key={i} style={S.tr(i)}>
                <td style={{ ...S.td, fontWeight: 600, whiteSpace: "nowrap" }}>{row.cl}</td>
                {meses.map(m => <td key={m} style={{ ...S.td, textAlign: "right", color: row.mv[m] > 0 ? T.text : T.shadowD }}>{row.mv[m] > 0 ? fmtK(row.mv[m]) : "—"}</td>)}
                <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: T.accent }}>{fmtK(row.total)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${T.shadowD}` }}>
              <td style={{ ...S.td, fontWeight: 800 }}>Total</td>
              {meses.map(m => <td key={m} style={{ ...S.td, textAlign: "right", fontWeight: 800, color: T.accent }}>{fmtK(matrix.reduce((s,r) => s + (r.mv[m] ?? 0), 0))}</td>)}
              <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: T.accent }}>{fmtK(matrix.reduce((s,r) => s + r.total, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <DrillBarChart data={data} S={S} T={T} title="👥 Mensal — Cliente / Plataforma / WO" />
    </div>
  );
}

/* ========== PAGE CLIENTE ========== */
function PageCliente({ data, S, T }: { data: Conta[]; S: ReturnType<typeof mkStyles>; T: typeof LIGHT }) {
  const cdata = useMemo(() => {
    const ctot: Record<string,number> = {};
    const cmap: Record<string, Record<string,number>> = {};
    data.forEach(c => {
      if (!c.cliente) return;
      const s = c.status ?? "";
      if (!cmap[c.cliente]) cmap[c.cliente] = {};
      cmap[c.cliente][s] = (cmap[c.cliente][s] ?? 0) + (c.vl_bruto ?? 0);
      ctot[c.cliente] = (ctot[c.cliente] ?? 0) + (c.vl_bruto ?? 0);
    });
    return Object.entries(ctot).map(([cl, total]) => ({ cl, total, statuses: cmap[cl] ?? {} })).sort((a,b) => b.total - a.total);
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Drill-down chart replaces static bar chart */}
      <DrillBarChart data={data} S={S} T={T} title="👥 Clientes a Receber — Cliente / Plataforma / WO" />
      <div style={{ ...S.neo, padding: 16, overflowX: "auto" }}>
        <div style={S.h3}>📋 Detalhe por Cliente</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={S.th}>Cliente</th>
            <th style={{ ...S.th, textAlign: "right" }}>Total Bruto</th>
            <th style={S.th}>Status Dominante</th>
          </tr></thead>
          <tbody>
            {cdata.slice(0,20).map((row, i) => {
              const top = Object.entries(row.statuses).sort((a,b) => b[1]-a[1])[0];
              return (
                <tr key={i} style={S.tr(i)}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{row.cl}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 800, color: T.accent }}>{fmtBRL(row.total)}</td>
                  <td style={S.td}>{top && <span style={S.badge(top[0])}>{top[0]}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========== MAIN DASHBOARD ========== */

export default function Dashboard({ dark = false, onToggleDark, page = "status", onPageChange }: {
  dark?: boolean; onToggleDark?: () => void;
  page?: string; onPageChange?: (p: string) => void;
}) {
  const T = dark ? DARK : LIGHT;
  const S = mkStyles(T);
  const [filters, setFilters] = useState<DashFilters>({
    ano: "", mes: "", cliente: "", plataforma: "",
    doc: "", status: "", escopo: "", faturado_por: ""
  });
  const [all, setAll] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<{ clientes: string[]; plataformas: string[] }>({ clientes: [], plataformas: [] });

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/contas-receber/?limit=2000`)
      .then(r => r.json())
      .then(d => {
        const items: Conta[] = Array.isArray(d) ? d : (d.items ?? []);
        setAll(items);
        setMeta({
          clientes: [...new Set(items.map(x => x.cliente).filter(Boolean) as string[])].sort(),
          plataformas: [...new Set(items.map(x => x.plataforma).filter(Boolean) as string[])].sort(),
        });
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const data = useMemo(() => {
    let d = all;
    if (filters.ano)        d = d.filter(c => (c.data_doc ?? "").startsWith(filters.ano));
    if (filters.mes && filters.ano) d = d.filter(c => (c.data_doc ?? "").startsWith(`${filters.ano}-${filters.mes}`));
    if (filters.cliente)    d = d.filter(c => c.cliente === filters.cliente);
    if (filters.plataforma) d = d.filter(c => c.plataforma === filters.plataforma);
    if (filters.doc)        d = d.filter(c => c.doc === filters.doc);
    if (filters.escopo)     d = d.filter(c => c.escopo === filters.escopo);
    if (filters.faturado_por) d = d.filter(c => (c.faturado_por ?? "").toLowerCase().includes(filters.faturado_por.toLowerCase()));
    if (filters.status)     d = d.filter(c => c.status === filters.status);
    return d;
  }, [all, filters]);

  return (
    <div style={{ ...S.wrap }}>
      {/* ── FILTERS ── */}
      <div style={{ ...S.neo, padding: "10px 16px", marginBottom: 12, display: "flex", flexWrap: "wrap" as const, gap: 8, alignItems: "flex-end" }}>
        <div>
          <span style={S.label}>Ano</span>
          <select style={{ ...S.sel, padding: "6px 10px", fontSize: 11 }} value={filters.ano} onChange={e => setFilters(f => ({ ...f, ano: e.target.value }))}>
            <option value="">Todos</option>
            {["2023","2024","2025","2026"].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <span style={S.label}>Mês</span>
          <select style={{ ...S.sel, padding: "6px 10px", fontSize: 11 }} value={filters.mes} onChange={e => setFilters(f => ({ ...f, mes: e.target.value }))}>
            <option value="">Todos</option>
            {["01","02","03","04","05","06","07","08","09","10","11","12"].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <span style={S.label}>Cliente</span>
          <select style={{ ...S.sel, padding: "6px 10px", fontSize: 11, minWidth: 130 }} value={filters.cliente} onChange={e => setFilters(f => ({ ...f, cliente: e.target.value }))}>
            <option value="">Todos</option>
            {meta.clientes.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <span style={S.label}>Plataforma</span>
          <select style={{ ...S.sel, padding: "6px 10px", fontSize: 11, minWidth: 130 }} value={filters.plataforma} onChange={e => setFilters(f => ({ ...f, plataforma: e.target.value }))}>
            <option value="">Todos</option>
            {meta.plataformas.slice(0,50).map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <span style={S.label}>Doc</span>
          <select style={{ ...S.sel, padding: "6px 10px", fontSize: 11 }} value={filters.doc} onChange={e => setFilters(f => ({ ...f, doc: e.target.value }))}>
            <option value="">Todos</option>
            {["NFSe","FAT. LOC.","DANFE","NFSe(ex)","Nota de Débito"].map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <span style={S.label}>Escopo</span>
          <select style={{ ...S.sel, padding: "6px 10px", fontSize: 11 }} value={filters.escopo} onChange={e => setFilters(f => ({ ...f, escopo: e.target.value }))}>
            <option value="">Todos</option>
            {["SERVIÇO","LOCAÇÃO","VENDA","CRÉDITO"].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <span style={S.label}>Fat. Por</span>
          <select style={{ ...S.sel, padding: "6px 10px", fontSize: 11 }} value={filters.faturado_por} onChange={e => setFilters(f => ({ ...f, faturado_por: e.target.value }))}>
            <option value="">Todos</option>
            <option>Rio</option><option>Macaé</option>
          </select>
        </div>
        <div>
          <span style={S.label}>Status</span>
          <select style={{ ...S.sel, padding: "6px 10px", fontSize: 11, minWidth: 140 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">Todos</option>
            {["PAGO","Programado","Em andamento","Aguardando Pagamento","Aguardando Resposta do Cliente","Aguardando Documentação","Aguardando PO","Enviar NF","Previsão","Free Of Charge"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {Object.values(filters).some(v => v !== "") && (
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 11, fontWeight: 700, padding: "6px 10px", marginTop: 14 }}
            onClick={() => setFilters({ ano: "", mes: "", cliente: "", plataforma: "", doc: "", status: "", escopo: "", faturado_por: "" })}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div style={{ ...S.neo, padding: 14, marginBottom: 12, borderLeft: "4px solid #ef4444" }}>
          <div style={{ fontWeight: 700, color: "#ef4444", fontSize: 13 }}>⚠️ Backend não encontrado</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Verifique se o servidor está rodando em <code>http://localhost:8000</code></div>
        </div>
      )}

      {/* ── CONTENT + CALENDAR SIDEBAR ── */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Page content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading && <div style={{ color: T.muted, fontSize: 13, padding: 20 }}>Carregando...</div>}
          {!loading && (
            <>
              {page === "status"   && <PageStatus   data={data} S={S} T={T} />}
              {page === "faturar"  && <PageFaturar  data={data} S={S} T={T} />}
              {page === "doc"      && <PageDoc      data={data} S={S} T={T} />}
              {page === "resposta" && <PageResposta data={data} S={S} T={T} />}
              {page === "draft"    && <PageDraft    data={data} S={S} T={T} />}
              {page === "mensal"   && <PageMensal   data={data} S={S} T={T} />}
              {page === "cliente"  && <PageCliente  data={data} S={S} T={T} />}
            </>
          )}
        </div>
        {/* Calendar heatmap sidebar */}
        <div style={{ width: 230, flexShrink: 0 }}>
          <CalendarHeatmap data={data} filters={filters} S={S} T={T} />
        </div>
      </div>
    </div>
  );
}
