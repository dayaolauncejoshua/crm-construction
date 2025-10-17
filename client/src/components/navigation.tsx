// client/src/components/navigation.tsx

import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  Bell,
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
  CreditCard
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
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/" || path === "/super-admin") {
      return location === path;
    }
    return location === path || location.startsWith(path + "/");
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
    { path: "/sops", label: "SOPs", icon: <FileText className="w-4 h-4" /> },

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

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-4 py-3 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-construction rounded-lg flex items-center justify-center shadow-lg">
              {userRole === "super_admin" ? (
                <Shield className="w-5 h-5 text-white" />
              ) : (
                <Rocket className="w-5 h-5 text-white" />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {userRole === "super_admin" ? "Admin Panel" : "AI Lead System"}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            {userRole !== "super_admin" && isTrialActive && (
              <Badge variant="secondary" className="hidden sm:flex text-xs">
                {daysLeft} days left
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
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <nav
        className={`md:hidden fixed top-0 right-0 h-full w-80 bg-white border-l border-slate-200 transform transition-transform duration-300 ease-in-out z-50 ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-construction rounded-lg flex items-center justify-center shadow-lg">
                  {userRole === "super_admin" ? (
                    <Shield className="w-5 h-5 text-white" />
                  ) : (
                    <Rocket className="w-5 h-5 text-white" />
                  )}
                </div>
                <h1 className="text-xl font-bold text-slate-900">
                  {userRole === "super_admin"
                    ? "Admin Panel"
                    : "AI Lead System"}
                </h1>
              </div>
              <Button variant="ghost" size="sm" onClick={closeMobileMenu}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

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
                  <div className="flex items-center space-x-3">
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 p-4">
            {userRole !== "super_admin" && isTrialActive && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900">
                    Trial: {daysLeft} days left
                  </span>
                </div>
                <Link href="/trial-unlock">
                  <Button
                    size="sm"
                    className="w-full mt-2 bg-amber-600 hover:bg-amber-700"
                  >
                    Upgrade Now
                  </Button>
                </Link>
              </div>
            )}

            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
              <Avatar className="w-8 h-8">
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback className="bg-blue-600 text-white text-sm">
                  {user?.firstName?.[0] ||
                    user?.email?.[0]?.toUpperCase() ||
                    "U"}
                  {user?.lastName?.[0] || ""}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "User"}
                </p>
                <p className="text-xs text-slate-500">
                  {userRole === "super_admin"
                    ? "Super Admin"
                    : user?.email || ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={onSignOut}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Unified Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 flex-col z-40">
        {/* Header with Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-construction rounded-lg flex items-center justify-center shadow-lg">
              {userRole === "super_admin" ? (
                <Shield className="w-5 h-5 text-white" />
              ) : (
                <Rocket className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {userRole === "super_admin" ? "Admin Panel" : "AI Lead System"}
              </h1>
              <p className="text-xs text-slate-600">
                {userRole === "super_admin"
                  ? "Platform Management"
                  : "Multi-Tenant Platform"}
              </p>
            </div>
          </div>
        </div>

        {/* 🔥 CLIENT SELECTOR - ADDED HERE */}
        {userRole !== "super_admin" && clients && clients.length > 0 && (
          <div className="p-4 mx-4 mt-4 bg-slate-50 border border-slate-200 rounded-lg">
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
                      <Building2 className="w-4 h-4 mr-2 text-slate-400" />
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
                    {item.icon}
                    <span className="ml-3 flex-1">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-slate-200">
          {/* ✅ TRIAL STATUS - MOVED TO BOTTOM */}
          {userRole !== "super_admin" && isTrialActive && (
            <div className="p-4 mx-4 mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Crown className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-900">
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

          {/* User Profile Section */}
          <div className="p-4">
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
              <Avatar className="w-8 h-8">
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback className="bg-gradient-construction text-white text-sm">
                  {user?.firstName?.[0] ||
                    user?.email?.[0]?.toUpperCase() ||
                    "U"}
                  {user?.lastName?.[0] || ""}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "User"}
                </p>
                <p className="text-xs text-slate-500">
                  {userRole === "super_admin"
                    ? "Super Admin"
                    : user?.email || ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={onSignOut}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
