import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const getTickets = (params?: any) => api.get('/tickets', { params });
export const getTicket = (id: number) => api.get(`/tickets/${id}`);
export const createTicket = (data: any) => api.post('/tickets', data);
export const updateTicket = (id: number, data: any) => api.put(`/tickets/${id}`, data);
export const getClients = (params?: any) => api.get('/clients', { params });
export const createClient = (data: any) => api.post('/clients', data);
export const getTicketStats = () => api.get('/tickets/stats/summary');
export const createDocument = (ticketId: number, data: any) => api.post(`/documents/${ticketId}`, data);
export const getDocumentPdf = (id: number) => api.get(`/documents/${id}/pdf`, { responseType: 'blob' });
export const aiChat = (query: string) => api.post('/ai/chat', { query });

export default api;
