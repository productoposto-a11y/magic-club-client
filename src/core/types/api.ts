export interface ClientInfo {
  id: string;
  user_id: string;
  email: string;
  dni?: string;
  qr_code?: string;
  created_at: string;
}

export interface ClientStatus {
  active_purchases_count: number;
  reward_available: boolean;
  available_discount: number;
}

export interface ClientProfileResponse {
  client: ClientInfo;
  status: ClientStatus;
}

export interface AuthTokens {
  authentication: {
    access_token: string;
    csrf_token: string;
  };
}

export interface Purchase {
  id: string;
  client_id: string;
  store_id: string;
  amount: number;
  status: 'active' | 'used';
  created_at: string;
}

export interface Reward {
  id: string;
  client_id: string;
  store_id_used: string;
  amount_discounted: number;
  created_at: string;
}
