# DELIVERABLE 2: Database Schema Design

This document details the normalized relational database schema designed and implemented for the **British Auction in RFQ System**, matching the approved System Design and Database Schema baseline.

---

## 1. Schema Overview

- **Storage Engine:** PostgreSQL 16 (with cross-compatibility for SQLite in local development and automated testing).
- **Primary Keys:** UUID (v4) for universal uniqueness and distributed safety.
- **Timestamps:** `TIMESTAMPTZ` (stored in UTC).
- **Monetary Precision:** `NUMERIC(14,2)` for exact decimal arithmetic (no floating-point rounding errors).
- **Structured Audit Metadata:** `JSONB` for event details and differential states.

---

## 2. Table Specifications

### 2.1 `users`
Stores authenticated user accounts for Buyers and Suppliers.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | Unique user identifier |
| `full_name` | VARCHAR(150) | NOT NULL | User / Company display name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE, INDEX | Login email address |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| `role` | VARCHAR(20) | NOT NULL, CHECK in (`BUYER`, `SUPPLIER`) | Role-based authorization |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Account activation flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Registration timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last modification timestamp |

---

### 2.2 `rfqs`
Stores procurement Request for Quotation definitions and auction lifecycle boundaries.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | RFQ identifier |
| `reference_id` | VARCHAR(60) | NOT NULL, UNIQUE, INDEX | Unique business reference code |
| `name` | VARCHAR(200) | NOT NULL | RFQ title / freight lane name |
| `buyer_id` | UUID | NOT NULL, FOREIGN KEY → `users(id)` ON DELETE CASCADE | Creator buyer identifier |
| `bid_start_at` | TIMESTAMPTZ | NOT NULL | Bidding window opening time |
| `initial_bid_close_at`| TIMESTAMPTZ | NOT NULL | Initial scheduled closing time |
| `current_bid_close_at`| TIMESTAMPTZ | NOT NULL | Effective closing time (extends dynamically) |
| `forced_close_at` | TIMESTAMPTZ | NOT NULL | Absolute hard closure deadline |
| `pickup_service_date` | DATE | NOT NULL | Physical service date |
| `status` | VARCHAR(20) | NOT NULL, INDEX | `DRAFT`, `SCHEDULED`, `ACTIVE`, `CLOSED`, `FORCE_CLOSED`, `CANCELLED` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last modification timestamp |

**Table Constraints:**
- `CHECK (initial_bid_close_at > bid_start_at)`
- `CHECK (forced_close_at > initial_bid_close_at)`
- `CHECK (current_bid_close_at <= forced_close_at)`

---

### 2.3 `auction_configs`
Stores British Auction extension parameters (1:1 with `rfqs`).

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | Configuration identifier |
| `rfq_id` | UUID | NOT NULL, UNIQUE, FOREIGN KEY → `rfqs(id)` ON DELETE CASCADE | Related RFQ |
| `trigger_window_minutes` | INTEGER | NOT NULL, CHECK > 0, DEFAULT 10 | Trigger window $X$ in minutes |
| `extension_duration_minutes` | INTEGER | NOT NULL, CHECK > 0, DEFAULT 5 | Extension duration $Y$ in minutes |
| `trigger_type` | VARCHAR(40) | NOT NULL | `BID_RECEIVED`, `ANY_SUPPLIER_RANK_CHANGE`, or `L1_RANK_CHANGE` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Timestamp |

---

### 2.4 `quotes`
Stores baseline quotation details and commercial charge breakdown submitted by suppliers.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | Quote identifier |
| `rfq_id` | UUID | NOT NULL, FOREIGN KEY → `rfqs(id)` ON DELETE CASCADE | Target RFQ |
| `supplier_id` | UUID | NOT NULL, FOREIGN KEY → `users(id)` ON DELETE CASCADE | Submitting supplier |
| `carrier_name` | VARCHAR(160) | NOT NULL | Name of logistics carrier |
| `freight_charges` | NUMERIC(14,2)| NOT NULL, CHECK >= 0 | Freight component |
| `origin_charges` | NUMERIC(14,2)| NOT NULL, CHECK >= 0 | Origin terminal / drayage charges |
| `destination_charges` | NUMERIC(14,2)| NOT NULL, CHECK >= 0 | Destination delivery charges |
| `transit_time` | VARCHAR(100) | NOT NULL | Estimated transit duration |
| `validity_text` | VARCHAR(100) | NOT NULL | Commercial validity terms |
| `currency_code` | VARCHAR(3) | NOT NULL, DEFAULT 'INR' | ISO 4217 Currency code |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Submission timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Modification timestamp |

---

### 2.5 `bids`
Immutable append-only audit trail of all competitive downward bid submissions.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | Unique bid identifier |
| `rfq_id` | UUID | NOT NULL, FOREIGN KEY → `rfqs(id)` ON DELETE CASCADE | Target RFQ |
| `quote_id` | UUID | NOT NULL, FOREIGN KEY → `quotes(id)` ON DELETE CASCADE | Originating quotation |
| `supplier_id` | UUID | NOT NULL, FOREIGN KEY → `users(id)` ON DELETE CASCADE | Submitting supplier |
| `bid_amount` | NUMERIC(14,2)| NOT NULL, CHECK > 0 | Revised total competitive price |
| `currency_code` | VARCHAR(3) | NOT NULL, DEFAULT 'INR' | ISO currency |
| `request_id` | UUID | NOT NULL, UNIQUE, INDEX | Idempotency key |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Server acceptance timestamp |

**Indexes:**
- `ix_bids_rfq_supplier_created`: `(rfq_id, supplier_id, created_at DESC)`
- `ix_bids_rfq_amount_created`: `(rfq_id, bid_amount ASC, created_at ASC)`

---

### 2.6 `auction_activity_logs`
Chronological audit log capturing all auction events and differential states.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | Event identifier |
| `rfq_id` | UUID | NOT NULL, FOREIGN KEY → `rfqs(id)` ON DELETE CASCADE | Related RFQ |
| `actor_user_id` | UUID | NULLABLE, FOREIGN KEY → `users(id)` ON DELETE SET NULL | Initiator (NULL for system) |
| `event_type` | VARCHAR(40) | NOT NULL, INDEX | Event category |
| `description` | TEXT | NOT NULL | Human-readable event description |
| `event_data` | JSONB / JSON | NOT NULL, DEFAULT `{}` | Structured before/after state values |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Event timestamp |

**Indexes:**
- `ix_activity_logs_rfq_created`: `(rfq_id, created_at DESC)`

---

### 2.7 `auction_results`
Snapshot of auction outcome upon closure and manual buyer award tracking.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | Result identifier |
| `rfq_id` | UUID | NOT NULL, UNIQUE, FOREIGN KEY → `rfqs(id)` ON DELETE CASCADE | Related RFQ |
| `winning_supplier_id`| UUID | NULLABLE, FOREIGN KEY → `users(id)` ON DELETE SET NULL | Selected award supplier |
| `final_bid_id` | UUID | NULLABLE, FOREIGN KEY → `bids(id)` ON DELETE SET NULL | Winning bid record |
| `final_bid_amount` | NUMERIC(14,2)| NULLABLE | Winning price |
| `selection_status` | VARCHAR(30) | NOT NULL | `PENDING_SELECTION`, `SELECTED`, `NO_VALID_BIDS` |
| `closed_at` | TIMESTAMPTZ | NOT NULL | Timestamp when auction closed |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Snapshot timestamp |
