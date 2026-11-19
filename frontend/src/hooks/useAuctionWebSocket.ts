import { useEffect, useRef, useState, useCallback } from 'react';
import { AuctionWebSocketEvent } from '../types/auction';

interface UseAuctionWebSocketOptions {
  rfqId: string;
  token?: string | null;
  onEvent?: (event: AuctionWebSocketEvent) => void;
}

export const useAuctionWebSocket = ({ rfqId, token, onEvent }: UseAuctionWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<AuctionWebSocketEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (!rfqId) return;

    // Build WS URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    const wsUrl = `${protocol}//${host}/api/v1/ws/auctions/${rfqId}${tokenQuery}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Start heartbeat ping
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 20000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const parsed = JSON.parse(event.data) as AuctionWebSocketEvent;
          setLastEvent(parsed);
          if (onEvent) {
            onEvent(parsed);
          }
        } catch (e) {
          // ignore non-json messages
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        clearInterval(pingIntervalRef.current);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      setIsConnected(false);
    }
  }, [rfqId, token, onEvent]);

  useEffect(() => {
    connect();

    return () => {
      clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, lastEvent };
};
