import { useState, useEffect, useRef } from 'react'
import { contasAPI, draftsAPI, projectsAPI } from '../services/api'
import type { ContaReceber, Totais, Draft, Project } from '../types'
import { DOC_TYPES, ESCOPOS, FATURADO_POR, STATUS_LIST } from '../types'

const fmt = (n?: number | null) => n != null ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '–'
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '–'
const statusColor = (s?: string) => {
  if (!s) return 'bg-slate-700 text-slate-300'
  if (s === 'PAGO') return 'bg-emerald-900 text-emerald-200'
  if (s === 'AGUARDANDO PAGAMENTO') return 'bg-yellow-900 text-yellow-200'
  if (s === 'Enviar NF') return 'bg-blue-900 text-blue-200'
  if (s?.toLowerCase().includes('aguard')) return 'bg-orange-900 text-orange-200'
  if (s === 'em andamento' || s === 'a começar') return 'bg-purple-900 text-purple-200'
  if (s === 'Devedores Incobráveis' || s === 'Free Of Charge') return 'bg-red-900 text-red-200'
  return 'bg-slate-700 text-slate-300'
}

// ─── TOTALS BAR ───────────────────────────────────────────────────────────────
function TotalsBar({ totais }: { totais?: Totais }) {
  if (!totais) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {[
        { label: 'Total Bruto', value: totais.total_bruto, color: 'text-blue-300', bg: 'bg-blue-900/30' },
        { label: 'Impostos Retidos', value: totais.total_retido, color: 'text-orange-300', bg: 'bg-orange-900/30' },
        { label: 'Valor Líquido', value: totais.total_liquido, color: 'text-emerald-300', bg: 'bg-emerald-900/30' },
        { label: 'Impostos a Pagar', value: totais.total_a_pagar, color: 'text-red-300', bg: 'bg-red-900/30' },
      ].map(c => (
        <div key={c.label} className={`${c.bg} rounded-lg p-3 border border-slate-700`}>
          <p className="text-slate-400 text-xs mb-1">{c.label}</p>
          <p className={`${c.color} font-bold text-lg`}>{fmt(c.value)}</p>
          <p className="text-slate-500 text-xs">{totais.count} registros</p>
        </div>
      ))}
    </div>
  )
}

