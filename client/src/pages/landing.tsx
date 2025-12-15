// client/src/pages/landing.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  Check,
  Users,
  TrendingUp,
  Clock,
  Zap,
  Shield,
  MessageCircle,
  Calendar,
  Target,
  HardHat,
  Building2,
  Wrench,
  ArrowRight,
  Menu,
  X,
  Rocket,
  Star, 
  Sparkles,
  Badge,
  ChevronDown
} from "lucide-react";

export default function Landing() {
  usePageTitle("AI Lead System - Intelligent CRM for Construction", false);
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  

  // ✅ Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log("✅ [LANDING] User authenticated, redirecting to dashboard");
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // ✅ Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ✅ Don't render if authenticated (prevents flash)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header />
      <HeroSection />
      <TrustedBySection />
      <HowItWorksSection />
      <LeadCaptureSection />
      <FeaturesSection />
      <StatsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-construction rounded-lg flex items-center justify-center shadow-lg">
              <HardHat className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-foreground">
                AI Lead System
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">
                For Construction
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Pricing
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden sm:flex items-center space-x-2 sm:space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/login")}
              className="text-sm"
            >
              Login
            </Button>
            <Button
              size="sm"
              onClick={() => (window.location.href = "/signup")}
              className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white shadow-xl hover:shadow-2xl transition-all px-4 sm:px-8 text-sm"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-border">
            <a
              href="#features"
              className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </a>
            <button
              onClick={() => {
                window.location.href = "/pricing";
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors"
            >
              Pricing
            </button>
            <div className="px-4 pt-3 space-y-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/login")}
                className="w-full"
              >
                Login
              </Button>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/signup")}
                className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white"
              >
                Get Started
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="pt-20 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 mb-4 sm:mb-6">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">
                #1 AI Lead System for Construction
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4 sm:mb-6">
              Stop Losing
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-orange-500">
                $100K+ Projects
              </span>
              to Slow Responses
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
              AI-powered lead qualification system that responds in under 2
              minutes, qualifies prospects 24/7, and books meetings with one
              click to help you close more deals.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 justify-center lg:justify-start">
              <Button
                size="lg"
                onClick={() => (window.location.href = "/signup")}
                className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white shadow-xl hover:shadow-2xl transition-all text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-auto"
              >
                Get Started Now
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                <span>Setup in 10 minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                <span>No contracts</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative mt-8 lg:mt-0">
            {/* Main Card - Dashboard Preview */}
            <Card className="shadow-2xl border-2 overflow-hidden">
              <div className="bg-gradient-construction p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="text-white">
                      <p className="text-sm sm:text-base font-semibold">AI Assistant Active</p>
                      <p className="text-[10px] sm:text-xs text-white/80">
                        Responding in real-time
                      </p>
                    </div>
                  </div>
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-success rounded-full animate-pulse"></div>
                </div>
              </div>

              <CardContent className="p-4 sm:p-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-success/10 border border-success/20 rounded-lg p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl font-bold text-success">47</div>
                    <div className="text-[10px] sm:text-xs text-success/80">
                      Hot Leads Today
                    </div>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl font-bold text-primary">98%</div>
                    <div className="text-[10px] sm:text-xs text-primary/80">
                      AI Qualification
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-muted/50 rounded-lg border">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-success rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                        Meeting booked: John Smith
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        Commercial renovation - $250K
                      </p>
                    </div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                      2m
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-muted/50 rounded-lg border">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                        AI qualified: Sarah Johnson
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        Residential build - Hot lead
                      </p>
                    </div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                      5m
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-muted/50 rounded-lg border">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-construction rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                        New inquiry: Mike Chen
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        Kitchen remodel inquiry
                      </p>
                    </div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                      8m
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Floating Badge - Hidden on mobile */}
            <div className="hidden sm:block absolute -top-4 -right-4 bg-card rounded-xl shadow-xl border-2 border-construction/20 p-3 sm:p-4 rotate-3">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-construction">
                  2 min
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">
                  Avg Response
                </div>
              </div>
            </div>

            {/* Decorative Elements - Hidden on mobile */}
            <div className="hidden sm:block absolute -bottom-8 -left-8 w-24 h-24 sm:w-32 sm:h-32 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="hidden sm:block absolute -top-8 -right-8 w-24 h-24 sm:w-32 sm:h-32 bg-construction/20 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustedBySection() {
  return (
    <section className="py-8 sm:py-12 bg-card border-y">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs sm:text-sm font-medium text-muted-foreground mb-6 sm:mb-8">
          Trusted by 200+ construction companies nationwide
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-6 sm:gap-12 opacity-60">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">BuildPro</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Construction</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <HardHat className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">Apex Builders</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Residential</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">Elite Remodeling</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Commercial</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      icon: MessageCircle,
      title: "Lead Comes In",
      description:
        "Prospect reaches out via WhatsApp, website, or ad. AI responds in under 2 minutes.",
      colorClass: "bg-primary text-primary-foreground",
      bgClass: "bg-primary/10",
      iconColorClass: "text-primary",
    },
    {
      number: "2",
      icon: Target,
      title: "AI Qualifies",
      description:
        "Smart questions determine budget, timeline, and project scope automatically.",
      colorClass: "bg-construction text-white",
      bgClass: "bg-construction/10",
      iconColorClass: "text-construction",
    },
    {
      number: "3",
      icon: Calendar,
      title: "Hot Lead Handoff",
      description:
        "Qualified leads are instantly flagged for you. Book meetings with one click and close more deals.",
      colorClass: "bg-success text-success-foreground",
      bgClass: "bg-success/10",
      iconColorClass: "text-success",
    },
  ];

  return (
    <section id="how-it-works" className="py-12 sm:py-16 md:py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            How It Works
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            From inquiry to qualified lead in minutes, not hours
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {steps.map((step, index) => (
            <div key={index} className="relative flex">
              <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg h-full w-full">
                <CardContent className="p-6 sm:p-8 flex flex-col h-full">
                  {/* Number and Icon - SIDE BY SIDE at top */}
                  <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
                    {/* Number Badge */}
                    <div
                      className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full font-bold text-base sm:text-lg ${step.colorClass} shadow-lg`}
                    >
                      {step.number}
                    </div>
                    {/* Icon */}
                    <div
                      className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${step.bgClass}`}
                    >
                      <step.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${step.iconColorClass}`} />
                    </div>
                  </div>

                  {/* Content - Centered and grows to fill space */}
                  <div className="flex flex-col flex-1 text-center">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Arrow Between Cards - Hidden on mobile & tablet */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <div className="bg-white rounded-full p-2 shadow-lg border border-slate-200">
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Clock,
      title: "Sub-2-Minute Response",
      description:
        "AI responds instantly while competitors take hours. Capture leads before they move on.",
      bgClass: "bg-primary/10",
      iconColorClass: "text-primary",
    },
    {
      icon: Target,
      title: "Smart Qualification",
      description:
        "AI asks the right questions about budget, timeline, and project scope automatically.",
      bgClass: "bg-construction/10",
      iconColorClass: "text-construction",
    },
    {
      icon: Calendar,
      title: "One-Click Meeting Scheduling",
      description:
        "Qualified leads come with all the details. Book meetings instantly through your calendar with automated confirmations.",
      bgClass: "bg-success/10",
      iconColorClass: "text-success",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Native",
      description:
        "Prospects prefer WhatsApp. Meet them where they are with seamless conversations.",
      bgClass: "bg-primary/10",
      iconColorClass: "text-primary",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Analytics",
      description:
        "Track lead quality, response times, and conversion rates in one dashboard.",
      bgClass: "bg-construction/10",
      iconColorClass: "text-construction",
    },
    {
      icon: Shield,
      title: "Human Handoff",
      description:
        "Take over any conversation instantly when you want to step in personally.",
      bgClass: "bg-success/10",
      iconColorClass: "text-success",
    },
  ];

  return (
    <section id="features" className="py-12 sm:py-16 md:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Everything You Need to Convert Leads
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Built specifically for construction companies who want more projects
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-2 hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <CardContent className="p-5 sm:p-6">
                <div
                  className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl mb-3 sm:mb-4 ${feature.bgClass}`}
                >
                  <feature.icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.iconColorClass}`}
                  />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-blue-600 to-orange-500 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            Results That Speak for Themselves
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">5-10x</div>
            <div className="text-sm sm:text-base text-white/80">More Qualified Leads</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">2 min</div>
            <div className="text-sm sm:text-base text-white/80">Average Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">73%</div>
            <div className="text-sm sm:text-base text-white/80">AI Qualification Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">24/7</div>
            <div className="text-sm sm:text-base text-white/80">Always Available</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LeadCaptureSection() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isResubmission, setIsResubmission] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: "af6849e8-9dcf-4115-8c8a-923d6ef7332c",
          email,
          phone,
          firstName,
          lastName: lastName || "",
          source: "landing_page",
          auditType: "construction",
          consentGiven: true,
          auditInputs: {
            contactName: `${firstName} ${lastName}`.trim(),
            phone: phone,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setIsResubmission(data.isResubmission || false);
      }
    } catch (error) {
      console.error("Error submitting lead:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-construction">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg p-8 sm:p-12 shadow-2xl text-center">
            <Check className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-success mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              {isResubmission ? "Welcome Back! 👋" : "Check Your WhatsApp! 📱"}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-4">
              {isResubmission
                ? "Thanks for the update! We have your information and will be in touch soon."
                : `We've sent you a message at ${phone}`}
            </p>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isResubmission
                ? "If you need immediate assistance, feel free to call us directly."
                : "Our team will help you with your construction project. Reply on WhatsApp to get started!"}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-gradient-construction">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
            Get Your Free Construction Quote
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-white/90">
            Tell us about your project and get a response in 2 minutes
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 sm:p-8 shadow-2xl">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="text-base sm:text-lg py-5 sm:py-6"
                />
                <Input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="text-base sm:text-lg py-5 sm:py-6"
                />
              </div>
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-base sm:text-lg py-5 sm:py-6"
              />
              <Button
                onClick={() => setStep(2)}
                size="lg"
                className="w-full text-base sm:text-lg py-5 sm:py-6 h-auto"
                disabled={!firstName || !email}
              >
                Continue →
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Input
                type="tel"
                placeholder="WhatsApp number (e.g., +639123456789)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-base sm:text-lg py-5 sm:py-6"
              />
              <label className="flex items-start text-left text-xs sm:text-sm gap-2">
                <input type="checkbox" className="mt-1 flex-shrink-0" required />
                <span className="text-gray-600">
                  I agree to receive WhatsApp messages about my audit. Reply
                  STOP to opt out anytime.
                </span>
              </label>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !phone}
                size="lg"
                className="w-full text-base sm:text-lg py-5 sm:py-6 h-auto"
              >
                {isSubmitting ? "Sending..." : "Get My Free Quote 🚀"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="w-full"
              >
                ← Back
              </Button>
            </div>
          )}
        </div>

        <p className="text-white/80 text-xs sm:text-sm mt-4 text-center">
          💯 Setup in 10 minutes • 📱 Response via WhatsApp in under 2 minutes
        </p>
      </div>
    </section>
  );
}

