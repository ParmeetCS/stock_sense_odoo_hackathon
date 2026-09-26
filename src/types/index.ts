export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  databaseConnected: boolean;
  timestamp: string;
}
