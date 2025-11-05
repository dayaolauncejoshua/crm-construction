// client/src/pages/landing.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Play,
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
} from "lucide-react";

export default function Landing() {
  usePageTitle("AI Lead System - Intelligent CRM for Construction", false);
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header />
      <HeroSection />
      <TrustedBySection />
      <HowItWorksSection />
      <LeadCaptureSection />
      <FeaturesSection />
      <StatsSection />
      <CTASection />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Using existing theme colors */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-construction rounded-lg flex items-center justify-center shadow-lg">
              <HardHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                AI Lead System
              </h1>
              <p className="text-xs text-muted-foreground">For Construction</p>
            </div>
          </div>

          {/* Navigation */}
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
            <button
              onClick={() => (window.location.href = "/pricing")}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Pricing
            </button>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/login")}
            >
              Login
            </Button>
            <Button
              size="sm"
              onClick={() => (window.location.href = "/signup")}
              className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white shadow-xl hover:shadow-2xl transition-all px-8"
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                #1 AI Lead System for Construction
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Stop Losing
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-orange-500">
                {" "}
                $100K+ Projects{" "}
              </span>
              to Slow Responses
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              AI-powered lead qualification system that responds in under 2
              minutes, qualifies prospects 24/7, and book meetings with one
              click and close more deals.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                size="lg"
                onClick={() => (window.location.href = "/signup")}
                className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white shadow-xl hover:shadow-2xl transition-all text-lg px-8"
              >
                Start 14-Day Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 hover:bg-primary/5 text-lg px-8"
              >
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-success" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-success" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-success" />
                <span>Setup in 10 minutes</span>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative">
            {/* Main Card - Dashboard Preview */}
            <Card className="shadow-2xl border-2 overflow-hidden">
              <div className="bg-gradient-construction p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-white">
                      <p className="font-semibold">AI Assistant Active</p>
                      <p className="text-xs text-white/80">
                        Responding in real-time
                      </p>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                </div>
              </div>

              <CardContent className="p-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-success">47</div>
                    <div className="text-xs text-success/80">
                      Hot Leads Today
                    </div>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-primary">98%</div>
                    <div className="text-xs text-primary/80">
                      AI Qualification
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg border">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        Meeting booked: John Smith
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Commercial renovation - $250K
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      2m ago
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg border">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        AI qualified: Sarah Johnson
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Residential build - Hot lead
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      5m ago
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg border">
                    <div className="w-2 h-2 bg-construction rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        New inquiry: Mike Chen
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Kitchen remodel inquiry
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      8m ago
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Floating Badge */}
            <div className="absolute -top-4 -right-4 bg-card rounded-xl shadow-xl border-2 border-construction/20 p-4 rotate-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-construction">
                  2 min
                </div>
                <div className="text-xs text-muted-foreground">
                  Avg Response
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-construction/20 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustedBySection() {
  return (
    <section className="py-12 bg-card border-y">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-muted-foreground mb-8">
          Trusted by 200+ construction companies nationwide
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
          <div className="flex items-center space-x-2">
            <Building2 className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="font-bold text-foreground">BuildPro</p>
              <p className="text-xs text-muted-foreground">Construction</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <HardHat className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="font-bold text-foreground">Apex Builders</p>
              <p className="text-xs text-muted-foreground">Residential</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Wrench className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="font-bold text-foreground">Elite Remodeling</p>
              <p className="text-xs text-muted-foreground">Commercial</p>
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
    <section id="how-it-works" className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From inquiry to qualified lead in minutes, not hours
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {steps.map((step, index) => (
            <div key={index} className="relative flex">
              <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg h-full w-full">
                <CardContent className="p-8 flex flex-col h-full">
                  {/* ✅ Number and Icon - SIDE BY SIDE at top */}
                  <div className="flex items-center justify-center gap-3 mb-8">
                    {/* Number Badge */}
                    <div
                      className={`flex items-center justify-center w-14 h-14 rounded-full font-bold text-lg ${step.colorClass} shadow-lg`}
                    >
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div
                      className={`flex items-center justify-center w-14 h-14 rounded-xl ${step.bgClass}`}
                    >
                      <step.icon className={`w-7 h-7 ${step.iconColorClass}`} />
                    </div>
                  </div>

                  {/* Content - Centered and grows to fill space */}
                  <div className="flex flex-col flex-1 text-center">
                    <h3 className="text-xl font-bold text-foreground mb-3">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Arrow Between Cards */}
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
    <section id="features" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Convert Leads
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built specifically for construction companies who want more projects
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-2 hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <CardContent className="p-6">
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${feature.bgClass}`}
                >
                  <feature.icon
                    className={`w-6 h-6 ${feature.iconColorClass}`}
                  />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
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
    <section className="py-20 bg-gradient-to-br from-blue-600 to-orange-500 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Results That Speak for Themselves
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">5-10x</div>
            <div className="text-white/80">More Qualified Leads</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">2 min</div>
            <div className="text-white/80">Average Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">73%</div>
            <div className="text-white/80">AI Qualification Rate</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">24/7</div>
            <div className="text-white/80">Always Available</div>
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
        // ✅ Store re-submission status for custom message
        setSuccess(true);
        setIsResubmission(data.isResubmission || false); // NEW
      }
    } catch (error) {
      console.error("Error submitting lead:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Update success screen
  if (success) {
    return (
      <section className="py-20 bg-gradient-construction">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-lg p-12 shadow-2xl">
            <Check className="w-16 h-16 mx-auto text-success mb-4" />
            <h2 className="text-3xl font-bold mb-4">
              {isResubmission ? "Welcome Back! 👋" : "Check Your WhatsApp! 📱"}
            </h2>
            <p className="text-lg text-muted-foreground mb-4">
              {isResubmission
                ? "Thanks for the update! We have your information and will be in touch soon."
                : `We've sent you a message at ${phone}`}
            </p>
            <p className="text-muted-foreground">
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
    <section className="py-20 bg-gradient-construction">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">
          Get Your Free Construction Quote
        </h2>
        <p className="text-white/90 mb-8 text-lg">
          Tell us about your project and get a response in 2 minutes
        </p>

        <div className="bg-white rounded-lg p-8 shadow-2xl">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="text-lg py-6"
                />
                <Input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="text-lg py-6"
                />
              </div>
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-lg py-6"
              />
              <Button
                onClick={() => setStep(2)}
                size="lg"
                className="w-full text-lg py-6"
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
                className="text-lg py-6"
              />
              <label className="flex items-start text-left text-sm gap-2">
                <input type="checkbox" className="mt-1" required />
                <span className="text-gray-600">
                  I agree to receive WhatsApp messages about my audit. Reply
                  STOP to opt out anytime.
                </span>
              </label>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !phone}
                size="lg"
                className="w-full text-lg py-6"
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

        <p className="text-white/80 text-sm mt-4">
          💯 No credit card required • 📱 Response via WhatsApp in under 2
          minutes
        </p>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Ready to Close More Deals?
        </h2>
        <p className="text-xl text-muted-foreground mb-8">
          Start your 14-day free trial. No credit card required.
        </p>
        <Button
          size="lg"
          onClick={() => (window.location.href = "/signup")}
          className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white shadow-xl hover:shadow-2xl transition-all text-lg px-8"
        >
          Start Free Trial
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-orange-500 rounded-lg flex items-center justify-center">
                <HardHat className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">AI Lead System</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered lead generation for construction companies.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
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
              <li>
                <a href="#" className="hover:text-foreground">
                  Demo
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
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
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
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

        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 AI Lead System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
