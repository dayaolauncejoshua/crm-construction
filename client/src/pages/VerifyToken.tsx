import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { CheckCircle, XCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyToken() {
  const [, params] = useRoute("/verify/:token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/auth/verify/${params?.token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");

        // Notify other tabs about auth change
        localStorage.setItem("auth_updated", Date.now().toString());
        setTimeout(() => localStorage.removeItem("auth_updated"), 1000);
          
          // Countdown timer
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                window.location.href = "/dashboard";
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Failed to verify email. Please try again.");
      }
    };

    if (params?.token) {
      verifyEmail();
    }
  }, [params?.token]);

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Status */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏗️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">AI Lead System</h1>
              <p className="text-sm text-slate-500">Email Verification</p>
            </div>
          </div>

          {status === "loading" && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-blue-200 rounded-full"></div>
                  <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Verifying Your Email...
              </h2>
              <p className="text-slate-600">
                Please wait a moment while we confirm your email address
              </p>
              <div className="mt-8 flex items-center justify-center space-x-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing verification...</span>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                  <CheckCircle className="w-14 h-14 text-white" />
                </div>
              </div>
              
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
                  Email Verified! <Sparkles className="w-6 h-6 text-yellow-500" />
                </h2>
                <p className="text-slate-600 text-lg">{message}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
                <p className="text-sm text-slate-700 mb-3">
                  ✅ Your account is now fully activated!
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Redirecting to dashboard in <strong className="text-blue-600">{countdown}</strong> seconds...</span>
                </div>
              </div>

              <Button
                onClick={() => window.location.href = "/dashboard"}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
              >
                Go to Dashboard Now →
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center">
                  <XCircle className="w-14 h-14 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Verification Failed
              </h2>
              <p className="text-slate-600 mb-8">{message}</p>
              
              <div className="bg-red-50 rounded-xl p-6 mb-6 border border-red-200">
                <p className="text-sm text-red-900 mb-4">
                  <strong>Common reasons:</strong>
                </p>
                <ul className="text-sm text-red-800 text-left space-y-2">
                  <li>• Link has expired (valid for 24 hours)</li>
                  <li>• Link was already used</li>
                  <li>• Invalid or corrupted link</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => window.location.href = "/verify-email"}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
                >
                  Request New Verification Link
                </Button>
                <Button
                  onClick={() => window.location.href = "/dashboard"}
                  variant="outline"
                  className="w-full h-12"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

    
    </div>
  );
}