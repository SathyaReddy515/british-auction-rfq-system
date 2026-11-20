# British Auction in RFQ Management System

A production-grade, full-stack procurement web application featuring **British Auction** mechanics (reverse auction downward bidding with dynamic anti-sniping bid-time extensions and hard forced closure limits).

Built with **Python (FastAPI)**, **React.js (Vite + TypeScript + Tailwind CSS)**, **PostgreSQL 16**, **SQLAlchemy 2.0**, **Alembic**, **Celery + Redis**, and **FastAPI WebSockets**.

---

## 🚀 Key Highlights & Business Capabilities

1. **British Auction Engine:**
   - **Competitive Downward Bidding:** Competing suppliers continuously lower their prices to achieve the lowest bid ranking (**L1**).
   - **Anti-Sniping Dynamic Extensions ($X$ & $Y$):** Bids submitted inside the critical trigger window ($X$ minutes before the current close) automatically extend the auction by $Y$ minutes.
   - **Configurable Extension Triggers (All 3 Supported):**
     1. `BID_RECEIVED`: Extends when any valid downward bid is received in the last $X$ minutes.
     2. `ANY_SUPPLIER_RANK_CHANGE`: Extends when any supplier ranking position changes in the last $X$ minutes.
     3. `L1_RANK_CHANGE`: Extends strictly when the identity of the lowest bidder (L1) changes in the last $X$ minutes.
   - **Hard Forced Close Cap:** Regardless of extensions, the auction strictly terminates at the **Forced Bid Close Date & Time** ($\text{New Close} = \min(\text{Current Close} + Y, \text{Forced Close})$).
2. **Concurrency & Integrity:**
   - Database transactions with row-level locking (`SELECT ... FOR UPDATE`) guarantee that concurrent bids never corrupt rankings or trigger calculations.
   - Idempotent Celery background reconciliation tasks re-read PostgreSQL state with locks to prevent premature closure from stale tasks.
3. **Real-time Live Streaming:**
   - Native WebSockets stream live bid submissions, ranking recalculations, countdown timer extensions, and closure events to connected clients.
4. **Role-Based Access Control (RBAC):**
   - **Buyer:** Creates RFQs, configures auction parameters, monitors live bids, reviews audit logs, and awards contracts.
   - **Supplier:** Submits commercial quote breakdowns, places competitive downward bids, tracks their live rank (L1, L2, L3), and monitors the live countdown clock.

---

## 📦 Mandatory Assignment Deliverables

| Deliverable | Description | Location |
|---|---|---|
| **DELIVERABLE 1** | **High-Level Design (HLD)** with architecture diagram & component details | [docs/HLD.md](docs/HLD.md) |
| **DELIVERABLE 2** | **Database Schema Design** (tables, columns, constraints, indexes) | [docs/database-schema.md](docs/database-schema.md) & [docs/ER-diagram.md](docs/ER-diagram.md) |
| **DELIVERABLE 3** | **Backend Code** (FastAPI, SQLAlchemy, Bidding Engine, WebSockets, Celery, Tests) | [backend/](backend/) |
| **DELIVERABLE 4** | **Frontend Code** (React 18, Vite, TypeScript, Tailwind CSS, Live Bidding) | [frontend/](frontend/) |
| **RTM** | **Requirement Traceability Matrix** mapping all assignment rules to code and tests | [REQUIREMENT_TRACEABILITY.md](REQUIREMENT_TRACEABILITY.md) |

## Evaluator Guide

Start here for assignment evaluation:

| Evaluation area | Document or folder |
|---|---|
| System overview and architecture | [docs/HLD.md](docs/HLD.md) |
| Database tables, constraints, and indexes | [docs/database-schema.md](docs/database-schema.md) |
| Entity relationships | [docs/ER-diagram.md](docs/ER-diagram.md) |
| API and WebSocket specifications | [docs/API-documentation.md](docs/API-documentation.md) |
| Architecture assumptions | [docs/assumptions.md](docs/assumptions.md) |
| Requirement-to-code mapping | [REQUIREMENT_TRACEABILITY.md](REQUIREMENT_TRACEABILITY.md) |
| Backend implementation | [backend/app/](backend/app/) |
| Backend automated tests | [backend/tests/test_all_requirements.py](backend/tests/test_all_requirements.py) |
| Frontend implementation | [frontend/src/](frontend/src/) |
| Application screenshots | [Images/](Images/) |

