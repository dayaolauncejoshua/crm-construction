// client/src/contexts/ClientContext.tsx

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface ClientContextType {
  selectedClientId: string | null;
  setSelectedClientId: (clientId: string) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Load saved client from localStorage
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`selectedClient_${user.id}`);
      if (saved) {
        setSelectedClientId(saved);
      }
    }
  }, [user?.id]);

  // Save to localStorage when changed
  const handleSetClient = (clientId: string) => {
    setSelectedClientId(clientId);
    if (user?.id && clientId) {
      localStorage.setItem(`selectedClient_${user.id}`, clientId);
    }
  };

  return (
    <ClientContext.Provider
      value={{
        selectedClientId,
        setSelectedClientId: handleSetClient,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClient must be used within ClientProvider");
  }
  return context;
}