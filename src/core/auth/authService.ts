import { apiClient } from '../api/axios';
import type { AuthTokens } from '../types/api';

export async function loginWithPassword(email: string, password: string): Promise<AuthTokens> {
  const res = await apiClient.post('/tokens/authentication', { email, password });
  return res.data;
}

export async function requestMagicLink(email: string): Promise<void> {
  await apiClient.post('/users/magic-link', { email });
}

export async function authenticateMagicLink(token: string): Promise<AuthTokens> {
  const res = await apiClient.post('/users/magic-link/authenticate', { token });
  return res.data;
}

export async function refreshTokens(): Promise<AuthTokens> {
  const res = await apiClient.post('/tokens/refresh');
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/tokens/logout');
}
