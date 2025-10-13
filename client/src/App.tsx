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

function ProtectedRouter() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { selectedClientId, setSelectedClientId } = useClient(); // ← ADD THIS
  const [location, setLocation] = useLocation();

  // Fetch clients based on role
  const { data: clients } = useQuery({
    queryKey: ["/api/clients", user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id) return [];

      // Super admin gets all clients for viewing
      if (user?.role === "super_admin") {
        const response = await fetch("/api/super-admin/clients");
        if (!response.ok) return [];
        return response.json();
      }

      // Regular users get only their clients
      const response = await fetch(`/api/clients?userId=${user?.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id && isAuthenticated,
  });

  // ← ADD THIS: Auto-select first client if none selected
  useEffect(() => {
    if (clients && clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId, setSelectedClientId]);

  // ← CHANGE THIS: Use selectedClientId instead of clients?.[0]?.id
  const { data: dashboardData } = useQuery<{
    conversations: any[];
    kpis: any;
  }>({
    queryKey: [`/api/dashboard/${selectedClientId}`, user?.role],
    queryFn: async () => {
      if (!selectedClientId) return null;

      // Super admin gets platform-wide dashboard
      if (user?.role === "super_admin") {
        const response = await fetch("/api/super-admin/dashboard");
        return response.json();
      }

      // Regular users get their client dashboard
      const response = await fetch(`/api/dashboard/${selectedClientId}`);
      return response.json();
    },
    enabled: user?.role === "super_admin" || !!selectedClientId,
    staleTime: 30 * 1000,
  });

  // Calculate unread count from conversations
  const unreadCount =
    dashboardData?.conversations?.reduce((total: number, conv: any) => {
      return total + (conv.unreadCount || 0);
    }, 0) || 0;

  // Calculate new leads count (status = "new")
  const newLeadsCount =
    dashboardData?.conversations?.filter(
      (conv: any) => conv.lead?.status === "new" && !conv.lead?.viewedAt
    ).length || 0;

  const { data: wsData } = useWebSocket();

  useEffect(() => {
    if (!wsData || !selectedClientId) return;

    console.log("🌐 App-level WebSocket event:", wsData.type);

    // Refresh dashboard data (for sidebar badges) on any relevant event
    if (
      wsData.type === "new_message" ||
      wsData.type === "new_conversation" ||
      wsData.type === "conversation_updated" ||
      wsData.type === "lead_updated" ||
      wsData.type === "hot_lead_alert"
    ) {
      console.log("🔄 Invalidating dashboard query for sidebar update");

      // Invalidate dashboard to update unread counts
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/${selectedClientId}`],
      });
    }
  }, [wsData, selectedClientId]);

  // Pages that don't need navigation layout
  const fullScreenPages = ["/trial-unlock", "/landing", "/login", "/signup"];
  const shouldShowNavigation =
    !fullScreenPages.includes(location) && isAuthenticated;

  // Show loading state
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

  // ✅ NEW: Landing page is the default for unauthenticated users
  const publicPages = ["/", "/login", "/signup", "/landing"];

  // Redirect to landing if not authenticated and trying to access protected page
  if (!isAuthenticated && !publicPages.includes(location)) {
    setLocation("/");
    return null;
  }

  // ✅ NEW: Redirect authenticated users away from landing page
  if (isAuthenticated && location === "/") {
    setLocation("/dashboard");
    return null;
  }

  // Redirect to login if not authenticated and not on public page
  if (!isAuthenticated && !publicPages.includes(location)) {
    return <Login />;
  }

  const handleSignOut = async () => {
    try {
      await logout();
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {shouldShowNavigation && (
        <Navigation
          userRole={user?.role || "user"}
          isTrialActive={user?.isTrialActive || false}
          daysLeft={0}
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
            {/* ✅ PUBLIC ROUTES - No auth required */}
            <Route path="/" component={Landing} />{" "}
            {/* ✅ Landing is now the homepage */}
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
            <Route path="/landing" component={Landing} />{" "}
            {/* Keep /landing as alias */}
            <Route path="/trial-unlock" component={TrialUnlock} />

            {/* ✅ PROTECTED ROUTES - Auth required */}
            <Route path="/super-admin" component={SuperAdmin} />
            <Route path="/super-admin/users" component={SuperAdminUsers} />
            <Route path="/dashboard" component={Dashboard} />{" "}
            {/* ✅ Dashboard now requires /dashboard */}
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
