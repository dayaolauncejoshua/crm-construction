// client/src/components/TwoFactorAuth.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, ArrowLeft, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TwoFactorAuthProps {
  userId: string;
  email: string;
  onSuccess: (user: any) => void;
  onBack: () => void;
}

export function TwoFactorAuth({ userId, email, onSuccess, onBack }: TwoFactorAuthProps) {
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (code.length !== 6 && code.length !== 8) {
      toast({
        title: "Invalid Code",
        description: useBackupCode 
          ? "Backup code must be 8 characters" 
          : "Code must be 6 digits",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, code, useBackupCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid code");
      }

      toast({
        title: "Success!",
        description: "Login successful",
      });

      onSuccess(data.user);
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isVerifying) {
      handleVerify();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-center">
            Enter the 6-digit code from your authenticator app
          </CardDescription>
          <div className="p-2 bg-slate-100 rounded-lg">
            <p className="text-xs text-center text-slate-600 font-medium">
              {email}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!useBackupCode ? (
            // Regular 2FA Code Input
            <>
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyPress={handleKeyPress}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                  autoFocus
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={code.length !== 6 || isVerifying}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setUseBackupCode(true);
                  setCode("");
                }}
                className="w-full gap-2"
              >
                <Key className="w-4 h-4" />
                Use Backup Code
              </Button>
            </>
          ) : (
            // Backup Code Input
            <>
              <div className="space-y-2">
                <Label htmlFor="backupCode">Backup Code</Label>
                <Input
                  id="backupCode"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 8))}
                  onKeyPress={handleKeyPress}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  className="text-center text-xl tracking-[0.3em] font-mono h-14"
                  autoFocus
                />
                <p className="text-xs text-slate-500 text-center">
                  Enter one of your 8-character backup codes
                </p>
              </div>

              <Button
                onClick={handleVerify}
                disabled={code.length !== 8 || isVerifying}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  "Use Backup Code"
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setUseBackupCode(false);
                  setCode("");
                }}
                className="w-full gap-2"
              >
                <Shield className="w-4 h-4" />
                Use Authenticator Code
              </Button>
            </>
          )}

          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}