import { apiClient } from './axios';
import type { AdminStats, PaginatedClients } from '../types/api';

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
