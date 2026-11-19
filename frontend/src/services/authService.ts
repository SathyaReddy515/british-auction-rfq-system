import { api } from './api';
import { User } from '../types/auction';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', { email, password });
    return res.data;
  },

  register: async (data: { full_name: string; email: string; password: string; role: 'BUYER' | 'SUPPLIER' }): Promise<User> => {
    const res = await api.post<User>('/auth/register', data);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
};
