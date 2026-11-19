import uuid
from typing import List, Dict, Optional, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session
from backend.app.models.bid import Bid
from backend.app.models.user import User
from backend.app.schemas.bid import SupplierRankingItem


class RankingService:
    @staticmethod
    def get_latest_bids_per_supplier(db: Session, rfq_id: uuid.UUID) -> List[Bid]:
        """
        Retrieves each supplier's most recent valid bid for the RFQ.
        """
        # Fetch all bids for this RFQ ordered by created_at DESC, id DESC
        all_bids = (
            db.query(Bid)
            .filter(Bid.rfq_id == rfq_id)
            .order_by(Bid.created_at.desc(), Bid.id.desc())
            .all()
        )
        
        seen_suppliers = set()
        latest_bids = []
        for bid in all_bids:
            if bid.supplier_id not in seen_suppliers:
                seen_suppliers.add(bid.supplier_id)
                latest_bids.append(bid)
                
        return latest_bids

    @classmethod
    def calculate_rankings(
        cls, 
        db: Session, 
        rfq_id: uuid.UUID,
        current_user_id: Optional[uuid.UUID] = None,
        anonymize_for_suppliers: bool = False
    ) -> List[SupplierRankingItem]:
        """
        Calculates L1, L2, L3... rankings using each supplier's latest valid bid.
        Sorting policy:
        1. bid_amount ASC (lowest price is best)
        2. created_at ASC (earliest timestamp wins tie)
        3. supplier_id ASC (deterministic tie-break)
        """
        latest_bids = cls.get_latest_bids_per_supplier(db, rfq_id)
        
        # Sort deterministically
        sorted_bids = sorted(
            latest_bids,
            key=lambda b: (b.bid_amount, b.created_at, str(b.supplier_id))
        )
        
        rankings: List[SupplierRankingItem] = []
        for index, bid in enumerate(sorted_bids, start=1):
            supplier = db.query(User).filter(User.id == bid.supplier_id).first()
            raw_name = supplier.full_name if supplier else "Unknown Supplier"
            
            is_self = (current_user_id is not None and bid.supplier_id == current_user_id)
            
            # Anonymize competitor names for suppliers to preserve commercial confidentiality
            if anonymize_for_suppliers and not is_self:
                display_name = f"Supplier #{str(bid.supplier_id)[:4]}"
            else:
                display_name = raw_name

            rankings.append(
                SupplierRankingItem(
                    rank=index,
                    rank_label=f"L{index}",
                    supplier_id=bid.supplier_id,
                    supplier_name=display_name,
                    current_bid_amount=bid.bid_amount,
                    submitted_at=bid.created_at,
                    is_current_user=is_self
                )
            )
            
        return rankings

    @classmethod
    def get_rank_mapping(cls, db: Session, rfq_id: uuid.UUID) -> Dict[uuid.UUID, int]:
        """
        Returns a dictionary mapping {supplier_id: rank_integer}.
        """
        rankings = cls.calculate_rankings(db, rfq_id)
        return {item.supplier_id: item.rank for item in rankings}

    @classmethod
    def get_l1_supplier(cls, db: Session, rfq_id: uuid.UUID) -> Optional[Tuple[uuid.UUID, Decimal]]:
        """
        Returns (supplier_id, bid_amount) of the current L1 leader, or None if no bids.
        """
        rankings = cls.calculate_rankings(db, rfq_id)
        if rankings:
            return rankings[0].supplier_id, rankings[0].current_bid_amount
        return None
