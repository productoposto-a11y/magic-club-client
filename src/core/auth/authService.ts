import { apiClient } from '../api/axios';
import type { AuthTokens } from '../types/api';

export async function loginWithPassword(email: string, password: string): Promise<AuthTokens> {
  const res = await apiClient.post('/tokens/authentication', { email, password });
  return res.data;
}

export async function loginWithDNI(dni: string, password: string): Promise<AuthTokens> {
  const res = await apiClient.post('/tokens/authentication', { dni, password });
  return res.data;
}

export async function refreshTokens(): Promise<AuthTokens> {
  const res = await apiClient.post('/tokens/refresh');
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/tokens/logout');
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post('/password/reset-request', { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiClient.post('/password/reset', { token, password });
}
