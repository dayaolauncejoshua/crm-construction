import { useState } from "react";
import { useRoute } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Lock, CheckCircle, Eye, EyeOff, Shield, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPassword() {
  const [, params] = useRoute("/reset-password/:token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const resetMutation = useMutation({
    mutationFn: async ({ password, token }: { password: string; token: string }) => {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reset password");
      }

      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = "/login";
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return;
    if (params?.token) {
      resetMutation.mutate({ password, token: params.token });
    }
  };

  const passwordRequirements = [
    { met: password.length >= 8, text: "At least 8 characters" },
    { met: /[A-Z]/.test(password), text: "One uppercase letter" },
    { met: /[a-z]/.test(password), text: "One lowercase letter" },
    { met: /[0-9]/.test(password), text: "One number" },
  ];

  const isPasswordValid = passwordRequirements.every((req) => req.met);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  if (success) {
    return (
      <div className="min-h-screen flex">
        {/* Success State */}
        <div className="flex-1 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏗️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">AI Lead System</h1>
                <p className="text-sm text-slate-500">Password Reset</p>
              </div>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-14 h-14 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Password Reset! 🎉
              </h2>
              <p className="text-slate-600 mb-6">
                Your password has been successfully reset.
              </p>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
                <p className="text-sm text-slate-700 mb-3">
                  You can now log in with your new password
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Redirecting to login in <strong className="text-blue-600">{countdown}</strong> seconds...</span>
                </div>
              </div>

              <Button
                onClick={() => window.location.href = "/login"}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
              >
                Go to Login Now →
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-orange-500 p-12 items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 max-w-lg text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-bold mb-4">All Set!</h2>
            <p className="text-lg text-blue-100 mb-8">
              Your account is secure. Log in now to continue automating your lead generation.
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <p className="text-sm text-blue-100">
                💡 <strong>Pro Tip:</strong> Consider using a password manager to keep your passwords secure and easily accessible.
              </p>
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
              <p className="text-sm text-slate-500">Password Reset</p>
            </div>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-slate-900 mb-2">
            Create New Password
          </h2>
          <p className="text-center text-slate-600 mb-8">
            Enter a strong password to secure your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm Password
              </label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={8}
                className="h-12"
              />
            </div>

            {/* Password Requirements */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="font-medium text-sm text-slate-900 mb-3 flex items-center">
                <Key className="w-4 h-4 mr-2" />
                Password Requirements:
              </p>
              <div className="space-y-2">
                {passwordRequirements.map((req, idx) => (
                  <div key={idx} className="flex items-center text-sm">
                    <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                      req.met ? 'bg-green-500' : 'bg-slate-300'
                    }`}>
                      {req.met && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={req.met ? 'text-green-700' : 'text-slate-600'}>
                      {req.text}
                    </span>
                  </div>
                ))}
                <div className="flex items-center text-sm">
                  <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                    passwordsMatch ? 'bg-green-500' : 'bg-slate-300'
                  }`}>
                    {passwordsMatch && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className={passwordsMatch ? 'text-green-700' : 'text-slate-600'}>
                    Passwords match
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {resetMutation.isError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  {(resetMutation.error as Error).message}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={
                resetMutation.isPending ||
                !isPasswordValid ||
                !passwordsMatch
              }
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
            >
              {resetMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Resetting Password...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Reset Password
                </>
              )}
            </Button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 flex items-start">
              <Shield className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Security Tip:</strong> Use a unique password you don't use on other sites.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Marketing */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-orange-500 p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-lg text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10" />
          </div>
          
          <h2 className="text-4xl font-bold text-center mb-6">
            Secure & Protected
          </h2>
          <p className="text-lg text-blue-100 text-center mb-12">
            Your security is our top priority. We use industry-leading encryption to protect your data.
          </p>

          {/* Security Features */}
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">256-Bit Encryption</h3>
                  <p className="text-sm text-blue-100">Bank-level security for all your data</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">GDPR Compliant</h3>
                  <p className="text-sm text-blue-100">Your privacy is always protected</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Secure Password Storage</h3>
                  <p className="text-sm text-blue-100">Passwords are hashed and never stored in plain text</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}