function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const monthlyPrice = 297;
  const yearlyPrice = 2970;
  const yearlyDiscount = 20;

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

  return (
    <section id="pricing" className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-blue-100 border border-blue-200 rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-blue-700" />
            <span className="text-sm font-medium text-blue-700">
              7-Day Free Trial • No Credit Card Required
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            One plan with everything you need to close more deals
          </p>
        </div>

        {/* Pricing Content */}
        <div className="max-w-6xl mx-auto">
          {/* Main Pricing Section */}
          <div className="mb-16">
            {/* Header */}
            <div className="text-center mb-12">
              
              
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
                          ${billingPeriod === "monthly" ? monthlyPrice : yearlyPrice}
                        </span>
                        <span className="text-xl text-slate-600">
                          /{billingPeriod === "monthly" ? "month" : "year"}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      onClick={() => (window.location.href = "/signup")}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg py-6"
                    >
                      Start Free Trial
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

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <Card key={idx} className="border-2 hover:border-slate-300 transition-colors">
                  <button
                    className="w-full text-left p-6 flex items-center justify-between"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  >
                    <h3 className="font-semibold text-slate-900 pr-8">
                      {faq.question}
                    </h3>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-600 transition-transform flex-shrink-0 ${
                        openFaq === idx ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openFaq === idx && (
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
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-6">
          Ready to Close More Deals?
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8">
          Join hundreds of construction businesses already using AI to convert more leads.
        </p>
        <Button
          size="lg"
          onClick={() => (window.location.href = "/signup")}
          className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white shadow-xl hover:shadow-2xl transition-all text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-auto"
        >
          Sign Up Now
          <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2 mb-3 sm:mb-4">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-600 to-orange-500 rounded-lg flex items-center justify-center">
                <HardHat className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-sm sm:text-base font-bold">AI Lead System</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              AI-powered lead generation for construction companies.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Product</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-foreground">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Company</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Legal</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 sm:pt-8 text-center text-xs sm:text-sm text-muted-foreground">
          <p>© 2025 AI Lead System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}