import { api } from './api';
import { RFQ, AuctionConfig, Quote, Bid, AuctionRankingResponse, ActivityLog, AuctionResult, AuctionNotification } from '../types/auction';

export interface RFQListParams {
  search?: string;
  status?: string;
  buyer_only?: boolean;
  skip?: number;
  limit?: number;
  order_by?: string;
  order_dir?: string;
}

export interface RFQListResponse {
  total: number;
  items: RFQ[];
}

export interface CreateRFQPayload {
  reference_id: string;
  name: string;
  bid_start_at: string;
  initial_bid_close_at: string;
  forced_close_at: string;
  pickup_service_date: string;
  config?: {
    trigger_window_minutes: number;
    extension_duration_minutes: number;
    trigger_type: string;
  };
}

export const rfqService = {
  listRFQs: async (params?: RFQListParams): Promise<RFQListResponse> => {
    const res = await api.get<RFQListResponse>('/rfqs', { params });
    return res.data;
  },

  getRFQ: async (id: string): Promise<RFQ> => {
    const res = await api.get<RFQ>(`/rfqs/${id}`);
    return res.data;
  },

  createRFQ: async (payload: CreateRFQPayload): Promise<RFQ> => {
    const res = await api.post<RFQ>('/rfqs', payload);
    return res.data;
  },

  publishRFQ: async (id: string): Promise<RFQ> => {
    const res = await api.post<RFQ>(`/rfqs/${id}/publish`);
    return res.data;
  },

  configureAuction: async (id: string, config: { trigger_window_minutes: number; extension_duration_minutes: number; trigger_type: string }): Promise<AuctionConfig> => {
    const res = await api.post<AuctionConfig>(`/rfqs/${id}/config`, config);
    return res.data;
  },

  updateSchedule: async (id: string, schedule: { current_bid_close_at?: string; forced_close_at?: string }): Promise<RFQ> => {
    const res = await api.patch<RFQ>(`/rfqs/${id}/schedule`, schedule);
    return res.data;
  },

  // Quotes
  submitQuote: async (rfqId: string, quoteData: {
    carrier_name: string;
    freight_charges: number;
    origin_charges: number;
    destination_charges: number;
    transit_time: string;
    validity_text: string;
    currency_code?: string;
  }): Promise<Quote> => {
    const res = await api.post<Quote>(`/rfqs/${rfqId}/quotes`, quoteData);
    return res.data;
  },

  getQuotes: async (rfqId: string): Promise<Quote[]> => {
    const res = await api.get<Quote[]>(`/rfqs/${rfqId}/quotes`);
    return res.data;
  },

  // Bids & Rankings
  submitBid: async (rfqId: string, bidAmount: number): Promise<Bid> => {
    const res = await api.post<Bid>(`/rfqs/${rfqId}/bids`, { bid_amount: bidAmount });
    return res.data;
  },

  getBids: async (rfqId: string): Promise<Bid[]> => {
    const res = await api.get<Bid[]>(`/rfqs/${rfqId}/bids`);
    return res.data;
  },

  getRankings: async (rfqId: string): Promise<AuctionRankingResponse> => {
    const res = await api.get<AuctionRankingResponse>(`/rfqs/${rfqId}/rankings`);
    return res.data;
  },

  // Activity Logs
  getActivityLogs: async (rfqId: string): Promise<ActivityLog[]> => {
    const res = await api.get<ActivityLog[]>(`/rfqs/${rfqId}/activity`);
    return res.data;
  },

  // Results & Award
  getResults: async (rfqId: string): Promise<AuctionResult> => {
    const res = await api.get<AuctionResult>(`/rfqs/${rfqId}/results`);
    return res.data;
  },

  selectWinner: async (rfqId: string, supplierId: string): Promise<AuctionResult> => {
    const res = await api.post<AuctionResult>(`/rfqs/${rfqId}/select-winner`, { supplier_id: supplierId });
    return res.data;
  },

  checkClosure: async (rfqId: string): Promise<{ closed: boolean; description: string; status?: string }> => {
    const res = await api.post<{ closed: boolean; description: string; status?: string }>(`/rfqs/${rfqId}/check-closure`);
    return res.data;
  },

  // Notifications
  getNotifications: async (): Promise<{ items: AuctionNotification[] }> => {
    const res = await api.get<{ items: AuctionNotification[] }>('/notifications');
    return res.data;
  },

  markNotificationRead: async (notifId: string): Promise<AuctionNotification> => {
    const res = await api.patch<AuctionNotification>(`/notifications/${notifId}/read`);
    return res.data;
  }
};
