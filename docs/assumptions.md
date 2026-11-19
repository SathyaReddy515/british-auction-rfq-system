# Architectural Decisions & Documented Assumptions

This document formally records all architectural assumptions, business interpretations, and technical design decisions made during the design and implementation of the **British Auction in RFQ System**, matching the approved System Design baseline.

---

## 1. Pricing Model: Quote Charge Breakdown vs. Competitive Downward Bid Amount

- **Assignment Context:** The company assignment specifies a quote form containing carrier name, freight charges, origin charges, destination charges, transit time, and quote validity. Separately, it describes British Auction mechanics where suppliers compete by continuously lowering their prices.
- **Architectural Decision:** 
  1. The initial quotation submission (`quotes` table) requires the supplier to itemize freight, origin, and destination charges.
  2. The system automatically computes the initial total price:
     $$\text{Initial Price} = \text{Freight} + \text{Origin} + \text{Destination}$$
     This total is automatically registered as the supplier's starting baseline bid in the `bids` table.
  3. Subsequent competitive downward bids during active fast-paced auction rounds submit a revised total `bid_amount`. This avoids forcing suppliers to manually recalibrate line-item charges within seconds before auction close, guaranteeing low-latency bidding while preserving the initial charge breakdown on the quotation record for post-auction commercial auditing.

---

## 2. Supplier Ranking Calculation: Latest Valid Bid Policy

- **Assignment Context:** The assignment states that suppliers submit bids openly, lower prices to beat competitors, and are ranked L1, L2, L3...
- **Architectural Decision:**
  1. A supplier's current standing is computed strictly using their **most recent valid accepted bid**.
  2. Historical bids submitted by that supplier are immutably preserved in the `bids` table for chronological audit and visual replay.
  3. Historical bids do not occupy multiple ranking slots; each active supplier has exactly one current rank.

---

## 3. Deterministic Tie-Breaking Policy

- **Assignment Context:** The assignment does not explicitly specify tie-breaking rules if two suppliers submit the identical price.
- **Architectural Decision:**
  1. **Primary criterion:** Bid amount ascending (lower is better; L1 is lowest).
  2. **Secondary criterion (Tie-breaker 1):** Earliest server acceptance timestamp (`created_at ASC`). The supplier who submitted that price first holds the higher ranking position.
  3. **Tertiary criterion (Deterministic Tie-breaker 2):** Lexicographical supplier UUID order (`supplier_id ASC`) to guarantee strict mathematical determinism under any edge case.

---

## 4. Single Extension Trigger Selection per Auction

- **Assignment Context:** The assignment specifies three trigger conditions:
  1. `BID_RECEIVED` (Bid received in last $X$ minutes)
  2. `ANY_SUPPLIER_RANK_CHANGE` (Any supplier rank change in last $X$ minutes)
  3. `L1_RANK_CHANGE` (Lowest bidder L1 rank change in last $X$ minutes)
- **Architectural Decision:**
  - Each RFQ allows the Buyer to select **one** of these three extension triggers during creation (stored as `trigger_type` in `auction_configs`).
  - **L1 Rank Change Specificity:** Under `L1_RANK_CHANGE`, extension occurs **only** when the supplier identity of L1 changes. If the supplier who is *already* L1 submits an even lower bid, their identity did not change; therefore, under `L1_RANK_CHANGE`, no extension occurs (preventing a lone leader from artificially extending the auction indefinitely).

---

## 5. Winner Award Policy

- **Assignment Context:** The assignment requires displaying supplier rankings (L1, L2, L3) and final results, but does not state whether the system automatically executes a legal procurement award.
- **Architectural Decision:**
  - When the auction reaches its effective close or forced close deadline, it transitions to `CLOSED` or `FORCE_CLOSED`.
  - The system automatically generates an `auction_results` snapshot recording the L1 bidder and final price, marking `selection_status = PENDING_SELECTION`.
  - The Buyer retains formal commercial discretion to click "Confirm Award & Finalize Contract", transitioning the status to `SELECTED`.

---

## 6. Commercial Data Privacy & Fair Transparency

- **Assignment Context:** Suppliers submit bids openly and view current rankings.
- **Architectural Decision:**
  - **Buyer View:** Fully transparent. The Buyer sees all supplier corporate identities, line-item charge breakdowns, carrier names, and every bid.
  - **Supplier View:** Fair competitive transparency. A Supplier sees their own rank badge (e.g. L1, L2), the current market lowest price (L1), and their own quotation breakdown. Competitor company names are masked (e.g., "Supplier #f5b6") to protect sensitive corporate supply-chain pricing while encouraging active downward competition.
