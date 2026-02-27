import { apiClient } from './axios';
import type { ClientProfileResponse, Purchase, Reward } from '../types/api';

export async function getClientProfile(identifier: string): Promise<ClientProfileResponse> {
  const res = await apiClient.get(`/clients/${identifier}`);
  return res.data;
}

export async function createPurchase(clientId: string, storeId: string, amount: number, excludeFromPromo = false): Promise<Purchase> {
  const res = await apiClient.post('/purchases', {
    client_id: clientId,
    store_id: storeId,
    amount,
    exclude_from_promo: excludeFromPromo,
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

export async function registerClient(email: string, password: string, dni: string): Promise<{ client: ClientProfileResponse['client'] }> {
  const res = await apiClient.post('/clients', {
    email,
    password,
    dni,
  });
  return res.data;
}

export async function getClientPurchases(identifier: string): Promise<Purchase[]> {
  const res = await apiClient.get(`/clients/${identifier}/purchases`);
  return res.data.purchases || [];
}

export async function getClientRewards(identifier: string): Promise<Reward[]> {
  const res = await apiClient.get(`/clients/${identifier}/rewards`);
  return res.data.rewards || [];
}