For a quick demo, open the application at `http://localhost:3000`, switch roles using the navbar demo-role menu or log in with a demo account, and open an active auction. Use the buyer account to create or publish RFQs and award winners. Use a supplier account to submit quotes and lower bids.

---

## Application Screenshots

### 1. Login and Demo Role Selection

The login page provides one-click demo access for the buyer and all three supplier accounts.

![British Auction login and instant demo access](Images/Screenshot%202026-11-20%20103202.png)

### 2. Supplier Auction Workstation

Suppliers can view active opportunities, current L1 prices, closing times, and join live auctions.

![Supplier auction workstation](Images/Screenshot%202026-11-20%20103141.png)

### 3. Live Bidding Console and Supplier Rankings

The auction details page shows the live countdown, forced close limit, L1-L3 rankings, bid history, and competitive downward bidding console.

![Live bidding console and rankings](Images/Screenshot%202026-11-20%20103121.png)

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Axios, Lucide React.
- **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, PyJWT, Bcrypt.
- **Database:** PostgreSQL 16 (with SQLite cross-compatibility for zero-dependency local dev/tests).
- **Background Tasks & Broker:** Celery 5.x, Celery Beat, Redis 7.x.
- **Containerization:** Docker, Docker Compose.
- **Automated Testing:** Pytest, pytest-asyncio (23 implemented and passing scenarios).

---

## ⚡ Quickstart: Running with Docker Compose

Before the first Docker run:

```bash
cp .env.example .env
```

Open `.env` and replace the example secrets and database password. The following variables are required:

```dotenv
POSTGRES_PASSWORD=<strong-database-password>
SECRET_KEY=<strong-random-secret-at-least-32-characters>
```

Then start the complete environment:

```bash
docker compose up --build
```

- Docker Compose runs Frontend, Backend, PostgreSQL, Redis, Celery Worker, and Celery Beat.
- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend & Interactive API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative API Docs (ReDoc):** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 💻 Local Development Setup (Without Docker)

### 1. Backend Setup

```bash
# From repository root
python -m pip install -r backend/requirements.txt

# Run database migrations
python -m alembic upgrade head

# Seed initial demo accounts and sample auctions
python -m backend.scripts.seed_data

# Start FastAPI development server
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```bash
# From repository root
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Pre-Seeded Demo Accounts

The application includes pre-configured demo accounts. You can also use the **"⚡ Instant Demo Access"** 1-click login buttons on the login page:

| Role | Name | Email | Password |
|---|---|---|---|
| **Buyer** | Acme Procurement Officer | `buyer@demo.com` | `password123` |
| **Supplier 1** | FastTrack Global Cargo | `supplier1@demo.com` | `password123` |
| **Supplier 2** | Apex Freight Lines | `supplier2@demo.com` | `password123` |
| **Supplier 3** | BlueDart Logistics | `supplier3@demo.com` | `password123` |

---

## 🧪 Running Automated Tests

A comprehensive suite of **23 automated test scenarios** covers RFQ and quote validation, bidding, rankings, extensions, closure, concurrency, authorization, notifications, and existing-participant rebidding:

```bash
python -m pytest backend/tests/test_all_requirements.py -v
```

