import Dashboard from "./Dashboard";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { initMsal, getSpAccount, loginSharePoint, logoutSharePoint, postWOToSharePoint, getListItems, getToken, listWOs, createWO, updateWO, deleteWO, getListFields, listProjects, createProject, updateProject, deleteProject, createConta, updateConta, deleteConta, listProjetosFromSP, createProjeto, updateProjeto, deleteProjeto, ID_COUNTRY_BR, type WOItem, type ProjectItem } from "./services/sharepoint";

import { STATIC_DRAFTS, STATIC_CLIENTES_PRAZOS } from "./staticData";
import STATIC_PROJETOS_RAW from "./staticProjetos.json";
import STATIC_QUALTECH_PROJECTS from "./staticQualtechProjects.json";


type Tab = "contas" | "dashboard" | "impostos" | "clientes" | "projetos" | "drafts" | "feriados"
         | "qualtech_projects";

const STATIC_IMPOSTOS: Imposto[] = [
  { id:1,  nome:"COFINS", tipo:"retido_fonte", tipo_documento:"NFSe",  tipo_servico:undefined, cidade:undefined, aliquota:0.03,   vigencia_inicio:"2020-01-01", ativo:true },
  { id:2,  nome:"CSLL",   tipo:"retido_fonte", tipo_documento:"NFSe",  tipo_servico:undefined, cidade:undefined, aliquota:0.01,   vigencia_inicio:"2020-01-01", ativo:true },
  { id:3,  nome:"IRPJ",   tipo:"retido_fonte", tipo_documento:"NFSe",  tipo_servico:undefined, cidade:undefined, aliquota:0.015,  vigencia_inicio:"2020-01-01", ativo:true },
  { id:4,  nome:"PIS",    tipo:"retido_fonte", tipo_documento:"NFSe",  tipo_servico:undefined, cidade:undefined, aliquota:0.0065, vigencia_inicio:"2020-01-01", ativo:true },
  { id:5,  nome:"COFINS", tipo:"a_pagar",      tipo_documento:undefined,tipo_servico:undefined, cidade:undefined, aliquota:0.076,  vigencia_inicio:"2020-01-01", ativo:true },
  { id:6,  nome:"CSLL",   tipo:"a_pagar",      tipo_documento:undefined,tipo_servico:undefined, cidade:undefined, aliquota:0.0288, vigencia_inicio:"2020-01-01", ativo:true },
  { id:7,  nome:"ICMS",   tipo:"a_pagar",      tipo_documento:"DANFE", tipo_servico:undefined, cidade:undefined, aliquota:0.2,    vigencia_inicio:"2020-01-01", ativo:true },
  { id:8,  nome:"IRPJ",   tipo:"a_pagar",      tipo_documento:undefined,tipo_servico:undefined, cidade:undefined, aliquota:0.048,  vigencia_inicio:"2020-01-01", ativo:true },
  { id:9,  nome:"PIS",    tipo:"a_pagar",      tipo_documento:undefined,tipo_servico:undefined, cidade:undefined, aliquota:0.0165, vigencia_inicio:"2020-01-01", ativo:true },
  { id:10, nome:"INSS",   tipo:"retido_fonte", tipo_documento:"NFSe",  tipo_servico:"CONTRATO", cidade:undefined, aliquota:0.11,   vigencia_inicio:"2020-01-01", ativo:true },
];

const STATIC_FERIADOS: Feriado[] = [
  { id:1,  data:"2025-01-01", nome:"Confraternização Universal",  tipo:"nacional", pais:"BR" },
  { id:2,  data:"2025-04-21", nome:"Tiradentes",                  tipo:"nacional", pais:"BR" },
  { id:3,  data:"2025-05-01", nome:"Dia do Trabalho",             tipo:"nacional", pais:"BR" },
  { id:4,  data:"2025-09-07", nome:"Independência do Brasil",     tipo:"nacional", pais:"BR" },
  { id:5,  data:"2025-12-25", nome:"Natal",                       tipo:"nacional", pais:"BR" },
  { id:6,  data:"2026-01-01", nome:"Confraternização Universal",  tipo:"nacional", pais:"BR" },
  { id:7,  data:"2026-02-16", nome:"Carnaval (segunda)",          tipo:"nacional", pais:"BR" },
  { id:8,  data:"2026-02-17", nome:"Carnaval (terça)",            tipo:"nacional", pais:"BR" },
  { id:9,  data:"2026-04-03", nome:"Sexta-Feira Santa",           tipo:"nacional", pais:"BR" },
  { id:10, data:"2026-04-05", nome:"Páscoa",                      tipo:"nacional", pais:"BR" },
  { id:11, data:"2026-04-21", nome:"Tiradentes",                  tipo:"nacional", pais:"BR" },
  { id:12, data:"2026-05-01", nome:"Dia do Trabalho",             tipo:"nacional", pais:"BR" },
  { id:13, data:"2026-06-04", nome:"Corpus Christi",              tipo:"nacional", pais:"BR" },
  { id:14, data:"2026-09-07", nome:"Independência do Brasil",     tipo:"nacional", pais:"BR" },
  { id:15, data:"2026-10-12", nome:"Nossa Senhora Aparecida",     tipo:"nacional", pais:"BR" },
  { id:16, data:"2026-11-02", nome:"Finados",                     tipo:"nacional", pais:"BR" },
  { id:17, data:"2026-11-15", nome:"Proclamação da República",    tipo:"nacional", pais:"BR" },
  { id:18, data:"2026-11-20", nome:"Consciência Negra",           tipo:"nacional", pais:"BR" },
  { id:19, data:"2026-12-25", nome:"Natal",                       tipo:"nacional", pais:"BR" },
  { id:20, data:"2027-01-01", nome:"Confraternização Universal",  tipo:"nacional", pais:"BR" },
  { id:21, data:"2027-03-01", nome:"Carnaval (segunda)",          tipo:"nacional", pais:"BR" },
  { id:22, data:"2027-03-02", nome:"Carnaval (terça)",            tipo:"nacional", pais:"BR" },
  { id:23, data:"2027-03-26", nome:"Sexta-Feira Santa",           tipo:"nacional", pais:"BR" },
  { id:24, data:"2027-03-28", nome:"Páscoa",                      tipo:"nacional", pais:"BR" },
  { id:25, data:"2027-04-21", nome:"Tiradentes",                  tipo:"nacional", pais:"BR" },
  { id:26, data:"2027-05-01", nome:"Dia do Trabalho",             tipo:"nacional", pais:"BR" },
  { id:27, data:"2027-05-27", nome:"Corpus Christi",              tipo:"nacional", pais:"BR" },
  { id:28, data:"2027-09-07", nome:"Independência do Brasil",     tipo:"nacional", pais:"BR" },
  { id:29, data:"2027-10-12", nome:"Nossa Senhora Aparecida",     tipo:"nacional", pais:"BR" },
  { id:30, data:"2027-11-02", nome:"Finados",                     tipo:"nacional", pais:"BR" },
  { id:31, data:"2027-11-15", nome:"Proclamação da República",    tipo:"nacional", pais:"BR" },
  { id:32, data:"2027-11-20", nome:"Consciência Negra",           tipo:"nacional", pais:"BR" },
  { id:33, data:"2027-12-25", nome:"Natal",                       tipo:"nacional", pais:"BR" },
];

interface ContaReceber {
  id?: number; wo?: number; draft_id?: number; draft_codigo?: number; _novaDraft?: boolean;
  cliente?: string; plataforma?: string; coord_focal?: string; tipo_servico?: string;
  exterior_com_iss?: boolean; proposta_comercial?: string; po_contrato?: string;
  doc?: string; num_doc?: string; data_doc?: string; data_draft?: string;
  escopo?: string; faturado_por?: string; vl_bruto?: number;
  cofins_3?: number; csll_1?: number; inss_11?: number; irpj_15?: number;
  pis_065?: number; iss_retido?: number; total_retido?: number; vl_liquido?: number;
  status?: string; obs?: string; id_ticket_req?: string;
  data_envio_cliente?: string; data_pgto?: string; vencimento?: string;
  prev_fat?: string; prev_pag?: string; data_inicio?: string; data_fim?: string;
}
interface Imposto { id?: number; nome: string; tipo: string; tipo_documento?: string; tipo_servico?: string; cidade?: string; aliquota: number; vigencia_inicio: string; vigencia_fim?: string; ativo?: boolean; }
interface ClientePrazo { id?: number; cliente: string; rec_doc: number; medicao: number; resp_cli: number; vencimento: number; cambio: number; total_dias?: number; data_limite: number; }
interface Projeto { id?: number; wo: number; cliente?: string; plataforma?: string; coordenador?: string; tipo_servico?: string; ativo?: boolean; vl_diaria?: number; vl_diaria_locacao?: number; vl_outros?: number; }
interface Draft { id?: number; codigo: number; data_draft?: string; descricao?: string; ativo?: boolean; }
interface Feriado { id?: number; data: string; nome: string; tipo: string; estado?: string; municipio?: string; pais: string; }


