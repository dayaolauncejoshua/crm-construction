// client/src/pages/settings.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import {
  User,
  Lock,
  Bell,
  Globe,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Save,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  MessageSquare,
  Mail,
  Calendar,
  Zap,
  Info,
  BarChart3,
  RefreshCw,
  List,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";

export default function Settings() {
  usePageTitle("Settings");

  const { user, refreshUser } = useAuth();

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Form States
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState("");

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ ADD THESE: Set Password States (for OAuth users)
  const [oauthNewPassword, setOauthNewPassword] = useState("");
  const [oauthConfirmPassword, setOauthConfirmPassword] = useState("");
  const [showOauthNewPassword, setShowOauthNewPassword] = useState(false);
  const [showOauthConfirmPassword, setShowOauthConfirmPassword] =
    useState(false);

  // Notification Preferences
  const [emailNotifications, setEmailNotifications] = useState(
    user?.emailNotifications ?? true
  );
  const [whatsappNotifications, setWhatsappNotifications] = useState(
    user?.whatsappNotifications ?? false
  );
  const [leadNotifications, setLeadNotifications] = useState(
    user?.leadNotifications ?? true
  );
  const [bookingNotifications, setBookingNotifications] = useState(
    user?.bookingNotifications ?? true
  );
  const [weeklyReports, setWeeklyReports] = useState(
    user?.weeklyReports ?? true
  );

  useEffect(() => {
    if (user) {
      setEmailNotifications(user.emailNotifications ?? true);
      setWhatsappNotifications(user.whatsappNotifications ?? false);
      setLeadNotifications(user.leadNotifications ?? true);
      setBookingNotifications(user.bookingNotifications ?? true);
      setWeeklyReports(user.weeklyReports ?? true);
    }
  }, [user]);

  // Regional Settings
  const [timezone, setTimezone] = useState("America/New_York");
  const [language, setLanguage] = useState("en");

  // 2FA Setup
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [show2FADisableDialog, setShow2FADisableDialog] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [manualEntryKey, setManualEntryKey] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disable2FACode, setDisable2FACode] = useState("");

  // Regenerate Backup Codes States
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [regenerate2FACode, setRegenerate2FACode] = useState("");
  const [regenerateStep, setRegenerateStep] = useState<"input" | "display">(
    "input"
  );

  //Account Deletion States
  const [deletePassword, setDeletePassword] = useState("");
  const [delete2FACode, setDelete2FACode] = useState("");
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);

  const [showDeletionProgress, setShowDeletionProgress] = useState(false);
  const [deletionStep, setDeletionStep] = useState(0);
  const [deletionComplete, setDeletionComplete] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // ✅ NEW: Individual toggle handlers for instant save
  const handleToggleEmailNotifications = async (checked: boolean) => {
    setEmailNotifications(checked);
    updatePreferencesMutation.mutate({
      emailNotifications: checked,
      whatsappNotifications,
      leadNotifications,
      bookingNotifications,
      weeklyReports,
      timezone,
      language,
    });
  };

  const handleToggleWhatsAppNotifications = async (checked: boolean) => {
    setWhatsappNotifications(checked);
    updatePreferencesMutation.mutate({
      emailNotifications,
      whatsappNotifications: checked,
      leadNotifications,
      bookingNotifications,
      weeklyReports,
      timezone,
      language,
    });
  };

  const handleToggleLeadNotifications = async (checked: boolean) => {
    setLeadNotifications(checked);
    updatePreferencesMutation.mutate({
      emailNotifications,
      whatsappNotifications,
      leadNotifications: checked,
      bookingNotifications,
      weeklyReports,
      timezone,
      language,
    });
  };

  const handleToggleBookingNotifications = async (checked: boolean) => {
    setBookingNotifications(checked);
    updatePreferencesMutation.mutate({
      emailNotifications,
      whatsappNotifications,
      leadNotifications,
      bookingNotifications: checked,
      weeklyReports,
      timezone,
      language,
    });
  };

  const handleToggleWeeklyReports = async (checked: boolean) => {
    setWeeklyReports(checked);
    updatePreferencesMutation.mutate({
      emailNotifications,
      whatsappNotifications,
      leadNotifications,
      bookingNotifications,
      weeklyReports: checked,
      timezone,
      language,
    });
  };

  // Get user initials
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) return user.firstName[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      refetchActivity();
      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }
      return response.json();
    },
    onSuccess: () => {
      refetchActivity();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Success",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: Error) => {
      refetchActivity();
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set Password Mutation (for OAuth users)
  const setPasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      const response = await fetch("/api/user/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to set password");
      }

      return response.json();
    },
    onSuccess: async () => {
      refetchActivity();
      await refreshUser();

      setOauthNewPassword("");
      setOauthConfirmPassword("");

      toast({
        title: "Password Set Successfully!",
        description: "You can now login with your email and password.",
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      refetchActivity();
      toast({
        title: "Failed to Set Password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update Preferences Mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update preferences");
      }
      return response.json();
    },
    onSuccess: async () => {
      await refreshUser();
      refetchActivity();
      toast({
        title: "Success",
        description: "Your preferences have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 2FA Mutations
  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/2fa/setup", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        // 🆕 Handle "already enabled" case
        if (data.alreadyEnabled) {
          throw new Error("2FA_ALREADY_ENABLED");
        }
        throw new Error(data.error || "Failed to setup 2FA");
      }
      return data;
    },
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setManualEntryKey(data.manualEntryKey);
      setShow2FASetupModal(true);
    },
    onError: (error: Error) => {
      if (error.message === "2FA_ALREADY_ENABLED") {
        toast({
          title: "2FA Already Enabled",
          description:
            "You must disable 2FA before setting it up again. This prevents duplicate entries in your authenticator app.",
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const verify2FASetupMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/2fa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Invalid code");
      }
      return response.json();
    },
    onSuccess: async (data) => {
      refetchActivity();
      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);
      setShow2FASetupModal(false);
      await refreshUser();
      toast({
        title: "2FA Enabled!",
        description: "Save your backup codes in a safe place.",
      });
    },
    onError: (error: Error) => {
      refetchActivity();
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          password: disablePassword,
          code: disable2FACode,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to disable 2FA");
      }
      return response.json();
    },
    onSuccess: async () => {
      refetchActivity();
      setShow2FADisableDialog(false);
      setDisablePassword("");
      setDisable2FACode("");
      await refreshUser();
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled.",
      });
    },
    onError: (error: Error) => {
      refetchActivity();
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateBackupCodesMutation = useMutation({
    mutationFn: async (data: { password?: string; code: string }) => {
      const response = await fetch("/api/2fa/regenerate-backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate codes");
      }
      return response.json();
    },
    onSuccess: (data) => {
      refetchActivity();
      setBackupCodes(data.backupCodes);
      setRegenerateStep("display");
      toast({
        title: "New Backup Codes Generated",
        description: "Your old backup codes are now invalid.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enhanced Delete Account Mutation with Progress
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // Show progress modal immediately
      setShowDeletionProgress(true);
      setDeletionStep(0);

      // Simulate step progression for UX (actual deletion happens on backend)
      const steps = [
        "Verifying credentials...",
        "Canceling subscription...",
        "Deleting conversations...",
        "Deleting leads and clients...",
        "Removing bookings...",
        "Clearing analytics...",
        "Finalizing deletion...",
      ];

      // Progress through steps with delays for UX
      for (let i = 0; i < steps.length; i++) {
        setDeletionStep(i);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      // Make actual API call
      const response = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: deletePassword,
          twoFactorCode: user?.twoFactorEnabled ? delete2FACode : undefined,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete account");
      }

      return response.json();
    },
    onSuccess: () => {
      setDeletionStep(7); // Final step
      setDeletionComplete(true);

      // Start countdown
      let count = 5;
      const countdownInterval = setInterval(() => {
        count--;
        setRedirectCountdown(count);

        if (count <= 0) {
          clearInterval(countdownInterval);
          window.location.href = "/";
        }
      }, 1000);
    },
    onError: (error: Error) => {
      refetchActivity();
      setShowDeletionProgress(false);
      setDeletionStep(0);
      setDeletionComplete(false);

      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
        duration: 6000,
      });
    },
  });

  // Handle Profile Update
  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({
      firstName,
      lastName,
      phone,
      bio,
    });
  };

  // Secure password validation
  const validatePassword = (
    password: string
  ): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return {
        valid: false,
        message: "Password must be at least 8 characters long",
      };
    }
    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one uppercase letter",
      };
    }
    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one lowercase letter",
      };
    }
    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one number",
      };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one special character",
      };
    }
    return { valid: true };
  };

  // Handle Password Change
  const handleChangePassword = () => {
    if (!currentPassword) {
      toast({
        title: "Error",
        description: "Please enter your current password",
        variant: "destructive",
      });
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      toast({
        title: "Error",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast({
        title: "Error",
        description: "New password must be different from current password",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  // Handle Preferences Update
  const handleUpdatePreferences = () => {
    updatePreferencesMutation.mutate({
      emailNotifications,
      whatsappNotifications,
      leadNotifications,
      bookingNotifications,
      weeklyReports,
      timezone,
      language,
    });
  };

  // Password Strength Indicator
  const getPasswordStrength = (
    password: string
  ): { strength: string; color: string; percentage: number } => {
    if (!password) return { strength: "", color: "", percentage: 0 };

    let score = 0;
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;

    if (score < 40)
      return { strength: "Weak", color: "text-red-600", percentage: score };
    if (score < 70)
      return { strength: "Fair", color: "text-yellow-600", percentage: score };
    return { strength: "Strong", color: "text-green-600", percentage: score };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const {
    data: activityData,
    isLoading: isActivityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useQuery<{ activities: any[] }>({
    queryKey: ["/api/user/activity"],
  });

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "login":
        return <LogIn className="w-4 h-4 text-slate-500" />;
      case "password_changed":
        return <Lock className="w-4 h-4 text-slate-500" />;
      case "2fa_enabled":
      case "2fa_disabled":
        return <ShieldCheck className="w-4 h-4 text-slate-500" />;
      default:
        return <List className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatActionText = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex-shrink-0 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Profile & Settings
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Manage your account settings and preferences
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => setLocation("/")}
                className="cursor-pointer"
              >
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          {/* Tab Navigation with Underline Style */}
          <div className="border-b border-slate-200 pb-0 mb-6">
            <div className="flex gap-6 overflow-x-auto">
              <TabsList className="bg-transparent h-auto p-0 gap-6 border-0">
                <TabsTrigger
                  value="profile"
                  className="relative bg-transparent border-0 shadow-none px-1 pb-3 text-slate-600 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-none transition-colors after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-construction after:transition-all"
                >
                  <User className="w-4 h-4 mr-2" />
                  <span>Profile</span>
                </TabsTrigger>

                <TabsTrigger
                  value="security"
                  className="relative bg-transparent border-0 shadow-none px-1 pb-3 text-slate-600 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-none transition-colors after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-construction after:transition-all"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  <span>Security</span>
                </TabsTrigger>

                <TabsTrigger
                  value="notifications"
                  className="relative bg-transparent border-0 shadow-none px-1 pb-3 text-slate-600 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-none transition-colors after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-construction after:transition-all"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  <span>Notifications</span>
                </TabsTrigger>

                <TabsTrigger
                  value="preferences"
                  className="relative bg-transparent border-0 shadow-none px-1 pb-3 text-slate-600 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-none transition-colors after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-construction after:transition-all"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  <span>Preferences</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* ========== PROFILE TAB ========== */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Profile Picture */}
              <div className="lg:col-span-1">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Profile Picture</CardTitle>
                    <CardDescription>Upload your profile photo</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center space-y-4">
                    <div className="relative group">
                      <Avatar className="w-32 h-32 ring-4 ring-slate-100">
                        <AvatarImage src="/placeholder-avatar.jpg" />
                        <AvatarFallback className="bg-gradient-construction text-white text-3xl font-bold">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8 text-white" />
                      </button>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium text-slate-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <div className="w-full space-y-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Upload Photo
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove Photo
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 text-center">
                      JPG, GIF or PNG. Max 2MB.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Personal Information */}
              <div className="lg:col-span-2">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Personal Information
                    </CardTitle>
                    <CardDescription>
                      Update your personal details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="flex gap-2">
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          disabled
                          className="bg-slate-50"
                        />
                        {user?.emailVerified ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1 flex-shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="gap-1 flex-shrink-0"
                          >
                            <AlertCircle className="w-3 h-3" />
                            Unverified
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio (Optional)</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us a bit about yourself..."
                        rows={4}
                        maxLength={500}
                      />
                      <p className="text-xs text-slate-500 text-right">
                        {bio.length}/500
                      </p>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        onClick={handleUpdateProfile}
                        disabled={updateProfileMutation.isPending}
                        className="bg-gradient-construction hover:opacity-90 text-white gap-2"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========== SECURITY TAB ========== */}
          <TabsContent value="security" className="space-y-7">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ========== CHANGE PASSWORD OR SET PASSWORD CARD ========== */}
              {(user as any)?.passwordHash ? (
                // ✅ EXISTING: Change Password Card (for users with password)
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Change Password</CardTitle>
                    <CardDescription>
                      Update your password to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Password Requirements Alert */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-900">
                          <p className="font-semibold mb-1">
                            Password Requirements:
                          </p>
                          <ul className="space-y-0.5 text-xs">
                            <li>• 8+ characters</li>
                            <li>• Upper & lowercase letters</li>
                            <li>• At least one number</li>
                            <li>• At least one special character</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {newPassword && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">Strength:</span>
                            <span
                              className={`font-semibold ${passwordStrength.color}`}
                            >
                              {passwordStrength.strength}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                passwordStrength.percentage < 40
                                  ? "bg-red-500"
                                  : passwordStrength.percentage < 70
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{
                                width: `${passwordStrength.percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-red-600">
                          Passwords do not match
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        onClick={handleChangePassword}
                        disabled={
                          changePasswordMutation.isPending ||
                          !currentPassword ||
                          !newPassword ||
                          !confirmPassword ||
                          newPassword !== confirmPassword
                        }
                        className="bg-gradient-construction hover:opacity-90 text-white gap-2"
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                // ✅ NEW: Set Password Card (for OAuth users without password)
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Set a Password</CardTitle>
                    <CardDescription>
                      Add password login as backup authentication method
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Info Box - Why set password */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-900">
                          <p className="font-semibold mb-1">
                            Why set a password?
                          </p>
                          <ul className="space-y-0.5">
                            <li>• Login with email if Google is unavailable</li>
                            <li>• Backup authentication method</li>
                            <li>• More account recovery options</li>
                            <li>• You can still use Google sign-in</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Password Requirements */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-xs font-semibold text-slate-700 mb-1">
                        Password Requirements:
                      </p>
                      <ul className="space-y-0.5 text-xs text-slate-600">
                        <li>• 8+ characters</li>
                        <li>• Upper & lowercase letters</li>
                        <li>• At least one number</li>
                        <li>• At least one special character</li>
                      </ul>
                    </div>

                    {/* New Password Input */}
                    <div className="space-y-2">
                      <Label htmlFor="oauthNewPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="oauthNewPassword"
                          type={showOauthNewPassword ? "text" : "password"}
                          value={oauthNewPassword}
                          onChange={(e) => setOauthNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowOauthNewPassword(!showOauthNewPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showOauthNewPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {oauthNewPassword && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">Strength:</span>
                            <span
                              className={`font-semibold ${
                                getPasswordStrength(oauthNewPassword).color
                              }`}
                            >
                              {getPasswordStrength(oauthNewPassword).strength}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                getPasswordStrength(oauthNewPassword)
                                  .percentage < 40
                                  ? "bg-red-500"
                                  : getPasswordStrength(oauthNewPassword)
                                      .percentage < 70
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{
                                width: `${
                                  getPasswordStrength(oauthNewPassword)
                                    .percentage
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password Input */}
                    <div className="space-y-2">
                      <Label htmlFor="oauthConfirmPassword">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="oauthConfirmPassword"
                          type={showOauthConfirmPassword ? "text" : "password"}
                          value={oauthConfirmPassword}
                          onChange={(e) =>
                            setOauthConfirmPassword(e.target.value)
                          }
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowOauthConfirmPassword(
                              !showOauthConfirmPassword
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showOauthConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {oauthConfirmPassword &&
                        oauthNewPassword !== oauthConfirmPassword && (
                          <p className="text-xs text-red-600">
                            Passwords do not match
                          </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        onClick={() => {
                          // Validate password
                          const validation = validatePassword(oauthNewPassword);
                          if (!validation.valid) {
                            toast({
                              title: "Invalid Password",
                              description: validation.message,
                              variant: "destructive",
                            });
                            return;
                          }

                          // Check passwords match
                          if (oauthNewPassword !== oauthConfirmPassword) {
                            toast({
                              title: "Error",
                              description: "Passwords do not match",
                              variant: "destructive",
                            });
                            return;
                          }

                          // Submit
                          setPasswordMutation.mutate({
                            newPassword: oauthNewPassword,
                          });
                        }}
                        disabled={
                          setPasswordMutation.isPending ||
                          !oauthNewPassword ||
                          !oauthConfirmPassword ||
                          oauthNewPassword !== oauthConfirmPassword
                        }
                        className="bg-gradient-construction hover:opacity-90 text-white gap-2"
                      >
                        {setPasswordMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Setting Password...
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            Set Password
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 🆕 Two-Factor Authentication Card */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user?.twoFactorEnabled ? (
                    // 2FA is ENABLED
                    <>
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-green-900">
                              2FA is Enabled
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              Your account is protected with two-factor
                              authentication
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 🆕 ADD INSTRUCTIONS FOR RE-SETUP */}
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-blue-900">
                            <p className="font-semibold mb-1">
                              Need to re-setup 2FA?
                            </p>
                            <ol className="list-decimal list-inside space-y-1">
                              <li>Click "Disable 2FA" below</li>
                              <li>
                                Delete the "LeadFlow CRM" entry from your
                                authenticator app
                              </li>
                              <li>Click "Enable 2FA" to set up fresh</li>
                            </ol>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2"
                          onClick={() => {
                            setShowRegenerateModal(true);
                            setRegenerateStep("input");
                            setRegeneratePassword("");
                            setRegenerate2FACode("");
                          }}
                        >
                          <RefreshCw className="w-4 h-4" />
                          Regenerate Backup Codes
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setShow2FADisableDialog(true)}
                        >
                          <Shield className="w-4 h-4" />
                          Disable 2FA
                        </Button>
                      </div>
                    </>
                  ) : (
                    // 2FA is DISABLED
                    <>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-slate-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">
                              2FA Not Enabled
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              Protect your account with an authenticator app
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm text-slate-700">
                          Two-factor authentication adds an extra layer of
                          security by requiring a code from your phone in
                          addition to your password.
                        </p>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs font-semibold text-blue-900 mb-2">
                            You'll need:
                          </p>
                          <ul className="text-xs text-blue-800 space-y-1">
                            <li>• Google Authenticator or similar app</li>
                            <li>• Your phone with camera (for QR code)</li>
                            <li>• A safe place to store backup codes</li>
                          </ul>
                        </div>

                        <Button
                          onClick={() => setup2FAMutation.mutate()}
                          disabled={setup2FAMutation.isPending}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        >
                          {setup2FAMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Setting up...
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4" />
                              Enable 2FA
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Active Sessions Card */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg">Active Sessions</CardTitle>
                <CardDescription>
                  Manage your active login sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        Current Session
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        Chrome on Windows • Active now
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 flex-shrink-0">
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Activity Log</CardTitle>
                  <CardDescription>
                    A log of recent security-related activity on your account.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/settings/activity")}
                >
                  View Full Log
                </Button>
              </CardHeader>
              <CardContent>
                {isActivityLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : activityError ? (
                  <div className="text-red-600 text-sm">
                    Failed to load activity log.
                  </div>
                ) : activityData?.activities &&
                  activityData.activities.length > 0 ? (
                  <TooltipProvider>
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                      {activityData.activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-4"
                        >
                          <div className="w-8 h-8 flex-shrink-0 bg-slate-100 rounded-full flex items-center justify-center mt-1">
                            {getActivityIcon(activity.action)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">
                              {formatActionText(activity.action)}
                            </p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs text-slate-500 cursor-default">
                                  {formatDistanceToNow(
                                    new Date(activity.createdAt),
                                    {
                                      addSuffix: true,
                                    }
                                  )}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{formatFullDate(activity.createdAt)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TooltipProvider>
                ) : (
                  <p className="text-sm text-slate-500 text-center p-4">
                    No recent activity found.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== NOTIFICATIONS TAB ========== */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Notification Channels */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    Notification Channels
                  </CardTitle>
                  <CardDescription>
                    Choose how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-slate-500">
                          Get notified via email
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={handleToggleEmailNotifications}
                      disabled={updatePreferencesMutation.isPending}
                      style={{ minHeight: "28px" }}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-base">
                          WhatsApp Notifications
                        </Label>
                        <p className="text-sm text-slate-500">
                          Get notified via WhatsApp
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={whatsappNotifications}
                      onCheckedChange={handleToggleWhatsAppNotifications}
                      disabled={updatePreferencesMutation.isPending}
                      style={{ minHeight: "28px" }}
                    />
                  </div>

                  <Separator />

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-900">
                        <strong>How it works:</strong> You'll receive
                        notifications for:
                      </p>
                    </div>
                    <ul className="text-xs text-blue-800 mt-2 space-y-1 ml-6 list-disc">
                      <li>
                        <strong>Hot Leads:</strong> High-priority leads (score
                        ≥85%)
                      </li>
                      <li>
                        <strong>Booking Proposals:</strong> When AI schedules a
                        meeting
                      </li>
                      <li>
                        <strong>Weekly Reports:</strong> Performance summaries
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Event Notifications */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-construction" />
                    Event Notifications
                  </CardTitle>
                  <CardDescription>
                    Choose which events notify you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="space-y-0.5">
                        <Label>🔥 Hot Lead Alerts</Label>
                        <p className="text-sm text-slate-500">
                          When high-priority leads are detected
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={leadNotifications}
                      onCheckedChange={setLeadNotifications}
                      disabled={updatePreferencesMutation.isPending}
                      style={{ minHeight: "28px" }}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="space-y-0.5">
                        <Label>Booking Alerts</Label>
                        <p className="text-sm text-slate-500">
                          When meetings are booked
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={bookingNotifications}
                      onCheckedChange={handleToggleBookingNotifications}
                      disabled={updatePreferencesMutation.isPending}
                      style={{ minHeight: "28px" }}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="space-y-0.5">
                        <Label>Weekly Reports</Label>
                        <p className="text-sm text-slate-500">
                          Performance summaries
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={weeklyReports}
                      onCheckedChange={handleToggleWeeklyReports}
                      disabled={updatePreferencesMutation.isPending}
                      style={{ minHeight: "28px" }}
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      onClick={handleUpdatePreferences}
                      disabled={updatePreferencesMutation.isPending}
                      className="bg-gradient-construction hover:opacity-90 text-white gap-2"
                    >
                      {updatePreferencesMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Preferences
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========== PREFERENCES TAB ========== */}
          <TabsContent value="preferences" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Regional Settings */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Regional Settings</CardTitle>
                  <CardDescription>
                    Configure timezone and language
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">
                          Eastern Time (ET)
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time (CT)
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time (MT)
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time (PT)
                        </SelectItem>
                        <SelectItem value="Europe/London">
                          London (GMT)
                        </SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      onClick={handleUpdatePreferences}
                      disabled={updatePreferencesMutation.isPending}
                      className="bg-gradient-construction hover:opacity-90 text-white gap-2"
                    >
                      {updatePreferencesMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-2 border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-lg text-red-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible account actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white rounded-lg border border-red-200">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">
                        Delete Account
                      </p>
                      <p className="text-sm text-slate-500">
                        Permanently delete account and all data
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                            Delete Account Permanently?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action <strong>cannot be undone</strong>. This
                            will permanently delete your account and remove all
                            your data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="py-4 space-y-4">
                          {/* Warning Box */}
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs font-semibold text-red-900 mb-2">
                              ⚠️ What will be deleted:
                            </p>
                            <ul className="text-xs text-red-800 space-y-1 list-disc list-inside">
                              <li>All personal information</li>
                              <li>All clients and leads</li>
                              <li>All conversations and messages</li>
                              <li>All bookings and calendar data</li>
                              <li>All analytics and reports</li>
                              <li>Payment and subscription history</li>
                            </ul>
                          </div>

                          {/* Password Input - Only show if user has password */}
                          {(user as any)?.passwordHash !== null &&
                          (user as any)?.passwordHash !== undefined ? (
                            <div className="space-y-2">
                              <Label htmlFor="deletePassword">
                                Confirm Password
                              </Label>
                              <Input
                                id="deletePassword"
                                type="password"
                                value={deletePassword}
                                onChange={(e) =>
                                  setDeletePassword(e.target.value)
                                }
                                placeholder="Enter your password"
                              />
                            </div>
                          ) : (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-900">
                                <strong>Note:</strong> You signed up with{" "}
                                {(user as any)?.oauthProvider === "google"
                                  ? "Google"
                                  : "OAuth"}
                                . No password verification required.
                              </p>
                            </div>
                          )}

                          {/* 2FA Input (conditional) */}
                          {user?.twoFactorEnabled && (
                            <div className="space-y-2">
                              <Label htmlFor="delete2FACode">
                                Two-Factor Code
                              </Label>
                              <Input
                                id="delete2FACode"
                                value={delete2FACode}
                                onChange={(e) =>
                                  setDelete2FACode(
                                    e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 6)
                                  )
                                }
                                placeholder="000000"
                                maxLength={6}
                                className="text-center text-2xl tracking-widest font-mono"
                              />
                            </div>
                          )}

                          {/* Confirmation Checkbox */}
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              id="deleteConfirm"
                              checked={deleteConfirmChecked}
                              onChange={(e) =>
                                setDeleteConfirmChecked(e.target.checked)
                              }
                              className="mt-1"
                            />
                            <Label
                              htmlFor="deleteConfirm"
                              className="text-sm cursor-pointer"
                            >
                              I understand this action is permanent and cannot
                              be undone
                            </Label>
                          </div>
                        </div>

                        <AlertDialogFooter>
                          <AlertDialogCancel
                            onClick={() => {
                              setDeletePassword("");
                              setDelete2FACode("");
                              setDeleteConfirmChecked(false);
                            }}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteAccountMutation.mutate()}
                            disabled={
                              ((user as any)?.passwordHash !== null &&
                                (user as any)?.passwordHash !== undefined &&
                                !deletePassword) || // Only require password if account has one
                              !deleteConfirmChecked ||
                              (user?.twoFactorEnabled &&
                                delete2FACode.length !== 6) ||
                              deleteAccountMutation.isPending
                            }
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deleteAccountMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Deleting...
                              </>
                            ) : (
                              "Delete My Account"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* 🆕 2FA Setup Modal */}
      <Dialog open={show2FASetupModal} onOpenChange={setShow2FASetupModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 🆕 ADD WARNING ABOUT MULTIPLE ENTRIES */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-900">
                  <p className="font-semibold mb-1">⚠️ Important:</p>
                  <p>
                    If you're re-setting up 2FA,{" "}
                    <strong>delete the old "LeadFlow CRM" entry</strong> from
                    your authenticator app first to avoid confusion.
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white border-2 border-slate-200 rounded-lg">
              {qrCode ? (
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              )}
            </div>

            {/* Manual Entry */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs font-semibold text-slate-700 mb-1">
                Can't scan? Enter this code manually:
              </p>
              <code className="text-xs font-mono text-slate-900 break-all">
                {manualEntryKey}
              </code>
            </div>

            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label htmlFor="verificationCode">
                Enter 6-digit code from your app
              </Label>
              <Input
                id="verificationCode"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>

            {/* Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900">
                  After verification, you'll receive 10 backup codes. Save them
                  in a secure place!
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShow2FASetupModal(false);
                  setVerificationCode("");
                }}
                className="flex-1"
                disabled={verify2FASetupMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => verify2FASetupMutation.mutate(verificationCode)}
                disabled={
                  verificationCode.length !== 6 ||
                  verify2FASetupMutation.isPending
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {verify2FASetupMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Enable"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🆕 Backup Codes Modal */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              2FA Enabled Successfully!
            </DialogTitle>
            <DialogDescription>
              Save these backup codes in a secure place
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Warning */}
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-900">
                  <p className="font-semibold mb-1">Important!</p>
                  <p>These codes will only be shown once. Save them now!</p>
                </div>
              </div>
            </div>

            {/* Backup Codes */}
            <div className="p-4 bg-slate-900 rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <code key={index} className="text-sm font-mono text-white">
                    {code}
                  </code>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  const text = backupCodes.join("\n");
                  navigator.clipboard.writeText(text);
                  toast({
                    title: "Copied!",
                    description: "Backup codes copied to clipboard",
                  });
                }}
                className="flex-1 gap-2"
              >
                <Save className="w-4 h-4" />
                Copy Codes
              </Button>
              <Button
                onClick={() => {
                  setShowBackupCodes(false);
                  setBackupCodes([]);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                I've Saved Them
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🆕 Disable 2FA Dialog */}

      <AlertDialog
        open={show2FADisableDialog}
        onOpenChange={setShow2FADisableDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Disable Two-Factor Authentication?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will make your account less secure. Please verify your
              identity.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            {/* ✅ Security Notice */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-900">
                  <p className="font-semibold mb-1">
                    Security Verification Required
                  </p>
                  <p>
                    {(user as any)?.passwordHash
                      ? "Enter your password and current 2FA code to confirm."
                      : "Enter your current 2FA code to confirm (no password needed for Google accounts)."}
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ Password Input (only if account has password) */}
            {(user as any)?.passwordHash && (
              <div className="space-y-2">
                <Label htmlFor="disablePassword">Password</Label>
                <Input
                  id="disablePassword"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
            )}

            {/* ✅ 2FA Code Input (REQUIRED for ALL accounts) */}
            <div className="space-y-2">
              <Label htmlFor="disable2FACode">Current 2FA Code</Label>
              <Input
                id="disable2FACode"
                value={disable2FACode}
                onChange={(e) =>
                  setDisable2FACode(
                    e.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
              />
              <p className="text-xs text-slate-500">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDisablePassword("");
                setDisable2FACode("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                disable2FAMutation.mutate();
              }}
              disabled={
                ((user as any)?.passwordHash && !disablePassword) || // Password required if account has one
                disable2FACode.length !== 6 || // 2FA code always required
                disable2FAMutation.isPending
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {disable2FAMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Disabling...
                </>
              ) : (
                "Disable 2FA"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ✅ NEW: Regenerate Backup Codes Modal */}
      <Dialog
        open={showRegenerateModal}
        onOpenChange={(open) => {
          setShowRegenerateModal(open);
          if (!open) {
            // Reset on close
            setRegenerateStep("input");
            setRegeneratePassword("");
            setRegenerate2FACode("");
            setBackupCodes([]);
          }
        }}
      >
        <DialogContent className="max-w-md">
          {regenerateStep === "input" ? (
            // ========== STEP 1: INPUT CREDENTIALS ==========
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  Regenerate Backup Codes
                </DialogTitle>
                <DialogDescription>
                  Create new backup codes for your account
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* ⚠️ Warning Box */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-yellow-900">
                      <p className="font-semibold mb-1">⚠️ Important:</p>
                      <p>
                        This will{" "}
                        <strong>invalidate all old backup codes</strong>. Any
                        unused codes will no longer work.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Security Notice */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-900">
                      <p className="font-semibold mb-1">
                        Security Verification
                      </p>
                      <p>
                        {(user as any)?.passwordHash
                          ? "Enter your password and current 2FA code to confirm."
                          : "Enter your current 2FA code to confirm (no password needed for Google accounts)."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Password Input (conditional) */}
                {(user as any)?.passwordHash && (
                  <div className="space-y-2">
                    <Label htmlFor="regeneratePassword">Password</Label>
                    <Input
                      id="regeneratePassword"
                      type="password"
                      value={regeneratePassword}
                      onChange={(e) => setRegeneratePassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                )}

                {/* 2FA Code Input (REQUIRED) */}
                <div className="space-y-2">
                  <Label htmlFor="regenerate2FACode">Current 2FA Code</Label>
                  <Input
                    id="regenerate2FACode"
                    value={regenerate2FACode}
                    onChange={(e) =>
                      setRegenerate2FACode(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                  <p className="text-xs text-slate-500">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRegenerateModal(false);
                      setRegeneratePassword("");
                      setRegenerate2FACode("");
                    }}
                    className="flex-1"
                    disabled={regenerateBackupCodesMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      regenerateBackupCodesMutation.mutate({
                        password: (user as any)?.passwordHash
                          ? regeneratePassword
                          : undefined,
                        code: regenerate2FACode,
                      });
                    }}
                    disabled={
                      ((user as any)?.passwordHash && !regeneratePassword) ||
                      regenerate2FACode.length !== 6 ||
                      regenerateBackupCodesMutation.isPending
                    }
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {regenerateBackupCodesMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            // ========== STEP 2: DISPLAY NEW CODES ==========
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  New Backup Codes Generated!
                </DialogTitle>
                <DialogDescription>
                  Save these codes in a secure place
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Success Message */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-green-900">
                      <p className="font-semibold mb-1">✅ Success!</p>
                      <p>
                        Your old backup codes have been invalidated. Use these
                        new codes if you lose access to your authenticator.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-red-900">
                      <p className="font-semibold mb-1">⚠️ Save These Now!</p>
                      <p>
                        These codes will only be shown once. Each code can be
                        used only one time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Backup Codes Display */}
                <div className="p-4 bg-slate-900 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <code
                        key={index}
                        className="text-sm font-mono text-white"
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const text = backupCodes.join("\n");
                      navigator.clipboard.writeText(text);
                      toast({
                        title: "Copied!",
                        description: "Backup codes copied to clipboard",
                      });
                    }}
                    className="flex-1 gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Copy Codes
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRegenerateModal(false);
                      setBackupCodes([]);
                      setRegeneratePassword("");
                      setRegenerate2FACode("");
                      setRegenerateStep("input");
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    I've Saved Them
                  </Button>
                </div>

                {/* Optional: Download as file */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const text = `LeadFlow CRM - Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join(
                      "\n"
                    )}\n\n⚠️ Keep these codes secure. Each code can only be used once.`;
                    const blob = new Blob([text], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `leadflow-backup-codes-${Date.now()}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    toast({
                      title: "Downloaded!",
                      description: "Backup codes saved to file",
                    });
                  }}
                  className="w-full text-xs"
                >
                  💾 Download as Text File
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ NEW: Deletion Progress Modal */}
      <Dialog open={showDeletionProgress} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deletionComplete ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Account Deleted
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                  Deleting Your Account
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {deletionComplete
                ? "Your account has been permanently deleted."
                : "Please wait while we remove all your data..."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            {!deletionComplete ? (
              <>
                {/* Progress Steps */}
                <div className="space-y-3">
                  {[
                    { icon: Shield, text: "Verifying credentials" },
                    { icon: RefreshCw, text: "Canceling subscription" },
                    { icon: MessageSquare, text: "Deleting conversations" },
                    { icon: User, text: "Deleting leads and clients" },
                    { icon: Calendar, text: "Removing bookings" },
                    { icon: BarChart3, text: "Clearing analytics" },
                    { icon: Zap, text: "Finalizing deletion" },
                  ].map((step, index) => {
                    const Icon = step.icon;
                    const isActive = deletionStep === index;
                    const isComplete = deletionStep > index;

                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isActive
                            ? "bg-red-50 border border-red-200"
                            : isComplete
                            ? "bg-green-50 border border-green-200"
                            : "bg-slate-50 border border-slate-200"
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 ${
                            isActive
                              ? "text-red-600"
                              : isComplete
                              ? "text-green-600"
                              : "text-slate-400"
                          }`}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : isActive ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            isActive
                              ? "text-red-900"
                              : isComplete
                              ? "text-green-900"
                              : "text-slate-500"
                          }`}
                        >
                          {step.text}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500 ease-out"
                    style={{ width: `${((deletionStep + 1) / 7) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Completion Screen */}
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-900">
                      All Done!
                    </p>
                    <p className="text-sm text-slate-600">
                      Your account and all associated data have been permanently
                      deleted.
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Check your email</strong> for confirmation and
                      details about what was deleted.
                    </p>
                  </div>

                  {/* Countdown */}
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-center gap-2 text-slate-600">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm">
                        Redirecting in{" "}
                        <strong className="text-slate-900">
                          {redirectCountdown}
                        </strong>{" "}
                        seconds...
                      </span>
                    </div>

                    <Button
                      onClick={() => (window.location.href = "/")}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Go to Home Now
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
