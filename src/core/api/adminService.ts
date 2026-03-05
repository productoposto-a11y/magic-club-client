import { apiClient } from './axios';
import type { AdminStats, PaginatedClients, ClientListItem, TimeStat } from '../types/api';

export async function getAdminStats(): Promise<AdminStats> {
  const res = await apiClient.get('/admin/stats');
  return res.data.stats;
}

export async function getAdminClients(page = 1, pageSize = 20): Promise<PaginatedClients> {
  const res = await apiClient.get('/admin/clients', {
    params: { page, page_size: pageSize },
  });
  return res.data;
}

export async function getAdminTopClients(): Promise<ClientListItem[]> {
  const res = await apiClient.get('/admin/top-clients');
  return res.data.clients || [];
}

export async function getAdminTimeStats(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<{ stats: TimeStat[]; period: string }> {
  const res = await apiClient.get('/admin/time-stats', { params: { period } });
  return res.data;
}

export function getExportClientsURL(): string {
  return `${apiClient.defaults.baseURL}/admin/export/clients`;
}

export function getExportPurchasesURL(): string {
  return `${apiClient.defaults.baseURL}/admin/export/purchases`;
}
