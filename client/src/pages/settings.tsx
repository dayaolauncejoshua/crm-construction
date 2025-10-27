// client/src/pages/settings.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";

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

  // Notification Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [whatsappNotifications, setWhatsappNotifications] = useState(true);
  const [leadNotifications, setLeadNotifications] = useState(true);
  const [bookingNotifications, setBookingNotifications] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);

  // Regional Settings
  const [timezone, setTimezone] = useState("America/New_York");
  const [language, setLanguage] = useState("en");

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
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Success",
        description: "Your password has been changed successfully.",
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
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Change Password */}
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
                    {/* Password Strength Indicator */}
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
                            style={{ width: `${passwordStrength.percentage}%` }}
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

              {/* Security Features */}
              <div className="space-y-6">
                {/* Two-Factor Authentication */}
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Two-Factor Authentication
                    </CardTitle>
                    <CardDescription>Add extra security layer</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            2FA Disabled
                          </p>
                          <p className="text-xs text-slate-500">
                            Not configured
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Enable
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Active Sessions */}
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Active Sessions</CardTitle>
                    <CardDescription>Manage your devices</CardDescription>
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
              </div>
            </div>
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
                      onCheckedChange={setEmailNotifications}
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
                      onCheckedChange={setWhatsappNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-900">
                        <strong>How it works:</strong> Notifications are sent to
                        your email and WhatsApp based on your preferences. You
                        can customize which events trigger notifications below.
                      </p>
                    </div>
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
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-construction" />
                      </div>
                      <div className="space-y-0.5">
                        <Label>New Lead Alerts</Label>
                        <p className="text-sm text-slate-500">
                          When new leads come in
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={leadNotifications}
                      onCheckedChange={setLeadNotifications}
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
                      onCheckedChange={setBookingNotifications}
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
                      onCheckedChange={setWeeklyReports}
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
                        Permanently delete account and data
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
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete your account and remove all your data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                            Delete Account
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
    </div>
  );
}
