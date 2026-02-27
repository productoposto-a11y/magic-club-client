import { apiClient } from './axios';
import type { StoreStats, StorePurchasesResponse } from '../types/api';

export async function getStoreStats(): Promise<StoreStats> {
  const res = await apiClient.get('/store/stats');
  return res.data.stats;
}

export async function getStorePurchases(page: number = 1, pageSize: number = 20): Promise<StorePurchasesResponse> {
  const res = await apiClient.get('/store/purchases', {
    params: { page, page_size: pageSize },
  });
  return res.data;
}
