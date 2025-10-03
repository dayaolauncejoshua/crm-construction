// client/src/pages/trial-unlock.tsx

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
  Crown
} from "lucide-react";

// Add TypeScript interface for trial status
interface TrialStatus {
  isTrialActive: boolean;
  daysLeft?: number;
  trialEndsAt?: string;
}

export default function TrialUnlock() {
  const [isActivating, setIsActivating] = useState(false);
  const { toast } = useToast();

  // Check current user trial status - NOW PROPERLY TYPED
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
      toast({
        title: "🎉 Trial Activated!",
        description: `Your 14-day free trial is now active. Enjoy unlimited access to all features!`,
      });
      setIsActivating(false);
      // Redirect to dashboard after activation
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Activation Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsActivating(false);
    },
  });

  const features = [
    {
      icon: <MessageCircle className="w-6 h-6 text-blue-500" />,
      title: "AI-Powered Lead Qualification",
      description: "Sub-2-minute response times with intelligent conversation handling"
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-green-500" />,
      title: "Advanced Analytics & Reporting",
      description: "Real-time dashboards with automated executive summaries"
    },
    {
      icon: <Users className="w-6 h-6 text-purple-500" />,
      title: "Multi-Tenant Client Management",
      description: "Manage unlimited clients with white-label portals"
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-orange-500" />,
      title: "Competitor & SERP Monitoring",
      description: "Track top 50 keywords and competitor ad spend in real-time"
    },
    {
      icon: <Zap className="w-6 h-6 text-yellow-500" />,
      title: "Automated Follow-Up Sequences",
      description: "Multi-channel automation with WhatsApp, SMS, and email"
    },
    {
      icon: <Star className="w-6 h-6 text-red-500" />,
      title: "Brand Mention & Sentiment Analysis",
      description: "Monitor Reddit, social media, and web mentions with AI analysis"
    }
  ];

  const stats = [
    { label: "Average Response Time", value: "< 2 minutes", icon: <Clock className="w-5 h-5" /> },
    { label: "Lead Conversion Rate", value: "35%+", icon: <TrendingUp className="w-5 h-5" /> },
    { label: "Client Satisfaction", value: "98%", icon: <Star className="w-5 h-5" /> },
    { label: "Features Included", value: "50+", icon: <Rocket className="w-5 h-5" /> }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900">Trial Active!</CardTitle>
            <p className="text-slate-600 text-lg">Your free trial is currently running</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Timer className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-green-700">{daysLeft} days left</span>
              </div>
              <p className="text-green-600">
                Trial expires on {new Date(userStatus.trialEndsAt || '').toLocaleDateString()}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2 text-slate-600">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm text-slate-600">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex-1 bg-primary text-white hover:bg-primary/90"
                onClick={() => window.location.href = "/dashboard"}
              >
                Go to Dashboard
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = "/pricing"}
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-blue-200 rounded-full px-6 py-3 mb-6">
              <Gift className="w-5 h-5 text-blue-600" />
              <span className="text-blue-700 font-medium">Limited Time: 14-Day Free Trial</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Unlock the Future of
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> AI Lead Generation</span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              Experience the most advanced AI-powered lead generation system. 
              Sub-2-minute response times, automated qualification, and enterprise-grade analytics.
            </p>

            <div className="flex items-center justify-center space-x-8 mb-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm text-slate-600">{stat.label}</div>
                </div>
              ))}
            </div>

            <Card className="inline-block bg-white/80 backdrop-blur-sm border-2 border-blue-200 shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Crown className="w-8 h-8 text-yellow-500" />
                  <span className="text-2xl font-bold text-slate-900">Start Your Free Trial</span>
                </div>
                <p className="text-slate-600 mb-6 text-lg">
                  Full access to all premium features • No credit card required • Cancel anytime
                </p>
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg py-6"
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
                      <Rocket className="w-5 h-5 mr-3" />
                      Activate 14-Day Free Trial
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Everything You Need to Dominate Lead Generation
          </h2>
          <p className="text-xl text-slate-600">
            Powered by cutting-edge AI and enterprise-grade infrastructure
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                </div>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Lead Generation?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of businesses already using our AI-powered platform
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="bg-white text-blue-600 hover:bg-blue-50 text-lg py-6 px-12"
            onClick={() => activateTrialMutation.mutate()}
            disabled={isActivating}
          >
            {isActivating ? (
              <>
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                Starting Your Trial...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-3" />
                Start Free Trial Now
              </>
            )}
          </Button>
          <p className="text-sm text-blue-200 mt-4">
            14 days free • All features included • No setup fees
          </p>
        </div>
      </div>
    </div>
  );
}