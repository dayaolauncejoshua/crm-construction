// client/src/App.tsx

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ClientProvider, useClient } from "@/contexts/ClientContext"; // ← ADD THIS
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Landing from "@/pages/landing";
import TrialUnlock from "@/pages/trial-unlock";
import SuperAdmin from "@/pages/super-admin";
import SuperAdminUsers from "@/pages/super-admin-users";
import Clients from "@/pages/clients";
import Leads from "@/pages/leads";
import Conversations from "@/pages/conversations";
import VSL from "@/pages/vsl";
import Analytics from "@/pages/analytics";
import Calendar from "@/pages/calendar";
import Monitoring from "@/pages/monitoring";
import FollowUps from "@/pages/follow-ups";
import WhiteLabel from "@/pages/white-label";
import SOPs from "@/pages/sops";
import NotFound from "@/pages/not-found";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import VerificationBanner from "@/components/VerificationBanner";
import VerifyEmail from "@/pages/VerifyEmail";
import VerifyToken from "@/pages/VerifyToken";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Pricing from "@/pages/pricing";
import PaymentSuccess from "@/pages/payment-success";
import SubscriptionPage from "@/pages/SubscriptionPage";
import Settings from "@/pages/settings";
import ActivityLog from "./pages/activity";
import { Activity } from "lucide-react";
import BrowserTestCall from "@/pages/BrowserTestCall";
import { getApiUrl } from "@/lib/api-config";

function ProtectedRouter() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { selectedClientId, setSelectedClientId } = useClient();
  const [location, setLocation] = useLocation();

  // ✅ Fetch clients - ONLY when authenticated
  const { data: clients } = useQuery({
  queryKey: ["/api/clients", user?.id, user?.role],
  queryFn: async () => {
    if (!user?.id) return [];

    let endpoint = `/api/clients?userId=${user.id}`;
    if (user?.role === "super_admin") {
      endpoint = "/api/super-admin/clients";
    }

    // ✅ USE getApiUrl() to resolve to Render backend in production
    const url = getApiUrl(endpoint);
    console.log("🔍 [APP] Fetching clients from:", url);

    const response = await fetch(url, {
      credentials: "include",
    });

    console.log("📡 [APP] Response:", response.status);

    if (response.status === 401) {
      window.location.href = "/login";
      return [];
    }

    if (!response.ok) {
      console.error("❌ [APP] Failed to fetch clients");
      return [];
    }
    
    return response.json();
  },
  enabled: !!user?.id && isAuthenticated,
  staleTime: 30 * 1000,
});

  // Auto-select first client if none selected
  useEffect(() => {
    if (clients && clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId, setSelectedClientId]);

  // ✅ Fetch dashboard - ONLY when authenticated
  const { data: dashboardData } = useQuery<{
    conversations: any[];
    kpis: any;
  }>({
    queryKey: [`/api/dashboard/${selectedClientId}`, user?.role],
    queryFn: async () => {
      if (!selectedClientId) return null;

      if (user?.role === "super_admin") {
        const response = await fetch("/api/super-admin/dashboard", {
          credentials: "include",
        });
        if (!response.ok) return null;
        return response.json();
      }

      const response = await fetch(`/api/dashboard/${selectedClientId}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled:
      isAuthenticated && (user?.role === "super_admin" || !!selectedClientId), // ✅ Only when authenticated
    staleTime: 30 * 1000,
  });

  const unreadCount =
    dashboardData?.conversations?.reduce((total: number, conv: any) => {
      return total + (conv.unreadCount || 0);
    }, 0) || 0;

  const newLeadsCount =
    dashboardData?.conversations?.filter(
      (conv: any) => conv.lead?.status === "new" && !conv.lead?.viewedAt
    ).length || 0;

  // ✅ WebSocket - pass isAuthenticated
  const { data: wsData } = useWebSocket(isAuthenticated && !isLoading);

  useEffect(() => {
    if (!wsData || !selectedClientId || !isAuthenticated) return;

    console.log("🌐 App-level WebSocket event:", wsData.type);

    if (
      wsData.type === "new_message" ||
      wsData.type === "new_conversation" ||
      wsData.type === "conversation_updated" ||
      wsData.type === "lead_updated" ||
      wsData.type === "hot_lead_alert"
    ) {
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/${selectedClientId}`],
      });
    }
  }, [wsData, selectedClientId, isAuthenticated]);

  // ✅ Handle redirects in useEffect
  useEffect(() => {
    const publicPages = [
      "/",
      "/login",
      "/signup",
      "/landing",
      "/pricing",
      "/verify-email",
      "/forgot-password",
      "/trial-unlock",
      "/payment-success",
      "/test-call",
    ];

    const isPublicRoute = (path: string) => {
      return (
        publicPages.includes(path) ||
        path.startsWith("/verify/") ||
        path.startsWith("/reset-password/")
      );
    };

    if (isLoading) return;

    if (
      isAuthenticated &&
      (location === "/" || location === "/login" || location === "/signup")
    ) {
      setLocation("/dashboard");
      return;
    }

    if (!isAuthenticated && !isPublicRoute(location)) {
      setLocation("/");
      return;
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  const fullScreenPages = ["/trial-unlock", "/landing", "/login", "/signup"];
  const shouldShowNavigation =
    !fullScreenPages.includes(location) && isAuthenticated;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await logout();
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const trialDaysLeft =
    user?.isTrialActive && user?.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(user.trialEndsAt).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {shouldShowNavigation && (
        <Navigation
          userRole={user?.role || "user"}
          isTrialActive={user?.isTrialActive || false}
          daysLeft={trialDaysLeft}
          unreadCount={unreadCount}
          newLeadsCount={newLeadsCount}
          user={user}
          onSignOut={handleSignOut}
          clients={clients || []}
          selectedClientId={selectedClientId || ""}
          onClientChange={setSelectedClientId}
        />
      )}

      <div className={shouldShowNavigation ? "md:ml-64" : ""}>
        <div className={shouldShowNavigation ? "md:pt-0 pt-16" : ""}>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
            <Route path="/landing" component={Landing} />
            <Route path="/trial-unlock" component={TrialUnlock} />
            <Route path="/subscription" component={SubscriptionPage} />

            <Route path="/settings" component={Settings} />
            <Route path="/settings/activity" component={ActivityLog} />

            <Route path="/payment-success" component={PaymentSuccess} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/verify-email" component={VerifyEmail} />
            <Route path="/verify/:token" component={VerifyToken} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/reset-password/:token" component={ResetPassword} />

            <Route path="/super-admin" component={SuperAdmin} />
            <Route path="/super-admin/users" component={SuperAdminUsers} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/dashboard/:clientId" component={Dashboard} />
            <Route path="/clients" component={Clients} />
            <Route path="/leads" component={Leads} />
            <Route path="/conversations" component={Conversations} />
            <Route path="/vsl" component={VSL} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/monitoring" component={Monitoring} />
            <Route path="/follow-ups" component={FollowUps} />
            <Route path="/white-label" component={WhiteLabel} />
            <Route path="/sops" component={SOPs} />
            <Route path="/test-call" component={BrowserTestCall} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClientProvider>
          <TooltipProvider>
            <Toaster />
            <ProtectedRouter />
          </TooltipProvider>
        </ClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
