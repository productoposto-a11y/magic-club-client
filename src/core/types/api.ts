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

export interface AdminStats {
  total_clients: number;
  total_purchases: number;
  total_rewards: number;
  total_active_purchases: number;
}

export interface ClientListItem {
  id: string;
  email: string;
  dni?: string;
  active_purchases_count: number;
  total_purchases: number;
  total_rewards: number;
  created_at: string;
}

export interface PaginatedClients {
  clients: ClientListItem[];
  metadata: {
    current_page: number;
    page_size: number;
    total_records: number;
  };
}

export interface StoreStats {
  total_purchases: number;
  total_billed: number;
  total_discounted: number;
  total_net: number;
}

export interface StorePurchaseItem {
  id: string;
  client_email: string;
  client_dni: string;
  amount: number;
  status: 'active' | 'used';
  created_at: string;
}

export interface StorePurchasesResponse {
  purchases: StorePurchaseItem[];
  summary: {
    total_amount: number;
    total_discount: number;
  };
  metadata: {
    current_page: number;
    page_size: number;
    total_records: number;
  };
}