// ─── INLINE EDIT ROW ──────────────────────────────────────────────────────────
function ContaRow({ conta, drafts, projects, onSave, onDelete }: {
  conta: ContaReceber, drafts: Draft[], projects: Project[],
  onSave: (id: number, d: any) => void, onDelete: (id: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...conta })
  const [showTax, setShowTax] = useState(false)

  const f = (field: keyof ContaReceber) => (val: any) => setForm(p => ({ ...p, [field]: val }))

  const Cell = ({ field, type = 'text', options }: { field: keyof ContaReceber, type?: string, options?: readonly string[] }) => {
    if (!editing) {
      const v = conta[field]
      if (field === 'status') return <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor(v as string)}`}>{v || '–'}</span>
      if (type === 'date') return <span className="text-slate-300 text-xs">{fmtDate(v as string)}</span>
      if (type === 'currency') return <span className="font-mono text-sm">{fmt(v as number)}</span>
      return <span className="text-sm">{(v as any) ?? '–'}</span>
    }
    if (options) return (
      <select value={(form[field] as string) || ''} onChange={e => f(field)(e.target.value)}
        className="w-full bg-slate-600 text-white px-1 py-0.5 rounded text-xs border border-blue-400">
        <option value="">–</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
    return <input type={type} value={(form[field] as any) || ''} onChange={e => f(field)(type==='number' ? parseFloat(e.target.value)||0 : e.target.value)}
      className="w-full bg-slate-600 text-white px-1 py-0.5 rounded text-xs border border-blue-400" />
  }

  const DraftCell = () => {
    if (!editing) return <span className="font-mono font-bold text-yellow-300">{conta.draft_code || '–'}</span>
    return (
      <select value={form.draft_code || ''} onChange={e => setForm(p => ({ ...p, draft_code: parseInt(e.target.value) || undefined }))}
        className="w-full bg-slate-600 text-white px-1 py-0.5 rounded text-xs border border-blue-400">
        <option value="">–</option>
        {drafts.map(d => <option key={d.id} value={d.draft_code}>{d.draft_code} {d.draft_date ? `(${fmtDate(d.draft_date)})` : ''}</option>)}
      </select>
    )
  }

  return (
    <>
      <tr className={`border-b border-slate-800 ${editing ? 'bg-slate-700' : 'hover:bg-slate-800'} text-sm`}>
        <td className="py-1.5 px-2 font-mono text-yellow-300 font-bold">{conta.wo}</td>
        <td className="px-2 text-slate-300 text-xs">{conta.cliente || '–'}</td>
        <td className="px-2 text-slate-400 text-xs">{conta.plataforma || '–'}</td>
        <td className="px-2"><DraftCell /></td>
        <td className="px-2"><Cell field="doc_type" options={DOC_TYPES} /></td>
        <td className="px-2"><Cell field="num_doc" /></td>
        <td className="px-2"><Cell field="data_doc" type="date" /></td>
        <td className="px-2"><Cell field="escopo" options={ESCOPOS} /></td>
        <td className="px-2"><Cell field="faturado_por" options={FATURADO_POR} /></td>
        <td className="px-2 font-mono"><Cell field="vl_bruto" type="number" /></td>
        <td className="px-2 font-mono text-emerald-300">{fmt(conta.vl_liquido)}</td>
        <td className="px-2"><Cell field="vencimento" type="date" /></td>
        <td className="px-2"><Cell field="status" options={STATUS_LIST} /></td>
        <td className="px-2 text-blue-300 text-xs">{fmtDate(conta.prev_fat)}</td>
        <td className="px-2 text-purple-300 text-xs">{fmtDate(conta.prev_pag)}</td>
        <td className="px-2 text-slate-400 text-xs">{conta.mes_prev_pag} {conta.ano_prev_pag}</td>
        <td className="px-2">
          <div className="flex gap-1">
            {editing ? (
              <>
                <button onClick={() => { onSave(conta.id, form); setEditing(false) }} className="bg-green-600 hover:bg-green-500 text-white px-2 py-0.5 rounded text-xs">✓</button>
                <button onClick={() => setEditing(false)} className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-0.5 rounded text-xs">✕</button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="bg-blue-700 hover:bg-blue-600 text-white px-2 py-0.5 rounded text-xs">✏️</button>
                <button onClick={() => setShowTax(!showTax)} className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-0.5 rounded text-xs">🧾</button>
                <button onClick={() => onDelete(conta.id)} className="text-red-400 hover:text-red-300 text-xs">🗑</button>
              </>
            )}
          </div>
        </td>
      </tr>
      {showTax && (
        <tr className="bg-slate-800 border-b border-slate-700">
          <td colSpan={17} className="px-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-semibold mb-1">Retidos na Fonte</p>
                <div className="grid grid-cols-3 gap-1">
                  {[['COFINS 3%', conta.cofins_retido],['CSLL 1%', conta.csll_retido],['INSS 11%', conta.inss_retido],
                    ['IRPJ 1.5%', conta.irpj_retido],['PIS 0.65%', conta.pis_retido],['ISS', conta.iss_retido]].map(([l,v]) => (
                    <div key={l as string} className="flex justify-between px-2 py-0.5 bg-slate-900 rounded">
                      <span className="text-slate-400">{l as string}</span>
                      <span className="font-mono text-orange-300">{fmt(v as number)}</span>
                    </div>
                  ))}
                  <div className="col-span-3 flex justify-between px-2 py-1 bg-orange-900/30 rounded border border-orange-700">
                    <span className="text-orange-300 font-semibold">TOTAL RETIDO</span>
                    <span className="font-mono font-bold text-orange-300">{fmt(conta.total_retido)}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-slate-400 font-semibold mb-1">A Pagar</p>
                <div className="grid grid-cols-3 gap-1">
                  {[['COFINS 7.6%', conta.cofins_pagar],['CSLL 2.88%', conta.csll_pagar],['ICMS 20%', conta.icms_pagar],
                    ['IRPJ 4.8%', conta.irpj_pagar],['PIS 1.65%', conta.pis_pagar],['ISS', conta.iss_pagar]].map(([l,v]) => (
                    <div key={l as string} className="flex justify-between px-2 py-0.5 bg-slate-900 rounded">
                      <span className="text-slate-400">{l as string}</span>
                      <span className="font-mono text-red-300">{fmt(v as number)}</span>
                    </div>
                  ))}
                  <div className="col-span-3 flex justify-between px-2 py-1 bg-red-900/30 rounded border border-red-700">
                    <span className="text-red-300 font-semibold">TOTAL A PAGAR</span>
                    <span className="font-mono font-bold text-red-300">{fmt(conta.total_impostos_pagar)}</span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── NEW CONTA FORM ───────────────────────────────────────────────────────────
function NewContaForm({ drafts, projects, onCreated }: { drafts: Draft[], projects: Project[], onCreated: () => void }) {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState<any>({
    wo: '', draft_code: '', draft_date: '', doc_type: 'FAT. LOC.',
    num_doc: '', data_doc: '', escopo: 'LOCAÇÃO', faturado_por: 'Rio',
    id_ticket_req: '', po_contrato: '', num_proposta: '',
    vl_bruto: '', vencimento: '', status: 'em andamento',
    data_envio_cliente: '', obs: '', data_pgto: '', data_inicio: '', data_fim: '',
    data_rec_doc: '', adicional_dias: 0
  })

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target?.value ?? e }))

  const submit = async () => {
    const payload: any = { ...form }
    if (payload.wo) payload.wo = parseInt(payload.wo)
    if (payload.draft_code) payload.draft_code = parseInt(payload.draft_code)
    if (payload.vl_bruto) payload.vl_bruto = parseFloat(payload.vl_bruto)
    if (payload.adicional_dias) payload.adicional_dias = parseInt(payload.adicional_dias)
    await contasAPI.create(payload)
    onCreated()
    setShow(false)
  }

  if (!show) return <button onClick={() => setShow(true)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nova Conta</button>

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-600 p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-white font-bold text-lg mb-4">Nova Conta a Receber</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><label className="text-slate-400 text-xs">WO *</label>
            <input type="number" value={form.wo} onChange={f('wo')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded" /></div>
          <div><label className="text-slate-400 text-xs">DRAFT</label>
            <select value={form.draft_code} onChange={f('draft_code')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded">
              <option value="">Selecionar...</option>
              {drafts.map(d => <option key={d.id} value={d.draft_code}>{d.draft_code}</option>)}
            </select></div>
          <div><label className="text-slate-400 text-xs">Data DRAFT</label>
            <input type="date" value={form.draft_date} onChange={f('draft_date')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded" /></div>
          <div><label className="text-slate-400 text-xs">DOC.</label>
            <select value={form.doc_type} onChange={f('doc_type')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded">
              {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
            </select></div>
          <div><label className="text-slate-400 text-xs">Nº DOC</label>
            <input value={form.num_doc} onChange={f('num_doc')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded" /></div>
          <div><label className="text-slate-400 text-xs">Data DOC</label>
            <input type="date" value={form.data_doc} onChange={f('data_doc')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded" /></div>
          <div><label className="text-slate-400 text-xs">Escopo</label>
            <select value={form.escopo} onChange={f('escopo')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded">
              {ESCOPOS.map(e => <option key={e}>{e}</option>)}
            </select></div>
          <div><label className="text-slate-400 text-xs">Faturado Por</label>
            <select value={form.faturado_por} onChange={f('faturado_por')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded">
              {FATURADO_POR.map(e => <option key={e}>{e}</option>)}
            </select></div>
          <div><label className="text-slate-400 text-xs">VL. Bruto *</label>
            <input type="number" step="0.01" value={form.vl_bruto} onChange={f('vl_bruto')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded" /></div>
          <div><label className="text-slate-400 text-xs">Status</label>
            <select value={form.status} onChange={f('status')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded">
              {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
            </select></div>
          <div><label className="text-slate-400 text-xs">Vencimento</label>
            <input type="date" value={form.vencimento} onChange={f('vencimento')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded" /></div>
          <div><label className="text-slate-400 text-xs">Data Início</label>
            <input type="date" value={form.data_inicio} onChange={f('data_inicio')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded" /></div>
          <div><label className="text-slate-400 text-xs">Data Fim</label>
            <input type="date" value={form.data_fim} onChange={f('data_fim')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded" /></div>
          <div><label className="text-slate-400 text-xs">PO/Contrato</label>
            <input value={form.po_contrato} onChange={f('po_contrato')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded" /></div>
          <div><label className="text-slate-400 text-xs">ID/Ticket/Req</label>
            <input value={form.id_ticket_req} onChange={f('id_ticket_req')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded" /></div>
          <div className="col-span-3"><label className="text-slate-400 text-xs">Observações</label>
            <input value={form.obs} onChange={f('obs')} className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm">Cancelar</button>
          <button onClick={submit} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-semibold">Salvar</button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ContasPage() {
  const [data, setData] = useState<{ items: ContaReceber[], total: number, totais: Totais } | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filters, setFilters] = useState({ wo:'', cliente:'', plataforma:'', draft:'', doc_type:'', status:'', mes:'', ano:'', page: 1 })
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const params: any = { page: filters.page, page_size: 50 }
    if (filters.wo) params.wo = filters.wo
    if (filters.cliente) params.cliente = filters.cliente
    if (filters.plataforma) params.plataforma = filters.plataforma
    if (filters.draft) params.draft = filters.draft
    if (filters.doc_type) params.doc_type = filters.doc_type
    if (filters.status) params.status = filters.status
    if (filters.mes) params.mes = filters.mes
    if (filters.ano) params.ano = filters.ano
    const r = await contasAPI.list(params)
    setData(r.data)
  }

  useEffect(() => { load() }, [filters])
  useEffect(() => {
    draftsAPI.list().then(r => setDrafts(r.data))
    projectsAPI.list().then(r => setProjects(r.data))
  }, [])

  const handleSave = async (id: number, form: any) => { await contasAPI.update(id, form); load() }
  const handleDelete = async (id: number) => { if (confirm('Excluir?')) { await contasAPI.delete(id); load() } }
  const handleDownloadTemplate = async () => {
    const r = await contasAPI.downloadTemplate()
    const url = URL.createObjectURL(new Blob([r.data as any]))
    const a = document.createElement('a'); a.href = url; a.download = 'modelo_contas_receber.csv'; a.click()
  }
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = await contasAPI.importCsv(file)
    alert(`Importado: ${r.data.inserted} registros. ${r.data.errors.length ? 'Erros: ' + r.data.errors.join('; ') : ''}`)
    load()
  }

  const ff = (k: string) => (e: any) => setFilters(p => ({ ...p, [k]: e.target?.value ?? e, page: 1 }))

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">💰 Contas a Receber</h1>
          <p className="text-slate-400 text-sm">{data?.total ?? 0} registros</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-sm">⬇ Modelo CSV</button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-sm">⬆ Importar CSV</button>
          <NewContaForm drafts={drafts} projects={projects} onCreated={load} />
        </div>
      </div>

      <TotalsBar totais={data?.totais} />

      {/* Filters */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-4">
        <input placeholder="WO" value={filters.wo} onChange={ff('wo')} className="bg-slate-800 text-white px-2 py-1.5 rounded text-xs border border-slate-700" />
        <input placeholder="Cliente" value={filters.cliente} onChange={ff('cliente')} className="bg-slate-800 text-white px-2 py-1.5 rounded text-xs border border-slate-700" />
        <input placeholder="Plataforma" value={filters.plataforma} onChange={ff('plataforma')} className="bg-slate-800 text-white px-2 py-1.5 rounded text-xs border border-slate-700" />
        <input placeholder="Draft" value={filters.draft} onChange={ff('draft')} className="bg-slate-800 text-white px-2 py-1.5 rounded text-xs border border-slate-700" />
        <select value={filters.doc_type} onChange={ff('doc_type')} className="bg-slate-800 text-white px-2 py-1.5 rounded text-xs border border-slate-700">
          <option value="">Doc Tipo</option>{DOC_TYPES.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filters.status} onChange={ff('status')} className="bg-slate-800 text-white px-2 py-1.5 rounded text-xs border border-slate-700">
          <option value="">Status</option>{STATUS_LIST.map(s => <option key={s}>{s}</option>)}
        </select>
        <input placeholder="Mês (1-12)" type="number" value={filters.mes} onChange={ff('mes')} className="bg-slate-800 text-white px-2 py-1.5 rounded text-xs border border-slate-700" />
        <input placeholder="Ano" type="number" value={filters.ano} onChange={ff('ano')} className="bg-slate-800 text-white px-2 py-1.5 rounded text-xs border border-slate-700" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm min-w-[1400px]">
          <thead className="bg-slate-800 sticky top-0">
            <tr className="text-left text-slate-400 text-xs">
              <th className="py-2 px-2 font-semibold">WO</th>
              <th className="px-2">Cliente</th><th className="px-2">Plataforma</th>
              <th className="px-2">Draft</th><th className="px-2">DOC.</th>
              <th className="px-2">Nº Doc</th><th className="px-2">Data</th>
              <th className="px-2">Escopo</th><th className="px-2">Fat.Por</th>
              <th className="px-2">VL.Bruto</th><th className="px-2">VL.Líquido</th>
              <th className="px-2">Vencimento</th><th className="px-2">Status</th>
              <th className="px-2">Prev.Fat</th><th className="px-2">Prev.Pag</th>
              <th className="px-2">Mês/Ano</th><th className="px-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map(c => (
              <ContaRow key={c.id} conta={c} drafts={drafts} projects={projects} onSave={handleSave} onDelete={handleDelete} />
            ))}
            {!data?.items.length && (
              <tr><td colSpan={17} className="text-center py-10 text-slate-500">Nenhum registro encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total > 50 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setFilters(p => ({ ...p, page: Math.max(1, p.page-1) }))} disabled={filters.page === 1}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm disabled:opacity-40">← Anterior</button>
          <span className="text-slate-400 text-sm py-1">Pág {filters.page} / {Math.ceil(data.total/50)}</span>
          <button onClick={() => setFilters(p => ({ ...p, page: p.page+1 }))} disabled={filters.page >= Math.ceil(data.total/50)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm disabled:opacity-40">Próxima →</button>
        </div>
      )}
    </div>
  )
}
