import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// All helpers below use paths WITHOUT /api prefix (baseURL adds it).
// E.g. api.post('/auth/login') sends POST /api/auth/login

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export interface Ticket {
  id: number;
  number: string;
  created_at: string;
  updated_at: string;
  status: string;
  priority: string;
  deadline: string | null;
  short_description: string;
  full_description?: string | null;
  client?: Client | null;
  attachments?: Attachment[];
  documents?: Document[];
  history?: HistoryEntry[];
}

export interface TicketListItem {
  id: number;
  number: string;
  created_at: string;
  updated_at: string;
  status: string;
  priority: string;
  deadline: string | null;
  client_name: string | null;
  short_description: string;
}

export interface Client {
  id: number;
  client_type: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  inn: string | null;
  kpp: string | null;
}

export interface Attachment {
  id: number;
  filename: string;
  filepath: string;
  mime_type: string;
}

export interface DocumentItem {
  id: number;
  service_name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Document {
  id: number;
  doc_type: string;
  number: string;
  created_at: string;
  ticket_id: number;
  total_amount: number;
  warranty_period: string | null;
  items: DocumentItem[];
}

export interface HistoryEntry {
  id: number;
  action: string;
  description: string | null;
  created_at: string;
  user: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
}

export const ticketsApi = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<TicketListItem>>('/tickets', { params }),
  get: (id: number) =>
    api.get<Ticket>(`/tickets/${id}`),
  create: (data: any) =>
    api.post<Ticket>('/tickets', data),
  update: (id: number, data: any) =>
    api.put<Ticket>(`/tickets/${id}`, data),
  uploadAttachment: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/tickets/${id}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  notify: (id: number) =>
    api.post(`/tickets/${id}/notify`),
  stats: () =>
    api.get('/tickets/stats/summary'),
};

export const clientsApi = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<Client>>('/clients', { params }),
  get: (id: number) =>
    api.get<Client>(`/clients/${id}`),
  create: (data: any) =>
    api.post<Client>('/clients', data),
  update: (id: number, data: any) =>
    api.put<Client>(`/clients/${id}`, data),
  delete: (id: number) =>
    api.delete(`/clients/${id}`),
};

export const documentsApi = {
  create: (ticketId: number, data: any) =>
    api.post(`/documents/${ticketId}`, data),
  get: (id: number) =>
    api.get(`/documents/${id}`),
  getHtml: (id: number) =>
    api.get(`/documents/${id}/html`, { responseType: 'text' }),
  getPdf: (id: number) =>
    api.get(`/documents/${id}/pdf`, { responseType: 'blob' }),
  delete: (id: number) =>
    api.delete(`/documents/${id}`),
};

export const aiApi = {
  chat: (query: string, context?: string) =>
    api.post('/ai/chat', { query, context }),
};

export const reportsApi = {
  generate: (data: any) =>
    api.post('/reports/generate', data, { responseType: 'blob' }),
  fields: (type: string) =>
    api.get(`/reports/fields/${type}`),
  templates: {
    list: () => api.get('/reports/templates'),
    create: (data: any) => api.post('/reports/templates', data),
    delete: (id: number) => api.delete(`/reports/templates/${id}`),
  },
};

export default api;
