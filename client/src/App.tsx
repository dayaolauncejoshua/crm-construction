import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Landing from "@/pages/landing";
import TrialUnlock from "@/pages/trial-unlock";
import SuperAdmin from "@/pages/super-admin";
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

function ProtectedRouter() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();

  // MOVED: Fetch dashboard data BEFORE any conditional returns
  const { data: dashboardData } = useQuery<{
    conversations: any[];
  }>({
    queryKey: [`/api/dashboard/${user?.id}`],
    enabled: !!user && isAuthenticated,
    staleTime: 30 * 1000,
  });

  const unreadCount =
    dashboardData?.conversations?.filter((c: any) => c.unreadCount > 0)
      .length || 0;

  // Pages that don't need navigation layout
  const fullScreenPages = ["/trial-unlock", "/landing", "/login", "/signup"];
  const shouldShowNavigation =
    !fullScreenPages.includes(location) && isAuthenticated;

  // NOW: Conditional returns AFTER all hooks
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

  // Public pages that don't require authentication
  const publicPages = ["/login", "/signup", "/landing"];

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
          user={user}
          onSignOut={handleSignOut}
        />
      )}

      <div className={shouldShowNavigation ? "md:ml-64" : ""}>
        <div className={shouldShowNavigation ? "md:pt-0 pt-16" : ""}>
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
            <Route path="/landing" component={Landing} />
            <Route path="/trial-unlock" component={TrialUnlock} />
            <Route path="/super-admin" component={SuperAdmin} />
            <Route path="/" component={Dashboard} />
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
        <TooltipProvider>
          <Toaster />
          <ProtectedRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
