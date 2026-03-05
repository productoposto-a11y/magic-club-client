import { apiClient } from './axios';
import type { ClientProfileResponse, Purchase, Reward, Comment, CommentWithEmail } from '../types/api';

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

export async function registerClient(
  email: string, password: string, dni: string,
  name?: string, birthday?: string, referralCodeUsed?: string,
): Promise<{ client: ClientProfileResponse['client'] }> {
  const res = await apiClient.post('/clients', {
    email,
    password,
    name: name || undefined,
    dni,
    birthday: birthday || undefined,
    referral_code_used: referralCodeUsed || undefined,
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

export async function getMyComments(): Promise<Comment[]> {
  const res = await apiClient.get('/comments/mine');
  return res.data.comments || [];
}

export async function createComment(storeName: string, body: string, rating: number): Promise<Comment> {
  const res = await apiClient.post('/comments', { store_name: storeName, body, rating });
  return res.data.comment;
}

export async function getAllComments(page = 1, pageSize = 20): Promise<{ comments: CommentWithEmail[]; metadata: { total_records: number } }> {
  const res = await apiClient.get('/comments', { params: { page, page_size: pageSize } });
  return res.data;
}
