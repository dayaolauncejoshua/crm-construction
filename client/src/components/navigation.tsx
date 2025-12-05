// client/src/components/navigation.tsx
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home,
  Users,
  MessageCircle,
  BarChart3,
  Settings,
  Shield,
  Rocket,
  Crown,
  Menu,
  X,
  Calendar,
  Play,
  Zap,
  Palette,
  FileText,
  LogOut,
  DollarSign,
  Activity,
  Building2,
  CreditCard,
  User,
  ChevronDown,
  Mail,
} from "lucide-react";
import { useState } from "react";

interface MenuItem {
  path: string;
  label: string;
  icon: JSX.Element;
  badge?: string;
}

interface NavigationProps {
  userRole?: string;
  isTrialActive?: boolean;
  daysLeft?: number;
  unreadCount?: number;
  newLeadsCount?: number;
  user?: any;
  onSignOut?: () => void;
  clients?: any[];
  selectedClientId?: string;
  onClientChange?: (clientId: string) => void;
}

export default function Navigation({
  userRole = "user",
  isTrialActive = false,
  daysLeft = 0,
  unreadCount = 0,
  newLeadsCount = 0,
  user,
  onSignOut,
  clients = [],
  selectedClientId = "",
  onClientChange,
}: NavigationProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/" || path === "/super-admin") {
      return location === path;
    }
    return location === path || location.startsWith(path + "/");
  };

  // Helper function to get user display name
  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) return user.firstName;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  };

  // Helper function to get user initials
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) return user.firstName[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const userMenuItems: MenuItem[] = [
    { path: "/", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
    { path: "/clients", label: "Clients", icon: <Users className="w-4 h-4" /> },
    {
      path: "/conversations",
      label: "Conversations",
      icon: <MessageCircle className="w-4 h-4" />,
      badge: unreadCount > 0 ? unreadCount.toString() : undefined,
    },
    {
      path: "/leads",
      label: "Leads",
      icon: <Zap className="w-4 h-4" />,
      badge: newLeadsCount > 0 ? newLeadsCount.toString() : undefined,
    },
    {
      path: "/vsl",
      label: "VSL Generator",
      icon: <Play className="w-4 h-4" />,
    },
    {
      path: "/analytics",
      label: "Analytics",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      path: "/calendar",
      label: "Calendar",
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      path: "/follow-ups",
      label: "Follow-ups",
      icon: <Zap className="w-4 h-4" />,
    },
    // { path: "/sops", label: "SOPs", icon: <FileText className="w-4 h-4" /> },
    {
      path: "/subscription",
      label: "Subscription",
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      path: "/pricing",
      label: "Upgrade",
      icon: <Crown className="w-4 h-4" />,
    },
  ];

  const superAdminMenuItems: MenuItem[] = [
    {
      path: "/super-admin",
      label: "Dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      path: "/super-admin/users",
      label: "Users Management",
      icon: <Users className="w-4 h-4" />,
    },
    {
      path: "/super-admin/analytics",
      label: "Platform Analytics",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      path: "/super-admin/billing",
      label: "Billing & Revenue",
      icon: <DollarSign className="w-4 h-4" />,
    },
    {
      path: "/super-admin/monitoring",
      label: "System Monitoring",
      icon: <Activity className="w-4 h-4" />,
    },
    {
      path: "/super-admin/settings",
      label: "Platform Settings",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      path: "/white-label",
      label: "White Label",
      icon: <Palette className="w-4 h-4" />,
    },
  ];

  const menuItems =
    userRole === "super_admin" ? superAdminMenuItems : userMenuItems;

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // ✅ PROFESSIONAL USER PROFILE COMPONENT (Desktop)
  const DesktopUserProfile = () => (
    <div className="p-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start p-3 h-auto hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center space-x-3 w-full">
              <Avatar className="w-9 h-9 ring-2 ring-slate-200">
  {user?.profileImageUrl ? (
    <AvatarImage
      src={user.profileImageUrl}
      alt={getUserDisplayName()}
    />
  ) : null}
  <AvatarFallback className="bg-gradient-construction text-white text-sm font-semibold">
    {getUserInitials()}
  </AvatarFallback>
</Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {userRole === "super_admin"
                    ? "Super Admin"
                    : user?.email || ""}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-64"
          align="end"
          side="top"
          sideOffset={8}
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                {getUserDisplayName()}
              </p>
              <p className="text-xs text-slate-500 break-all">
                {user?.email || "No email"}
              </p>
              {userRole === "super_admin" && (
                <Badge className="w-fit mt-1 bg-purple-100 text-purple-700 hover:bg-purple-100">
                  <Shield className="w-3 h-3 mr-1" />
                  Super Admin
                </Badge>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setLocation("/settings")}
            className="cursor-pointer"
          >
            <User className="w-4 h-4 mr-2" />
            <span>Profile & Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => (window.location.href = "/subscription")}
            className="cursor-pointer"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            <span>Subscription</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onSignOut}
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ✅ PROFESSIONAL USER PROFILE COMPONENT (Mobile)
  const MobileUserProfile = () => (
    <div className="border-t border-slate-200 p-4">
      {userRole !== "super_admin" && isTrialActive && (
        <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Crown className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-amber-900">
              Trial: {daysLeft} {daysLeft === 1 ? "day" : "days"} left
            </span>
          </div>
          <Link href="/trial-unlock" onClick={closeMobileMenu}>
            <Button
              size="sm"
              className="w-full bg-gradient-construction hover:opacity-90 text-white"
            >
              Upgrade Now
            </Button>
          </Link>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start p-3 h-auto hover:bg-slate-100"
          >
            <div className="flex items-center space-x-3 w-full">
              <Avatar className="w-9 h-9 ring-2 ring-slate-200">
  {user?.profileImageUrl ? (
    <AvatarImage
      src={user.profileImageUrl}
      alt={getUserDisplayName()}
    />
  ) : null}
  <AvatarFallback className="bg-gradient-construction text-white text-sm font-semibold">
    {getUserInitials()}
  </AvatarFallback>
</Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {userRole === "super_admin"
                    ? "Super Admin"
                    : user?.email || ""}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72" align="end">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                {getUserDisplayName()}
              </p>
              <p className="text-xs text-slate-500 break-all">
                {user?.email || "No email"}
              </p>
              {userRole === "super_admin" && (
                <Badge className="w-fit mt-1 bg-purple-100 text-purple-700 hover:bg-purple-100">
                  <Shield className="w-3 h-3 mr-1" />
                  Super Admin
                </Badge>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setLocation("/settings")}
            className="cursor-pointer"
          >
            <User className="w-4 h-4 mr-2" />
            <span>Profile & Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              closeMobileMenu();
              window.location.href = "/subscription";
            }}
            className="cursor-pointer"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            <span>Subscription</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              closeMobileMenu();
              onSignOut?.();
            }}
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-4 py-3 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 bg-gradient-construction rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
              {userRole === "super_admin" ? (
                <Shield className="w-5 h-5 text-white" />
              ) : (
                <Rocket className="w-5 h-5 text-white" />
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              {userRole === "super_admin" ? "Admin Panel" : "AI Lead System"}
            </h1>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {userRole !== "super_admin" && isTrialActive && (
              <Badge
                variant="secondary"
                className="hidden xs:flex text-xs px-2 py-1"
              >
                {daysLeft}d
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <nav
        className={`md:hidden fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-8 h-8 bg-gradient-construction rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                  {userRole === "super_admin" ? (
                    <Shield className="w-5 h-5 text-white" />
                  ) : (
                    <Rocket className="w-5 h-5 text-white" />
                  )}
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                  {userRole === "super_admin"
                    ? "Admin Panel"
                    : "AI Lead System"}
                </h1>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeMobileMenu}
                className="flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="font-medium truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className="text-xs ml-2 flex-shrink-0"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile User Profile */}
          <MobileUserProfile />
        </div>
      </nav>

      {/* Desktop Unified Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 flex-col z-40 shadow-sm">
        {/* Header with Logo */}
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-construction rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
              {userRole === "super_admin" ? (
                <Shield className="w-5 h-5 text-white" />
              ) : (
                <Rocket className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-slate-900 truncate">
                {userRole === "super_admin" ? "Admin Panel" : "AI Lead System"}
              </h1>
              <p className="text-xs text-slate-600 truncate">
                {userRole === "super_admin"
                  ? "Platform Management"
                  : "Multi-Tenant Platform"}
              </p>
            </div>
          </div>
        </div>

        {/* Client Selector */}
        {userRole !== "super_admin" && clients && clients.length > 0 && (
          <div className="p-4 mx-4 mt-4 bg-slate-50 border border-slate-200 rounded-lg flex-shrink-0">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
              Active Client
            </label>
            <Select value={selectedClientId} onValueChange={onClientChange}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{client.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Main Navigation Items */}
        <div className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  <Button
                    variant={isActive(item.path) ? "default" : "ghost"}
                    className={`w-full justify-start text-left ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="ml-3 flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className="ml-auto text-xs flex-shrink-0"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-200 flex-shrink-0">
          {/* Trial Status */}
          {userRole !== "super_admin" && isTrialActive && (
            <div className="p-4 mx-4 mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Crown className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-amber-900 truncate">
                  Trial Active
                </span>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining
              </p>
              <Link href="/trial-unlock">
                <Button
                  size="sm"
                  className="w-full bg-gradient-construction hover:opacity-90 text-white text-xs py-2"
                >
                  Upgrade Now
                </Button>
              </Link>
            </div>
          )}

          {/* Desktop User Profile */}
          <DesktopUserProfile />
        </div>
      </nav>
    </>
  );
}
