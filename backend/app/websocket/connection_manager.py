import json
import logging
from typing import Dict, List, Any
import uuid
from fastapi import WebSocket

logger = logging.getLogger("auction.websocket")


class ConnectionManager:
    def __init__(self):
        # Map: rfq_id -> list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, rfq_id: str, websocket: WebSocket):
        await websocket.accept()
        if rfq_id not in self.active_connections:
            self.active_connections[rfq_id] = []
        self.active_connections[rfq_id].append(websocket)
        logger.info(f"WebSocket client connected to RFQ {rfq_id}. Active count: {len(self.active_connections[rfq_id])}")

    def disconnect(self, rfq_id: str, websocket: WebSocket):
        if rfq_id in self.active_connections:
            if websocket in self.active_connections[rfq_id]:
                self.active_connections[rfq_id].remove(websocket)
            if not self.active_connections[rfq_id]:
                del self.active_connections[rfq_id]
        logger.info(f"WebSocket client disconnected from RFQ {rfq_id}.")

    async def broadcast_to_rfq(self, rfq_id: str, message: Dict[str, Any]):
        if rfq_id in self.active_connections:
            payload = json.dumps(message, default=str)
            stale_connections = []
            for connection in self.active_connections[rfq_id]:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.warning(f"Failed to send to WebSocket: {e}")
                    stale_connections.append(connection)
            
            for stale in stale_connections:
                self.disconnect(rfq_id, stale)


# Global singleton instance
ws_manager = ConnectionManager()
