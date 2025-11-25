// client/src/pages/pricing.tsx

import { usePageTitle } from "@/hooks/usePageTitle";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  X,
  ArrowLeft,
  Rocket,
  Zap,
  Crown,
  HardHat,
  ChevronDown,
  ChevronUp,
  Timer,
  CheckCircle,
  Loader2,
  Menu,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

interface TrialStatus {
  isTrialActive: boolean;
  daysLeft?: number;
  trialEndsAt?: string;
  hasUnlockedTrial?: boolean;
  subscriptionType?: string;
}

export default function Pricing() {
  usePageTitle("Pricing - AI Lead System");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch trial status
  const { data: trialStatus } = useQuery<TrialStatus>({
    queryKey: ["/api/user/trial-status"],
    enabled: isAuthenticated,
    retry: false,
  });

  const daysLeft = trialStatus?.daysLeft ?? 0;

  // Stripe checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, billingPeriod }: { plan: string; billingPeriod: string }) => {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, billingPeriod }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      return response.json();
    },
    onSuccess: async (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: "Failed to get checkout URL",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (tierName: string) => {
    if (!isAuthenticated) {
      setLocation("/signup");
      return;
    }

    if (tierName === "Enterprise") {
      window.location.href = "mailto:sales@yourdomain.com?subject=Enterprise Plan Inquiry";
      return;
    }

    const plan = tierName.toLowerCase();
    const billing = billingPeriod;

    checkoutMutation.mutate({ plan, billingPeriod: billing });
  };

  // Minimal pricing tiers
  const pricingTiers = [
    {
      name: "Starter",
      price: billingPeriod === "monthly" ? 97 : 970,
      period: billingPeriod === "monthly" ? "/mo" : "/yr",
      description: "Perfect for getting started",
      icon: <HardHat className="w-6 h-6" />,
      color: "from-slate-600 to-slate-700",
      features: [
        "1 Active Client",
        "500 Leads per month",
        "AI Lead Qualification",
        "WhatsApp Integration",
        "24/7 Auto-Responses",
        "Basic Analytics",
        "Email Support",
      ],
      cta: "Start Free Trial",
    },
    {
      name: "Professional",
      price: billingPeriod === "monthly" ? 297 : 2970,
      period: billingPeriod === "monthly" ? "/mo" : "/yr",
      description: "For growing businesses",
      icon: <Rocket className="w-6 h-6" />,
      color: "from-blue-600 to-orange-500",
      popular: true,
      badge: "MOST POPULAR",
      features: [
        "5 Active Clients",
        "2,000 Leads per month",
        "Everything in Starter",
        "VSL Generator (AI-powered)",
        "1-Click Meeting Booking",
        "Advanced Analytics",
        "Lead Temperature Scoring",
        "Automated Follow-ups",
        "Priority Support",
      ],
      cta: "Start Free Trial",
    },
    {
      name: "Enterprise",
      price: billingPeriod === "monthly" ? 797 : 7970,
      period: billingPeriod === "monthly" ? "/mo" : "/yr",
      description: "For established companies",
      icon: <Crown className="w-6 h-6" />,
      color: "from-purple-600 to-pink-600",
      badge: "BEST VALUE",
      features: [
        "Unlimited Clients",
        "Unlimited Leads",
        "Everything in Professional",
        "White Label Customization",
        "API Access",
        "Dedicated Account Manager",
        "Phone Support",
        "Custom Integrations",
        "99.9% SLA Guarantee",
      ],
      cta: "Contact Sales",
    },
  ];

  const faqs = [
    {
      question: "What happens after my 14-day free trial?",
      answer: "After your trial ends, choose any plan to continue. Your data is preserved. No credit card required to start.",
    },
    {
      question: "Can I change plans later?",
      answer: "Yes! Upgrade or downgrade anytime. Changes take effect immediately (upgrades) or at next billing cycle (downgrades).",
    },
    {
      question: "Do you offer refunds?",
      answer: "Yes! 30-day money-back guarantee. Not satisfied? Full refund, no questions asked.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "All major credit cards (Visa, Mastercard, Amex) via Stripe. All payments are secure and encrypted.",
    },
    {
      question: "Can I cancel anytime?",
      answer: "Absolutely. Cancel anytime from your account settings. No cancellation fees, no questions asked.",
    },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-construction" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-50 to-white ${isAuthenticated ? "flex flex-col" : ""}`}>
      {/* Header */}
      {!isAuthenticated ? (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-construction rounded-lg flex items-center justify-center">
                  <HardHat className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-base sm:text-xl font-bold text-slate-900">AI Lead System</span>
              </div>
              
              {/* Desktop buttons */}
              <div className="hidden sm:flex items-center space-x-3">
                <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
                  Home
                </Button>
                <Button size="sm" onClick={() => setLocation("/login")} className="bg-gradient-construction text-white">
                  Sign In
                </Button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 text-slate-600 hover:text-slate-900"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="sm:hidden py-4 space-y-2 border-t border-slate-200">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setLocation("/"); setMobileMenuOpen(false); }}
                  className="w-full justify-start"
                >
                  Home
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => { setLocation("/login"); setMobileMenuOpen(false); }}
                  className="w-full bg-gradient-construction text-white"
                >
                  Sign In
                </Button>
              </div>
            )}
          </div>
        </header>
      ) : (
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Upgrade Your Plan</h2>
              <p className="text-sm sm:text-base text-slate-600">Choose the perfect plan for your business</p>
            </div>
            {trialStatus?.isTrialActive && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 self-start sm:self-auto">
                <Timer className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                {daysLeft} {daysLeft === 1 ? "day" : "days"} left in trial
              </Badge>
            )}
          </div>
        </header>
      )}

      <main className={isAuthenticated ? "flex-1 overflow-auto" : ""}>
        {/* Trial Banner */}
        {isAuthenticated && trialStatus?.isTrialActive && (
          <section className="bg-gradient-to-r from-blue-50 to-orange-50 border-y-2 border-construction/20 py-4 sm:py-6 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0 sm:justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-construction rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">You're Currently on Free Trial</h3>
                  <p className="text-sm sm:text-base text-slate-600">
                    {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining • All Professional features included
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Breadcrumb - Only for authenticated users */}
        {isAuthenticated && (
          <div className="px-4 sm:px-6 pt-4 sm:pt-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => setLocation("/dashboard")}
                    className="cursor-pointer text-sm sm:text-base"
                  >
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm sm:text-base">Pricing</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        )}

        {/* Hero */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
          <div className={`text-center ${isAuthenticated ? "" : "max-w-4xl mx-auto"}`}>
            <Badge className="mb-4 sm:mb-6 bg-gradient-construction text-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
              🎉 14-Day Free Trial • No Credit Card Required
            </Badge>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 sm:mb-6">
              Simple Pricing for
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-orange-500">
                Construction Companies
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Stop losing projects to slow responses. AI that converts leads in under 2 minutes.
            </p>

            {/* Billing Toggle */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 px-4">
              <span className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-slate-900" : "text-slate-500"}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
                style={{ minHeight: '28px' }}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-construction-500 focus:ring-offset-2 ${
                  billingPeriod === "yearly" ? "bg-gradient-construction" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                    billingPeriod === "yearly" ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${billingPeriod === "yearly" ? "text-slate-900" : "text-slate-500"}`}>
                Yearly
              </span>
              {billingPeriod === "yearly" && <Badge className="bg-green-100 text-green-700 text-xs sm:text-sm">Save 20%</Badge>}
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6">
          <div className={isAuthenticated ? "" : "max-w-7xl mx-auto"}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {pricingTiers.map((tier, index) => (
                <Card
                  key={index}
                  className={`relative flex flex-col ${
                    tier.popular
                      ? "border-4 border-construction shadow-2xl lg:scale-105 z-10"
                      : "border-2 border-slate-200 hover:border-construction/50 transition-all"
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-construction text-white px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-bold shadow-lg">
                        {tier.badge}
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-6 sm:pb-8 pt-8 sm:pt-10 px-4 sm:px-6">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gradient-to-r ${tier.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      {tier.icon}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{tier.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 mb-4 sm:mb-6">{tier.description}</p>

                    <div className="mb-4 sm:mb-6">
                      <span className="text-4xl sm:text-5xl font-bold text-slate-900">${tier.price}</span>
                      <span className="text-sm sm:text-base text-slate-600">{tier.period}</span>
                    </div>

                    <Button
                      className={`w-full text-sm sm:text-base ${
                        tier.popular
                          ? "bg-gradient-construction hover:opacity-90 text-white shadow-xl"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                      size="lg"
                      onClick={() => handleUpgrade(tier.name)}
                      disabled={checkoutMutation.isPending}
                    >
                      {checkoutMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : isAuthenticated ? (
                        tier.name === "Enterprise" ? "Contact Sales" : `Upgrade to ${tier.name}`
                      ) : (
                        tier.cta
                      )}
                    </Button>

                    {billingPeriod === "yearly" && (
                      <p className="text-[10px] sm:text-xs text-green-600 mt-2 font-medium">
                        💰 Save ${(tier.price * 12 * 0.2).toFixed(0)}/year
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="pt-4 sm:pt-6 border-t border-slate-200 flex-1 px-4 sm:px-6">
                    <div className="space-y-2 sm:space-y-3">
                      {tier.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start space-x-2 sm:space-x-3">
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className={`text-xs sm:text-sm ${feature.includes("Everything") ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Simple Comparison */}
        <section className="py-12 sm:py-16 md:py-20 bg-slate-50 px-4 sm:px-6">
          <div className={isAuthenticated ? "" : "max-w-5xl mx-auto"}>
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">Compare Plans</h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-600">See what's included</p>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                    <tr>
                      <th className="text-left py-3 sm:py-4 px-4 sm:px-6 font-semibold text-slate-900 text-sm sm:text-base">Feature</th>
                      <th className="text-center py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-900 text-sm sm:text-base">Starter</th>
                      <th className="text-center py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-900 text-sm sm:text-base bg-construction/10">
                        Professional
                      </th>
                      <th className="text-center py-3 sm:py-4 px-3 sm:px-6 font-semibold text-slate-900 text-sm sm:text-base">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-700 text-xs sm:text-sm">Active Clients</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center text-slate-700 font-medium text-xs sm:text-sm">1</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center text-slate-700 font-medium text-xs sm:text-sm bg-construction/5">5</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center text-slate-700 font-medium text-xs sm:text-sm">Unlimited</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-700 text-xs sm:text-sm">Leads per Month</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center text-slate-700 font-medium text-xs sm:text-sm">500</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center text-slate-700 font-medium text-xs sm:text-sm bg-construction/5">2,000</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center text-slate-700 font-medium text-xs sm:text-sm">Unlimited</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-700 text-xs sm:text-sm">AI Qualification</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center"><Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" /></td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center bg-construction/5"><Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" /></td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center"><Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-700 text-xs sm:text-sm">VSL Generator</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center"><X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 mx-auto" /></td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center bg-construction/5"><Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" /></td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center"><Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-700 text-xs sm:text-sm">Meeting Booking</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center"><X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 mx-auto" /></td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center bg-construction/5"><Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" /></td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center"><Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-700 text-xs sm:text-sm">White Label</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center"><X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 mx-auto" /></td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center bg-construction/5"><X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 mx-auto" /></td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center"><Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-700 text-xs sm:text-sm">Support</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center text-slate-700 font-medium text-xs sm:text-sm">Email</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center text-slate-700 font-medium text-xs sm:text-sm bg-construction/5">Priority</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-center text-slate-700 font-medium text-xs sm:text-sm">24/7 + Phone</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
            
            {/* Mobile scroll hint */}
            <p className="text-xs text-slate-500 text-center mt-3 sm:hidden">
              ← Scroll to see all features →
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
          <div className={isAuthenticated ? "" : "max-w-3xl mx-auto"}>
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="border-2 hover:border-construction/50 transition-all">
                  <button
                    className="w-full text-left p-4 sm:p-6 flex items-center justify-between"
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  >
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 pr-4 sm:pr-8">{faq.question}</h3>
                    {expandedFaq === index ? (
                      <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 flex-shrink-0" />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                      <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12 sm:py-16 md:py-20 bg-gradient-construction text-white px-4 sm:px-6">
          <div className={`text-center ${isAuthenticated ? "" : "max-w-4xl mx-auto"}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">Ready to Close More Deals?</h2>
            <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-6 sm:mb-8">Start your 14-day free trial today. No credit card required.</p>
            <Button
              size="lg"
              className="bg-white text-construction hover:bg-blue-50 text-sm sm:text-base md:text-lg px-8 sm:px-12 py-5 sm:py-6 shadow-xl h-auto"
              onClick={() => setLocation("/signup")}
            >
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
              Start Free Trial
            </Button>
            <p className="text-xs sm:text-sm text-blue-100 mt-4 sm:mt-6">Join 200+ construction companies winning more projects</p>
          </div>
        </section>

        {/* Footer - Only for public users */}
        {!isAuthenticated && (
          <footer className="bg-slate-900 text-slate-300 py-8 sm:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-construction rounded-lg flex items-center justify-center">
                    <HardHat className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-white">AI Lead System</span>
                </div>
                <p className="text-xs sm:text-sm text-center sm:text-right">© 2025 AI Lead System. All rights reserved.</p>
              </div>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}