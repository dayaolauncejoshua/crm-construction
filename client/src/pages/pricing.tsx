// client/src/pages/pricing.tsx

import { usePageTitle } from "@/hooks/usePageTitle";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext"; // ✅ Import auth
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  Check,
  X,
  HardHat,
  Rocket,
  Crown,
  Zap,
  Users,
  MessageCircle,
  Calendar,
  BarChart3,
  Play,
  FileText,
  Palette,
  Target,
  Shield,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Star,
  TrendingUp,
  Clock,
  ArrowLeft,
  Timer,
  CheckCircle,
} from "lucide-react";

interface TrialStatus {
  isTrialActive: boolean;
  daysLeft?: number;
  trialEndsAt?: string;
  hasUnlockedTrial?: boolean;
  subscriptionType?: string;
}

interface PricingTier {
  name: string;
  price: number;
  period: string;
  description: string;
  icon: JSX.Element;
  badge?: string;
  badgeColor?: string;
  features: string[];
  notIncluded?: string[];
  cta: string;
  popular?: boolean;
  gradient: string;
}

export default function Pricing() {
  usePageTitle("Pricing - AI Lead System");
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth(); // ✅ Check if user is logged in
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Fetch trial Status
  const { data: trialStatus } = useQuery<TrialStatus>({
    queryKey: ["/api/user/trial-status"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Calculate days left
  const daysLeft = trialStatus?.daysLeft ?? 0;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Skeleton header */}
        <header className="bg-white border-b border-slate-200 h-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-construction rounded-lg animate-pulse"></div>
              <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-9 w-20 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-9 w-24 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
        </header>

        {/* Loading content */}
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-construction border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Loading pricing...</p>
          </div>
        </div>
      </div>
    );
  }

  const pricingTiers: PricingTier[] = [
    {
      name: "Starter",
      price: billingPeriod === "monthly" ? 97 : 970,
      period: billingPeriod === "monthly" ? "/month" : "/year",
      description: "Perfect for small contractors getting started",
      icon: <HardHat className="w-6 h-6" />,
      gradient: "from-slate-500 to-slate-600",
      features: [
        "1 Active Client",
        "500 Leads/month",
        "AI-Powered Lead Qualification",
        "WhatsApp Integration",
        "Basic Analytics Dashboard",
        "Email Support",
        "Lead Capture Forms",
        "Automated Responses (24/7)",
      ],
      notIncluded: [
        "VSL Generator",
        "Advanced Analytics",
        "Priority Support",
        "White Label",
        "API Access",
      ],
      cta: "Start Free Trial",
    },
    {
      name: "Professional",
      price: billingPeriod === "monthly" ? 297 : 2970,
      period: billingPeriod === "monthly" ? "/month" : "/year",
      description: "For growing construction businesses",
      icon: <Rocket className="w-6 h-6" />,
      badge: "MOST POPULAR",
      badgeColor: "bg-gradient-construction",
      popular: true,
      gradient: "from-blue-600 to-orange-500",
      features: [
        "5 Active Clients",
        "2,000 Leads/month",
        "Everything in Starter, plus:",
        "VSL Generator (AI-powered)",
        "One-Click Meeting Scheduling",
        "Advanced Analytics & Reports",
        "Video SOPs Library",
        "Priority Email Support",
        "Custom Branding",
        "Multi-Channel Integration",
        "Lead Temperature Scoring",
        "Automated Follow-ups",
      ],
      notIncluded: [
        "White Label Portal",
        "Monitoring Dashboard",
        "Dedicated Account Manager",
      ],
      cta: "Start Free Trial",
    },
    {
      name: "Enterprise",
      price: billingPeriod === "monthly" ? 797 : 7970,
      period: billingPeriod === "monthly" ? "/month" : "/year",
      description: "For established companies & agencies",
      icon: <Crown className="w-6 h-6" />,
      badge: "BEST VALUE",
      badgeColor: "bg-gradient-to-r from-yellow-500 to-amber-600",
      gradient: "from-purple-600 to-pink-600",
      features: [
        "Unlimited Clients",
        "Unlimited Leads",
        "Everything in Professional, plus:",
        "White Label Customization",
        "Competitor Monitoring",
        "SERP Tracking (50 keywords)",
        "Brand Mention Alerts",
        "API Access",
        "Dedicated Account Manager",
        "Phone Support",
        "Custom Integrations",
        "Advanced Automation",
        "Executive Reports",
        "SLA Guarantee (99.9% uptime)",
      ],
      cta: "Contact Sales",
    },
  ];

  const comparisonFeatures = [
    {
      category: "Lead Management",
      features: [
        {
          name: "Active Clients",
          starter: "1",
          pro: "5",
          enterprise: "Unlimited",
        },
        {
          name: "Leads per Month",
          starter: "500",
          pro: "2,000",
          enterprise: "Unlimited",
        },
        {
          name: "Lead Qualification (AI)",
          starter: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "Temperature Scoring",
          starter: false,
          pro: true,
          enterprise: true,
        },
        {
          name: "Lead Tags & Notes",
          starter: true,
          pro: true,
          enterprise: true,
        },
      ],
    },
    {
      category: "Communication",
      features: [
        {
          name: "WhatsApp Integration",
          starter: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "Email Integration",
          starter: false,
          pro: true,
          enterprise: true,
        },
        {
          name: "SMS Integration",
          starter: false,
          pro: true,
          enterprise: true,
        },
        {
          name: "Automated Responses (24/7)",
          starter: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "Multi-Channel Support",
          starter: false,
          pro: true,
          enterprise: true,
        },
      ],
    },
    {
      category: "Features",
      features: [
        {
          name: "Meeting Scheduling",
          starter: false,
          pro: true,
          enterprise: true,
        },
        { name: "VSL Generator", starter: false, pro: true, enterprise: true },
        { name: "Video SOPs", starter: false, pro: true, enterprise: true },
        {
          name: "White Label Portal",
          starter: false,
          pro: false,
          enterprise: true,
        },
        { name: "API Access", starter: false, pro: false, enterprise: true },
      ],
    },
    {
      category: "Analytics & Monitoring",
      features: [
        { name: "Basic Analytics", starter: true, pro: true, enterprise: true },
        {
          name: "Advanced Reports",
          starter: false,
          pro: true,
          enterprise: true,
        },
        {
          name: "Executive Summaries",
          starter: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "Competitor Tracking",
          starter: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "SERP Monitoring",
          starter: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
    {
      category: "Support",
      features: [
        {
          name: "Email Support",
          starter: "Standard",
          pro: "Priority",
          enterprise: "24/7",
        },
        { name: "Phone Support", starter: false, pro: false, enterprise: true },
        {
          name: "Dedicated Manager",
          starter: false,
          pro: false,
          enterprise: true,
        },
        { name: "Response Time", starter: "48h", pro: "24h", enterprise: "4h" },
      ],
    },
  ];

  const faqs = [
    {
      question: "What happens after my 14-day free trial?",
      answer:
        "After your trial ends, you can choose any plan to continue. Your data and settings are preserved. If you don't select a plan, your account will be paused (not deleted) and you can reactivate anytime.",
    },
    {
      question: "Can I change plans later?",
      answer:
        "Yes! You can upgrade or downgrade at any time. When upgrading, you get immediate access to new features. When downgrading, changes take effect at your next billing cycle.",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "Yes! We offer a 30-day money-back guarantee. If you're not satisfied for any reason within the first 30 days, we'll refund your payment in full.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and ACH bank transfers for annual plans. All payments are processed securely through Stripe.",
    },
    {
      question: "Is there a setup fee?",
      answer:
        "No! There are no setup fees, hidden costs, or long-term contracts. You only pay the monthly or annual subscription fee.",
    },
    {
      question: "Can I cancel anytime?",
      answer:
        "Absolutely. You can cancel your subscription at any time from your account settings. No questions asked, no cancellation fees.",
    },
    {
      question: "What if I need more leads than my plan includes?",
      answer:
        "You can easily upgrade to a higher tier, or we offer overflow pricing at $0.15 per additional lead. Enterprise customers get unlimited leads.",
    },
    {
      question: "Do you offer custom enterprise solutions?",
      answer:
        "Yes! For large organizations with specific needs, we offer custom solutions. Contact our sales team to discuss your requirements.",
    },
  ];

  const testimonials = [
    {
      name: "Mike Rodriguez",
      company: "Rodriguez Construction",
      role: "Owner",
      image: "MR",
      quote:
        "We've closed $450K in new projects in just 3 months. The AI responds faster than any human could, and the quality of leads is incredible.",
      rating: 5,
    },
    {
      name: "Sarah Chen",
      company: "Urban Renovations",
      role: "Project Manager",
      image: "SC",
      quote:
        "The VSL Generator alone paid for the subscription. We're getting 5x more qualified leads than before, and our team saves 10+ hours per week.",
      rating: 5,
    },
    {
      name: "David Thompson",
      company: "Thompson & Sons Builders",
      role: "CEO",
      image: "DT",
      quote:
        "Best investment we've made this year. The ROI is insane - we're booking meetings with serious buyers, not tire-kickers.",
      rating: 5,
    },
  ];

  // ✅ CONDITIONAL RENDERING BASED ON AUTH STATUS
  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-slate-50 to-white ${
        isAuthenticated ? "flex-1 flex flex-col overflow-hidden" : ""
      }`}
    >
      {/* ✅ DIFFERENT HEADERS FOR LOGGED IN vs PUBLIC */}
      {!isAuthenticated ? (
        // PUBLIC HEADER - Full navigation
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-construction rounded-lg flex items-center justify-center shadow-lg">
                  <HardHat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    AI Lead System
                  </h1>
                  <p className="text-xs text-slate-600">For Construction</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="ghost" onClick={() => setLocation("/")}>
                  Home
                </Button>
                <Button
                  onClick={() => setLocation("/login")}
                  className="bg-gradient-construction hover:opacity-90 text-white"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </header>
      ) : (
        // LOGGED-IN HEADER - Simple header with back button
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div className="border-l border-slate-200 pl-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  Upgrade Your Plan
                </h2>
                <p className="text-slate-600">
                  Choose the perfect plan for your business
                </p>
              </div>
            </div>
            {/* TRIAL STATUS BADGE IN HEADER */}
            {trialStatus?.isTrialActive && (
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <Timer className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Trial Active: {daysLeft}{" "}
                        {daysLeft === 1 ? "day" : "days"} left
                      </p>
                      <p className="text-xs text-amber-700">
                        Expires{" "}
                        {new Date(
                          trialStatus.trialEndsAt!
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      {/* MAIN CONTENT - Same for both */}
      <main className={isAuthenticated ? "flex-1 overflow-auto" : ""}>
        {/* TRIAL STATUS BANNER FOR LOGGED-IN USERS */}
        {isAuthenticated && trialStatus?.isTrialActive && (
          <section className="bg-gradient-to-r from-blue-50 to-orange-50 border-y-2 border-construction/20 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-construction rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      You're Currently on Free Trial
                    </h3>
                    <p className="text-slate-600">
                      {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining •
                      All Professional features included • No credit card
                      required
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className="bg-gradient-construction text-white px-4 py-2">
                    <Timer className="w-4 h-4 mr-2" />
                    {daysLeft} Days Left
                  </Badge>
                </div>
              </div>
            </div>
          </section>
        )}
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-gradient-construction text-white">
              🎉 14-Day Free Trial • No Credit Card Required
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
              Simple, Transparent
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-orange-500">
                Pricing for Construction
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Stop losing $100K+ projects to slow responses. Choose the perfect
              plan for your business and start converting leads in under 2
              minutes.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-12">
              <span
                className={`text-sm font-medium ${
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  billingPeriod === "yearly"
                    ? "bg-gradient-construction"
                    : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingPeriod === "yearly"
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium ${
                  billingPeriod === "yearly"
                    ? "text-slate-900"
                    : "text-slate-500"
                }`}
              >
                Yearly
              </span>
              {billingPeriod === "yearly" && (
                <Badge className="bg-green-100 text-green-700">Save 20%</Badge>
              )}
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pricingTiers.map((tier, index) => (
                <Card
                  key={index}
                  className={`relative ${
                    tier.popular
                      ? "border-4 border-construction shadow-2xl scale-105 z-10"
                      : "border-2 border-slate-200 hover:border-construction/50 transition-all"
                  }
                  ${
                    // ✅ Highlight current trial plan
                    isAuthenticated &&
                    trialStatus?.isTrialActive &&
                    tier.name === "Professional"
                      ? "ring-4 ring-amber-300 ring-opacity-50"
                      : ""
                  }
                  `}
                >
                  {/* ✅ Show "Current Plan" badge for trial users on Professional tier */}
                  {isAuthenticated &&
                    trialStatus?.isTrialActive &&
                    tier.name === "Professional" && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-1 text-xs font-bold shadow-lg">
                          YOUR TRIAL PLAN
                        </Badge>
                      </div>
                    )}
                  {tier.badge && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge
                        className={`${tier.badgeColor} text-white px-4 py-1 text-xs font-bold shadow-lg`}
                      >
                        {tier.badge}
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-8 pt-10">
                    <div
                      className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-r ${tier.gradient} rounded-xl flex items-center justify-center text-white shadow-lg`}
                    >
                      {tier.icon}
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-sm text-slate-600 mb-6">
                      {tier.description}
                    </p>

                    {/* ✅ Show "Currently Testing" for trial users */}
                    {isAuthenticated &&
                      trialStatus?.isTrialActive &&
                      tier.name === "Professional" && (
                        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-semibold text-green-800 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            You're currently testing this plan!
                          </p>
                        </div>
                      )}

                    <div className="mb-6">
                      <span className="text-5xl font-bold text-slate-900">
                        ${tier.price}
                      </span>
                      <span className="text-slate-600">{tier.period}</span>
                    </div>

                    <Button
                      className={`w-full ${
                        tier.popular
                          ? "bg-gradient-construction hover:opacity-90 text-white shadow-xl"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                      size="lg"
                      onClick={() => {
                        // ✅ Different action based on auth status
                        if (isAuthenticated) {
                          // TODO: Open Stripe checkout for this plan
                          console.log("Upgrade to:", tier.name);
                          alert(
                            `Stripe integration coming soon! Plan: ${tier.name}`
                          );
                        } else {
                          setLocation("/signup");
                        }
                      }}
                    >
                      {isAuthenticated
                        ? tier.name === "Enterprise"
                          ? "Contact Sales"
                          : `Upgrade to ${tier.name}`
                        : tier.cta}
                    </Button>

                    {/* ✅ Show savings for yearly billing */}
                    {billingPeriod === "yearly" && (
                      <p className="text-xs text-green-600 mt-2 font-medium">
                        💰 Save ${(tier.price * 12 * 0.2).toFixed(0)}/year
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="pt-6 border-t border-slate-200">
                    <div className="space-y-4">
                      {tier.features.map((feature, featureIndex) => (
                        <div
                          key={featureIndex}
                          className="flex items-start space-x-3"
                        >
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span
                            className={`text-sm ${
                              feature.includes("plus:") ||
                              feature.includes("in")
                                ? "font-semibold text-slate-900"
                                : "text-slate-700"
                            }`}
                          >
                            {feature}
                          </span>
                        </div>
                      ))}

                      {tier.notIncluded && tier.notIncluded.length > 0 && (
                        <>
                          <div className="border-t border-slate-200 my-4"></div>
                          {tier.notIncluded.map((feature, featureIndex) => (
                            <div
                              key={featureIndex}
                              className="flex items-start space-x-3"
                            >
                              <X className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-slate-400">
                                {feature}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Compare Plans
              </h2>
              <p className="text-xl text-slate-600">
                See exactly what's included in each plan
              </p>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-slate-900">
                        Features
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-slate-900">
                        Starter
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-slate-900 bg-construction/10">
                        <div className="flex flex-col items-center">
                          <span>Professional</span>
                          <Badge className="mt-1 bg-gradient-construction text-white text-xs">
                            Popular
                          </Badge>
                        </div>
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-slate-900">
                        Enterprise
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {comparisonFeatures.map((category, categoryIndex) => (
                      <React.Fragment key={`category-group-${categoryIndex}`}>
                        <tr className="bg-slate-100">
                          <td
                            colSpan={4}
                            className="py-3 px-6 font-bold text-slate-900 text-sm uppercase tracking-wider"
                          >
                            {category.category}
                          </td>
                        </tr>
                        {category.features.map((feature, featureIndex) => (
                          <tr
                            key={`feature-${categoryIndex}-${featureIndex}`}
                            className="border-b border-slate-200 hover:bg-slate-50"
                          >
                            <td className="py-4 px-6 text-slate-700">
                              {feature.name}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {typeof feature.starter === "boolean" ? (
                                feature.starter ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-slate-300 mx-auto" />
                                )
                              ) : (
                                <span className="text-slate-700 font-medium">
                                  {feature.starter}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center bg-construction/5">
                              {typeof feature.pro === "boolean" ? (
                                feature.pro ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-slate-300 mx-auto" />
                                )
                              ) : (
                                <span className="text-slate-700 font-medium">
                                  {feature.pro}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {typeof feature.enterprise === "boolean" ? (
                                feature.enterprise ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-slate-300 mx-auto" />
                                )
                              ) : (
                                <span className="text-slate-700 font-medium">
                                  {feature.enterprise}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Trusted by 200+ Construction Companies
              </h2>
              <p className="text-xl text-slate-600">
                See what our customers are saying
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card
                  key={index}
                  className="border-2 hover:border-construction/50 transition-all"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 text-yellow-500 fill-yellow-500"
                        />
                      ))}
                    </div>
                    <p className="text-slate-700 mb-6 italic">
                      "{testimonial.quote}"
                    </p>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-construction rounded-full flex items-center justify-center text-white font-bold">
                        {testimonial.image}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {testimonial.name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {testimonial.role}
                        </p>
                        <p className="text-sm text-slate-500">
                          {testimonial.company}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-slate-600">
                Everything you need to know
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card
                  key={index}
                  className="border-2 hover:border-construction/50 transition-all"
                >
                  <button
                    className="w-full text-left p-6 flex items-center justify-between"
                    onClick={() =>
                      setExpandedFaq(expandedFaq === index ? null : index)
                    }
                  >
                    <h3 className="text-lg font-semibold text-slate-900 pr-8">
                      {faq.question}
                    </h3>
                    {expandedFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <div className="px-6 pb-6">
                      <p className="text-slate-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="py-12 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-12 text-slate-600">
              <div className="flex items-center space-x-2">
                <Shield className="w-6 h-6 text-green-600" />
                <span className="font-medium">256-bit SSL Secure</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-6 h-6 text-green-600" />
                <span className="font-medium">30-Day Money Back</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-6 h-6 text-green-600" />
                <span className="font-medium">Cancel Anytime</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                <span className="font-medium">4.9/5 Rating</span>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-construction text-white">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Close More Construction Deals?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Start your 14-day free trial today. No credit card required.
            </p>
            <Button
              size="lg"
              className="bg-white text-construction hover:bg-blue-50 text-lg px-12 py-6 shadow-xl"
              onClick={() => setLocation("/signup")}
            >
              <Rocket className="w-5 h-5 mr-3" />
              Start Free Trial
            </Button>
            <p className="text-sm text-blue-100 mt-6">
              Join 200+ construction companies already winning more projects
            </p>
          </div>
        </section>

        {/* Footer - Only show for public users */}
        {!isAuthenticated && (
          <footer className="bg-slate-900 text-slate-300 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-4 gap-8 mb-8">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-construction rounded-lg flex items-center justify-center">
                      <HardHat className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-white">AI Lead System</span>
                  </div>
                  <p className="text-sm">
                    AI-powered lead generation for construction companies.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-4">Product</h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a href="/pricing" className="hover:text-white">
                        Pricing
                      </a>
                    </li>
                    <li>
                      <a href="#" className="hover:text-white">
                        Features
                      </a>
                    </li>
                    <li>
                      <a href="#" className="hover:text-white">
                        Demo
                      </a>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-4">Company</h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a href="#" className="hover:text-white">
                        About
                      </a>
                    </li>
                    <li>
                      <a href="#" className="hover:text-white">
                        Contact
                      </a>
                    </li>
                    <li>
                      <a href="#" className="hover:text-white">
                        Support
                      </a>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-4">Legal</h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a href="#" className="hover:text-white">
                        Privacy Policy
                      </a>
                    </li>
                    <li>
                      <a href="#" className="hover:text-white">
                        Terms of Service
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-8 text-center text-sm">
                <p>© 2025 AI Lead System. All rights reserved.</p>
              </div>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}
