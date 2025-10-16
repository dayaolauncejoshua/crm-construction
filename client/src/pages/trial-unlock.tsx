// client/src/pages/trial-unlock.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Zap, 
  Clock, 
  CheckCircle, 
  Star, 
  TrendingUp, 
  Users, 
  MessageCircle, 
  BarChart3,
  Rocket,
  Gift,
  Timer,
  Crown,
  HardHat,      // ✅ Construction icon
  Building2,    // ✅ Construction icon
  Wrench,       // ✅ Construction icon
  Hammer,       // ✅ Construction icon
  Target,       // ✅ Construction icon
  Calendar,      // ✅ Construction icon
  Play,        // ✅ Add for VSL
  FileText,    // ✅ Add for SOPs
  Palette
} from "lucide-react";
import { useLocation } from "wouter";

// Add TypeScript interface for trial status
interface TrialStatus {
  isTrialActive: boolean;
  daysLeft?: number;
  trialEndsAt?: string;
}

export default function TrialUnlock() {
  usePageTitle("Unlock Free Trial - AI Lead System");
  const [isActivating, setIsActivating] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Use authenticated user from backend
  const { data: userStatus, isLoading } = useQuery<TrialStatus>({
    queryKey: ["/api/user/trial-status"],
    retry: false,
  });

  const activateTrialMutation = useMutation({
    mutationFn: async () => {
      setIsActivating(true);
      const response = await apiRequest("POST", "/api/user/activate-trial", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/trial-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"]});

      toast({
        title: "🎉 Trial Activated!",
        description: `Your 14-day free trial is now active. Enjoy unlimited access!`,
      });
      setIsActivating(false);
      // Redirect to dashboard after activation
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsActivating(false);
    },
  });

  // ✅ CONSTRUCTION-THEMED FEATURES
  const features = [
    {
      icon: <MessageCircle className="w-6 h-6 text-construction" />,
      title: "AI-Powered Lead Qualification",
      description: "Sub-2-minute response times with intelligent conversation handling",
      bgClass: "bg-construction/10",
      iconColorClass: "text-construction"
    },
    {
      icon: <Calendar className="w-6 h-6 text-primary" />,
      title: "One-Click Meeting Scheduling",
      description: "Qualified leads come with all the details. Book meetings instantly through your calendar with automated confirmations",
      bgClass: "bg-primary/10",
      iconColorClass: "text-primary"
    },
    {
      icon: <Play className="w-6 h-6 text-construction" />,
      title: "VSL Generator",
      description: "Create professional Video Sales Letters automatically with AI-powered script generation and video production",
      bgClass: "bg-construction/10",
      iconColorClass: "text-construction"
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-primary" />,
      title: "Advanced Analytics & Reporting",
      description: "Real-time dashboards with automated executive summaries and performance tracking",
      bgClass: "bg-primary/10",
      iconColorClass: "text-primary"
    },
    {
      icon: <FileText className="w-6 h-6 text-construction" />,
      title: "Video SOPs & Documentation",
      description: "Create and manage standard operating procedures with video tutorials and searchable documentation",
      bgClass: "bg-construction/10",
      iconColorClass: "text-construction"
    },
    {
      icon: <Palette className="w-6 h-6 text-primary" />,
      title: "White Label Customization",
      description: "Fully customize branding, colors, and domain for your clients with white-label portals",
      bgClass: "bg-primary/10",
      iconColorClass: "text-primary"
    }
  ];

  const stats = [
    { label: "Average Response Time", value: "< 2 min", icon: <Clock className="w-5 h-5" /> },
    { label: "Lead Conversion Rate", value: "35%+", icon: <TrendingUp className="w-5 h-5" /> },
    { label: "Client Satisfaction", value: "98%", icon: <Star className="w-5 h-5" /> },
    { label: "Features Included", value: "50+", icon: <Rocket className="w-5 h-5" /> }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading trial status...</p>
        </div>
      </div>
    );
  }

  // If trial is already active, show status
  if (userStatus?.isTrialActive) {
    const daysLeft = userStatus.daysLeft || 0;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="w-20 h-20 bg-gradient-construction rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900">Trial Active!</CardTitle>
            <p className="text-slate-600 text-lg">Your free trial is currently running</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ✅ CONSTRUCTION-THEMED STATUS BOX */}
            <div className="bg-gradient-to-r from-blue-50 to-orange-50 border-2 border-construction/20 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Timer className="w-5 h-5 text-construction" />
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-orange-500">
                  {daysLeft} days left
                </span>
              </div>
              <p className="text-slate-600">
                Trial expires on {new Date(userStatus.trialEndsAt || '').toLocaleDateString()}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-4 bg-slate-50 rounded-lg border hover:border-construction/30 transition-colors">
                  <div className="flex items-center justify-center mb-2 text-construction">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm text-slate-600">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex-1 bg-gradient-construction hover:opacity-90 text-white"
                onClick={() => setLocation("/dashboard")}
              >
                Go to Dashboard
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-2 hover:bg-construction/5"
                onClick={() => setLocation("/pricing")}
              >
                View Pricing Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section - FULL WIDTH like landing page */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-orange-500/10"></div>
        
        {/* ✅ CONSTRUCTION-THEMED HERO */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm border-2 border-construction/20 rounded-full px-6 py-3 mb-6">
              <HardHat className="w-5 h-5 text-construction" />
              <span className="text-construction font-semibold">Limited Time: 14-Day Free Trial</span>
            </div>
            
            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-8">
              Unlock the Power of
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-orange-500">
                AI Lead Generation
              </span>
              <span className="block text-slate-900">for Construction</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl text-slate-600 mb-14 max-w-3xl mx-auto leading-relaxed">
              Stop losing $100K+ projects to slow responses. AI-powered system responds in under 2 minutes, 
              qualifies prospects 24/7, and book meetings with one
              click and close more deals.
            </p>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-14">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border-2 border-slate-200 hover:border-construction/30 transition-colors">
                  <div className="flex items-center justify-center mb-2 text-construction">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm text-slate-600">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* CTA Card */}
            <Card className="inline-block w-full max-w-2xl bg-white/90 backdrop-blur-sm border-2 border-construction/20 shadow-2xl">
              <CardContent className="p-8">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-construction rounded-lg flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-slate-900">Start Your Free Trial</span>
                </div>
                
                <p className="text-slate-600 mb-6 text-lg">
                  Full access to all premium features • No credit card required • Cancel anytime
                </p>
                
                {/* ✅ CONSTRUCTION-THEMED BUTTON */}
                <Button
                  size="lg"
                  className="w-full bg-gradient-construction hover:opacity-90 text-white text-lg py-6 shadow-xl"
                  onClick={() => activateTrialMutation.mutate()}
                  disabled={isActivating}
                >
                  {isActivating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                      Activating Trial...
                    </>
                  ) : (
                    <>
                      <HardHat className="w-5 h-5 mr-3" />
                      Activate 14-Day Free Trial
                    </>
                  )}
                </Button>
                
                <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-500">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>No credit card</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Cancel anytime</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Setup in 10 min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Features Section - FULL WIDTH */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need to Convert Construction Leads
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Built specifically for construction companies who want more $100K+ projects
            </p>
          </div>

          {/* ✅ CONSTRUCTION-THEMED FEATURE CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="border-2 hover:border-construction/50 transition-all hover:shadow-xl"
              >
                <CardContent className="p-6">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${feature.bgClass}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA Section - FULL WIDTH like landing page */}
      <div className="py-16 bg-gradient-construction text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-90" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Win More Construction Projects?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join 200+ construction companies already using our AI-powered platform
          </p>
          
          {/* ✅ WHITE BUTTON ON CONSTRUCTION GRADIENT */}
          <Button
            size="lg"
            className="bg-white text-construction hover:bg-blue-50 text-lg py-6 px-12 shadow-xl"
            onClick={() => activateTrialMutation.mutate()}
            disabled={isActivating}
          >
            {isActivating ? (
              <>
                <div className="w-5 h-5 border-2 border-construction border-t-transparent rounded-full animate-spin mr-3"></div>
                Starting Your Trial...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-3" />
                Start Free Trial Now
              </>
            )}
          </Button>
          
          <p className="text-sm text-blue-100 mt-6">
            14 days free • All features included • No setup fees • Built for construction
          </p>
        </div>
      </div>
    </div>
  );
}