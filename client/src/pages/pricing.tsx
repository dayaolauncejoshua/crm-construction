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
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-construction rounded-lg flex items-center justify-center">
                  <HardHat className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">AI Lead System</span>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="ghost" onClick={() => setLocation("/")}>
                  Home
                </Button>
                <Button onClick={() => setLocation("/login")} className="bg-gradient-construction text-white">
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </header>
      ) : (
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Upgrade Your Plan</h2>
              <p className="text-slate-600">Choose the perfect plan for your business</p>
            </div>
            {trialStatus?.isTrialActive && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2">
                <Timer className="w-4 h-4 mr-2" />
                {daysLeft} {daysLeft === 1 ? "day" : "days"} left in trial
              </Badge>
            )}
          </div>
        </header>
      )}

      <main className={isAuthenticated ? "flex-1 overflow-auto" : ""}>
        {/* Trial Banner */}
        {isAuthenticated && trialStatus?.isTrialActive && (
          <section className="bg-gradient-to-r from-blue-50 to-orange-50 border-y-2 border-construction/20 py-6 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-construction rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">You're Currently on Free Trial</h3>
                  <p className="text-slate-600">
                    {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining • All Professional features included
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Breadcrumb - Only for authenticated users */}
        {isAuthenticated && (
          <div className="px-4 sm:px-6 pt-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => setLocation("/dashboard")}
                    className="cursor-pointer"
                  >
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Pricing</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        )}

        {/* Hero */}
        <section className="py-20 px-4 sm:px-6">
          <div className={`text-center ${isAuthenticated ? "" : "max-w-4xl mx-auto"}`}>
            <Badge className="mb-6 bg-gradient-construction text-white px-4 py-2">
              🎉 14-Day Free Trial • No Credit Card Required
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
              Simple Pricing for
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-orange-500">
                Construction Companies
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Stop losing projects to slow responses. AI that converts leads in under 2 minutes.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-12">
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
              {billingPeriod === "yearly" && <Badge className="bg-green-100 text-green-700">Save 20%</Badge>}
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-20 px-4 sm:px-6">
          <div className={isAuthenticated ? "" : "max-w-7xl mx-auto"}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pricingTiers.map((tier, index) => (
                <Card
                  key={index}
                  className={`relative flex flex-col ${
                    tier.popular
                      ? "border-4 border-construction shadow-2xl scale-105 z-10"
                      : "border-2 border-slate-200 hover:border-construction/50 transition-all"
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-construction text-white px-4 py-1 text-xs font-bold shadow-lg">
                        {tier.badge}
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-8 pt-10">
                    <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-r ${tier.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      {tier.icon}
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{tier.name}</h3>
                    <p className="text-sm text-slate-600 mb-6">{tier.description}</p>

                    <div className="mb-6">
                      <span className="text-5xl font-bold text-slate-900">${tier.price}</span>
                      <span className="text-slate-600">{tier.period}</span>
                    </div>

                    <Button
                      className={`w-full ${
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
                      <p className="text-xs text-green-600 mt-2 font-medium">
                        💰 Save ${(tier.price * 12 * 0.2).toFixed(0)}/year
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="pt-6 border-t border-slate-200 flex-1">
                    <div className="space-y-3">
                      {tier.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start space-x-3">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className={`text-sm ${feature.includes("Everything") ? "font-semibold text-slate-900" : "text-slate-700"}`}>
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
        <section className="py-20 bg-slate-50 px-4 sm:px-6">
          <div className={isAuthenticated ? "" : "max-w-5xl mx-auto"}>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Compare Plans</h2>
              <p className="text-xl text-slate-600">See what's included</p>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-slate-900">Feature</th>
                      <th className="text-center py-4 px-6 font-semibold text-slate-900">Starter</th>
                      <th className="text-center py-4 px-6 font-semibold text-slate-900 bg-construction/10">
                        Professional
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-slate-900">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-4 px-6 text-slate-700">Active Clients</td>
                      <td className="py-4 px-6 text-center text-slate-700 font-medium">1</td>
                      <td className="py-4 px-6 text-center text-slate-700 font-medium bg-construction/5">5</td>
                      <td className="py-4 px-6 text-center text-slate-700 font-medium">Unlimited</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-4 px-6 text-slate-700">Leads per Month</td>
                      <td className="py-4 px-6 text-center text-slate-700 font-medium">500</td>
                      <td className="py-4 px-6 text-center text-slate-700 font-medium bg-construction/5">2,000</td>
                      <td className="py-4 px-6 text-center text-slate-700 font-medium">Unlimited</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-4 px-6 text-slate-700">AI Qualification</td>
                      <td className="py-4 px-6 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                      <td className="py-4 px-6 text-center bg-construction/5"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                      <td className="py-4 px-6 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-4 px-6 text-slate-700">VSL Generator</td>
                      <td className="py-4 px-6 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                      <td className="py-4 px-6 text-center bg-construction/5"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                      <td className="py-4 px-6 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-4 px-6 text-slate-700">Meeting Booking</td>
                      <td className="py-4 px-6 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                      <td className="py-4 px-6 text-center bg-construction/5"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                      <td className="py-4 px-6 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-4 px-6 text-slate-700">White Label</td>
                      <td className="py-4 px-6 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                      <td className="py-4 px-6 text-center bg-construction/5"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                      <td className="py-4 px-6 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-4 px-6 text-slate-700">Support</td>
                      <td className="py-4 px-6 text-center text-slate-700 font-medium">Email</td>
                      <td className="py-4 px-6 text-center text-slate-700 font-medium bg-construction/5">Priority</td>
                      <td className="py-4 px-6 text-center text-slate-700 font-medium">24/7 + Phone</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 sm:px-6">
          <div className={isAuthenticated ? "" : "max-w-3xl mx-auto"}>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="border-2 hover:border-construction/50 transition-all">
                  <button
                    className="w-full text-left p-6 flex items-center justify-between"
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  >
                    <h3 className="text-lg font-semibold text-slate-900 pr-8">{faq.question}</h3>
                    {expandedFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <div className="px-6 pb-6">
                      <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-construction text-white px-4 sm:px-6">
          <div className={`text-center ${isAuthenticated ? "" : "max-w-4xl mx-auto"}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Close More Deals?</h2>
            <p className="text-xl text-blue-100 mb-8">Start your 14-day free trial today. No credit card required.</p>
            <Button
              size="lg"
              className="bg-white text-construction hover:bg-blue-50 text-lg px-12 py-6 shadow-xl"
              onClick={() => setLocation("/signup")}
            >
              <Rocket className="w-5 h-5 mr-3" />
              Start Free Trial
            </Button>
            <p className="text-sm text-blue-100 mt-6">Join 200+ construction companies winning more projects</p>
          </div>
        </section>

        {/* Footer - Only for public users */}
        {!isAuthenticated && (
          <footer className="bg-slate-900 text-slate-300 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-construction rounded-lg flex items-center justify-center">
                    <HardHat className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-white">AI Lead System</span>
                </div>
                <p className="text-sm">© 2025 AI Lead System. All rights reserved.</p>
              </div>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}