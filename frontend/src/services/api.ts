import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' })

export const contasAPI = {
  list: (params?: any) => api.get<any>('/api/contas-receber/', { params }),
  get: (id: number) => api.get<any>('/api/contas-receber/' + id),
  create: (data: any) => api.post<any>('/api/contas-receber/', data),
  update: (id: number, data: any) => api.put<any>('/api/contas-receber/' + id, data),
  delete: (id: number) => api.delete('/api/contas-receber/' + id),
  importCsv: (file: File) => { const fd = new FormData(); fd.append('file', file); return api.post<any>('/api/contas-receber/import/csv', fd) },
  downloadTemplate: () => api.get('/api/contas-receber/modelo-csv/download', { responseType: 'blob' }),
}
export const taxAPI = {
  list: (cat?: string) => api.get<any>('/setup/impostos', { params: cat ? { categoria: cat } : {} }),
  create: (data: any) => api.post<any>('/setup/impostos', data),
  update: (id: number, data: any) => api.put<any>('/setup/impostos/' + id, data),
  delete: (id: number) => api.delete('/setup/impostos/' + id),
}
export const paymentTermsAPI = {
  list: () => api.get<any>('/setup/clientes-prazos-setup'),
  create: (data: any) => api.post<any>('/setup/clientes-prazos-setup', data),
  update: (id: number, data: any) => api.put<any>('/setup/clientes-prazos-setup/' + id, data),
  delete: (id: number) => api.delete('/setup/clientes-prazos-setup/' + id),
}
export const draftsAPI = {
  list: () => api.get<any>('/setup/drafts-setup'),
  create: (data: any) => api.post<any>('/setup/drafts-setup', data),
  delete: (id: number) => api.delete('/setup/drafts-setup/' + id),
  nextSuggestion: () => api.get<any>('/setup/drafts-setup/next'),
}
export const holidaysAPI = {
  list: (year?: string, state?: string) => api.get<any>('/setup/feriados-setup', { params: { year, state } }),
  create: (data: any) => api.post<any>('/setup/feriados-setup', data),
  delete: (id: number) => api.delete('/setup/feriados-setup/' + id),
}
export const projectsAPI = {
  list: (search?: string) => api.get<any>('/setup/projetos-setup', { params: { search } }),
  create: (data: any) => api.post<any>('/setup/projetos-setup', data),
  delete: (wo: string) => api.delete('/setup/projetos-setup/' + wo),
}
export const qualtechAPI = {
  listProjects: (wo: string) => api.get<any>('/qualtech/projects', { params: { wo } }),
}

const dim = (recurso: string) => ({
  list:   ()              => api.get<any>(`/api/dim/${recurso}/`),
  get:    (id: number)    => api.get<any>(`/api/dim/${recurso}/${id}`),
  create: (data: any)     => api.post<any>(`/api/dim/${recurso}/`, data),
  update: (id: number, data: any) => api.put<any>(`/api/dim/${recurso}/${id}`, data),
  delete: (id: number)    => api.delete(`/api/dim/${recurso}/${id}`),
})

export const clientesAPI       = dim('clientes')
export const plataformasAPI    = dim('plataformas')
export const coordenadoresAPI  = dim('coordenadores')
export const tiposServicoAPI   = dim('tipos-servico')
export const statusAPI         = dim('status')
export const empresasAPI       = dim('empresas')
