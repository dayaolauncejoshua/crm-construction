import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Mail, ArrowLeft, CheckCircle, Shield, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const forgotMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send reset email");
      }

      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      forgotMutation.mutate(email);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex">
        {/* Success Message */}
        <div className="flex-1 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏗️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">AI Lead System</h1>
                <p className="text-sm text-slate-500">Password Recovery</p>
              </div>
            </div>

            {/* Success Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200 mb-6">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-center text-slate-900 mb-3">
                Check Your Email
              </h2>
              <p className="text-center text-slate-600 mb-2">
                We've sent password reset instructions to:
              </p>
              <p className="text-center font-semibold text-slate-900 mb-6">
                {email}
              </p>
              <div className="bg-white/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-600 text-center">
                  <strong>Didn't receive it?</strong> Check your spam folder or try again in a few minutes.
                </p>
              </div>
            </div>

            <Link href="/login">
              <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Side - Marketing */}
        <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-orange-500 p-12 items-center justify-center relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>

          <div className="relative z-10 max-w-lg text-white">
            <div className="inline-block px-4 py-2 bg-white/20 rounded-full text-sm font-medium mb-6">
              🔐 Secure Recovery
            </div>
            <h2 className="text-4xl font-bold mb-6">
              Your Account is Safe
            </h2>
            <p className="text-lg text-blue-100 mb-8">
              We take security seriously. Your password reset link is encrypted and expires in 1 hour.
            </p>

            {/* Security Features */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Bank-Level Security</h3>
                  <p className="text-sm text-blue-100">
                    256-bit encryption protects all your data
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Time-Limited Links</h3>
                  <p className="text-sm text-blue-100">
                    Reset links expire after 1 hour for your safety
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Instant Access</h3>
                  <p className="text-sm text-blue-100">
                    Back to your leads in under 2 minutes
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="pt-8 border-t border-white/20">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">100%</div>
                  <div className="text-xs text-blue-100">Secure</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">&lt;2min</div>
                  <div className="text-xs text-blue-100">Recovery Time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">24/7</div>
                  <div className="text-xs text-blue-100">Support</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏗️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">AI Lead System</h1>
              <p className="text-sm text-slate-500">Password Recovery</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Forgot Password?</h2>
            <p className="text-slate-600">
              No worries! Enter your email and we'll send you reset instructions.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
              <p className="text-xs text-slate-500 mt-2">
                We'll send you a link to reset your password
              </p>
            </div>

            {/* Error Message */}
            {forgotMutation.isError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 flex items-center">
                  <span className="mr-2">⚠️</span>
                  {(forgotMutation.error as Error).message}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={forgotMutation.isPending}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
            >
              {forgotMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link href="/login">
              <button className="text-slate-600 hover:text-slate-900 flex items-center justify-center mx-auto space-x-2 py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </button>
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 text-center">
              <strong>Need help?</strong> Contact our support team at{" "}
              <a href="mailto:support@aileadsystem.com" className="underline font-medium">
                support@aileadsystem.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Marketing */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-orange-500 p-12 items-center justify-center relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-lg text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10" />
          </div>
          
          <h2 className="text-4xl font-bold text-center mb-6">
            Quick Recovery
          </h2>
          <p className="text-lg text-blue-100 text-center mb-12">
            Get back to managing your leads in just a few clicks
          </p>

          {/* Steps */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Enter Your Email</h3>
                <p className="text-sm text-blue-100">
                  We'll look up your account instantly
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Check Your Inbox</h3>
                <p className="text-sm text-blue-100">
                  You'll receive a secure reset link
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Create New Password</h3>
                <p className="text-sm text-blue-100">
                  Set a strong password and you're all set!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}