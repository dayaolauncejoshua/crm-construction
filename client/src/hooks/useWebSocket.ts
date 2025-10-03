import { useState, useEffect, useRef } from "react";

export function useWebSocket() {
  const [data, setData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Always connect to backend server port
    const wsUrl = "ws://localhost:5000/ws";
    
    const connect = () => {
      console.log("Attempting to connect to:", wsUrl);
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected successfully");
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          console.log("WebSocket message received:", parsedData);
          setData(parsedData);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected, reconnecting in 3s...");
        setIsConnected(false);
        setTimeout(connect, 3000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { data, isConnected };
}