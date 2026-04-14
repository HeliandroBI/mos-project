import { useState, useEffect, useCallback } from 'react'
import { taxAPI, paymentTermsAPI, draftsAPI, holidaysAPI, projectsAPI, qualtechAPI } from '../services/api'
import type { TaxRate, ClientPaymentTerm, Draft, Holiday, Project } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n?: number) => n !== undefined ? (n * 100).toFixed(2) + '%' : ''
const fmtDays = (n?: number) => n !== undefined ? `${n}d` : ''

function EditableCell({ value, onSave, type = 'text' }: { value: any, onSave: (v: any) => void, type?: string }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  if (editing) return (
    <input autoFocus type={type} value={val}
      className="w-full bg-slate-700 text-white px-2 py-1 rounded border border-blue-400 text-sm"
      onChange={e => setVal(e.target.value)}
      onBlur={() => { onSave(type === 'number' ? parseFloat(val) : val); setEditing(false) }}
      onKeyDown={e => { if (e.key === 'Enter') { onSave(type === 'number' ? parseFloat(val) : val); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
    />
  )
  return <span className="cursor-pointer hover:text-blue-300 underline dotted" onClick={() => { setVal(value); setEditing(true) }}>{value ?? '–'}</span>
}

// ─── TAX RATES TABLE ──────────────────────────────────────────────────────────
function TaxRatesTab() {
  const [taxes, setTaxes] = useState<TaxRate[]>([])
  const [filter, setFilter] = useState<'all'|'retido'|'a_pagar'>('all')
  const [newTax, setNewTax] = useState({ tax_name:'', category:'retido', rate:'', valid_from: new Date().toISOString().split('T')[0], service_type:'', doc_type:'', faturado_por:'', country:'Brasil' })
  const load = useCallback(() => taxAPI.list(filter === 'all' ? undefined : filter).then(r => setTaxes(r.data)), [filter])
  useEffect(() => { load() }, [load])

  const handleUpdate = async (id: number, field: string, value: any) => {
    await taxAPI.update(id, { [field]: value })
    load()
  }
  const handleDelete = async (id: number) => { if (confirm('Excluir?')) { await taxAPI.delete(id); load() } }
  const handleAdd = async () => {
    await taxAPI.create({ ...newTax, rate: parseFloat(newTax.rate) || 0 })
    load()
    setNewTax({ tax_name:'', category:'retido', rate:'', valid_from: new Date().toISOString().split('T')[0], service_type:'', doc_type:'', faturado_por:'', country:'Brasil' })
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['all','retido','a_pagar'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm font-medium ${filter===f ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            {f === 'all' ? 'Todos' : f === 'retido' ? 'Retidos na Fonte' : 'A Pagar'}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-400 border-b border-slate-700">
            <th className="py-2 px-3">Imposto</th><th className="px-3">Categoria</th>
            <th className="px-3">Alíquota</th><th className="px-3">Tipo Serv.</th>
            <th className="px-3">Doc</th><th className="px-3">Fat. Por</th>
            <th className="px-3">Vigência</th><th className="px-3">Fim</th><th className="px-3">País</th><th className="px-3">Ações</th>
          </tr></thead>
          <tbody>
            {taxes.map(t => (
              <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-800">
                <td className="py-2 px-3 font-medium">{t.tax_name}</td>
                <td className="px-3"><span className={`text-xs px-2 py-0.5 rounded ${t.category==='retido' ? 'bg-blue-900 text-blue-200' : 'bg-orange-900 text-orange-200'}`}>{t.category}</span></td>
                <td className="px-3 font-mono"><EditableCell value={t.rate * 100} onSave={v => handleUpdate(t.id, 'rate', parseFloat(v)/100)} type="number" />%</td>
                <td className="px-3 text-slate-400">{t.service_type || '–'}</td>
                <td className="px-3 text-slate-400">{t.doc_type || '–'}</td>
                <td className="px-3 text-slate-400">{t.faturado_por || '–'}</td>
                <td className="px-3 text-slate-400">{t.valid_from}</td>
                <td className="px-3 text-slate-400"><EditableCell value={t.valid_to} onSave={v => handleUpdate(t.id, 'valid_to', v)} type="date" /></td>
                <td className="px-3 text-slate-400">{t.country}</td>
                <td className="px-3"><button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300 text-xs">🗑</button></td>
              </tr>
            ))}
            {/* Add row */}
            <tr className="border-b border-slate-700 bg-slate-900">
              <td className="py-2 px-3"><input value={newTax.tax_name} onChange={e=>setNewTax({...newTax,tax_name:e.target.value})} placeholder="COFINS..." className="w-24 bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td className="px-3"><select value={newTax.category} onChange={e=>setNewTax({...newTax,category:e.target.value})} className="bg-slate-700 text-white px-2 py-1 rounded text-sm">
                <option value="retido">retido</option><option value="a_pagar">a_pagar</option></select></td>
              <td className="px-3"><input type="number" step="0.01" value={newTax.rate} onChange={e=>setNewTax({...newTax,rate:e.target.value})} placeholder="%" className="w-16 bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td className="px-3"><input value={newTax.service_type} onChange={e=>setNewTax({...newTax,service_type:e.target.value})} placeholder="Opcional" className="w-24 bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td className="px-3"><input value={newTax.doc_type} onChange={e=>setNewTax({...newTax,doc_type:e.target.value})} placeholder="Opcional" className="w-24 bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td className="px-3"><input value={newTax.faturado_por} onChange={e=>setNewTax({...newTax,faturado_por:e.target.value})} placeholder="Opcional" className="w-20 bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td className="px-3"><input type="date" value={newTax.valid_from} onChange={e=>setNewTax({...newTax,valid_from:e.target.value})} className="bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td /><td />
              <td className="px-3"><button onClick={handleAdd} className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs">+ Add</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── PAYMENT TERMS TABLE ──────────────────────────────────────────────────────
function PaymentTermsTab() {
  const [terms, setTerms] = useState<ClientPaymentTerm[]>([])
  const [newRow, setNewRow] = useState({ client_name:'', rec_doc:5, medicao:3, resp_cli:10, vencimento:30, cambio:0, data_limite:25 })
  const load = () => paymentTermsAPI.list().then(r => setTerms(r.data))
  useEffect(() => { load() }, [])

  const handleUpdate = async (id: number, field: string, value: any) => {
    await paymentTermsAPI.update(id, { [field]: value })
    load()
  }
  const handleDelete = async (id: number) => { if (confirm('Excluir?')) { await paymentTermsAPI.delete(id); load() } }
  const handleAdd = async () => { await paymentTermsAPI.create(newRow); load(); setNewRow({ client_name:'', rec_doc:5, medicao:3, resp_cli:10, vencimento:30, cambio:0, data_limite:25 }) }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-400 border-b border-slate-700">
          <th className="py-2 px-3">Cliente</th><th className="px-3">Rec.Doc</th>
          <th className="px-3">Medição</th><th className="px-3">Resp.Cli</th>
          <th className="px-3">Vencimento</th><th className="px-3">Câmbio</th>
          <th className="px-3">Total Dias</th><th className="px-3">Lim.Fat</th><th className="px-3">Ações</th>
        </tr></thead>
        <tbody>
          {terms.map(t => (
            <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-800">
              <td className="py-2 px-3 font-medium">{t.client_name}</td>
              {(['rec_doc','medicao','resp_cli','vencimento','cambio'] as const).map(f => (
                <td key={f} className="px-3 text-center font-mono"><EditableCell value={t[f]} onSave={v => handleUpdate(t.id, f, parseInt(v))} type="number" /></td>
              ))}
              <td className="px-3 text-center font-mono font-bold text-emerald-400">{t.total_dias}</td>
              <td className="px-3 text-center font-mono"><EditableCell value={t.data_limite} onSave={v => handleUpdate(t.id, 'data_limite', parseInt(v))} type="number" /></td>
              <td className="px-3"><button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300 text-xs">🗑</button></td>
            </tr>
          ))}
          <tr className="border-b border-slate-700 bg-slate-900">
            <td className="py-2 px-3"><input value={newRow.client_name} onChange={e=>setNewRow({...newRow,client_name:e.target.value})} placeholder="Cliente..." className="w-32 bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
            {(['rec_doc','medicao','resp_cli','vencimento','cambio','data_limite'] as const).map(f => (
              <td key={f} className="px-3"><input type="number" value={newRow[f]} onChange={e=>setNewRow({...newRow,[f]:parseInt(e.target.value)||0})} className="w-16 bg-slate-700 text-white px-2 py-1 rounded text-sm text-center" /></td>
            ))}
            <td className="px-3"><button onClick={handleAdd} className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs">+ Add</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── DRAFTS TABLE ─────────────────────────────────────────────────────────────
function DraftsTab() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [nextDraft, setNextDraft] = useState<number | null>(null)
  const [newDraft, setNewDraft] = useState({ draft_code:'', draft_date:'' })
  const load = () => {
    draftsAPI.list().then(r => setDrafts(r.data))
    draftsAPI.nextSuggestion().then(r => setNextDraft(r.data.next_draft))
  }
  useEffect(() => { load() }, [])

  const handleDelete = async (id: number) => { if (confirm('Excluir?')) { await draftsAPI.delete(id); load() } }
  const handleAdd = async () => {
    await draftsAPI.create({ draft_code: parseInt(newDraft.draft_code), draft_date: newDraft.draft_date || null })
    load()
    setNewDraft({ draft_code:'', draft_date:'' })
  }

  return (
    <div>
      {nextDraft && <div className="mb-4 text-sm text-blue-300 bg-blue-900/30 px-4 py-2 rounded-lg inline-block">💡 Próximo DRAFT sugerido: <span className="font-bold text-white">{nextDraft}</span></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-400 border-b border-slate-700">
            <th className="py-2 px-3">Cód. DRAFT</th><th className="px-3">Data DRAFT</th><th className="px-3">Notas</th><th className="px-3">Ações</th>
          </tr></thead>
          <tbody>
            {drafts.map(d => (
              <tr key={d.id} className="border-b border-slate-800 hover:bg-slate-800">
                <td className="py-2 px-3 font-mono font-bold text-yellow-300">{d.draft_code}</td>
                <td className="px-3 text-slate-300">{d.draft_date || '–'}</td>
                <td className="px-3 text-slate-400 text-xs">{d.notes || '–'}</td>
                <td className="px-3"><button onClick={() => handleDelete(d.id)} className="text-red-400 hover:text-red-300 text-xs">🗑</button></td>
              </tr>
            ))}
            <tr className="border-b border-slate-700 bg-slate-900">
              <td className="py-2 px-3"><input type="number" value={newDraft.draft_code} onChange={e=>setNewDraft({...newDraft,draft_code:e.target.value})} placeholder={nextDraft?.toString()} className="w-24 bg-slate-700 text-white px-2 py-1 rounded text-sm font-mono" /></td>
              <td className="px-3"><input type="date" value={newDraft.draft_date} onChange={e=>setNewDraft({...newDraft,draft_date:e.target.value})} className="bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td />
              <td className="px-3"><button onClick={handleAdd} className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs">+ Add</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── HOLIDAYS TABLE ───────────────────────────────────────────────────────────
function HolidaysTab() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [state, setState] = useState('')
  const [newHol, setNewHol] = useState({ date:'', name:'', type:'nacional', state:'', city:'', country:'Brasil', recurring:true })
  const load = () => holidaysAPI.list(String(year), state || undefined).then(r => setHolidays(r.data))
  useEffect(() => { load() }, [year, state])

  const handleDelete = async (id: number) => { if (confirm('Excluir?')) { await holidaysAPI.delete(id); load() } }
  const handleAdd = async () => { await holidaysAPI.create(newHol); load(); setNewHol({ date:'', name:'', type:'nacional', state:'', city:'', country:'Brasil', recurring:true }) }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-slate-400 text-sm">Ano:</label>
          <input type="number" value={year} onChange={e=>setYear(parseInt(e.target.value))} className="w-20 bg-slate-700 text-white px-2 py-1 rounded text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-slate-400 text-sm">Estado:</label>
          <input value={state} onChange={e=>setState(e.target.value)} placeholder="RJ, SP..." className="w-20 bg-slate-700 text-white px-2 py-1 rounded text-sm" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-400 border-b border-slate-700">
            <th className="py-2 px-3">Data</th><th className="px-3">Nome</th><th className="px-3">Tipo</th>
            <th className="px-3">Estado</th><th className="px-3">País</th><th className="px-3">Recorrente</th><th className="px-3">Ações</th>
          </tr></thead>
          <tbody>
            {holidays.map(h => (
              <tr key={h.id} className="border-b border-slate-800 hover:bg-slate-800">
                <td className="py-2 px-3 font-mono text-yellow-300">{h.date}</td>
                <td className="px-3">{h.name}</td>
                <td className="px-3"><span className={`text-xs px-2 py-0.5 rounded ${h.type==='nacional' ? 'bg-blue-900 text-blue-200' : h.type==='estadual' ? 'bg-purple-900 text-purple-200' : 'bg-orange-900 text-orange-200'}`}>{h.type}</span></td>
                <td className="px-3 text-slate-400">{h.state || '–'}</td>
                <td className="px-3 text-slate-400">{h.country}</td>
                <td className="px-3">{h.recurring ? '✅' : '❌'}</td>
                <td className="px-3"><button onClick={() => handleDelete(h.id)} className="text-red-400 hover:text-red-300 text-xs">🗑</button></td>
              </tr>
            ))}
            <tr className="border-b border-slate-700 bg-slate-900">
              <td className="py-2 px-2"><input type="date" value={newHol.date} onChange={e=>setNewHol({...newHol,date:e.target.value})} className="bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td className="px-2"><input value={newHol.name} onChange={e=>setNewHol({...newHol,name:e.target.value})} placeholder="Nome..." className="w-40 bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td className="px-2"><select value={newHol.type} onChange={e=>setNewHol({...newHol,type:e.target.value})} className="bg-slate-700 text-white px-2 py-1 rounded text-sm">
                <option>nacional</option><option>estadual</option><option>municipal</option></select></td>
              <td className="px-2"><input value={newHol.state} onChange={e=>setNewHol({...newHol,state:e.target.value})} placeholder="RJ" className="w-16 bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td className="px-2"><input value={newHol.country} onChange={e=>setNewHol({...newHol,country:e.target.value})} className="w-20 bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td className="px-2"><input type="checkbox" checked={newHol.recurring} onChange={e=>setNewHol({...newHol,recurring:e.target.checked})} /></td>
              <td className="px-2"><button onClick={handleAdd} className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs">+ Add</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── PROJECTS (WOs) TAB ───────────────────────────────────────────────────────
function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [woSearch, setWoSearch] = useState('')
  const [apiResults, setApiResults] = useState<any[]>([])
  const [newWO, setNewWO] = useState({ wo:'', client_name:'', platform_name:'', coordinator_name:'', service_type:'', exterior_com_iss: false })
  const load = () => projectsAPI.list(search || undefined).then(r => setProjects(r.data))
  useEffect(() => { load() }, [search])

  const searchAPI = async () => {
    if (!woSearch) return
    const r = await qualtechAPI.listProjects(woSearch)
    setApiResults(r.data)
  }

  const importFromAPI = async (wo: number) => {
    await qualtechAPI.listProjects(String(wo))
    load()
    setApiResults([])
    setWoSearch('')
  }

  const handleDelete = async (wo: number) => { if (confirm('Excluir?')) { await projectsAPI.delete(String(wo)); load() } }
  const handleAdd = async () => {
    await projectsAPI.create({ ...newWO, wo: parseInt(newWO.wo) })
    load()
    setNewWO({ wo:'', client_name:'', platform_name:'', coordinator_name:'', service_type:'', exterior_com_iss: false })
  }

  return (
    <div>
      {/* Search from Qualtech API */}
      <div className="bg-slate-800 rounded-lg p-4 mb-4">
        <p className="text-slate-400 text-xs mb-2">🔗 Importar WO da API Qualtech:</p>
        <div className="flex gap-2">
          <input value={woSearch} onChange={e=>setWoSearch(e.target.value)} placeholder="Buscar WO na API..." className="flex-1 bg-slate-700 text-white px-3 py-2 rounded text-sm" />
          <button onClick={searchAPI} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm">Buscar</button>
        </div>
        {apiResults.length > 0 && (
          <div className="mt-2 max-h-32 overflow-y-auto">
            {apiResults.slice(0,10).map((p: any) => (
              <div key={p.id} className="flex justify-between items-center py-1 px-2 hover:bg-slate-700 rounded">
                <span className="text-sm font-mono text-yellow-300">WO {p.project_number}</span>
                <button onClick={() => importFromAPI(p.project_number)} className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded">Importar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Filtrar WOs cadastradas..." className="w-full bg-slate-700 text-white px-3 py-2 rounded mb-3 text-sm" />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-400 border-b border-slate-700">
            <th className="py-2 px-3">WO</th><th className="px-3">Cliente</th><th className="px-3">Plataforma</th>
            <th className="px-3">Coordenador</th><th className="px-3">Tipo Serv.</th><th className="px-3">Ext.ISS</th><th className="px-3">Ações</th>
          </tr></thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800">
                <td className="py-2 px-3 font-mono font-bold text-yellow-300">{p.wo}</td>
                <td className="px-3">{p.client_name || '–'}</td>
                <td className="px-3 text-slate-300">{p.platform_name || '–'}</td>
                <td className="px-3 text-slate-400">{p.coordinator_name || '–'}</td>
                <td className="px-3"><span className={`text-xs px-2 py-0.5 rounded ${p.service_type==='SERVIÇO' ? 'bg-blue-900 text-blue-200' : 'bg-green-900 text-green-200'}`}>{p.service_type || '–'}</span></td>
                <td className="px-3">{p.exterior_com_iss ? '✅' : '–'}</td>
                <td className="px-3"><button onClick={() => handleDelete(p.wo)} className="text-red-400 hover:text-red-300 text-xs">🗑</button></td>
              </tr>
            ))}
            <tr className="border-b border-slate-700 bg-slate-900">
              <td className="py-2 px-2"><input type="number" value={newWO.wo} onChange={e=>setNewWO({...newWO,wo:e.target.value})} placeholder="WO#" className="w-20 bg-slate-700 text-white px-2 py-1 rounded text-sm font-mono" /></td>
              <td className="px-2"><input value={newWO.client_name} onChange={e=>setNewWO({...newWO,client_name:e.target.value})} placeholder="Cliente" className="w-28 bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td className="px-2"><input value={newWO.platform_name} onChange={e=>setNewWO({...newWO,platform_name:e.target.value})} placeholder="Plataforma" className="w-28 bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td className="px-2"><input value={newWO.coordinator_name} onChange={e=>setNewWO({...newWO,coordinator_name:e.target.value})} placeholder="Coord." className="w-24 bg-slate-700 text-white px-2 py-1 rounded text-sm" /></td>
              <td className="px-2"><select value={newWO.service_type} onChange={e=>setNewWO({...newWO,service_type:e.target.value})} className="bg-slate-700 text-white px-2 py-1 rounded text-sm">
                <option value="">–</option><option>SERVIÇO</option><option>LOCAÇÃO</option></select></td>
              <td className="px-2"><input type="checkbox" checked={newWO.exterior_com_iss} onChange={e=>setNewWO({...newWO,exterior_com_iss:e.target.checked})} /></td>
              <td className="px-2"><button onClick={handleAdd} className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs">+ Add</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── MAIN SETUP PAGE ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'taxes', label: '🧾 Impostos' },
  { id: 'terms', label: '📅 Prazos/Vencimentos' },
  { id: 'drafts', label: '📋 DRAFTs' },
  { id: 'holidays', label: '🎉 Feriados' },
  { id: 'projects', label: '🏗 WOs / Projetos' },
]

export default function SetupPage() {
  const [activeTab, setActiveTab] = useState('taxes')
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-2">⚙️ Setup</h1>
      <p className="text-slate-400 text-sm mb-6">Configurações base do sistema</p>

      <div className="flex gap-1 mb-6 border-b border-slate-700 pb-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${activeTab===t.id ? 'bg-slate-700 text-white border-b-2 border-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
        {activeTab === 'taxes' && <TaxRatesTab />}
        {activeTab === 'terms' && <PaymentTermsTab />}
        {activeTab === 'drafts' && <DraftsTab />}
        {activeTab === 'holidays' && <HolidaysTab />}
        {activeTab === 'projects' && <ProjectsTab />}
      </div>
    </div>
  )
}
