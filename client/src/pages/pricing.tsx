// client/src/pages/pricing.tsx

import { usePageTitle } from "@/hooks/usePageTitle";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  Rocket,
  Timer,
  CheckCircle,
  Loader2,
  Sparkles,
  CreditCard,
  Calendar,
  DollarSign,
  AlertCircle,
  Zap,
  Shield,
  TrendingUp,
  Lock,
  ChevronDown,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TrialStatus {
  isTrialActive: boolean;
  daysLeft?: number;
  trialEndsAt?: string;
  hasUnlockedTrial?: boolean;
  subscriptionType?: string;
}

interface Subscription {
  id: string;
  plan: string;
  billingPeriod: string;
  status: string;
  amount: number;
  currency: string;
  currentPeriodEnd: string;
  currentPeriodStart: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
}

export default function Pricing() {
  usePageTitle("Subscription - AI Lead System");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Fetch trial status
  const { data: trialStatus, isLoading: trialLoading } = useQuery<TrialStatus>({
    queryKey: ["/api/user/trial-status"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch subscription
  const { data: subscriptionData, isLoading: subLoading } = useQuery<{
    subscription: Subscription | null;
  }>({
    queryKey: ["/api/stripe/subscription"],
    enabled: isAuthenticated,
    retry: false,
  });

  const daysLeft = trialStatus?.daysLeft ?? 0;
  const subscription = subscriptionData?.subscription;

  // Stripe checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async ({ billingPeriod }: { billingPeriod: string }) => {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ billingPeriod }),
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

  const handleSubscribe = () => {
    checkoutMutation.mutate({ billingPeriod });
  };

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to cancel");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Canceled",
        description:
          "You'll still have access until the end of your billing period.",
      });
      window.location.reload();
    },
  });

  // Billing portal mutation
  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to open portal");
      return response.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const monthlyPrice = 297;
  const yearlyPrice = 2970;

  const faqs = [
    {
      question: "Can I cancel anytime?",
      answer:
        "Absolutely. You can cancel your subscription at any time with no penalties or hidden fees. Your access will continue until the end of your billing period.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards (Visa, MasterCard, American Express) and offer invoice-based billing for annual plans.",
    },
    {
      question: "Do you offer a free trial?",
      answer:
        "Yes! Start with a 7-day free trial with full access to all features. No credit card required to get started.",
    },
  ];

  // Loading state
  if (authLoading || trialLoading || subLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Skeleton className="h-4 w-48 mb-6" />
          <div className="max-w-7xl mx-auto space-y-6">
            <Card className="border-2">
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-lg">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="py-12">
              <div className="max-w-5xl mx-auto">
                <Skeleton className="h-8 w-64 mx-auto mb-4" />
                <Skeleton className="h-4 w-96 mx-auto mb-12" />
                <Card className="border-2">
                  <CardContent className="p-12">
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
        <div className="hidden md:block px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 truncate">
                Subscription & Billing
              </h2>
              <p className="text-sm lg:text-base text-slate-600 mt-1 truncate">
                Manage your subscription and payment methods
              </p>
            </div>
            {trialStatus?.isTrialActive && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2">
                <Timer className="w-4 h-4 mr-2" />
                {daysLeft} {daysLeft === 1 ? "day" : "days"} left in trial
              </Badge>
            )}
          </div>
        </div>

        <div className="md:hidden px-4 py-3 space-y-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              Subscription
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 truncate">
              Manage your plan
            </p>
          </div>
          {trialStatus?.isTrialActive && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-1.5 inline-flex">
              <Timer className="w-3 h-3 mr-1.5" />
              {daysLeft} {daysLeft === 1 ? "day" : "days"} left
            </Badge>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Breadcrumb - Matching analytics.tsx style */}
        <Breadcrumb className="mb-6">
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
              <BreadcrumbPage>Subscription</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Current Subscription Status - If Active */}
        {subscription && (
          <div className="mb-6">
            <Card className="border-2 border-construction/20 shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-construction" />
                      Your Current Plan
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Active subscription • Professional Plan
                    </CardDescription>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Subscription Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-600">Plan</span>
                    </div>
                    <p className="font-semibold text-lg capitalize">
                      {subscription.billingPeriod}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-600">Amount</span>
                    </div>
                    <p className="font-semibold text-lg">
                      ${(subscription.amount / 100).toFixed(0)}/
                      {subscription.billingPeriod === "monthly" ? "mo" : "yr"}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-600">
                        Next Billing
                      </span>
                    </div>
                    <p className="font-semibold text-lg">
                      {new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {subscription.cancelAtPeriodEnd && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-900">
                          Subscription Canceling
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Your subscription will end on{" "}
                          {new Date(
                            subscription.currentPeriodEnd
                          ).toLocaleDateString()}
                          . You'll still have access until then.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                  >
                    {portalMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Manage Payment Method
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                  >
                    View Billing History
                  </Button>

                  {!subscription.cancelAtPeriodEnd && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to cancel? You'll still have access until the end of your billing period."
                          )
                        ) {
                          cancelMutation.mutate();
                        }
                      }}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trial Progress - If On Trial */}
        {trialStatus?.isTrialActive && !subscription && (
          <div className="mb-6">
            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      Free Trial Active
                    </CardTitle>
                    <CardDescription className="mt-1 text-amber-700">
                      {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining •
                      All features unlocked
                    </CardDescription>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    <Timer className="w-3 h-3 mr-1" />
                    Trial
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      Trial Progress
                    </span>
                    <span className="text-sm font-semibold text-amber-600">
                      Day {7 - daysLeft} of 7
                    </span>
                  </div>
                  <Progress
                    value={((7 - daysLeft) / 7) * 100}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Pricing Section */}
        <div className="py-8 sm:py-8 bg-gradient-to-b from-slate-50 to-white -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-4">
                Simple, Transparent Pricing
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Everything You Need to Grow
              </h1>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                One powerful plan with all features included. No hidden fees, no
                surprises. Scale your business with confidence.
              </p>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span
                className={`text-base font-medium ${
                  billingPeriod === "monthly"
                    ? "text-slate-900"
                    : "text-slate-500"
                }`}
              >
                Monthly
              </span>
              <button
                onClick={() =>
                  setBillingPeriod(
                    billingPeriod === "monthly" ? "yearly" : "monthly"
                  )
                }
                style={{ minHeight: "28px" }}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-construction-500 focus:ring-offset-2 ${
                  billingPeriod === "yearly"
                    ? "bg-gradient-construction"
                    : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                    billingPeriod === "yearly"
                      ? "translate-x-8"
                      : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-base font-medium ${
                  billingPeriod === "yearly"
                    ? "text-slate-900"
                    : "text-slate-500"
                }`}
              >
                Yearly
              </span>
            </div>

            {/* Pricing Card */}
            <Card className="max-w-5xl mx-auto border-2 shadow-xl overflow-hidden relative">
              {/* Gradient Border Effect */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 rounded-lg"
                style={{ padding: "2px" }}
              >
                <div className="absolute inset-[2px] bg-white rounded-lg" />
              </div>

              <div className="relative">
                <div className="grid lg:grid-cols-2 gap-8 p-8 sm:p-12">
                  {/* Left Column */}
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                        Professional Plan
                      </h2>
                      <p className="text-slate-600">
                        Perfect for growing businesses and teams
                      </p>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-5xl sm:text-6xl font-bold text-slate-900">
                          $
                          {billingPeriod === "monthly"
                            ? monthlyPrice
                            : yearlyPrice}
                        </span>
                        <span className="text-xl text-slate-600">
                          /{billingPeriod === "monthly" ? "month" : "year"}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      onClick={handleSubscribe}
                      disabled={checkoutMutation.isPending}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg py-6"
                    >
                      {checkoutMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Start Free Trial"
                      )}
                    </Button>

                    <p className="text-center text-sm text-slate-600">
                      No credit card required • Cancel anytime
                    </p>

                    <div className="space-y-4 pt-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-1">
                            Lightning Fast Setup
                          </h3>
                          <p className="text-sm text-slate-600">
                            Get started in minutes, not hours
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-1">
                            Enterprise Security
                          </h3>
                          <p className="text-sm text-slate-600">
                            Bank-grade encryption & data protection
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-1">
                            Proven ROI
                          </h3>
                          <p className="text-sm text-slate-600">
                            Average 3x increase in conversions
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Features */}
                  <div className="lg:border-l lg:pl-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-6">
                      Everything Included
                    </h3>
                    <div className="space-y-3">
                      {[
                        "5 Active Clients",
                        "AI Lead Qualification",
                        "24/7 Auto-Responses",
                        "1-Click Meeting Booking",
                        "Lead Temperature Scoring",
                        "Priority Support",
                        "2,000 Leads/month",
                        "WhatsApp Integration",
                        "VSL Generator",
                        "Advanced Analytics",
                        "Automated Follow-ups",
                        "Video Tutorials",
                      ].map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-green-600" />
                          </div>
                          <span className="text-slate-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="py-16 bg-white -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <Collapsible
                  key={idx}
                  open={openFaq === idx}
                  onOpenChange={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <Card className="border-2 hover:border-slate-300 transition-colors">
                    <CollapsibleTrigger className="w-full">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-slate-900 text-left">
                            {faq.question}
                          </h3>
                          <ChevronDown
                            className={`w-5 h-5 text-slate-600 transition-transform ${
                              openFaq === idx ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 px-6 pb-6">
                        <p className="text-slate-600 leading-relaxed">
                          {faq.answer}
                        </p>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}