from fastapi import APIRouter
from backend.app.api.v1.endpoints import auth, rfqs, quotes, bids, activity, results, ws

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(rfqs.router, prefix="/rfqs", tags=["RFQs & Auction Configuration"])
api_router.include_router(quotes.router, tags=["Quotations"])
api_router.include_router(bids.router, tags=["Bidding & Rankings"])
api_router.include_router(activity.router, tags=["Activity & Audit Logs"])
api_router.include_router(results.router, tags=["Auction Results & Awards"])
api_router.include_router(ws.router, tags=["WebSockets"])
