export type UserRole = 'BUYER' | 'SUPPLIER';

export type RFQStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED' | 'FORCE_CLOSED' | 'CANCELLED';

export type TriggerType = 'BID_RECEIVED' | 'ANY_SUPPLIER_RANK_CHANGE' | 'L1_RANK_CHANGE';

export type SelectionStatus = 'PENDING_SELECTION' | 'SELECTED' | 'NO_VALID_BIDS';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuctionConfig {
  id: string;
  rfq_id: string;
  trigger_window_minutes: number;
  extension_duration_minutes: number;
  trigger_type: TriggerType;
  created_at: string;
  updated_at: string;
}

export interface RFQ {
  id: string;
  reference_id: string;
  name: string;
  buyer_id: string;
  bid_start_at: string;
  initial_bid_close_at: string;
  current_bid_close_at: string;
  forced_close_at: string;
  pickup_service_date: string;
  status: RFQStatus;
  created_at: string;
  updated_at: string;
  auction_config?: AuctionConfig;
  current_lowest_bid?: number;
  total_bids_count: number;
  total_quotes_count: number;
}

export interface Quote {
  id: string;
  rfq_id: string;
  supplier_id: string;
  supplier_name?: string;
  carrier_name: string;
  freight_charges: number;
  origin_charges: number;
  destination_charges: number;
  total_amount: number;
  transit_time: string;
  validity_text: string;
  currency_code: string;
  created_at: string;
  updated_at: string;
}

export interface Bid {
  id: string;
  rfq_id: string;
  quote_id: string;
  supplier_id: string;
  supplier_name?: string;
  bid_amount: number;
  currency_code: string;
  created_at: string;
  rank_label?: string;
}

export interface SupplierRankingItem {
  rank: number;
  rank_label: string;
  supplier_id: string;
  supplier_name: string;
  current_bid_amount: number;
  submitted_at: string;
  is_current_user: boolean;
}

export interface AuctionRankingResponse {
  rfq_id: string;
  current_lowest_bid?: number;
  rankings: SupplierRankingItem[];
  total_participants: number;
}

export interface ActivityLog {
  id: string;
  rfq_id: string;
  actor_user_id?: string;
  actor_name?: string;
  event_type: string;
  description: string;
  event_data: Record<string, any>;
  created_at: string;
}

export interface AuctionResult {
  id: string;
  rfq_id: string;
  winning_supplier_id?: string;
  winning_supplier_name?: string;
  final_bid_id?: string;
  final_bid_amount?: number;
  selection_status: SelectionStatus;
  closed_at: string;
  created_at: string;
}

export interface WebSocketAuctionStateEvent {
  type: 'AUCTION_STATE';
  rfq_id: string;
  status: RFQStatus;
  bid_start_at: string;
  initial_bid_close_at: string;
  current_bid_close_at: string;
  forced_close_at: string;
  current_lowest_bid?: number;
  config: {
    trigger_window_minutes: number;
    extension_duration_minutes: number;
    trigger_type: TriggerType;
  };
  rankings: SupplierRankingItem[];
}

export interface WebSocketNewBidEvent {
  type: 'NEW_BID';
  rfq_id: string;
  bid: {
    id: string;
    supplier_id: string;
    supplier_name: string;
    bid_amount: number;
    created_at: string;
  };
  is_extended: boolean;
  new_close_time?: string;
  extension_reason?: string;
  current_lowest_bid?: number;
  rankings: SupplierRankingItem[];
}

export interface WebSocketStatusChangeEvent {
  type: 'AUCTION_CLOSED' | 'AUCTION_FORCE_CLOSED' | 'WINNER_SELECTED';
  rfq_id: string;
  status?: RFQStatus;
  description?: string;
  winning_supplier_id?: string;
  winning_supplier_name?: string;
}

export type AuctionWebSocketEvent = 
  | WebSocketAuctionStateEvent 
  | WebSocketNewBidEvent 
  | WebSocketStatusChangeEvent;
