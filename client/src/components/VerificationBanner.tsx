import { useState, useEffect} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Mail, X } from "lucide-react";
import { getApiUrl } from "@/lib/api-config"; // ✅ ADD THIS IMPORT

export default function VerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Listen for verification in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_updated") {
        console.log("🔄 Banner: Auth updated in another tab");
        // Force page reload to refresh auth state
        window.location.reload();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const resendMutation = useMutation({
    mutationFn: async () => {
      const url = getApiUrl("/api/auth/resend-verification"); // ✅ USE getApiUrl
      console.log("🔍 [RESEND VERIFICATION] Posting to:", url);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ ADD THIS
        body: JSON.stringify({ email: user?.email }),
      });

      console.log("📡 [RESEND VERIFICATION] Response:", res.status);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to resend verification email");
      }

      return res.json();
    },
  });

  // Don't show if verified or dismissed
  if (!user || user.emailVerified || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-blue-50 border-l-4 border-orange-500 p-4 mb-6 rounded-r-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">
              Email Verification Required
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Please verify your email address ({user.email}) to ensure you receive important notifications and updates.
            </p>
            
            {resendMutation.isSuccess ? (
              <div className="mt-2 flex items-center space-x-2 text-sm text-green-600">
                <Mail className="w-4 h-4" />
                <span>✅ Verification email sent! Check your inbox.</span>
              </div>
            ) : (
              <button
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {resendMutation.isPending ? "Sending..." : "Resend verification email"}
              </button>
            )}
            
            {resendMutation.isError && (
              <p className="mt-1 text-sm text-red-600">
                Failed to send email. Please try again.
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 ml-4"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}