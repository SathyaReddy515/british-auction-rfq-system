from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict
import uuid
from backend.app.models.rfq import RFQ
from backend.app.models.auction_config import AuctionConfig
from backend.app.models.enums import TriggerType


class ExtensionService:
    @staticmethod
    def is_within_trigger_window(
        bid_timestamp: datetime,
        current_close: datetime,
        trigger_window_minutes: int
    ) -> bool:
        """
        Evaluates whether the bid occurred in the trigger window:
        [current_close - X minutes, current_close)
        """
        # Ensure UTC timezone awareness
        if bid_timestamp.tzinfo is None:
            bid_timestamp = bid_timestamp.replace(tzinfo=timezone.utc)
        if current_close.tzinfo is None:
            current_close = current_close.replace(tzinfo=timezone.utc)
            
        trigger_window_start = current_close - timedelta(minutes=trigger_window_minutes)
        return trigger_window_start <= bid_timestamp < current_close

    @classmethod
    def evaluate_and_calculate_extension(
        cls,
        rfq: RFQ,
        config: AuctionConfig,
        bid_timestamp: datetime,
        ranks_before: Dict[uuid.UUID, int],
        ranks_after: Dict[uuid.UUID, int],
        l1_before_id: Optional[uuid.UUID],
        l1_after_id: Optional[uuid.UUID]
    ) -> Tuple[bool, datetime, Optional[str]]:
        """
        Evaluates trigger condition and computes the extended closing time.
        Returns: (is_extended, new_close_time, extension_reason)
        """
        # 1. Check if bid was submitted inside the trigger window
        in_window = cls.is_within_trigger_window(
            bid_timestamp=bid_timestamp,
            current_close=rfq.current_bid_close_at,
            trigger_window_minutes=config.trigger_window_minutes
        )
        
        if not in_window:
            return False, rfq.current_bid_close_at, None

        # 2. Evaluate configured trigger condition
        trigger_satisfied = False
        reason = ""

        if config.trigger_type == TriggerType.BID_RECEIVED.value:
            trigger_satisfied = True
            reason = f"Bid received within last {config.trigger_window_minutes} minutes"

        elif config.trigger_type == TriggerType.ANY_SUPPLIER_RANK_CHANGE.value:
            # Check if any supplier's rank changed or new supplier ranked
            has_rank_change = False
            for supplier_id, new_rank in ranks_after.items():
                old_rank = ranks_before.get(supplier_id)
                if old_rank != new_rank:
                    has_rank_change = True
                    break
            
            if has_rank_change:
                trigger_satisfied = True
                reason = f"Supplier ranking change occurred within last {config.trigger_window_minutes} minutes"

        elif config.trigger_type == TriggerType.L1_RANK_CHANGE.value:
            # Extends ONLY if the identity of L1 changed
            if l1_before_id != l1_after_id and l1_after_id is not None:
                trigger_satisfied = True
                reason = f"L1 lowest bidder identity changed within last {config.trigger_window_minutes} minutes"

        if not trigger_satisfied:
            return False, rfq.current_bid_close_at, None

        # 3. Calculate extension duration Y and enforce forced close cap
        current_close = rfq.current_bid_close_at
        forced_close = rfq.forced_close_at
        
        if current_close.tzinfo is None:
            current_close = current_close.replace(tzinfo=timezone.utc)
        if forced_close.tzinfo is None:
            forced_close = forced_close.replace(tzinfo=timezone.utc)

        proposed_close = current_close + timedelta(minutes=config.extension_duration_minutes)
        new_close = min(proposed_close, forced_close)

        # Check if actual extension happened
        if new_close > current_close:
            capped_note = " (Capped at Forced Close Time)" if new_close == forced_close and proposed_close > forced_close else ""
            full_reason = f"{reason}. Extended by {config.extension_duration_minutes} min{capped_note}."
            return True, new_close, full_reason
        else:
            return False, current_close, "Auction already at maximum Forced Close Time; cannot extend further."
