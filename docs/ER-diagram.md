# Entity-Relationship (ER) Diagram

The following Mermaid diagram visualizes the relational structure, primary keys, foreign keys, cardinality, and constraints across the 7 core database tables.

```mermaid
erDiagram
    USERS ||--o{ RFQS : "creates (as Buyer)"
    USERS ||--o{ QUOTES : "submits (as Supplier)"
    USERS ||--o{ BIDS : "places (as Supplier)"
    USERS ||--o{ AUCTION_RESULTS : "selected as awardee"
    USERS ||--o{ AUCTION_ACTIVITY_LOGS : "acts as"
    
    RFQS ||--|| AUCTION_CONFIGS : "configured with (1:1)"
    RFQS ||--o{ QUOTES : "receives"
    RFQS ||--o{ BIDS : "contains"
    RFQS ||--o{ AUCTION_ACTIVITY_LOGS : "records"
    RFQS ||--o| AUCTION_RESULTS : "concludes in (1:1)"

    QUOTES ||--o{ BIDS : "initializes baseline"

    USERS {
        uuid id PK
        varchar email UK "Unique login"
        varchar password_hash "Bcrypt"
        varchar full_name "Display name"
        varchar role "BUYER | SUPPLIER"
        boolean is_active "Default true"
        timestamptz created_at
        timestamptz updated_at
    }

    RFQS {
        uuid id PK
        varchar reference_id UK "Unique reference"
        varchar name "Title / Lane"
        uuid buyer_id FK "References users.id"
        timestamptz bid_start_at "Opening time"
        timestamptz initial_bid_close_at "Original deadline"
        timestamptz current_bid_close_at "Effective close after extensions"
        timestamptz forced_close_at "Hard deadline cap"
        date pickup_service_date "Service date"
        varchar status "DRAFT|SCHEDULED|ACTIVE|CLOSED|FORCE_CLOSED|CANCELLED"
        timestamptz created_at
        timestamptz updated_at
    }

    AUCTION_CONFIGS {
        uuid id PK
        uuid rfq_id FK,UK "1:1 with RFQ"
        integer trigger_window_minutes "X > 0"
        integer extension_duration_minutes "Y > 0"
        varchar trigger_type "BID_RECEIVED | ANY_SUPPLIER_RANK_CHANGE | L1_RANK_CHANGE"
        timestamptz created_at
        timestamptz updated_at
    }

    QUOTES {
        uuid id PK
        uuid rfq_id FK "References rfqs.id"
        uuid supplier_id FK "References users.id"
        varchar carrier_name
        numeric freight_charges ">= 0"
        numeric origin_charges ">= 0"
        numeric destination_charges ">= 0"
        varchar transit_time
        varchar validity_text
        varchar currency_code "DEFAULT 'INR'"
        timestamptz created_at
        timestamptz updated_at
    }

    BIDS {
        uuid id PK
        uuid rfq_id FK "References rfqs.id"
        uuid quote_id FK "References quotes.id"
        uuid supplier_id FK "References users.id"
        numeric bid_amount "> 0 (Strict downward)"
        varchar currency_code "DEFAULT 'INR'"
        uuid request_id UK "Idempotency key"
        timestamptz created_at "Server timestamp"
    }

    AUCTION_ACTIVITY_LOGS {
        uuid id PK
        uuid rfq_id FK "References rfqs.id"
        uuid actor_user_id FK "Nullable (System or User)"
        varchar event_type "BID_SUBMITTED | RANK_CHANGED | AUCTION_EXTENDED | AUCTION_CLOSED | FORCE_CLOSED"
        text description "Human readable"
        jsonb event_data "Structured state delta"
        timestamptz created_at
    }

    AUCTION_RESULTS {
        uuid id PK
        uuid rfq_id FK,UK "One result per RFQ"
        uuid winning_supplier_id FK "References users.id (Nullable)"
        uuid final_bid_id FK "References bids.id (Nullable)"
        numeric final_bid_amount "Winning price"
        varchar selection_status "PENDING_SELECTION | SELECTED | NO_VALID_BIDS"
        timestamptz closed_at "Closure time"
        timestamptz created_at
    }
```

---

## Cardinality & Structural Integrity

1. **One-to-One RFQ Configuration:** Every RFQ has exactly one British Auction configuration row in `auction_configs` defining parameters $X$, $Y$, and the active trigger condition.
2. **One-to-Many Quotes per RFQ:** Multiple competing suppliers submit their initial quotation breakdown to an RFQ.
3. **One-to-Many Bids per Quote:** Each supplier can submit multiple downward bids over the lifetime of the active auction, all linked back to their originating quote breakdown and RFQ.
4. **Append-Only Bid Log:** Bids are never mutated or deleted in place, preserving an immutable audit trail for forensic review and ranking re-calculation.
5. **One-to-Zero/One Final Result:** When an auction reaches closure or forced closure, an `auction_results` record is generated to snapshot the final state and track the buyer's award decision.
