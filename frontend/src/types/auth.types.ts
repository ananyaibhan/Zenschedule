export interface User {
  id: number;
  email: string;
  name: string;
  has_calendar: boolean;
  has_notion: boolean;
  has_spotify: boolean;
  created_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}