// client/src/components/ui/sidebar.tsx

import { Link } from "wouter";
import {
  Bot,
  Users,
  TrendingUp,
  MessageCircle,
  Video,
  Calendar,
  Settings,
  User,
  LogOut,
  Activity,
  Zap,
  Palette,
  BookOpen,
  
} from "lucide-react";

interface SidebarProps {
  selectedClientId: string;
  onClientChange: (clientId: string) => void;
  clients: any[];
  hotLeadsCount: number;
  activeLeadsCount: number;
  unreadCount: number;
}

export function Sidebar({
  selectedClientId,
  onClientChange,
  clients,
  hotLeadsCount,
  activeLeadsCount,
  unreadCount,
}: SidebarProps) {
  return (
    <div className="w-64 bg-white shadow-sm border-r border-slate-200 flex flex-col">
      {/* Logo Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">AI Lead System</h1>
            <p className="text-sm text-slate-500">Multi-Tenant Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center space-x-3 px-4 py-3 bg-primary/10 text-primary rounded-lg font-medium"
        >
          <TrendingUp className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/clients"
          className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Users className="w-5 h-5" />
          <span>Clients</span>
          <span className="ml-auto bg-accent text-white text-xs px-2 py-1 rounded-full">
            {clients.length}
          </span>
        </Link>

        <Link
          href="/leads"
          className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <TrendingUp className="w-5 h-5" />
          <span>Leads</span>
          <span className="ml-auto bg-warning text-white text-xs px-2 py-1 rounded-full">
            {activeLeadsCount}
          </span>
        </Link>

        <Link
          href="/conversations"
          className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Conversations</span>
          {unreadCount > 0 && (
            <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </Link>

        <Link
          href="/vsl"
          className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Video className="w-5 h-5" />
          <span>VSL Generator</span>
        </Link>

        <Link
          href="/analytics"
          className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <TrendingUp className="w-5 h-5" />
          <span>Analytics</span>
        </Link>

        <Link
          href="/calendar"
          className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Calendar className="w-5 h-5" />
          <span>Calendar</span>
        </Link>

        <Link
          href="/monitoring"
          className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Activity className="w-5 h-5" />
          <span>Monitoring</span>
        </Link>

        <Link
          href="/follow-ups"
          className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Zap className="w-5 h-5" />
          <span>Follow-ups</span>
        </Link>

        <Link
          href="/white-label"
          className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Palette className="w-5 h-5" />
          <span>White Label</span>
        </Link>
{/* 
        <Link
          href="/sops"
          className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <BookOpen className="w-5 h-5" />
          <span>SOPs</span>
        </Link> */}

        <Link
          href="/settings"
          className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
            <User className="text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-900">Demo User</p>
            <p className="text-sm text-slate-500">Admin</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
