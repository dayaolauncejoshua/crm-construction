// client/src/contexts/AuthContext.tsx

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  emailVerified?: boolean;
  isTrialActive?: boolean;
  trialEndsAt?: Date | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [location] = useLocation();

  // ✅ Define public pages
  const publicPages = [
    "/",
    "/login",
    "/signup",
    "/landing",
    "/verify-email",
    "/forgot-password",
  ];

  const isPublicRoute = (path: string) => {
    return (
      publicPages.includes(path) ||
      path.startsWith("/verify/") ||
      path.startsWith("/reset-password/")
    );
  };

  // ✅ Only fetch current user on protected pages
  const { data, isLoading, refetch } = useQuery<{ user: User } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }), // ✅ Return null on 401, don't throw
    retry: false,
    enabled: !isPublicRoute(location), // ✅ Only run on protected pages
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data?.user) {
      setUser(data.user);
    } else if (data === null) {
      // 401 or no user
      setUser(null);
    }
  }, [data]);

  // ✅ Listen for cross-tab auth changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_updated") {
        console.log("🔄 Auth state changed in another tab");
        if (!isPublicRoute(location)) {
          refetch();
        }
      }
    };

    const handleWindowFocus = () => {
      if (!isPublicRoute(location)) {
        refetch();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [refetch, location]);

  // Login
  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries();
      localStorage.setItem("auth_updated", Date.now().toString());
    },
  });

  // Signup
  const signupMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      firstName,
      lastName,
    }: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Signup failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries();
      localStorage.setItem("auth_updated", Date.now().toString());
    },
  });

  // Logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Logout failed");
      return response.json();
    },
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      localStorage.setItem("auth_updated", Date.now().toString());
      console.log("✅ Logged out successfully");
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login: async (email, password) => {
          await loginMutation.mutateAsync({ email, password });
        },
        signup: async (email, password, firstName, lastName) => {
          await signupMutation.mutateAsync({
            email,
            password,
            firstName,
            lastName,
          });
        },
        logout: async () => {
          await logoutMutation.mutateAsync();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}