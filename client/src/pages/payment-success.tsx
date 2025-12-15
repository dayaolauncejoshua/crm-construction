// client/src/pages/payment-success.tsx

import { usePageTitle } from "@/hooks/usePageTitle";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CheckCircle, Rocket, ArrowRight, Sparkles } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function PaymentSuccess() {
  usePageTitle("Payment Successful");
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Get session_id from URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get("session_id");
    setSessionId(id);

    // Invalidate queries to refresh subscription status
    queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/trial-status"] });

    // ✅ REMOVED: No automatic redirect - user must click button
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-orange-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-2xl border-2 border-construction/20 relative overflow-hidden">
        {/* ✅ ADD: Celebration confetti effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
          <div
            className="absolute top-10 right-1/4 w-2 h-2 bg-blue-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <div
            className="absolute top-5 left-1/2 w-2 h-2 bg-orange-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.4s" }}
          ></div>
        </div>

        <CardHeader className="text-center pb-6 relative">
          {/* Success Icon with Animation */}
          <div className="w-24 h-24 bg-gradient-construction rounded-full flex items-center justify-center mx-auto mb-6 animate-[bounce_1s_ease-in-out_3]">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>

          <div className="mb-4">
            <Sparkles className="w-8 h-8 text-yellow-500 mx-auto mb-2 animate-pulse" />
          </div>

          <CardTitle className="text-4xl font-bold text-slate-900 mb-2">
            🎉 Payment Successful!
          </CardTitle>
          <p className="text-xl text-slate-600">
            Welcome to your upgraded plan!
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Success Message */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              ✅ Your subscription is now active!
            </h3>
            <p className="text-green-700">
              You now have access to all premium features. Start generating
              leads and closing deals!
            </p>
          </div>

          {/* What's Included */}
          <div className="bg-slate-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-construction mr-2" />
              What's Included
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-construction rounded-full"></div>
                <span className="text-sm text-slate-700">
                  AI Lead Qualification
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-construction rounded-full"></div>
                <span className="text-sm text-slate-700">
                  WhatsApp Integration
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-construction rounded-full"></div>
                <span className="text-sm text-slate-700">VSL Generator</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-construction rounded-full"></div>
                <span className="text-sm text-slate-700">
                  Advanced Analytics
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-construction rounded-full"></div>
                <span className="text-sm text-slate-700">
                  Meeting Scheduling
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-construction rounded-full"></div>
                <span className="text-sm text-slate-700">Priority Support</span>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">
              🚀 What's next?
            </h3>

            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border-2 border-slate-200">
                <div className="w-8 h-8 bg-construction/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-construction font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    Set up your WhatsApp
                  </p>
                  <p className="text-sm text-slate-600">
                    Connect your business WhatsApp number
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border-2 border-slate-200">
                <div className="w-8 h-8 bg-construction/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-construction font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    Add your first client
                  </p>
                  <p className="text-sm text-slate-600">
                    Create a client profile to start managing leads
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border-2 border-slate-200">
                <div className="w-8 h-8 bg-construction/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-construction font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    Generate your first VSL
                  </p>
                  <p className="text-sm text-slate-600">
                    Create video sales letters to attract leads
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - User MUST click to continue */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              className="flex-1 bg-gradient-construction hover:opacity-90 text-white shadow-lg"
              size="lg"
              onClick={() => setLocation("/dashboard")}
            >
              <Rocket className="w-5 h-5 mr-2" />
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-2 hover:bg-slate-50"
              size="lg"
              onClick={() => setLocation("/clients")}
            >
              Set Up Client
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Session Info */}
          {sessionId && (
            <div className="text-center pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2">
                Payment confirmation sent to your email
              </p>
              <p className="text-xs text-slate-400">
                Session ID: {sessionId.slice(0, 20)}...
              </p>
            </div>
          )}

          {/* Receipt Link */}
          <div className="text-center">
            <Button
              variant="link"
              className="text-sm text-slate-600 hover:text-construction"
              onClick={() =>
                window.open(
                  "https://dashboard.stripe.com/test/payments",
                  "_blank"
                )
              }
            >
              View receipt in Stripe Dashboard →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
