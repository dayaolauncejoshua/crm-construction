import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiUrl } from "@/lib/api-config";

export default function VerifyEmail() {
  usePageTitle("Email Verification");

  const { user } = useAuth();
  const [resendSuccess, setResendSuccess] = useState(false);
  const [, setLocation] = useLocation();

  // ✅ Poll auth status every 5 seconds to detect verification
  const { data: authCheck } = useQuery<{ user: { emailVerified?: boolean } }>({
    queryKey: ["/api/auth/me"],
    refetchInterval: 5000,
    enabled: true,
  });

  // ✅ Redirect when verified
  useEffect(() => {
    if (user?.emailVerified || authCheck?.user?.emailVerified) {
      console.log("✅ Email verified! Redirecting to dashboard...");
      setLocation("/dashboard");
    }
  }, [user?.emailVerified, authCheck, setLocation]);

  // Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_updated") {
        console.log("🔄 Auth updated in another tab, checking status...");
        // Reload the page to get fresh auth state
        window.location.reload();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Check verification status when window gets focus
  useEffect(() => {
    const handleFocus = () => {
      console.log("👁️ Window focused, checking verification status...");
      // Reload to check if user was verified in another tab
      window.location.reload();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const resendMutation = useMutation({
    mutationFn: async () => {
      const url = getApiUrl("/api/auth/resend-verification");
      console.log("🔍 [RESEND VERIFICATION] Posting to:", url);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: user?.email }),
      });

      console.log("📡 [RESEND VERIFICATION] Response:", res.status);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to resend");
      }

      return res.json();
    },
    onSuccess: () => {
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <Card className="shadow-2xl border-0 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-orange-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Check Your Email</h1>
                  <p className="text-blue-100 text-sm">Verification Required</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                📧 Almost There!
              </div>
            </div>
          </div>

          <CardContent className="p-8">
            {/* Email Address Display */}
            <div className="text-center mb-8">
              <p className="text-slate-600 mb-2">
                We sent a verification link to
              </p>
              <div className="inline-flex items-center space-x-2 px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-slate-900">
                  {user?.email}
                </span>
              </div>
            </div>

            {/* Instructions Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    Next Steps:
                  </h3>
                  <p className="text-sm text-slate-600">
                    Follow these simple steps to verify your email
                  </p>
                </div>
              </div>

              <ol className="space-y-3">
                <li className="flex items-start text-sm">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full mr-3 flex-shrink-0 font-semibold">
                    1
                  </span>
                  <span className="text-slate-700 pt-0.5">
                    <strong>Open your email inbox</strong> (don't forget to
                    check spam!)
                  </span>
                </li>
                <li className="flex items-start text-sm">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full mr-3 flex-shrink-0 font-semibold">
                    2
                  </span>
                  <span className="text-slate-700 pt-0.5">
                    <strong>Click the verification link</strong> in the email
                  </span>
                </li>
                <li className="flex items-start text-sm">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full mr-3 flex-shrink-0 font-semibold">
                    3
                  </span>
                  <span className="text-slate-700 pt-0.5">
                    <strong>You'll be redirected back</strong> and fully
                    verified! 🎉
                  </span>
                </li>
              </ol>
            </div>

            {/* Success Message */}
            {resendSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3 animate-in fade-in duration-300">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-900">
                    Email Sent Successfully!
                  </p>
                  <p className="text-xs text-green-700">
                    Check your inbox for the verification link
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {resendMutation.isError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-900">
                    Failed to Send Email
                  </p>
                  <p className="text-xs text-red-700">
                    Please try again or contact support
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <Button
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
                variant="outline"
                className="h-12 border-2"
              >
                {resendMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Email
                  </>
                )}
              </Button>

              <Link href="/dashboard">
                <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600">
                  Continue to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Info Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Timer Notice */}
              <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-orange-900">
                    Expires in 24h
                  </p>
                  <p className="text-xs text-orange-700">
                    Link valid for 24 hours
                  </p>
                </div>
              </div>

              {/* Help */}
              <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <AlertCircle className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Need Help?
                  </p>
                  <a
                    href="mailto:support@aileadsystem.com"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Contact Support
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Tips */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            {/* 💡 <strong>Tip:</strong> Add <span className="font-mono bg-slate-200 px-2 py-1 rounded">noreply@aileadsystem.com</span> to your contacts to ensure delivery */}
          </p>
        </div>
      </div>
    </div>
  );
}
