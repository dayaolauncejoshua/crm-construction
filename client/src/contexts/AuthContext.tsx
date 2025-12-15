// client/src/contexts/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { getApiUrl } from "@/lib/api-config";

// User Settings interface
interface UserSettings {
  notifications?: {
    email?: boolean;
    whatsapp?: boolean;
    leads?: boolean;
    bookings?: boolean;
    weeklyReports?: boolean;
  };
  regional?: {
    timezone?: string;
    language?: string;
  };
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  role: string;
  emailVerified?: boolean;
  isTrialActive?: boolean;
  trialEndsAt?: Date | null;
  twoFactorEnabled?: boolean;
  
  // Notification Preferences 
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
  leadNotifications?: boolean;
  bookingNotifications?: boolean;
  weeklyReports?: boolean;
  
  // Settings JSONB (for regional preferences)
  settings?: UserSettings;
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
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ Define public pages that don't require auth
const skipAuthRoutes = [
  "/",
  "/login",
  "/signup",
  "/landing",
  "/verify-email",
  "/forgot-password",
  "/trial-unlock",
  "/payment-success",
];

const shouldSkipAuth = (path: string) => {
  return (
    skipAuthRoutes.includes(path) ||
    path.startsWith("/verify/") ||
    path.startsWith("/reset-password/")
  );
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [location] = useLocation();

  // ✅ Always check auth on protected pages
  const shouldFetchUser = useMemo(() => {
    return !shouldSkipAuth(location);
  }, [location]);

  // ✅ Fetch user with proper credentials
  const { data, isLoading, refetch } = useQuery<{ user: User } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/auth/me"), {
        credentials: "include", // ✅ CRITICAL: Send cookies
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null; // Not authenticated
        }
        throw new Error("Failed to fetch user");
      }

      return response.json();
    },
    retry: false,
    enabled: true, // ✅ Always enabled (we'll check in component)
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true, // ✅ Refetch when tab regains focus
    refetchOnMount: true, // ✅ Always check on mount
  });

  // ✅ Update user state when data changes
  useEffect(() => {
    if (data?.user) {
      setUser(data.user);
      console.log("✅ [AUTH] User authenticated:", data.user.email);
    } else if (data === null) {
      setUser(null);
      console.log("❌ [AUTH] No active session");
    }
  }, [data]);

  // ✅ Listen for cross-tab auth changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_updated") {
        console.log("🔄 [AUTH] Auth state changed in another tab");
        refetch();
      }
    };

    const handleWindowFocus = () => {
      console.log("👁️ [AUTH] Window focused, checking session");
      refetch();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [refetch]);

  // Login
  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const response = await fetch(getApiUrl("api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ CRITICAL: Send cookies
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
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      localStorage.setItem("auth_updated", Date.now().toString());
      console.log("✅ [AUTH] Login successful:", data.user.email);
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
      const response = await fetch(getApiUrl("api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ CRITICAL: Send cookies
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
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      localStorage.setItem("auth_updated", Date.now().toString());
      console.log("✅ [AUTH] Signup successful:", data.user.email);
    },
  });

  // Logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(getApiUrl("api/auth/logout"), {
        method: "POST",
        credentials: "include", // ✅ CRITICAL: Send cookies
      });

      if (!response.ok) throw new Error("Logout failed");
      return response.json();
    },
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      localStorage.setItem("auth_updated", Date.now().toString());
      console.log("✅ [AUTH] Logged out successfully");
    },
  });

  // Refresh user data
  const refreshUser = async () => {
    console.log("🔄 [AUTH] Refreshing user data");
    await refetch();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading,
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
        refreshUser,
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