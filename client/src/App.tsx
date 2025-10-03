// client/src/App.tsx

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/navigation";
import Dashboard from "@/pages/dashboard";
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
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

function Router() {
  const [location] = useLocation();
  
  // Fetch user trial status for navigation
  const { data: userStatus } = useQuery({
    queryKey: ["/api/user/trial-status"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Pages that don't need navigation layout
  const fullScreenPages = ["/trial-unlock", "/landing"];
  const shouldShowNavigation = !fullScreenPages.includes(location);

  // Mock user data (in real app, this would come from auth context)
  const mockUser = {
    role: "super_admin", // Change to "user" or "admin" to test different roles
    isTrialActive: (userStatus as any)?.isTrialActive || false,
    daysLeft: (userStatus as any)?.daysLeft || 0
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {shouldShowNavigation && (
        <Navigation 
          userRole={mockUser.role}
          isTrialActive={mockUser.isTrialActive}
          daysLeft={mockUser.daysLeft}
        />
      )}
      
      <div className={shouldShowNavigation ? "md:ml-64" : ""}>
        <div className={shouldShowNavigation ? "md:pt-0 pt-16" : ""}>
          <Switch>
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
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