const fmt = {
  brl: (v?: number) => v != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "-",
  pct: (v?: number) => v != null ? `${(v * 100).toFixed(2)}%` : "-",
  date: (v?: string) => {
    if (!v) return "-";
    const s = String(v);
    // SP OData verbose: /Date(1234567890000)/ ou /Date(1234567890000+0000)/
    const spMs = s.match(/\/Date\((-?\d+)(?:[+-]\d+)?\)\//);
    if (spMs) return new Date(parseInt(spMs[1])).toLocaleDateString("pt-BR");
    // ISO com timezone: 2024-01-15T00:00:00Z ou 2024-01-15T00:00:00.000Z
    if (s.includes("T")) return new Date(s).toLocaleDateString("pt-BR");
    // Só data: 2024-01-15
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T12:00:00").toLocaleDateString("pt-BR");
    return "-";
  },
  num: (v?: number) => v != null ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "",
};

const THEMES = {
  light: { bg: "#E9EDF0", card: "#EDF1F4", shadowD: "#c8cdd6", shadowL: "#ffffff", text: "#1e293b", muted: "#64748b", accent: "#1a5ea8" },
  dark:  { bg: "#151924", card: "#1b2030", shadowD: "#10131c", shadowL: "#222840", text: "#e2e8f0", muted: "#94a3b8", accent: "#60a5fa" },
};

// N is the active theme — set by App() at runtime via applyTheme()
let N = THEMES.light;
let neo = `5px 5px 12px ${N.shadowD}, -3px -3px 8px ${N.shadowL}`;
let inset = `inset 3px 3px 8px ${N.shadowD}, inset -2px -2px 6px ${N.shadowL}`;

function buildStyles(t: typeof THEMES.light) {
  const _neo = `5px 5px 12px ${t.shadowD}, -3px -3px 8px ${t.shadowL}`;
  const _inset = `inset 3px 3px 8px ${t.shadowD}, inset -2px -2px 6px ${t.shadowL}`;
  return {
    app: { fontFamily: "Inter, Segoe UI, sans-serif", background: t.bg, minHeight: "100vh", fontSize: 13, color: t.text, transition: "background .3s, color .3s" },
    header: { background: t.card, boxShadow: _neo, borderRadius: 14, padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, margin: "12px 16px 0", transition: "background .3s" },
    nav: { background: t.card, boxShadow: _neo, borderRadius: 10, display: "flex", padding: "4px 8px", overflowX: "auto" as const, gap: 4, margin: "8px 16px", transition: "background .3s" },
    page: { padding: "0 16px 16px" },
    card: { background: t.card, borderRadius: 14, boxShadow: _neo, marginBottom: 16, overflow: "hidden" },
    cardHeader: { background: t.bg, borderBottom: `1px solid ${t.shadowD}`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    cardTitle: { fontWeight: 700, color: t.text, fontSize: 13 },
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12 },
    th: { background: "transparent", color: t.muted, padding: "8px 10px", textAlign: "left" as const, fontWeight: 700, whiteSpace: "nowrap" as const, borderBottom: `1px solid ${t.shadowD}`, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
    td: { padding: "7px 10px", borderBottom: `1px solid ${t.bg}`, verticalAlign: "middle" as const, color: t.text },
    input: { width: "100%", padding: "7px 10px", border: "none", borderRadius: 10, fontSize: 12, boxSizing: "border-box" as const, background: t.bg, boxShadow: _inset, color: t.text },
    select: { width: "100%", padding: "7px 10px", border: "none", borderRadius: 10, fontSize: 12, background: t.bg, boxShadow: _inset, color: t.text, boxSizing: "border-box" as const },
    label: { display: "block", fontSize: 11, fontWeight: 600, color: t.muted, marginBottom: 4 },
    stat: { background: t.card, borderRadius: 14, padding: "12px 16px", boxShadow: _neo, flex: 1 },
    modal: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    modalBox: { background: t.card, borderRadius: 14, width: "min(900px,95vw)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 50px rgba(0,0,0,.4)" },
    filters: { background: t.card, borderRadius: 14, boxShadow: _neo, padding: "12px 16px", marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" as const, alignItems: "flex-end" },
  } as Record<string, React.CSSProperties>;
}

let S = buildStyles(N);

const btn = (color?: string): React.CSSProperties => ({ background: color || N.accent, color: "#fff", border: "none", padding: "7px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, boxShadow: `3px 3px 8px ${N.shadowD}, -2px -2px 6px ${N.shadowL}` });
const btnSm = (color?: string): React.CSSProperties => ({ background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: "2px 5px", color: color || N.accent, lineHeight: 1 });
const grid = (cols: number): React.CSSProperties => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 });
const navBtn = (active: boolean): React.CSSProperties => ({ background: active ? N.accent : "transparent", color: active ? "#fff" : N.muted, border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400, whiteSpace: "nowrap" as const, boxShadow: active ? `inset 2px 2px 6px rgba(0,0,0,.2)` : "none", transition: "all .15s" });

const STATUS_COLORS: Record<string, [string, string]> = {
  "PAGO": ["#dcfce7", "#166534"], "Programado": ["#dbeafe", "#1e40af"],
  "Aguardando Pagamento": ["#fef9c3", "#854d0e"], "Em andamento": ["#e0f2fe", "#0c4a6e"],
  "Previsão": ["#f3e8ff", "#6b21a8"], "Enviar NF": ["#ffedd5", "#9a3412"],
};

const Badge = ({ text, doc, color: customColor }: { text: string; doc?: boolean; color?: string }) => {
  const [bg, color] = customColor ? [customColor + "22", customColor] : doc ? ["#dbeafe", "#1e40af"] : (STATUS_COLORS[text] || ["#f1f5f9", "#475569"]);
  return <span style={{ background: bg, color, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" as const }}>{text}</span>;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label style={S.label}>{label}</label>{children}</div>
);

function SearchSelect({ options, value, onChange, placeholder }: {
  options: { id: number; label: string }[];
  value: number | null;
  onChange: (id: number | null, option?: { id: number; label: string } | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 4 }}>
        <input
          style={{ ...S.input, flex: 1 }}
          placeholder={selected ? selected.label : (placeholder ?? "Selecionar...")}
          value={open ? q : (selected ? selected.label : "")}
          onFocus={() => { setOpen(true); setQ(""); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={e => setQ(e.target.value)}
        />
        {value !== null && (
          <button type="button" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", padding: "0 8px", fontSize: 12, color: N.muted }}
            onMouseDown={e => { e.preventDefault(); onChange(null); setQ(""); }}>✕</button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", zIndex: 999, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.12)", maxHeight: 200, overflowY: "auto", width: "100%", top: "calc(100% + 2px)" }}>
          {filtered.slice(0, 50).map(o => (
            <div key={o.id}
              onMouseDown={e => { e.preventDefault(); onChange(o.id, o); setOpen(false); setQ(""); }}
              style={{ padding: "7px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f1f5f9" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              <span style={{ fontWeight: 600, color: N.accent }}>{o.id}</span>
              <span style={{ color: N.text, marginLeft: 8 }}>{o.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Input de moeda: exibe R$ 1.234,56 quando desfocado, edita como "1234,56" quando focado */
function CurrencyInput({ value, onChange, style, bold }: { value?: number; onChange: (v: number | undefined) => void; style?: React.CSSProperties; bold?: boolean }) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  const formatted = value != null
    ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";

  return (
    <input
      style={{ ...style, fontWeight: bold ? 700 : undefined }}
      value={focused ? raw : formatted}
      placeholder="0,00"
      onFocus={() => {
        setRaw(value != null ? String(value).replace(".", ",") : "");
        setFocused(true);
      }}
      onChange={e => setRaw(e.target.value)}
      onBlur={() => {
        setFocused(false);
        // aceita tanto "1234,56" quanto "1.234,56" quanto "1234.56"
        const clean = raw.replace(/\./g, "").replace(",", ".");
        const parsed = parseFloat(clean);
        onChange(isNaN(parsed) ? undefined : +parsed.toFixed(2));
      }}
    />
  );
}

const Section = ({ title }: { title: string }) => (
  <div style={{ gridColumn: "1/-1", background: "#f1f5f9", borderRadius: 6, padding: "5px 10px", fontWeight: 700, fontSize: 11, color: "#475569", textTransform: "uppercase" as const, marginTop: 4 }}>{title}</div>
);

function calcImpostos(f: ContaReceber): Partial<ContaReceber> {
  // Espelha exatamente a lógica do backend (tax_calculator.py)
  const vl = f.vl_bruto || 0;
  const isNFSe = ["NFSe", "NFSe(ex)"].includes(f.doc || "");
  const fatPor = (f.faturado_por || "").toLowerCase().trim();
  const isMacae = fatPor.includes("mac");
  const isRio   = fatPor.includes("rio");
  // ISS só incide se Faturado Por estiver preenchido com Rio ou Macaé
  const issRate    = isMacae ? 0.02 : 0.05;
  const temFatPor  = isRio || isMacae;
  const cofins_3   = isNFSe ? vl * 0.03   : 0;
  const csll_1     = isNFSe ? vl * 0.01   : 0;
  const irpj_15    = isNFSe ? vl * 0.015  : 0;
  const pis_065    = isNFSe ? vl * 0.0065 : 0;
  const iss_retido = isNFSe && temFatPor ? vl * issRate : 0;
  const total_retido = cofins_3 + csll_1 + irpj_15 + pis_065 + iss_retido;
  const vl_liquido   = vl - total_retido;
  const r = (x: number) => +x.toFixed(2);
  return { cofins_3: r(cofins_3), csll_1: r(csll_1), irpj_15: r(irpj_15), pis_065: r(pis_065), iss_retido: r(iss_retido), total_retido: r(total_retido), vl_liquido: r(vl_liquido) };
}

// ===== CONTA FORM =====
function ContaForm({ conta, onSave, onClose, drafts, projetos, onDraftsChanged, spAccount }: { conta: ContaReceber; onSave: (c: ContaReceber) => void; onClose: () => void; drafts: Draft[]; projetos: Projeto[]; onDraftsChanged?: () => void; spAccount?: { name?: string; username?: string } | null }) {
  // Para nova conta, draft_id=0 significa "criar nova draft ao salvar"
  const defaultDraftId = !conta.id ? 0 : (conta.draft_id ?? 0);
  const [form, setForm] = useState<ContaReceber>({ ...conta, draft_id: defaultDraftId });
  const [projData, setProjData] = useState<{ vl_diaria?: number; vl_diaria_locacao?: number; vl_outros?: number }>({});
  const [closeHover, setCloseHover] = useState(false);
  const [spWOs, setSpWOs] = useState<any[]>([]);
  const proximoCodigo = drafts[0] ? drafts[0].codigo + 1 : 1;

  useEffect(() => {
    if (spAccount) {
      getListItems('ListaWOs')
        .then(items => setSpWOs(items))
        .catch(err => console.error('Erro ao buscar ListaWOs:', err));
    }
  }, [spAccount]);

  const calcVlBruto = (f: ContaReceber, pd: typeof projData): number | undefined => {
    if (!f.data_inicio || !f.data_fim) return undefined;
    const dias = Math.round((new Date(f.data_fim + "T12:00:00").getTime() - new Date(f.data_inicio + "T12:00:00").getTime()) / 86400000) + 1;
    if (dias <= 0) return undefined;
    if (f.escopo === "SERVIÇO") {
      return pd.vl_diaria != null ? pd.vl_diaria * dias : undefined;
    } else {
      if (pd.vl_diaria_locacao == null) return undefined;
      return pd.vl_diaria_locacao * dias + (pd.vl_outros || 0);
    }
  };

  // Breakdown para exibir no form
  const calcBreakdown = (): string | null => {
    if (!form.data_inicio || !form.data_fim) return null;
    const dias = Math.round((new Date(form.data_fim + "T12:00:00").getTime() - new Date(form.data_inicio + "T12:00:00").getTime()) / 86400000) + 1;
    if (dias <= 0) return null;
    const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    if (form.escopo === "SERVIÇO") {
      if (projData.vl_diaria == null) return `${dias} dias corridos · sem Vl. Diária cadastrado no Projeto WO`;
      return `${dias} dias corridos × ${brl(projData.vl_diaria)}/dia = ${brl(dias * projData.vl_diaria)}`;
    } else {
      if (projData.vl_diaria_locacao == null) return `${dias} dias corridos · sem Vl. Diária Locação cadastrado no Projeto WO`;
      const sub = projData.vl_diaria_locacao * dias;
      const outros = projData.vl_outros || 0;
      return outros
        ? `${dias} dias × ${brl(projData.vl_diaria_locacao)}/dia = ${brl(sub)}  +  Vl.Outros ${brl(outros)}  =  ${brl(sub + outros)}`
        : `${dias} dias corridos × ${brl(projData.vl_diaria_locacao)}/dia = ${brl(sub)}`;
    }
  };

  const handleChange = (k: keyof ContaReceber, v: any) => {
    const updated = { ...form, [k]: v };
    if (["escopo", "data_inicio", "data_fim"].includes(k as string)) {
      const newVl = calcVlBruto(updated, projData);
      if (newVl != null) updated.vl_bruto = +newVl.toFixed(2);
    }
    if (["vl_bruto", "doc", "faturado_por", "escopo", "data_inicio", "data_fim"].includes(k as string)) {
      setForm({ ...updated, ...calcImpostos(updated) });
    } else {
      setForm(updated);
    }
  };

  const applyWO = (woNum: number) => {
    // Try SharePoint first if logged in
    if (spAccount && spWOs.length > 0) {
      const spItem = spWOs.find(item => parseInt(item.WO || item.wo) === woNum);
      if (spItem) {
        const cliente = spItem.Client || spItem.cliente || '';
        const plataforma = spItem.Rig || spItem.plataforma || '';
        const updated = { ...form, wo: woNum, cliente, plataforma, coord_focal: form.coord_focal };
        setProjData({ vl_diaria: undefined, vl_diaria_locacao: undefined, vl_outros: undefined });
        setForm(updated);
        return;
      }
    }

    // Fall back to backend projetos
    const proj = projetos.find(p => p.wo === woNum);
    if (!proj) return;
    const pd = { vl_diaria: proj.vl_diaria, vl_diaria_locacao: proj.vl_diaria_locacao, vl_outros: proj.vl_outros };
    setProjData(pd);
    const updated = { ...form, wo: woNum, cliente: proj.cliente, plataforma: proj.plataforma, coord_focal: proj.coordenador };
    const newVl = calcVlBruto(updated, pd);
    if (newVl != null) updated.vl_bruto = +newVl.toFixed(2);
    setForm({ ...updated, ...calcImpostos(updated) });
  };

  const todayLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const handleSave = async () => {
    const finalForm = { ...form };
    // Drafts são estáticos — não cria via API
    if (!finalForm.draft_id) {
      onDraftsChanged?.();
    }
    onSave(finalForm);
    // Post to SharePoint if logged in
    if (spAccount && finalForm.wo && finalForm.cliente && finalForm.plataforma) {
      try {
        await postWOToSharePoint({ wo: finalForm.wo, cliente: finalForm.cliente, plataforma: finalForm.plataforma });
      } catch (err) {
        console.warn('Aviso: não foi possível sincronizar com SharePoint', err);
      }
    }
  };

  return (
    <div style={S.modal} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...S.modalBox, overflow: "hidden", position: "relative" }}>
        {/* Botão fechar — posição absoluta no canto superior direito */}
        <button
          onMouseEnter={() => setCloseHover(true)}
          onMouseLeave={() => setCloseHover(false)}
          onClick={onClose}
          style={{ position: "absolute", top: 12, right: 14, width: 14, height: 14, borderRadius: "50%", background: "#ff5f57", border: "1.5px solid #d94b47", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: closeHover ? "#6b0000" : "transparent", fontWeight: 900, transition: "color .15s", outline: "none", zIndex: 10 }}
          title="Fechar">×</button>

        {/* Header elegante */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 36px 12px 18px", borderBottom: `1px solid ${N.shadowD}` }}>
          <img src="/logo-icon.png" alt="MOS" style={{ height: 38, borderRadius: 8 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: N.text, letterSpacing: "-0.01em" }}>
              {form.id ? `Editar Conta #${form.id}` : "Nova Conta a Receber"}
            </div>
            <div style={{ fontSize: 11, color: N.muted, marginTop: 1, textTransform: "capitalize" as const }}>{todayLabel}</div>
          </div>
        </div>

        {/* Área rolável — scrollbar fica dentro, longe das bordas arredondadas */}
        <div style={{ overflowY: "auto", maxHeight: "calc(90vh - 68px)" }}>
        <div style={{ padding: 20 }}>
          <div style={grid(4)}>
            <Section title="WO / Projeto" />
            <Field label="WO (Project Number)">
              <select style={S.select} value={form.wo || ""} onChange={e => applyWO(+e.target.value)}>
                <option value="">Selecione a WO...</option>
                {spAccount && spWOs.length > 0 ? (
                  <>
                    {spWOs.map((item, i) => {
                      const woNum = parseInt(item.WO || item.wo);
                      const cliente = item.Client || item.cliente || '';
                      return <option key={`sp-${i}`} value={woNum}>{woNum}{cliente ? ` — ${cliente}` : ""}{item.Rig || item.plataforma ? ` · ${item.Rig || item.plataforma}` : ""}</option>;
                    })}
                    {projetos.length > 0 && <option disabled>─── Backend ───</option>}
                  </>
                ) : null}
                {projetos.map(p => (
                  <option key={p.wo} value={p.wo}>{p.wo}{p.cliente ? ` — ${p.cliente}` : ""}{p.plataforma ? ` · ${p.plataforma}` : ""}</option>
                ))}
              </select>
            </Field>
            <Field label="Cliente"><input style={S.input} value={form.cliente || ""} onChange={e => handleChange("cliente", e.target.value)} /></Field>
            <Field label="Plataforma"><input style={S.input} value={form.plataforma || ""} onChange={e => handleChange("plataforma", e.target.value)} /></Field>
            <Field label="Coord. Focal"><input style={S.input} value={form.coord_focal || ""} onChange={e => handleChange("coord_focal", e.target.value)} /></Field>

            <Section title="Documento / Draft" />
            <Field label="Draft">
              <select style={S.select} value={form.draft_id ?? 0} onChange={e => handleChange("draft_id", +e.target.value)}>
                <option value={0}>▶ Nova Draft #{proximoCodigo} (criar ao salvar)</option>
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
            <Field label="Data Início"><input type="date" style={S.input} value={form.data_inicio || ""} onChange={e => handleChange("data_inicio", e.target.value)} /></Field>
            <Field label="Data Fim"><input type="date" style={S.input} value={form.data_fim || ""} onChange={e => handleChange("data_fim", e.target.value)} /></Field>

            <Section title="Valores e Impostos" />
            <div style={{ gridColumn: "1/-1" }}>
              <Field label="Valor Bruto (R$)">
                <CurrencyInput bold style={S.input} value={form.vl_bruto} onChange={v => handleChange("vl_bruto", v ?? 0)} />
              </Field>
              {calcBreakdown() && (
                <div style={{ marginTop: 4, fontSize: 11, color: N.muted, background: N.bg, borderRadius: 6, padding: "4px 8px", boxShadow: `inset 1px 1px 4px ${N.shadowD}` }}>
                  🧮 {calcBreakdown()}
                </div>
              )}
            </div>
            <Field label="Total Retido"><input readOnly style={{ ...S.input, background: "#f1f5f9", fontWeight: 700, color: "#dc2626" }} value={fmt.num(form.total_retido)} /></Field>
            <Field label="Valor Líquido"><input readOnly style={{ ...S.input, background: "#f1f5f9", fontWeight: 700, color: "#059669" }} value={fmt.num(form.vl_liquido)} /></Field>

            {form.vl_bruto ? (
              <div style={{ gridColumn: "1/-1", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                  {[["COFINS 3%", form.cofins_3], ["CSLL 1%", form.csll_1], ["IRPJ 1.5%", form.irpj_15], ["PIS 0.65%", form.pis_065], ["ISS Ret.", form.iss_retido]].map(([l, v]) => (
                    <div key={l as string} style={{ textAlign: "center" as const }}>
                      <div style={{ fontSize: 9, color: "#64748b" }}>{l}</div>
                      <div style={{ fontWeight: 700, color: "#dc2626" }}>{fmt.brl(v as number)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ gridColumn: "1/-1", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#1e40af", lineHeight: 1.6 }}>
              <strong>Cálculos automáticos:</strong> &nbsp;
              <span>• <b>VL.Bruto</b>: WO + Escopo + Data Início/Fim → busca valores do projeto</span> &nbsp;|&nbsp;
              <span>• <b>Vencimento</b> e <b>Prev.Pag</b>: Data Doc + Cliente (cadastrado em Clientes/Prazos)</span> &nbsp;|&nbsp;
              <span>• <b>Prev.Fat</b>: Data Fim + prazo "Rec.Doc" do cliente</span>
            </div>

            <Section title="Status e Datas" />
            <Field label="Status">
              <select style={S.select} value={form.status || "Programado"} onChange={e => handleChange("status", e.target.value)}>
                {["Programado", "Em andamento", "Aguardando Pagamento", "Aguardando Resposta do Cliente", "Aguardando Documentação", "Aguardando PO", "Enviar NF", "PAGO", "Previsão", "Free Of Charge"].map(s => <option key={s}>{s}</option>)}
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
            <button style={btn("#059669")} onClick={handleSave}>💾 Salvar</button>
          </div>
        </div>
        </div>{/* fim área rolável */}
      </div>
    </div>
  );
}

// ===== CONTAS PAGE =====
function ContasPage({ drafts, projetos, onDraftsChanged, spAccount }: { drafts: Draft[]; projetos: Projeto[]; onDraftsChanged?: () => void; spAccount?: { name?: string; username?: string } | null }) {
  const [items, setItems] = useState<ContaReceber[]>([]);
  const [total, setTotal] = useState({ total: 0, total_bruto: 0, total_liquido: 0 });
  const [filters, setFilters] = useState<any>({});
  const [editing, setEditing] = useState<ContaReceber | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  // Dimensões extraídas da lista carregada (sem requisição extra)
  const [dimClientes, setDimClientes] = useState<{id: number; label: string}[]>([]);
  const [dimPlataformas, setDimPlataformas] = useState<{id: number; label: string}[]>([]);
  const [dimStatus, setDimStatus] = useState<string[]>([]);
  const [dimEscopo, setDimEscopo] = useState<string[]>([]);
  const [dimFatPor, setDimFatPor] = useState<string[]>([]);
  // Cache em memória — evita re-fetch ao filtrar
  const allDataRef = useRef<ContaReceber[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<ContaReceber | null>(null);
  // edição inline: { id, field }
  const [inlineEdit, setInlineEdit] = useState<{ id: number; field: string } | null>(null);

  const quickSave = async (row: ContaReceber, field: string, value: string) => {
    setInlineEdit(null);
    if ((row as any)[field] === value) return;
    try { await updateConta(row.id!, { [field]: value }); fetchData(); }
    catch (e: any) { alert(`Erro: ${e.message}`); }
  };

  const duplicate = async (row: ContaReceber) => {
    const ok = confirm(
      `Duplicar este registro?\n\nWO ${row.wo} · ${row.cliente || ""} · ${row.plataforma || ""}\nDoc: ${row.doc || "-"} ${row.num_doc || ""} · ${row.escopo || ""}\n\nUm novo registro idêntico será criado. Você poderá editá-lo em seguida.`
    );
    if (!ok) return;
    const { id, criado_em, atualizado_em, draft_codigo, _novaDraft, ...rest } = row as any;
    try {
      const res = await createConta(rest);
      fetchData();
      if (res?.ID) setEditing({ ...rest, id: res.ID });
    } catch (e: any) { alert(`Erro ao duplicar: ${e.message}`); }
  };

  // Aplica filtros sobre os dados em memória — sem requisição ao SP
  const applyFilters = useCallback((data: ContaReceber[], f: any) => {
    let r = data;
    if (f.wo)            r = r.filter((x: any) => String(x.wo ?? '').includes(f.wo));
    if (f.cliente_id)    r = r.filter((x: any) => Number(x.cliente_id) === Number(f.cliente_id));
    if (f.plataforma_id) r = r.filter((x: any) => Number(x.plataforma_id) === Number(f.plataforma_id));
    if (f.draft_codigo)  r = r.filter((x: any) => String(x.draft_codigo ?? '') === f.draft_codigo);
    if (f.doc)           r = r.filter((x: any) => x.doc === f.doc);
    if (f.num_doc)       r = r.filter((x: any) => String(x.num_doc ?? '').includes(f.num_doc));
    if (f.status)        r = r.filter((x: any) => x.status === f.status);
    if (f.escopo)        r = r.filter((x: any) => x.escopo === f.escopo);
    if (f.faturado_por)  r = r.filter((x: any) => x.faturado_por === f.faturado_por);
    if (f.data_doc)      r = r.filter((x: any) => (x.data_doc ?? '') === f.data_doc);
    if (f.data_doc_de)   r = r.filter((x: any) => (x.data_doc ?? '') >= f.data_doc_de);
    if (f.data_doc_ate)  r = r.filter((x: any) => (x.data_doc ?? '') <= f.data_doc_ate);
    setItems(r);
    setTotal({ total: r.length, total_bruto: r.reduce((s, x) => s + (x.vl_bruto || 0), 0), total_liquido: r.reduce((s, x) => s + (x.vl_liquido || 0), 0) });
  }, []);

  // Busca dados do SP — só chama quando realmente precisa recarregar
  const fetchData = useCallback(async () => {
    if (!getSpAccount()) return;
    setLoading(true);
    try {
      const data: ContaReceber[] = await getListItems('fContasReceber');
      allDataRef.current = data;
      // Popula dimensões uma única vez
      const uniqBy = <T,>(arr: T[], key: (x: T) => any) => { const seen = new Set(); return arr.filter(x => { const k = key(x); return seen.has(k) ? false : seen.add(k); }); };
      setDimClientes(uniqBy(data.filter((x: any) => x.cliente && x.cliente_id), (x: any) => x.cliente_id).map((x: any) => ({ id: Number(x.cliente_id), label: x.cliente })).sort((a,b) => a.label.localeCompare(b.label)));
      setDimPlataformas(uniqBy(data.filter((x: any) => x.plataforma && x.plataforma_id), (x: any) => x.plataforma_id).map((x: any) => ({ id: Number(x.plataforma_id), label: x.plataforma })).sort((a,b) => a.label.localeCompare(b.label)));
      setDimStatus([...new Set(data.map((x: any) => x.status).filter(Boolean))].sort());
      setDimEscopo([...new Set(data.map((x: any) => x.escopo).filter(Boolean))].sort());
      setDimFatPor([...new Set(data.map((x: any) => x.faturado_por).filter(Boolean))].sort());
      applyFilters(data, filters);
    } catch (e: any) { console.error(e); setLoadError(String(e?.message || e)); }
    finally { setLoading(false); }
  }, []); // sem dependências — nunca recria

  // Filtrar = instantâneo na memória, sem rede
  const load = useCallback(() => {
    if (allDataRef.current.length > 0) {
      applyFilters(allDataRef.current, filters);
    } else {
      fetchData();
    }
  }, [filters, applyFilters, fetchData]);

  // Busca inicial e quando login completa
  useEffect(() => { fetchData(); }, [fetchData, spAccount]);

  const save = async (conta: ContaReceber) => {
    try {
      const { id, ...fields } = conta as any;
      if (id) await updateConta(id, fields);
      else await createConta(fields);
      setEditing(null); fetchData();
    } catch (e: any) { alert(`Erro ao salvar: ${e.message || e}`); }
  };

  const del = async (_responsavel: string, _motivo: string) => {
    if (!delTarget?.id) return;
    try {
      await deleteConta(delTarget.id);
    } catch (e: any) { alert(`Erro ao excluir: ${e.message}`); }
    setDelTarget(null); fetchData();
  };

  // Upload CSV removido — importação agora é direto no SharePoint
  const uploadCSV = async (_e: React.ChangeEvent<HTMLInputElement>) => {
    alert('Importação via CSV foi migrada para o SharePoint.\nUse: Importar de > Excel na lista fContasReceber.');
  };

  return (
    <div style={S.page}>
      {loadError && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 16px", marginBottom: 12, fontSize: 12, color: "#991b1b" }}>
          ⚠️ Erro ao carregar lista: <strong>{loadError}</strong>
          <button onClick={() => { setLoadError(null); load(); }} style={{ marginLeft: 12, background: "#dc2626", border: "none", color: "#fff", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11 }}>Tentar novamente</button>
        </div>
      )}
      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {[["Total registros", total.total, "#0f172a"], ["Total Bruto", fmt.brl(total.total_bruto), "#0284c7"], ["Total Líquido", fmt.brl(total.total_liquido), "#059669"], ["Total Retido", fmt.brl(total.total_bruto - total.total_liquido), "#dc2626"]].map(([l, v, c]) => (
          <div key={l as string} style={S.stat}><div style={{ fontSize: 19, fontWeight: 800, color: c as string }}>{v}</div><div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{l}</div></div>
        ))}
      </div>

      {/* Filtros */}
      <div style={S.filters}>
        {/* WO */}
        <div><label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>WO</label>
          <input style={{ ...S.input, width: 75 }} value={filters.wo || ""} onChange={e => setFilters({ ...filters, wo: e.target.value })} /></div>
        {/* Cliente dropdown */}
        <div><label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>Cliente</label>
          <select style={{ ...S.select, width: 160 }} value={filters.cliente_id || ""} onChange={e => setFilters({ ...filters, cliente_id: e.target.value })}>
            <option value="">Todos</option>
            {dimClientes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select></div>
        {/* Plataforma dropdown */}
        <div><label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>Plataforma</label>
          <select style={{ ...S.select, width: 160 }} value={filters.plataforma_id || ""} onChange={e => setFilters({ ...filters, plataforma_id: e.target.value })}>
            <option value="">Todas</option>
            {dimPlataformas.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select></div>
        {/* Draft */}
        <div><label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>Draft</label>
          <input type="number" style={{ ...S.input, width: 80 }} value={filters.draft_codigo || ""} onChange={e => setFilters({ ...filters, draft_codigo: e.target.value })} /></div>
        {/* Doc */}
        <div><label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>Doc</label>
          <select style={{ ...S.select, width: 100 }} value={filters.doc || ""} onChange={e => setFilters({ ...filters, doc: e.target.value })}>
            <option value="">Todos</option>
            {["NFSe", "FAT. LOC.", "DANFE", "NFSe(ex)", "Nota de Débito", "DANFE(ex)", "FAT.LOC.(ex)", "Crédito"].map(s => <option key={s}>{s}</option>)}
          </select></div>
        {/* Nº Doc */}
        <div><label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>Nº</label>
          <input style={{ ...S.input, width: 90 }} value={filters.num_doc || ""} onChange={e => setFilters({ ...filters, num_doc: e.target.value })} /></div>
        {/* Data Doc */}
        <div>
          <label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>Data</label>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
            <div style={{ display: "flex", gap: 2 }}>
              {(["Exata","Mês","Período"] as const).map(m => (
                <button key={m} onClick={() => setFilters({ ...filters, _dataModo: m, data_doc: undefined, data_doc_de: undefined, data_doc_ate: undefined })}
                  style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600,
                    background: (filters._dataModo || "Exata") === m ? N.accent : N.bg,
                    color: (filters._dataModo || "Exata") === m ? "#fff" : N.muted,
                    boxShadow: (filters._dataModo || "Exata") === m ? inset : neo }}>{m}</button>
              ))}
            </div>
            {(!filters._dataModo || filters._dataModo === "Exata") && (
              <input type="date" style={{ ...S.input, width: 130 }} value={filters.data_doc || ""} onChange={e => setFilters({ ...filters, data_doc: e.target.value })} />
            )}
            {filters._dataModo === "Mês" && (
              <input type="month" style={{ ...S.input, width: 130 }} value={filters._mesSel || ""} onChange={e => {
                const v = e.target.value; // "2026-04"
                if (!v) { setFilters({ ...filters, _mesSel: "", data_doc_de: undefined, data_doc_ate: undefined }); return; }
                const [y, m] = v.split("-").map(Number);
                const ultimo = new Date(y, m, 0).getDate();
                setFilters({ ...filters, _mesSel: v, data_doc_de: `${v}-01`, data_doc_ate: `${v}-${String(ultimo).padStart(2,"0")}` });
              }} />
            )}
            {filters._dataModo === "Período" && (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input type="date" style={{ ...S.input, width: 120 }} placeholder="De" value={filters.data_doc_de || ""} onChange={e => setFilters({ ...filters, data_doc_de: e.target.value })} />
                <span style={{ color: N.muted, fontSize: 11 }}>–</span>
                <input type="date" style={{ ...S.input, width: 120 }} placeholder="Até" value={filters.data_doc_ate || ""} onChange={e => setFilters({ ...filters, data_doc_ate: e.target.value })} />
              </div>
            )}
          </div>
        </div>
        {/* Escopo */}
        <div><label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>Escopo</label>
          <select style={{ ...S.select, width: 110 }} value={filters.escopo || ""} onChange={e => setFilters({ ...filters, escopo: e.target.value })}>
            <option value="">Todos</option>
            {dimEscopo.map(s => <option key={s}>{s}</option>)}
          </select></div>
        {/* Fat.Por */}
        <div><label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>Fat.Por</label>
          <select style={{ ...S.select, width: 110 }} value={filters.faturado_por || ""} onChange={e => setFilters({ ...filters, faturado_por: e.target.value })}>
            <option value="">Todos</option>
            {dimFatPor.map(s => <option key={s}>{s}</option>)}
          </select></div>
        {/* Status */}
        <div><label style={{ ...S.label, fontSize: 10, textTransform: "uppercase" as const }}>Status</label>
          <select style={{ ...S.select, width: 180 }} value={filters.status || ""} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Todos</option>
            {dimStatus.map(s => <option key={s}>{s}</option>)}
          </select></div>
        <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
          <button style={btn()} onClick={load}>🔍 Filtrar</button>
          <button style={btn("#64748b")} onClick={() => { setFilters({}); }}>✕ Limpar</button>
        </div>
      </div>

      {/* Tabela */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>📋 Contas a Receber · {total.total} registros {loading && "⏳"}</span>
          <div style={{ display: "flex", gap: 5 }}>
            <button style={btn("#059669")} onClick={() => setEditing({})}>➕ Novo</button>
            <button style={btn("#0891b2")} title="Recalcula VL.Bruto, impostos, Vencimento, Prev.Fat e Prev.Pag de todos os registros" onClick={() => {
              alert("Recálculo disponível apenas com backend ativo.");
            }}>⟳ Recalcular Tudo</button>
            <button style={btn("#6366f1")} onClick={async () => {
              try {
                const token = await getToken();
                const r = await fetch(`https://qualitechirmcom.sharepoint.com/sites/GLOBALAPPS/_api/web/lists/getbytitle('fContasReceber')/fields?$filter=Hidden eq false and ReadOnlyField eq false`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=verbose' } });
                const json = await r.json();
                const fields = (json.d.results || []).map((f: any) => `${f.InternalName} (${f.TypeAsString})`);
                console.log('[SP fContasReceber] campos:', fields);
                alert('Campos fContasReceber:\n\n' + fields.join('\n'));
              } catch(e: any) { alert('Erro: ' + e.message); }
            }}>🔍 Ver campos SP</button>
            <label style={{ ...btn("#f59e0b"), cursor: "pointer" }}>📤 Importar CSV<input type="file" accept=".csv" style={{ display: "none" }} onChange={uploadCSV} /></label>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead><tr>
              <th style={{ ...S.th, width: 28 }}></th>
              <th style={{ ...S.th, width: 90 }}>Ações</th>
              {["WO", "Draft", "Cliente", "Plataforma", "Doc", "Nº", "Data", "Escopo", "Fat.Por", "Vl. Bruto", "Retido", "Líquido", "Vencimento", "Prev. Pag", "Status"].map(h => <th key={h} style={S.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr><td colSpan={20} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: 40 }}>
                  {!spAccount
                    ? <span>🔑 Clique em <strong>Entrar</strong> no topo da página para carregar os dados do SharePoint.</span>
                    : 'Nenhum registro. Clique em "➕ Novo" ou "📤 Importar CSV".'}
                </td></tr>
              )}
              {items.map((row, i) => {
                const isExp = expanded === row.id;
                return [
                  <tr key={row.id} style={{ background: i % 2 === 0 ? N.card : N.bg }}>
                    <td style={S.td}><button onClick={() => setExpanded(isExp ? null : row.id!)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>{isExp ? "▼" : "▶"}</button></td>
                    <td style={S.td}><div style={{ display: "flex", gap: 2 }}>
                      <button style={btnSm(N.accent)} title="Editar" onClick={() => setEditing(row)}>✏️</button>
                      <button style={btnSm("#f59e0b")} title="Duplicar registro" onClick={() => duplicate(row)}>⧉</button>
                      <button style={btnSm("#dc2626")} title="Excluir" onClick={() => setDelTarget(row)}>🗑</button>
                    </div></td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{row.wo || "-"}</td>
                    <td style={S.td}>{row.draft_codigo || row.draft_id || "-"}</td>
                    <td style={S.td}>{row.cliente || "-"}</td>
                    <td style={S.td}>{row.plataforma || "-"}</td>
                    <td style={S.td}><Badge text={row.doc || "-"} doc /></td>
                    <td style={S.td}>{row.num_doc || "-"}</td>
                    <td style={S.td}>{fmt.date(row.data_doc)}</td>
                    {/* Escopo — inline edit */}
                    <td style={{ ...S.td, cursor: "pointer" }} onClick={() => setInlineEdit({ id: row.id!, field: "escopo" })}>
                      {inlineEdit?.id === row.id && inlineEdit.field === "escopo"
                        ? <select autoFocus style={{ ...S.select, width: 110, padding: "3px 6px" }}
                            defaultValue={row.escopo || ""}
                            onBlur={e => quickSave(row, "escopo", e.target.value)}
                            onChange={e => quickSave(row, "escopo", e.target.value)}>
                            <option value="">—</option>
                            {["SERVIÇO","LOCAÇÃO","VENDA","CRÉDITO"].map(v => <option key={v}>{v}</option>)}
                          </select>
                        : <span title="Clique para editar">{row.escopo || <span style={{ color: N.muted }}>—</span>}</span>}
                    </td>
                    {/* Faturado por — inline edit */}
                    <td style={{ ...S.td, cursor: "pointer" }} onClick={() => setInlineEdit({ id: row.id!, field: "faturado_por" })}>
                      {inlineEdit?.id === row.id && inlineEdit.field === "faturado_por"
                        ? <select autoFocus style={{ ...S.select, width: 90, padding: "3px 6px" }}
                            defaultValue={row.faturado_por || ""}
                            onBlur={e => quickSave(row, "faturado_por", e.target.value)}
                            onChange={e => quickSave(row, "faturado_por", e.target.value)}>
                            <option value="">—</option>
                            <option>Rio</option><option>Macaé</option>
                          </select>
                        : <span title="Clique para editar">{row.faturado_por || <span style={{ color: N.muted }}>—</span>}</span>}
                    </td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{fmt.brl(row.vl_bruto)}</td>
                    <td style={{ ...S.td, color: "#dc2626" }}>{fmt.brl(row.total_retido)}</td>
                    <td style={{ ...S.td, color: "#059669", fontWeight: 700 }}>{fmt.brl(row.vl_liquido)}</td>
                    <td style={S.td}>{fmt.date(row.vencimento)}</td>
                    <td style={S.td}>{fmt.date(row.prev_pag)}</td>
                    {/* Status — inline edit */}
                    <td style={{ ...S.td, cursor: "pointer" }} onClick={() => setInlineEdit({ id: row.id!, field: "status" })}>
                      {inlineEdit?.id === row.id && inlineEdit.field === "status"
                        ? <select autoFocus style={{ ...S.select, width: 160, padding: "3px 6px" }}
                            defaultValue={row.status || ""}
                            onBlur={e => quickSave(row, "status", e.target.value)}
                            onChange={e => quickSave(row, "status", e.target.value)}>
                            {["Programado","Em andamento","Aguardando Pagamento","Aguardando Resposta do Cliente","Aguardando Documentação","Aguardando PO","Enviar NF","PAGO","Previsão","Free Of Charge"].map(s => <option key={s}>{s}</option>)}
                          </select>
                        : <Badge text={row.status || "-"} />}
                    </td>
                  </tr>,
                  isExp && <tr key={`exp-${row.id}`}>
                    <td colSpan={20} style={{ background: N.bg, padding: "10px 16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 6, fontSize: 11 }}>
                        {[["COFINS 3%", row.cofins_3], ["CSLL 1%", row.csll_1], ["IRPJ 1.5%", row.irpj_15], ["PIS 0.65%", row.pis_065], ["ISS Ret.", row.iss_retido], ["PO/Contrato", row.po_contrato], ["Prev. Fat.", fmt.date(row.prev_fat)], ["Data Pgto.", fmt.date(row.data_pgto)], ["Obs", row.obs]].map(([l, v]) => (
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
      {editing !== null && <ContaForm conta={editing} onSave={save} onClose={() => setEditing(null)} drafts={drafts} projetos={projetos} onDraftsChanged={onDraftsChanged} spAccount={spAccount} />}
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

function exportCSV(filename: string, columns: { key: string; label: string }[], items: any[]) {
  const keys = columns.map(c => c.key);
  const header = columns.map(c => c.label).join(";");
  const rows = items.map(row => keys.map(k => {
    const v = row[k] ?? "";
    const s = String(v).replace(/"/g, '""');
    return s.includes(";") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  }).join(";"));
  const csv = "﻿" + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ===== QUALTECH · PROJECTS (CRUD via Azure Function proxy) =====
const QT_API = "/api/qualtech-projects";

interface QtProject {
  id?: number;
  project_number?: number;
  cliente?: string;
  plataforma?: string;
  classificacao?: string;
  categoria_contrato?: string;
  client_id?: number;
  platform_id?: number;
  project_classification_id?: number;
  contract_category_id?: number;
}

const EMPTY_QT: QtProject = { project_number: 0, client_id: undefined, platform_id: undefined, project_classification_id: undefined, contract_category_id: undefined };

function QualtechProjectsPage() {
  const [rows, setRows] = useState<QtProject[]>(STATIC_QUALTECH_PROJECTS as QtProject[]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<QtProject | null>(null);
  const [delTarget, setDelTarget] = useState<QtProject | null>(null);
  const [liveMode, setLiveMode] = useState(false);

  const load = () => {
    setLoading(true); setError(null);
    fetch(QT_API)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => { setRows(Array.isArray(data) ? data : []); setLiveMode(true); })
      .catch(err => { setError(String(err)); setRows(STATIC_QUALTECH_PROJECTS as QtProject[]); })
      .finally(() => setLoading(false));
  };

  const save = async (form: QtProject) => {
    if (!liveMode) { alert("Conecte à API ao vivo primeiro (botão 🔄 API ao vivo)"); return; }
    try {
      const isNew = !form.id;
      const r = await fetch(isNew ? QT_API : `${QT_API}?id=${form.project_number}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_number: form.project_number, client_id: form.client_id, platform_id: form.platform_id, project_classification_id: form.project_classification_id, contract_category_id: form.contract_category_id }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setEditing(null);
      load();
    } catch (err) { alert("Erro ao salvar: " + String(err)); }
  };

  const del = async () => {
    if (!delTarget || !liveMode) return;
    try {
      const r = await fetch(`${QT_API}?id=${delTarget.project_number}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setDelTarget(null);
      load();
    } catch (err) { alert("Erro ao excluir: " + String(err)); }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.trim().toLowerCase();
    return rows.filter(r =>
      String(r.project_number ?? "").includes(s) ||
      (r.cliente ?? "").toLowerCase().includes(s) ||
      (r.plataforma ?? "").toLowerCase().includes(s) ||
      (r.classificacao ?? "").toLowerCase().includes(s) ||
      (r.categoria_contrato ?? "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <span style={S.cardTitle}>
          🌐 Qualtech · Projects
          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 8, color: liveMode ? "#16a34a" : N.muted }}>
            {liveMode ? "● API ao vivo" : "● dados locais"} ({filtered.length})
          </span>
        </span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input style={{ ...S.input, width: 180 }} placeholder="Filtrar projeto, cliente..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={btn()} onClick={load} disabled={loading}>{loading ? "⏳" : "🔄"} API ao vivo</button>
          <button style={btn("#2563eb")} onClick={() => setEditing({ ...EMPTY_QT })}>+ Novo</button>
        </div>
      </div>

      {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 8 }}>⚠ {error} — exibindo dados locais</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>WO</th>
              <th style={S.th}>Cliente</th>
              <th style={S.th}>Plataforma</th>
              <th style={S.th}>Classificação</th>
              <th style={S.th}>Categoria Contrato</th>
              <th style={{ ...S.th, width: 80 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id ?? i} style={{ background: i % 2 === 0 ? "transparent" : N.bg }}>
                <td style={{ ...S.td, fontWeight: 700 }}>{r.project_number}</td>
                <td style={S.td}>{r.cliente || "—"}</td>
                <td style={S.td}>{r.plataforma || "—"}</td>
                <td style={S.td}>{r.classificacao || "—"}</td>
                <td style={S.td}>{r.categoria_contrato || "—"}</td>
                <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                  <button style={btnSm()} onClick={() => setEditing({ ...r })} title="Editar">✏️</button>
                  <button style={btnSm("#dc2626")} onClick={() => setDelTarget(r)} title="Excluir">🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal edição */}
      {editing !== null && (
        <div style={S.modal}>
          <div style={{ ...S.modalBox, width: 420, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{editing.id ? `Editar WO ${editing.project_number}` : "Novo Projeto"}</span>
              <button style={btnSm()} onClick={() => setEditing(null)}>✕</button>
            </div>
            <Field label="Project Number (WO)">
              <input type="number" style={S.input} value={editing.project_number || ""} onChange={e => setEditing({ ...editing, project_number: +e.target.value })} disabled={!!editing.id} />
            </Field>
            <Field label="Client ID">
              <input type="number" style={S.input} value={editing.client_id || ""} onChange={e => setEditing({ ...editing, client_id: +e.target.value })} />
            </Field>
            <Field label="Platform ID">
              <input type="number" style={S.input} value={editing.platform_id || ""} onChange={e => setEditing({ ...editing, platform_id: +e.target.value })} />
            </Field>
            <Field label="Classification ID">
              <input type="number" style={S.input} value={editing.project_classification_id || ""} onChange={e => setEditing({ ...editing, project_classification_id: +e.target.value })} />
            </Field>
            <Field label="Contract Category ID">
              <input type="number" style={S.input} value={editing.contract_category_id || ""} onChange={e => setEditing({ ...editing, contract_category_id: +e.target.value })} />
            </Field>
            {!liveMode && <div style={{ color: "#f59e0b", fontSize: 12, marginBottom: 8 }}>⚠ Modo local: clique "🔄 API ao vivo" para persistir alterações na API.</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button style={btn(N.muted)} onClick={() => setEditing(null)}>Cancelar</button>
              <button style={btn("#2563eb")} onClick={() => save(editing)}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {delTarget && (
        <div style={S.modal}>
          <div style={{ ...S.modalBox, width: 360, padding: 24 }}>
            <p style={{ marginBottom: 16 }}>Excluir projeto <strong>WO {delTarget.project_number}</strong> — {delTarget.cliente}?</p>
            {!liveMode && <div style={{ color: "#f59e0b", fontSize: 12, marginBottom: 8 }}>⚠ Modo local: a exclusão não será enviada à API.</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={btn(N.muted)} onClick={() => setDelTarget(null)}>Cancelar</button>
              <button style={btn("#dc2626")} onClick={del}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== GENERIC CRUD =====
function CRUDPage<T extends { id?: number }>({ title, icon, endpoint, columns, emptyItem, renderForm, info, extraButton, staticData, spLoad, spSave, spDelete }: {
  title: string; icon: string; endpoint: string; info?: string;
  columns: { key: string; label: string; render?: (v: any, row: T) => React.ReactNode }[];
  emptyItem: T; renderForm: (form: T, set: (k: keyof T, v: any) => void) => React.ReactNode;
  extraButton?: (reload: () => void) => React.ReactNode;
  staticData?: T[];
  spLoad?: () => Promise<T[]>;
  spSave?: (form: T) => Promise<void>;
  spDelete?: (id: number) => Promise<void>;
}) {
  const [items, setItems] = useState<T[]>(staticData ?? []);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<T>(emptyItem);
  const [delTarget, setDelTarget] = useState<T | null>(null);
  const load = () => {
    if (spLoad) { spLoad().then(data => setItems(data)).catch(() => { if (staticData) setItems(staticData); }); return; }
    if (staticData) { setItems(staticData); return; }
    setItems([]);
  };
  useEffect(() => { load(); }, []);
  const setField = (k: keyof T, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const save = async () => {
    if (spSave) { await spSave(form); setEditing(null); load(); return; }
    console.warn("Save não disponível: sem backend ou SP configurado");
    setEditing(null);
  };
  const del = async (responsavel: string, motivo: string) => {
    if (!delTarget?.id) return;
    if (spDelete) { await spDelete(delTarget.id); setDelTarget(null); load(); return; }
    const resumo = Object.entries(delTarget as any).filter(([k]) => !["id","criado_em","atualizado_em"].includes(k)).map(([k,v]) => `${k}: ${v}`).join(" | ").slice(0, 300);
    await logAndDelete(endpoint, delTarget.id, resumo, responsavel, motivo);
    setDelTarget(null); load();
  };

  return (
    <div style={S.page}>
      {info && <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "8px 14px", marginBottom: 10, fontSize: 12, color: "#1e40af" }}>
        📋 <strong>SharePoint:</strong> {info}
      </div>}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>{icon} {title} ({items.length})</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={btn("#6366f1")} onClick={() => exportCSV(`${endpoint}.csv`, columns, items)} title="Exportar dados para importar no SharePoint">⬇ Exportar CSV</button>
            <button style={btn("#059669")} onClick={() => { setForm({ ...emptyItem }); setEditing({ ...emptyItem }); }}>➕ Novo</button>
          </div>
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

async function logAndDelete(_endpoint: string, _id: number, _resumo: string, _responsavel: string, _motivo: string) {
  // Audit log e delete via backend removidos — use spDelete para entidades com SharePoint
  console.warn("logAndDelete: operação não disponível sem backend.");
}

// ===== DRAFTS PAGE =====
function DraftsPage({ onDraftsChanged }: { onDraftsChanged?: () => void }) {
  const [items, setItems] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [form, setForm] = useState<Draft>({ codigo: 0, data_draft: "", descricao: "", ativo: true });
  const [syncing, setSyncing] = useState(false);
  const [delTarget, setDelTarget] = useState<Draft | null>(null);

  const load = () => { setItems(STATIC_DRAFTS as Draft[]); onDraftsChanged?.(); };
  useEffect(() => { load(); }, []);
  const setField = (k: keyof Draft, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => { setEditing(null); };

  const sincronizar = async () => {
    setSyncing(true);
    try {
      alert("Sincronização disponível apenas com backend ativo.");
    } finally { setSyncing(false); }
  };

  const del = async (responsavel: string, motivo: string) => {
    if (!delTarget?.id) return;
    const resumo = `Draft #${delTarget.codigo} — ${delTarget.data_draft || "sem data"}`;
    await logAndDelete("drafts", delTarget.id, resumo, responsavel, motivo);
    setDelTarget(null); load();
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>📝 Drafts ({items.length})</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={btn("#059669")} onClick={() => {
              const proximo = Math.max(0, ...items.map(d => d.codigo ?? 0)) + 1;
              setForm({ codigo: proximo, data_draft: new Date().toISOString().slice(0, 10), descricao: "", ativo: true });
              setEditing({ codigo: proximo, ativo: true });
            }}>➕ Nova Draft</button>
            <button style={btn("#0891b2")} onClick={sincronizar} disabled={syncing} title="Importa automaticamente todos os códigos de draft usados nas Contas a Receber">
              {syncing ? "⏳ Sincronizando..." : "⟳ Sincronizar das Contas"}
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead><tr>
              <th style={{ ...S.th, width: 70 }}>Ações</th>
              <th style={S.th}>Código</th>
              <th style={S.th}>Data da Draft</th>
              <th style={S.th}>Descrição</th>
              <th style={S.th}>Ativo</th>
            </tr></thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: N.muted, padding: 32 }}>
                  Sem drafts. Clique em "⟳ Sincronizar das Contas" para importar os dados existentes.
                </td></tr>
              )}
              {items.map((row, i) => (
                <tr key={row.id || i} style={{ background: i % 2 === 0 ? N.card : N.bg }}>
                  <td style={S.td}><div style={{ display: "flex", gap: 2 }}>
                    <button style={btnSm(N.accent)} onClick={() => { setForm({ ...row }); setEditing(row); }}>✏️</button>
                    <button style={btnSm("#dc2626")} onClick={() => setDelTarget(row)}>🗑</button>
                  </div></td>
                  <td style={{ ...S.td, fontWeight: 800, fontSize: 14 }}>#{row.codigo}</td>
                  <td style={S.td}>{fmt.date(row.data_draft)}</td>
                  <td style={{ ...S.td, color: N.muted }}>{row.descricao || "—"}</td>
                  <td style={S.td}>{row.ativo ? "✅" : "❌"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== null && (
        <div style={S.modal} onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div style={{ ...S.modalBox, maxWidth: 480 }}>
            <div style={{ ...S.cardHeader, background: N.accent }}>
              <span style={{ ...S.cardTitle, color: "#fff" }}>{form.id ? "✏️ Editar" : "➕ Nova"} Draft</span>
              <button style={btn("#dc2626")} onClick={() => setEditing(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={grid(2)}>
                <Field label="Código Draft"><input type="number" style={S.input} value={form.codigo || ""} onChange={e => setField("codigo", +e.target.value)} /></Field>
                <Field label="Data da Draft"><input type="date" style={S.input} value={form.data_draft || ""} onChange={e => setField("data_draft", e.target.value)} /></Field>
                <div style={{ gridColumn: "1/-1" }}>
                  <Field label="Descrição (opcional)"><input style={S.input} value={form.descricao || ""} onChange={e => setField("descricao", e.target.value)} /></Field>
                </div>
              </div>
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
          info={`Draft #${delTarget.codigo} — ${fmt.date(delTarget.data_draft)}`}
          onConfirm={del}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}

// ===== APP =====
// ── project_list SharePoint (Brasil via API + Internacional manual) ──────────
function ProjectListPage({ spAccount, onLogin, onLogout }: {
  spAccount: { name?: string; username?: string } | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [view, setView]           = useState<"todos"|"brasil"|"internacional">("todos");
  const [spItems, setSpItems]     = useState<ProjectItem[]>([]);
  const [apiItems, setApiItems]   = useState<any[]>([]);
  const [clients, setClients]     = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [classifications, setClassifications] = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [syncing, setSyncing]     = useState<number[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const [editing, setEditing]     = useState<ProjectItem | null>(null);
  const [form, setForm]           = useState<ProjectItem>({ project_number: 0, IDCountry: ID_COUNTRY_BR });
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState("");

  const loadSP = async () => {
    if (!spAccount) return;
    setLoading(true); setError(null);
    try { setSpItems(await listProjects()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadAPI = async () => {
    // Backend Railway removido — sem dados de API externos
    setApiItems([]);
    setClients([]);
    setPlatforms([]);
    setCategories([]);
    setClassifications([]);
  };

  useEffect(() => { loadSP(); loadAPI(); }, [spAccount]);

  // WOs que já estão no SP (IDCountry=10 = Brasil)
  const spBrasilNums = new Set(spItems.filter(i => i.IDCountry === ID_COUNTRY_BR).map(i => i.project_number));

  const syncFromApi = async (proj: any) => {
    const pn = proj.project_number ?? proj.wo;
    setSyncing(s => [...s, pn]);
    setError(null);
    try {
      await createProject({
        project_number: pn,
        client_id: proj.client_id,
        platform_id: proj.platform_id,
        contract_category_id: proj.contract_category_id,
        IDCountry: ID_COUNTRY_BR,
      });
      await loadSP();
    } catch (e: any) { setError(e.message); }
    finally { setSyncing(s => s.filter(x => x !== pn)); }
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      if (form.ID) await updateProject(form.ID, form);
      else         await createProject(form);
      setEditing(null); await loadSP();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const del = async (row: ProjectItem) => {
    if (!row.ID) return;
    if (!confirm(`Excluir project_number ${row.project_number} (IDWO: ${row.IDWO})?`)) return;
    try { await deleteProject(row.ID); await loadSP(); }
    catch (e: any) { setError(e.message); }
  };

  const filtered = (view === "brasil"
    ? spItems.filter(i => i.IDCountry === ID_COUNTRY_BR)
    : view === "internacional"
    ? spItems.filter(i => i.IDCountry !== ID_COUNTRY_BR)
    : spItems
  ).filter(r => !search || String(r.project_number).includes(search) || String(r.IDWO ?? "").includes(search));

  if (!spAccount) return (
    <div style={{ ...S.page, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, minHeight: 300 }}>
      <div style={{ fontSize: 48 }}>🌍</div>
      <div style={{ fontWeight: 700, fontSize: 18, color: N.text }}>Conectar ao SharePoint</div>
      <div style={{ color: N.muted, fontSize: 13, textAlign: "center", maxWidth: 400 }}>
        Para acessar a <strong>project_list</strong>, faça login com sua conta Qualtech.
      </div>
      <button style={btn("#0078d4")} onClick={async () => { try { await onLogin(); } catch(e:any) { alert("Erro: " + e.message); }}}>🔑 Entrar com conta Qualtech</button>
    </div>
  );

  return (
    <div style={S.page}>
      {/* conexão */}
      <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "8px 14px", marginBottom: 10, fontSize: 12, color: "#065f46", display: "flex", alignItems: "center", gap: 8 }}>
        <span>✅</span>
        <span>Conectado como <strong>{spAccount.name}</strong> — Lista: <strong>project_list</strong> · Brasil ID: <strong>{ID_COUNTRY_BR}</strong></span>
        <button onClick={onLogout} style={{ marginLeft: "auto", background: "none", border: "1px solid #6ee7b7", borderRadius: 6, cursor: "pointer", fontSize: 11, color: "#065f46", padding: "2px 8px" }}>Sair</button>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "8px 14px", marginBottom: 10, fontSize: 12, color: "#991b1b" }}>⚠️ {error}</div>}

      {/* abas */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {([["todos","📋","Todos",spItems.length],["brasil","🇧🇷","Brasil (API)",spItems.filter(i=>i.IDCountry===ID_COUNTRY_BR).length],["internacional","🌍","Internacional",spItems.filter(i=>i.IDCountry!==ID_COUNTRY_BR).length]] as const).map(([k,icon,label,count]) => (
          <button key={k} onClick={() => setView(k as any)}
            style={{ ...navBtn(view===k), fontSize: 12 }}>{icon} {label} ({count})</button>
        ))}
      </div>

      {/* ── ABA BRASIL: sincronização da API ── */}
      {view === "brasil" && (
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>🇧🇷 WOs da API Qualtech → project_list</span>
            <button style={btn("#6366f1")} onClick={loadAPI}>↺ Atualizar API</button>
          </div>
          {apiItems.length === 0
            ? <div style={{ padding: "16px 20px", color: N.muted, fontSize: 12 }}>Backend offline ou sem WOs na API.</div>
            : <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead><tr>
                    <th style={{ ...S.th, width: 100 }}>Ação</th>
                    <th style={S.th}>project_number</th>
                    <th style={S.th}>Cliente</th>
                    <th style={S.th}>Plataforma</th>
                    <th style={S.th}>IDCountry</th>
                    <th style={S.th}>Status SP</th>
                  </tr></thead>
                  <tbody>
                    {apiItems.map((p, i) => {
                      const pn = p.project_number ?? p.wo;
                      const noSP = !spBrasilNums.has(pn);
                      const isSyncing = syncing.includes(pn);
                      const clientName = clients.find((c: any) => c.id === p.client_id)?.client_name ?? p.client_id ?? "—";
                      const platName = platforms.find((pl: any) => pl.id === p.platform_id)?.platform_name ?? p.platform_id ?? "—";
                      return (
                        <tr key={pn} style={{ background: i % 2 === 0 ? N.card : N.bg }}>
                          <td style={S.td}>
                            {noSP
                              ? <button style={btn("#059669")} onClick={() => syncFromApi(p)} disabled={isSyncing}>
                                  {isSyncing ? "⏳" : "⬆ Sincronizar"}
                                </button>
                              : <span style={{ color: "#059669", fontSize: 11, fontWeight: 700 }}>✅ No SP</span>}
                          </td>
                          <td style={{ ...S.td, fontWeight: 700 }}>{pn}</td>
                          <td style={S.td}>{clientName}</td>
                          <td style={S.td}>{platName}</td>
                          <td style={S.td}><Badge text={`${ID_COUNTRY_BR}`} color="#059669" /></td>
                          <td style={S.td}>{noSP ? <Badge text="Pendente" color="#f59e0b" /> : <Badge text="Sincronizado" color="#059669" />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>}
        </div>
      )}

      {/* ── TABELA SP ── */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>🌍 project_list · SharePoint {loading ? "⏳" : `(${filtered.length})`}</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input style={{ ...S.input, width: 140 }} placeholder="Buscar WO..." value={search} onChange={e => setSearch(e.target.value)} />
            <button style={btn("#6366f1")} onClick={loadSP} disabled={loading}>↺ Recarregar</button>
            {view !== "brasil" && <button style={btn("#059669")} onClick={() => { setForm({ project_number: 0, IDCountry: view === "internacional" ? 40 : ID_COUNTRY_BR }); setEditing({} as ProjectItem); }}>➕ Novo</button>}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead><tr>
              <th style={{ ...S.th, width: 80 }}>Ações</th>
              <th style={S.th}>IDWO</th>
              <th style={S.th}>WO</th>
              <th style={S.th}>Cliente</th>
              <th style={S.th}>Plataforma</th>
              <th style={S.th}>Categoria</th>
              <th style={S.th}>Classificação</th>
              <th style={S.th}>País</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: 32 }}>Nenhum item.</td></tr>
              )}
              {filtered.map((row, i) => {
                const cliName = clients.find((c: any) => c.id === row.client_id)?.client_name ?? (row.client_id != null ? `ID ${row.client_id}` : "—");
                const platName = platforms.find((p: any) => p.id === row.platform_id)?.platform_name ?? (row.platform_id != null ? `ID ${row.platform_id}` : "—");
                const catName = categories.find((c: any) => c.id === row.contract_category_id)?.contract_category_name ?? (row.contract_category_id != null ? `ID ${row.contract_category_id}` : "—");
                const clsName = classifications.find((c: any) => c.id === row.project_classification_id)?.project_classification_name ?? (row.project_classification_id != null ? `ID ${row.project_classification_id}` : "—");
                return (
                <tr key={row.ID ?? i} style={{ background: i % 2 === 0 ? N.card : N.bg }}>
                  <td style={S.td}><div style={{ display: "flex", gap: 2 }}>
                    <button style={btnSm(N.accent)} onClick={() => { setForm({...row}); setEditing(row); }}>✏️</button>
                    <button style={btnSm("#dc2626")} onClick={() => del(row)}>🗑</button>
                  </div></td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{row.IDWO ?? "—"}</td>
                  <td style={S.td}>{row.project_number}</td>
                  <td style={S.td}>{cliName}</td>
                  <td style={S.td}>{platName}</td>
                  <td style={S.td}>{catName}</td>
                  <td style={S.td}>{clsName}</td>
                  <td style={S.td}><Badge text={String(row.IDCountry ?? "?")} color={row.IDCountry === ID_COUNTRY_BR ? "#059669" : "#6366f1"} /></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {editing !== null && (
        <div style={S.modal} onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div style={{ ...S.modalBox, maxWidth: 520 }}>
            <div style={{ ...S.cardHeader, background: "#6366f1", borderRadius: "12px 12px 0 0", padding: "14px 20px" }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>🌍 {form.ID ? `Editar IDWO ${form.IDWO}` : "Novo projeto"}</span>
              <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="project_number *"><input type="number" style={S.input} value={form.project_number || ""} onChange={e => setForm(f => ({ ...f, project_number: +e.target.value }))} /></Field>
              <Field label="País (IDCountry) *">
                <select style={S.input} value={form.IDCountry ?? ID_COUNTRY_BR} onChange={e => setForm(f => ({ ...f, IDCountry: +e.target.value }))}>
                  <option value={10}>🇧🇷 Brasil (10)</option>
                  <option value={20}>🌍 Internacional 20</option>
                  <option value={30}>🌍 Internacional 30</option>
                  <option value={40}>🌍 Internacional 40</option>
                </select>
              </Field>
              <Field label="Cliente (client_id)">
                {clients.length > 0
                  ? <SearchSelect options={clients.map((c: any) => ({ id: c.id, label: c.client_name ?? c.name ?? String(c.id) }))} value={form.client_id ?? null} onChange={id => setForm(f => ({ ...f, client_id: id ?? undefined }))} placeholder="Buscar cliente..." />
                  : <input type="number" style={S.input} value={form.client_id ?? ""} onChange={e => setForm(f => ({ ...f, client_id: e.target.value ? +e.target.value : undefined }))} placeholder="ID (backend offline)" />}
              </Field>
              <Field label="Plataforma / Rig (platform_id)">
                {platforms.length > 0
                  ? <SearchSelect options={platforms.map((p: any) => ({ id: p.id, label: `${p.platform_name ?? p.name ?? String(p.id)}${p.platform_code ? ` (${p.platform_code})` : ""}` }))} value={form.platform_id ?? null} onChange={id => setForm(f => ({ ...f, platform_id: id ?? undefined }))} placeholder="Buscar plataforma..." />
                  : <input type="number" style={S.input} value={form.platform_id ?? ""} onChange={e => setForm(f => ({ ...f, platform_id: e.target.value ? +e.target.value : undefined }))} placeholder="ID (backend offline)" />}
              </Field>
              <Field label="Contract Category">
                {categories.length > 0
                  ? <SearchSelect options={categories.map((c: any) => ({ id: c.id, label: c.contract_category_name ?? c.name ?? String(c.id) }))} value={form.contract_category_id ?? null} onChange={id => setForm(f => ({ ...f, contract_category_id: id ?? undefined }))} placeholder="Buscar categoria..." />
                  : <input type="number" style={S.input} value={form.contract_category_id ?? ""} onChange={e => setForm(f => ({ ...f, contract_category_id: e.target.value ? +e.target.value : undefined }))} placeholder="ID (backend offline)" />}
              </Field>
              <Field label="Classification">
                {classifications.length > 0
                  ? <SearchSelect options={classifications.map((c: any) => ({ id: c.id, label: c.project_classification_name ?? c.name ?? String(c.id) }))} value={form.project_classification_id ?? null} onChange={id => setForm(f => ({ ...f, project_classification_id: id ?? undefined }))} placeholder="Buscar classificação..." />
                  : <input type="number" style={S.input} value={form.project_classification_id ?? ""} onChange={e => setForm(f => ({ ...f, project_classification_id: e.target.value ? +e.target.value : undefined }))} placeholder="ID (backend offline)" />}
              </Field>
            </div>
            <div style={{ padding: "0 20px 8px", fontSize: 11, color: N.muted }}>
              IDWO será gerado automaticamente: <strong>{form.IDCountry}{form.project_number || "..."}</strong>
            </div>
            {error && <div style={{ margin: "0 20px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#991b1b" }}>⚠️ {error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "0 20px 20px" }}>
              <button style={btn("#64748b")} onClick={() => setEditing(null)}>Cancelar</button>
              <button style={btn("#6366f1")} onClick={save} disabled={saving}>{saving ? "Salvando..." : "💾 Salvar no SharePoint"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ListaWOs SharePoint (CRUD live) ──────────────────────────────────────────
function ListaWOsPage({ spAccount, onLogin, onLogout }: {
  spAccount: { name?: string; username?: string } | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [items, setItems]     = useState<WOItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [editing, setEditing] = useState<WOItem | null>(null);
  const [form, setForm]       = useState<WOItem>({ WO: "", Client: "", Rig: "" });
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState("");
  const [clients, setClients]   = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [contractCategories, setContractCategories] = useState<any[]>([]);

  const load = async () => {
    if (!spAccount) return;
    setLoading(true); setError(null);
    try {
      const data = await listWOs();
      setItems(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadApiOptions = async () => {
    // Backend Railway removido — inputs manuais sem lookup de API
    setClients([]);
    setPlatforms([]);
    setContractCategories([]);
  };

  useEffect(() => { load(); loadApiOptions(); }, [spAccount]);

  const openNew  = () => { setForm({ WO: "", Client: "", Rig: "" }); setEditing({} as WOItem); };
  const openEdit = (row: WOItem) => { setForm({ ...row }); setEditing(row); };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      if (form.ID) await updateWO(form.ID, form);
      else         await createWO(form);
      setEditing(null); await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const del = async (row: WOItem) => {
    if (!row.ID) return;
    if (!confirm(`Excluir WO ${row.WO} — ${row.Client}?`)) return;
    setError(null);
    try { await deleteWO(row.ID); await load(); }
    catch (e: any) { setError(e.message); }
  };

  const filtered = items.filter(r =>
    !search || [r.WO, r.Client, r.Rig, r.Status, r.ContractType, r.Country].some(v => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  if (!spAccount) return (
    <div style={{ ...S.page, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, minHeight: 300 }}>
      <div style={{ fontSize: 48 }}>🔗</div>
      <div style={{ fontWeight: 700, fontSize: 18, color: N.text }}>Conectar ao SharePoint</div>
      <div style={{ color: N.muted, fontSize: 13, textAlign: "center", maxWidth: 400 }}>
        Para acessar a <strong>ListaWOs</strong> no SharePoint, faça login com sua conta Qualtech.<br />
        O TI deve ter aprovado as permissões para este app.
      </div>
      <button style={btn("#0078d4")} onClick={async () => {
        try { await onLogin(); }
        catch(e: any) { alert("Erro ao autenticar: " + (e.message || String(e))); }
      }}>🔑 Entrar com conta Qualtech</button>
    </div>
  );

  return (
    <div style={S.page}>
      {/* Header status conexão */}
      <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "8px 14px", marginBottom: 10, fontSize: 12, color: "#065f46", display: "flex", alignItems: "center", gap: 8 }}>
        <span>✅</span>
        <span>Conectado como <strong>{spAccount.name}</strong> ({spAccount.username}) — Site: GLOBALAPPS · Lista: ListaWOs</span>
        <button onClick={onLogout} style={{ marginLeft: "auto", background: "none", border: "1px solid #6ee7b7", borderRadius: 6, cursor: "pointer", fontSize: 11, color: "#065f46", padding: "2px 8px" }}>Sair</button>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "8px 14px", marginBottom: 10, fontSize: 12, color: "#991b1b" }}>⚠️ {error}</div>}

      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>🔗 ListaWOs · SharePoint {loading ? "⏳" : `(${filtered.length} itens)`}</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input style={{ ...S.input, width: 160 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            <button style={btn("#6366f1")} onClick={load} disabled={loading}>↺ Recarregar</button>
            <button style={btn("#64748b")} onClick={async () => { try { const fields = await getListFields(); alert("Campos da lista:\n\n" + fields.map(f => `${f.internalName} (${f.title}) — ${f.type}`).join("\n")); } catch(e: any) { alert("Erro: " + e.message); } }}>🔍 Ver Campos SP</button>
            <button style={btn("#059669")} onClick={openNew}>➕ Novo WO</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead><tr>
              <th style={{ ...S.th, width: 80 }}>Ações</th>
              <th style={S.th}>WO</th>
              <th style={S.th}>Cliente</th>
              <th style={S.th}>Rig / Plataforma</th>
              <th style={S.th}>Tipo Contrato</th>
              <th style={S.th}>País</th>
              <th style={S.th}>Status SP</th>
              <th style={{ ...S.th, color: N.muted }}>ID SP</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: 32 }}>
                  {items.length === 0 ? "Nenhum item na lista." : "Nenhum resultado para a busca."}
                </td></tr>
              )}
              {filtered.map((row, i) => (
                <tr key={row.ID ?? i} style={{ background: i % 2 === 0 ? N.card : N.bg }}>
                  <td style={S.td}><div style={{ display: "flex", gap: 2 }}>
                    <button style={btnSm(N.accent)} title="Editar" onClick={() => openEdit(row)}>✏️</button>
                    <button style={btnSm("#dc2626")} title="Excluir" onClick={() => del(row)}>🗑</button>
                  </div></td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{row.WO}</td>
                  <td style={S.td}>{row.Client || "—"}</td>
                  <td style={S.td}>{row.Rig || "—"}</td>
                  <td style={S.td}>{row.ContractType ? <Badge text={row.ContractType} /> : "—"}</td>
                  <td style={S.td}>{row.Country || "—"}</td>
                  <td style={S.td}>{row.Status ? <Badge text={row.Status} /> : "—"}</td>
                  <td style={{ ...S.td, color: N.muted, fontSize: 11 }}>{row.ID}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal edição */}
      {editing !== null && (
        <div style={S.modal} onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div style={{ ...S.modalBox, maxWidth: 520 }}>
            <div style={{ ...S.cardHeader, background: "#0078d4", borderRadius: "12px 12px 0 0", padding: "14px 20px" }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>🔗 {form.ID ? `Editar WO ${form.WO}` : "Novo WO — ListaWOs"}</span>
              <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="WO *"><input style={S.input} value={form.WO} onChange={e => setForm(f => ({ ...f, WO: e.target.value }))} placeholder="ex: 3808" /></Field>
              <Field label="Cliente *">
                {clients.length > 0
                  ? <SearchSelect options={clients.map((c: any) => ({ id: c.id, label: c.client_name ?? c.name ?? String(c.id) }))} value={form.client_id ?? null} onChange={(id, opt) => setForm(f => ({ ...f, client_id: id ?? undefined, Client: opt?.label ?? f.Client }))} placeholder="Buscar cliente..." />
                  : <input style={S.input} value={form.Client} onChange={e => setForm(f => ({ ...f, Client: e.target.value }))} placeholder="ex: Transocean" />}
              </Field>
              <Field label="Rig / Plataforma *">
                {platforms.length > 0
                  ? <SearchSelect options={platforms.map((p: any) => ({ id: p.id, label: p.platform_name ?? p.name ?? String(p.id) }))} value={form.platform_id ?? null} onChange={(id, opt) => setForm(f => ({ ...f, platform_id: id ?? undefined, Rig: opt?.label ?? f.Rig }))} placeholder="Buscar plataforma..." />
                  : <input style={S.input} value={form.Rig} onChange={e => setForm(f => ({ ...f, Rig: e.target.value }))} placeholder="ex: Deepwater Corcovado" />}
              </Field>
              <Field label="Tipo Contrato (ContractType)">
                {contractCategories.length > 0
                  ? <SearchSelect options={contractCategories.map((c: any) => ({ id: c.id, label: c.contract_category_name ?? c.name ?? String(c.id) }))} value={contractCategories.find((c: any) => (c.contract_category_name ?? c.name) === form.ContractType)?.id ?? null} onChange={(_id, opt) => setForm(f => ({ ...f, ContractType: opt?.label ?? "" }))} placeholder="Buscar tipo de contrato..." />
                  : <input style={S.input} value={form.ContractType ?? ""} onChange={e => setForm(f => ({ ...f, ContractType: e.target.value }))} />}
              </Field>
              <Field label="País">
                <select style={S.select} value={form.Country_ID ?? ""} onChange={e => setForm(f => ({ ...f, Country_ID: e.target.value }))}>
                  <option value="">—</option>
                  <option value="10">🇧🇷 Brasil (10)</option>
                  <option value="20">🌍 Internacional 20</option>
                  <option value="30">🌍 Internacional 30</option>
                  <option value="40">🌍 Internacional 40</option>
                </select>
              </Field>
            </div>
            {error && <div style={{ margin: "0 20px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#991b1b" }}>⚠️ {error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "0 20px 20px" }}>
              <button style={btn("#64748b")} onClick={() => setEditing(null)}>Cancelar</button>
              <button style={btn("#0078d4")} onClick={save} disabled={saving}>{saving ? "Salvando..." : "💾 Salvar no SharePoint"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>(() => (sessionStorage.getItem("mos-tab") as Tab) || "contas");
  const changeTab = (t: Tab) => {
    sessionStorage.setItem("mos-tab", t);
    sessionStorage.setItem("mos-active-tab", t); // preserva para restaurar após login redirect
    setTab(t);
  };
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [dark, setDark] = useState(() => localStorage.getItem("mos-dark") === "1");
  const [dashPage, setDashPage] = useState<string>("status");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [spAccount, setSpAccount] = useState<{ name?: string; username?: string } | null>(null);

  // Re-apply theme globals on every dark change
  const T = THEMES[dark ? "dark" : "light"];
  N = T;
  neo = `5px 5px 12px ${T.shadowD}, -3px -3px 8px ${T.shadowL}`;
  inset = `inset 3px 3px 8px ${T.shadowD}, inset -2px -2px 6px ${T.shadowL}`;
  S = buildStyles(T);

  const toggleDark = () => setDark(d => { const next = !d; localStorage.setItem("mos-dark", next ? "1" : "0"); return next; });

  useEffect(() => {
    if (!settingsOpen) return;
    const close = () => setSettingsOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [settingsOpen]);

  const reloadDrafts = () => setDrafts(STATIC_DRAFTS as Draft[]);

  useEffect(() => {
    reloadDrafts();
    setProjetos(STATIC_PROJETOS_RAW as Projeto[]); // fallback estático
    initMsal().then(() => {
      setSpAccount(getSpAccount());
      // Carrega projetos do SharePoint se estiver logado
      listProjetosFromSP().then(data => { if (data.length > 0) setProjetos(data); }).catch(() => {});
    }).catch(() => {});
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
        <img src={dark ? "/logo-full-dark.png" : "/logo-full.png"} alt="Qualitech" style={{ height: 36, objectFit: "contain" }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>QT - FIN - Contas a Receber</div>
          <div style={{ fontSize: 11, color: T.muted }}>Offshore Workboard · Qualtech IRM</div>
        </div>
        <div style={{ flex: 1 }} />
        {/* SP login/logout */}
        {spAccount ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ textAlign: "right" as const }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{spAccount.name}</div>
              <div style={{ fontSize: 10, color: "#059669" }}>✅ SharePoint conectado</div>
            </div>
            <button onClick={async () => { await logoutSharePoint(); setSpAccount(null); }}
              title="Sair do SharePoint"
              style={{ background: "#fee2e2", border: "none", cursor: "pointer", fontSize: 12, padding: "6px 12px", borderRadius: 8, color: "#dc2626", fontWeight: 600 }}>
              Sair
            </button>
          </div>
        ) : (
          <button onClick={async () => { try { await loginSharePoint(); } catch(e: any) { alert(e.message); } }}
            title="Entrar com conta Qualtech"
            style={{ background: "#0078d4", border: "none", cursor: "pointer", fontSize: 12, padding: "7px 14px", borderRadius: 8, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            🔑 Entrar
          </button>
        )}
        <button onClick={toggleDark} title={dark ? "Modo claro" : "Modo escuro"}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: "4px 8px", borderRadius: 8, color: T.muted, transition: "color .2s" }}>
          {dark ? "☀️" : "🌙"}
        </button>
      </div>
      {/* ── NAV + ⚙️ em flex row — ⚙️ fora do overflow:auto ── */}
      <div style={{ display: "flex", gap: 6, margin: "8px 16px", alignItems: "center" }}>

        {/* Nav principal (flex:1, overflow auto interno) */}
        <div style={{ ...S.nav, flex: 1, margin: 0, justifyContent: "flex-start" }}>
          <button style={navBtn(tab === "contas")} onClick={() => changeTab("contas")}>📋 Contas a Receber</button>
          <button style={navBtn(tab === "dashboard")} onClick={() => changeTab("dashboard")}>📊 Dashboard</button>

          {tab === "dashboard" && (
            <>
              <div style={{ width: 1, alignSelf: "stretch", background: N.shadowD, margin: "4px 4px" }} />
              {[
                { id: "status",   label: "📊 Status" },
                { id: "faturar",  label: "💰 A Faturar" },
                { id: "doc",      label: "📄 Documentação" },
                { id: "resposta", label: "💬 Resp. Cliente" },
                { id: "draft",    label: "📝 Draft" },
                { id: "mensal",   label: "📅 Fat. Mensal" },
                { id: "cliente",  label: "👥 Por Cliente" },
              ].map(p => (
                <button key={p.id}
                  style={{ ...navBtn(dashPage === p.id), fontSize: 11, padding: "6px 10px" }}
                  onClick={() => setDashPage(p.id)}>{p.label}</button>
              ))}
            </>
          )}
        </div>

        {/* ⚙️ fora do nav — dropdown abre livremente para baixo/esquerda */}
        <div style={{ position: "relative", flexShrink: 0 }} onMouseDown={e => e.stopPropagation()}>
          <button
            style={{ ...navBtn(["impostos","clientes","projetos","drafts","feriados","qualtech_projects"].includes(tab)),
              padding: "8px 14px", background: N.card,
              boxShadow: `4px 4px 10px ${N.shadowD}, -2px -2px 6px ${N.shadowL}`,
              borderRadius: 10, display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => setSettingsOpen(o => !o)}
          >
            <span style={{ fontSize: 14 }}>⚙️</span>
            <span style={{ fontSize: 12, fontWeight: ["impostos","clientes","projetos","drafts","feriados"].includes(tab) ? 700 : 400 }}>
              Configurações
            </span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{settingsOpen ? "▲" : "▼"}</span>
          </button>

          {settingsOpen && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 6px)",
              background: N.card, borderRadius: 12,
              boxShadow: `6px 6px 18px ${N.shadowD}, -3px -3px 10px ${N.shadowL}`,
              zIndex: 300, overflow: "hidden",
              /* expande para a esquerda em linha */
              display: "flex", flexDirection: "row", whiteSpace: "nowrap" as const,
            }}>
              {[
                { key: "impostos"           as Tab, icon: "⚙️",  label: "Impostos" },
                { key: "clientes"           as Tab, icon: "👥",  label: "Clientes / Prazos" },
                { key: "projetos"           as Tab, icon: "🏗",  label: "Projetos (WO)" },
                { key: "drafts"             as Tab, icon: "📝",  label: "Drafts" },
                { key: "feriados"           as Tab, icon: "📅",  label: "Feriados" },
                { key: "qualtech_projects"  as Tab, icon: "🌐",  label: "Qualtech · Projects" },
              ].map((item, i, arr) => (
                <button key={item.key}
                  onClick={() => { changeTab(item.key); setSettingsOpen(false); }}
                  style={{
                    padding: "11px 18px",
                    background: tab === item.key ? N.accent : "transparent",
                    color: tab === item.key ? "#fff" : N.text,
                    border: "none",
                    borderRight: i < arr.length - 1 ? `1px solid ${N.shadowD}` : "none",
                    cursor: "pointer", fontSize: 12,
                    fontWeight: tab === item.key ? 700 : 400,
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "background .12s",
                  }}>
                  <span>{item.icon}</span><span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {tab === "dashboard" && <Dashboard dark={dark} onToggleDark={toggleDark} page={dashPage} onPageChange={setDashPage} />}
      {tab === "contas" && <ContasPage drafts={drafts} projetos={projetos} onDraftsChanged={reloadDrafts} spAccount={spAccount} />}

      {tab === "impostos" && <CRUDPage<Imposto> title="Impostos" icon="🧾" endpoint="impostos" staticData={STATIC_IMPOSTOS}
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

      {tab === "clientes" && <CRUDPage<ClientePrazo> title="Prazos por Cliente" icon="👥" endpoint="clientes-prazos" staticData={STATIC_CLIENTES_PRAZOS as ClientePrazo[]}
        columns={[{ key: "cliente", label: "Cliente" }, { key: "rec_doc", label: "Rec. Doc" }, { key: "medicao", label: "Medição" }, { key: "resp_cli", label: "Resp. Cli" }, { key: "vencimento", label: "Vencimento" }, { key: "cambio", label: "Câmbio" }, { key: "total_dias", label: "Total", render: v => <strong>{v}</strong> }, { key: "data_limite", label: "Dia Limite" }]}
        emptyItem={{ cliente: "", rec_doc: 5, medicao: 3, resp_cli: 10, vencimento: 30, cambio: 0, data_limite: 30 }}
        renderForm={(f, set) => (<>
          <Field label="Cliente"><input style={S.input} value={f.cliente} onChange={e => set("cliente", e.target.value)} /></Field>
          {(["rec_doc", "medicao", "resp_cli", "vencimento", "cambio", "data_limite"] as const).map(k => (
            <Field key={k} label={k}><input type="number" style={S.input} value={f[k]} onChange={e => set(k, +e.target.value)} /></Field>
          ))}
        </>)} />}

      {tab === "projetos" && <CRUDPage<Projeto> title="Projetos / WO" icon="🏗" endpoint="projetos"
        staticData={STATIC_PROJETOS_RAW as Projeto[]}
        spLoad={listProjetosFromSP}
        spSave={async (f) => { if (f.id) await updateProjeto(f.id, f); else await createProjeto(f); }}
        spDelete={deleteProjeto}
        columns={[
          { key: "wo", label: "WO", render: v => <strong>#{v}</strong> },
          { key: "cliente", label: "Cliente" },
          { key: "plataforma", label: "Plataforma" },
          { key: "coordenador", label: "Coordenador" },
          { key: "tipo_servico", label: "Tipo Serviço" },
          { key: "vl_diaria", label: "Vl. Diária", render: v => v != null ? fmt.brl(v) : "-" },
          { key: "vl_diaria_locacao", label: "Vl. Diária Loc.", render: v => v != null ? fmt.brl(v) : "-" },
          { key: "vl_outros", label: "Vl. Outros", render: v => v != null ? fmt.brl(v) : "-" },
          { key: "ativo", label: "Ativo", render: v => v ? "✅" : "❌" },
        ]}
        emptyItem={{ wo: 0, cliente: "", plataforma: "", coordenador: "", tipo_servico: "", ativo: true, vl_diaria: undefined, vl_diaria_locacao: undefined, vl_outros: undefined }}
        renderForm={(f, set) => {
          const qtProjs = STATIC_QUALTECH_PROJECTS as { project_number: number; cliente: string; plataforma: string }[];
          const coordOpts = ["AJ","AS","GR","MF","MS","TC","VR"];
          const handleWO = (pn: number) => {
            set("wo", pn);
            const qt = qtProjs.find(p => p.project_number === pn);
            if (qt) { set("cliente", qt.cliente || ""); set("plataforma", qt.plataforma || ""); }
          };
          return (<>
            <Field label="WO">
              <select style={S.select} value={f.wo || ""} onChange={e => handleWO(+e.target.value)}>
                <option value="">Selecione a WO...</option>
                {qtProjs.map(p => (
                  <option key={p.project_number} value={p.project_number}>
                    {p.project_number}{p.cliente ? ` — ${p.cliente}` : ""}{p.plataforma ? ` · ${p.plataforma}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cliente"><input style={S.input} value={f.cliente || ""} onChange={e => set("cliente", e.target.value)} placeholder="Auto-preenchido pela WO" /></Field>
            <Field label="Plataforma"><input style={S.input} value={f.plataforma || ""} onChange={e => set("plataforma", e.target.value)} placeholder="Auto-preenchido pela WO" /></Field>
            <Field label="Coordenador">
              <select style={S.select} value={f.coordenador || ""} onChange={e => set("coordenador", e.target.value)}>
                <option value="">—</option>
                {coordOpts.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Tipo Serviço">
              <select style={S.select} value={f.tipo_servico || ""} onChange={e => set("tipo_servico", e.target.value)}>
                <option value="">—</option>
                {["SERVIÇO","LOCAÇÃO","CONTRATO","VENDA"].map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Vl. Diária (SERVIÇO)"><CurrencyInput style={S.input} value={f.vl_diaria} onChange={v => set("vl_diaria", v)} /></Field>
            <Field label="Vl. Diária Locação"><CurrencyInput style={S.input} value={f.vl_diaria_locacao} onChange={v => set("vl_diaria_locacao", v)} /></Field>
            <Field label="Vl. Outros"><CurrencyInput style={S.input} value={f.vl_outros} onChange={v => set("vl_outros", v)} /></Field>
          </>);
        }} />}

      {tab === "drafts" && <DraftsPage onDraftsChanged={reloadDrafts} />}
      {tab === "qualtech_projects" && <QualtechProjectsPage />}

      {tab === "feriados" && <CRUDPage<Feriado> title="Feriados" icon="📅" endpoint="feriados" staticData={STATIC_FERIADOS}
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
