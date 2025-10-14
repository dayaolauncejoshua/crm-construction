// client/src/hooks/useWebSocket.ts

import { useState, useEffect, useRef } from "react";

export function useWebSocket(isAuthenticated: boolean = true) {
  const [data, setData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // ✅ Only connect if authenticated
    if (!isAuthenticated) {
      console.log("⏸️ WebSocket disabled - not authenticated");
      
      // Cleanup if exists
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      setIsConnected(false);
      return;
    }

    // Determine WebSocket URL based on environment
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = process.env.NODE_ENV === "production" 
      ? `${protocol}//${window.location.host}/ws`
      : "ws://localhost:5000/ws";

    const connect = () => {
      console.log("Attempting to connect to:", wsUrl);
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("✅ WebSocket connected");
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          console.log("📨 WebSocket message:", parsedData);
          setData(parsedData);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        
        // Only reconnect if still authenticated
        if (isAuthenticated) {
          console.log("Reconnecting in 3s...");
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      socket.onerror = (error) => {
        console.log("WebSocket error:", error);
        setIsConnected(false);
      };
    };

    connect();

    return () => {
      console.log("🔌 Cleaning up WebSocket");
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated]);

  return { data, isConnected };
}