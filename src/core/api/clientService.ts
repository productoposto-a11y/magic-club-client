import { apiClient } from './axios';
import type { ClientProfileResponse, Purchase, Reward } from '../types/api';

export async function getClientProfile(identifier: string): Promise<ClientProfileResponse> {
  const res = await apiClient.get(`/clients/${identifier}`);
  return res.data;
}

export async function createPurchase(clientId: string, storeId: string, amount: number): Promise<Purchase> {
  const res = await apiClient.post('/purchases', {
    client_id: clientId,
    store_id: storeId,
    amount,
  });
  return res.data.purchase;
}

export async function redeemReward(clientId: string, storeId: string, amountDiscounted: number): Promise<Reward> {
  const res = await apiClient.post('/rewards/redeem', {
    client_id: clientId,
    store_id_used: storeId,
    amount_discounted: amountDiscounted,
  });
  return res.data.reward;
}

export async function registerClient(email: string, password?: string, dni?: string): Promise<{ client: any }> {
  const res = await apiClient.post('/clients', {
    email,
    password: password || undefined,
    dni: dni || undefined,
  });
  return res.data;
}
