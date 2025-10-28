// client/src/pages/signup.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Rocket, CheckCircle, Shield, Zap } from "lucide-react";

export default function Signup() {
  usePageTitle("Signup");

  const [, setLocation] = useLocation();
  const { signup, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signup(email, password, firstName, lastName);
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account",
      });
      setLocation("/verify-email");
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-construction rounded-lg flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                AI Lead System
              </h1>
              <p className="text-sm text-slate-500">Multi-Tenant Platform</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Create Account
            </h2>
            <p className="text-slate-600">
              Already have an account?{" "}
              <button
                onClick={() => setLocation("/login")}
                className="text-blue-600 hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  First Name
                </label>
                <Input
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Last Name
                </label>
                <Input
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <Input
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <Input
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-12"
              />
              <p className="text-xs text-slate-500 mt-2">
                Must be at least 8 characters long
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>

            <p className="text-xs text-center text-slate-500">
              By signing up, you agree to our{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </p>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">
                Or sign up with
              </span>
            </div>
          </div>

          {/* Social Signup */}
          <div className="grid grid-cols-2 gap-3">
            {/* 🆕 FUNCTIONAL GOOGLE BUTTON */}
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
              className="flex items-center justify-center px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                {/* ... same SVG paths ... */}
              </svg>
              <span className="text-sm font-medium text-slate-700">Google</span>
            </button>

            {/* Facebook button - keep as placeholder */}
            <button className="flex items-center justify-center px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors opacity-50 cursor-not-allowed">
              {/* ... Facebook SVG ... */}
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Benefits */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-construction p-12 items-center justify-center relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-lg text-white">
          <div className="mb-8">
            <div className="inline-block px-4 py-2 bg-white/20 rounded-full text-sm font-medium mb-4">
              🎉 14-Day Free Trial
            </div>
            <h2 className="text-4xl font-bold mb-4">
              Start Growing Your Business Today
            </h2>
            <p className="text-lg text-blue-100">
              Join thousands of businesses using AI to automate lead generation
              and boost conversions.
            </p>
          </div>

          {/* Benefits List */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
              <span className="text-lg">No credit card required</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
              <span className="text-lg">Cancel anytime</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
              <span className="text-lg">Full access to all features</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
              <span className="text-lg">24/7 customer support</span>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <Shield className="w-8 h-8 mb-3" />
              <h3 className="font-semibold mb-1">Secure & Private</h3>
              <p className="text-sm text-blue-100">Enterprise-grade security</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <Zap className="w-8 h-8 mb-3" />
              <h3 className="font-semibold mb-1">Lightning Fast</h3>
              <p className="text-sm text-blue-100">Instant AI responses</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
