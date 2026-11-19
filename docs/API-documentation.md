# API Documentation: REST & WebSocket Protocols

## 1. Authentication & Security

All private endpoints require a JSON Web Token (JWT) supplied in the `Authorization` header:
```http
Authorization: Bearer <access_token>
```
Authentication tokens expire after 24 hours.

### 1.1 `POST /api/v1/auth/login`
Authenticates user and returns JWT token and user profile.
- **Request Body:**
```json
{
  "email": "buyer@demo.com",
  "password": "password123"
}
```
- **Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "user": {
    "id": "3118a73a-7ced-42c7-8312-466dd99b667b",
    "full_name": "Acme Procurement Officer",
    "email": "buyer@demo.com",
    "role": "BUYER",
    "is_active": true,
    "created_at": "2026-11-19T14:35:55.924741Z",
    "updated_at": "2026-11-19T14:35:55.924741Z"
  }
}
```

### 1.2 `POST /api/v1/auth/register`
Creates a new Buyer or Supplier account.
- **Request Body:**
```json
{
  "full_name": "Global Express Freight",
  "email": "supplier@example.com",
  "password": "securepassword",
  "role": "SUPPLIER"
}
```

### 1.3 `GET /api/v1/auth/me`
Retrieves authenticated user profile.

---

## 2. RFQ Management & Auction Configuration

### 2.1 `GET /api/v1/rfqs`
Lists RFQs with full search, status filter, and pagination support.
- **Query Parameters:**
  - `search` (string, optional): Search by Name or Reference ID.
  - `status` (string, optional): Filter by `ACTIVE`, `SCHEDULED`, `CLOSED`, `FORCE_CLOSED`, `DRAFT`.
  - `buyer_only` (bool, optional): If true, filters to current authenticated buyer's RFQs.
  - `skip` (int, default 0), `limit` (int, default 20).
- **Response (200 OK):**
```json
{
  "total": 5,
  "items": [
    {
      "id": "d0411252-878f-4ba6-8cb5-78e3ec8b9409",
      "reference_id": "RFQ-2026-001",
      "name": "Trans-Pacific Container Freight (Shanghai to LA)",
      "buyer_id": "3118a73a-7ced-42c7-8312-466dd99b667b",
      "bid_start_at": "2026-11-19T13:35:55Z",
      "initial_bid_close_at": "2026-11-19T14:50:55Z",
      "current_bid_close_at": "2026-11-19T14:50:55Z",
      "forced_close_at": "2026-11-19T16:35:55Z",
      "pickup_service_date": "2026-12-03",
      "status": "ACTIVE",
      "current_lowest_bid": 48500.0,
      "total_bids_count": 3,
      "total_quotes_count": 2,
      "auction_config": {
        "id": "e221376e-5f90-4e33-b9ba-8d9ceb9b1e77",
        "rfq_id": "d0411252-878f-4ba6-8cb5-78e3ec8b9409",
        "trigger_window_minutes": 10,
        "extension_duration_minutes": 5,
        "trigger_type": "BID_RECEIVED"
      }
    }
  ]
}
```

### 2.2 `POST /api/v1/rfqs` *(Buyer Only)*
Creates a new RFQ with British Auction parameters.
- **Request Body:**
```json
{
  "reference_id": "RFQ-2026-008",
  "name": "Heavy Equipment Transport (Chennai to Pune)",
  "bid_start_at": "2026-11-20T10:00:00Z",
  "initial_bid_close_at": "2026-11-20T14:00:00Z",
  "forced_close_at": "2026-11-20T18:00:00Z",
  "pickup_service_date": "2026-12-01",
  "config": {
    "trigger_window_minutes": 10,
    "extension_duration_minutes": 5,
    "trigger_type": "BID_RECEIVED"
  }
}
```

### 2.3 `POST /api/v1/rfqs/{id}/publish` *(Buyer Only)*
Transitions RFQ from `DRAFT` to `SCHEDULED` (or `ACTIVE` if start time is past).

---

## 3. Quotation & Bidding Endpoints

### 3.1 `POST /api/v1/rfqs/{id}/quotes` *(Supplier Only)*
Submits baseline commercial quote breakdown and initializes supplier's starting bid.
- **Request Body:**
```json
{
  "carrier_name": "Maersk Line",
  "freight_charges": 45000.0,
  "origin_charges": 3000.0,
  "destination_charges": 2000.0,
  "transit_time": "14 Days",
  "validity_text": "Valid 30 Days from Bid Acceptance",
  "currency_code": "INR"
}
```
- **Response (201 Created):**
```json
{
  "id": "3ec3b9a5-5dc1-4cf1-8378-f7b539a2632b",
  "rfq_id": "d0411252-878f-4ba6-8cb5-78e3ec8b9409",
  "supplier_id": "a90bb620-80bc-4340-9aa8-ec16d6bfba16",
  "carrier_name": "Maersk Line",
  "freight_charges": 45000.0,
  "origin_charges": 3000.0,
  "destination_charges": 2000.0,
  "total_amount": 50000.0,
  "transit_time": "14 Days",
  "validity_text": "Valid 30 Days from Bid Acceptance",
  "currency_code": "INR",
  "created_at": "2026-11-19T14:40:00Z"
}
```

### 3.2 `POST /api/v1/rfqs/{id}/bids` *(Supplier Only)*
Places a competitive downward bid.
- **Request Body:**
```json
{
  "bid_amount": 47500.0,
  "request_id": "b3e94473-8da8-4ea7-8b09-cf87aa856e71"
}
```
- **Response (201 Created):**
```json
{
  "id": "67fce535-6187-4389-8d75-47e2bf91e4ab",
  "rfq_id": "d0411252-878f-4ba6-8cb5-78e3ec8b9409",
  "supplier_id": "a90bb620-80bc-4340-9aa8-ec16d6bfba16",
  "bid_amount": 47500.0,
  "currency_code": "INR",
  "created_at": "2026-11-19T14:46:12Z",
  "supplier_name": "FastTrack Global Cargo",
  "rank_label": "L1"
}
```

### 3.3 `GET /api/v1/rfqs/{id}/rankings`
Retrieves live rankings table (L1, L2, L3...). If requested by a Supplier, competitor names are anonymized.
- **Response (200 OK):**
```json
{
  "rfq_id": "d0411252-878f-4ba6-8cb5-78e3ec8b9409",
  "current_lowest_bid": 47500.0,
  "total_participants": 2,
  "rankings": [
    {
      "rank": 1,
      "rank_label": "L1",
      "supplier_id": "a90bb620-80bc-4340-9aa8-ec16d6bfba16",
      "supplier_name": "FastTrack Global Cargo",
      "current_bid_amount": 47500.0,
      "submitted_at": "2026-11-19T14:46:12Z",
      "is_current_user": true
    },
    {
      "rank": 2,
      "rank_label": "L2",
      "supplier_id": "f5b61a38-c68e-4a87-bf6a-f5eefbdc5991",
      "supplier_name": "Supplier #f5b6",
      "current_bid_amount": 48500.0,
      "submitted_at": "2026-11-19T14:38:10Z",
      "is_current_user": false
    }
  ]
}
```

---

## 4. Audit & Results Endpoints

### 4.1 `GET /api/v1/rfqs/{id}/activity`
Returns complete immutable chronological activity log.

### 4.2 `POST /api/v1/rfqs/{id}/select-winner` *(Buyer Only)*
Awards the closed auction contract to the selected supplier.
- **Request Body:**
```json
{
  "supplier_id": "a90bb620-80bc-4340-9aa8-ec16d6bfba16"
}
```

### 4.3 `POST /api/v1/rfqs/{id}/check-closure`
Manually/idempotently evaluates whether the effective or forced deadline has arrived and executes closure.

---

## 5. Real-Time WebSocket Protocol

### Endpoint:
```
ws://<host>:8000/api/v1/ws/auctions/{rfq_id}?token=<jwt_token>
```

### Events Broadcasted:

#### `AUCTION_STATE` (Initial Sync upon connection)
```json
{
  "type": "AUCTION_STATE",
  "rfq_id": "d0411252-878f-4ba6-8cb5-78e3ec8b9409",
  "status": "ACTIVE",
  "current_bid_close_at": "2026-11-19T14:50:55Z",
  "forced_close_at": "2026-11-19T16:35:55Z",
  "current_lowest_bid": 47500.0,
  "config": {
    "trigger_window_minutes": 10,
    "extension_duration_minutes": 5,
    "trigger_type": "BID_RECEIVED"
  },
  "rankings": [...]
}
```

#### `NEW_BID`
Broadcasted immediately when a valid bid is committed.
```json
{
  "type": "NEW_BID",
  "rfq_id": "d0411252-878f-4ba6-8cb5-78e3ec8b9409",
  "bid": {
    "id": "67fce535-6187-4389-8d75-47e2bf91e4ab",
    "supplier_id": "a90bb620-80bc-4340-9aa8-ec16d6bfba16",
    "supplier_name": "FastTrack Global Cargo",
    "bid_amount": 47500.0,
    "created_at": "2026-11-19T14:46:12Z"
  },
  "is_extended": true,
  "new_close_time": "2026-11-19T14:55:55Z",
  "extension_reason": "Bid received within last 10 minutes. Extended by 5 min.",
  "current_lowest_bid": 47500.0,
  "rankings": [...]
}
```

#### `AUCTION_CLOSED` / `AUCTION_FORCE_CLOSED`
Broadcasted when closing task executes.
```json
{
  "type": "AUCTION_CLOSED",
  "rfq_id": "d0411252-878f-4ba6-8cb5-78e3ec8b9409",
  "status": "CLOSED",
  "description": "Auction successfully closed at effective close time."
}
```