### Verified Test Matrix:
1. `test_01_valid_rfq_creation` — Valid RFQ creation with British Auction parameters.
2. `test_02_invalid_rfq_dates` — Date boundaries validation ($\text{Start} < \text{Close} < \text{Forced}$).
3. `test_03_valid_supplier_quotation` — Carrier charges breakdown and initial baseline price seeding.
4. `test_04_bid_before_auction_starts` — Rejection of bids before start time.
5. `test_05_bid_during_active_auction` — Acceptance of valid downward bids.
6. `test_06_bid_after_auction_closure` — Rejection of bids after auction close.
7. `test_07_higher_or_equal_bid_rejection` — Strict enforcement of downward competitive pricing.
8. `test_08_correct_l1_l2_l3_ranking` — Correct L1/L2/L3 ranking order from latest bids.
9. `test_09_equal_price_tie_breaking` — Deterministic tie-breaking (earliest timestamp wins).
10. `test_10_bid_received_inside_trigger_window` — Dynamic extension triggered by `BID_RECEIVED`.
11. `test_11_bid_received_outside_trigger_window` — No extension when bid is outside trigger window.
12. `test_12_any_supplier_rank_change_trigger` — Extension triggered by `ANY_SUPPLIER_RANK_CHANGE`.
13. `test_13_l1_identity_change_trigger` — Extension on L1 leader shift; verifies existing L1 price drop does NOT extend.
14. `test_14_multiple_consecutive_extensions` — Cumulative consecutive time extensions.
15. `test_15_extension_capped_at_forced_close` — Proposed extensions strictly capped at Forced Close.
16. `test_16_auction_forced_closure` — Automatic transition to `FORCE_CLOSED`.
17. `test_17_simultaneous_bids_simulation` — High-concurrency atomic bid submissions.
18. `test_18_duplicate_task_execution_idempotency` — Idempotent closure execution.
19. `test_19_scheduled_closure_after_extension` — Stale tasks do not close extended auctions prematurely.
20. `test_20_existing_participant_remains_eligible` — An existing bid participant remains eligible when rebidding.
21. `test_21_unauthorized_role_enforcement` — Unauthorized RFQ and quote operations remain forbidden.
22. `test_22_supplier_award_notification` — Supplier award notifications are persisted and readable.
23. `test_23_l3_supplier_rebidding_to_l1` — An L3 supplier can submit a lower accepted bid and reach L1.

---

## 📁 Repository Structure

```
british-auction-rfq/
|-- backend/
|   |-- alembic/                  # Version-controlled database migrations
|   |   |-- versions/
|   |   |   |-- 001_initial_schema.py
|   |   |-- env.py
|   |   |-- script.py.mako
|   |-- app/
|   |   |-- api/
|   |   |   |-- v1/
|   |   |   |   |-- endpoints/    # Auth, RFQs, Quotes, Bids, Activity, Results, WebSockets
|   |   |   |   |-- api.py
|   |   |   |-- deps.py           # Dependency injection (Auth, RBAC, DB session)
|   |   |-- core/                 # Settings, security, config
|   |   |-- db/                   # Database session, engine, base
|   |   |-- models/               # SQLAlchemy 2.0 relational models
|   |   |-- schemas/              # Pydantic v2 validation models
|   |   |-- services/             # Core business logic: bidding, ranking, extensions, closure
|   |   |-- tasks/                # Celery worker & Beat periodic reconciliation tasks
|   |   |-- websocket/            # Connection manager & live broadcast engine
|   |   |-- main.py               # FastAPI application entry point
|   |-- scripts/
|   |   |-- seed_data.py          # Realistic database seeder
|   |-- tests/
|   |   |-- conftest.py
|   |   |-- test_all_requirements.py
|   |-- requirements.txt
|
|-- frontend/
|   |-- src/
|   |   |-- components/           # BiddingConsole, CountdownTimer, StatusBadge, Modals, Feed
|   |   |-- context/              # AuthContext with quick role switcher
|   |   |-- hooks/                # useAuctionWebSocket, useCountdown
|   |   |-- pages/                # Login, Register, AuctionListing, AuctionDetails, Dashboards
|   |   |-- services/             # Axios API client, authService, rfqService
|   |   |-- types/                # TypeScript interfaces
|   |   |-- App.tsx
|   |   |-- main.tsx
|   |   |-- index.css             # Tailwind CSS directives & theme styling
|   |-- package.json
|   |-- vite.config.ts
|   |-- tailwind.config.js
|
|-- docs/
|   |-- HLD.md                    # Deliverable 1
|   |-- database-schema.md        # Deliverable 2
|   |-- ER-diagram.md             # Entity Relationship diagram
|   |-- API-documentation.md      # REST & WebSocket specifications
|   |-- assumptions.md            # Documented architectural decisions
|
|-- Images/                       # Application screenshots for demo/evaluation
|
|-- REQUIREMENT_TRACEABILITY.md   # Complete requirements traceability matrix
|-- docker-compose.yml            # Multi-container orchestration
|-- Dockerfile.backend
|-- Dockerfile.frontend
|-- alembic.ini
|-- .env.example
|-- README.md
```
