// client/src/pages/dashboard.tsx

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useClient } from "@/contexts/ClientContext";
import { KPICard } from "@/components/ui/kpi-card";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLocation } from "wouter";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Bot,
  TrendingUp,
  Clock,
  Percent,
  MessageCircle,
  Calendar,
  Users,
  Flame,
  Wind,
  Snowflake,
  AlertCircle,
  CheckCircle,
  Video,
  UserPlus,
  ArrowRight,
  PhoneCall,
  Mail,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedClientId } = useClient();
  const [, setLocation] = useLocation();

  // WebSocket for real-time updates
  const { data: wsData, isConnected } = useWebSocket();

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading,
    refetch,
  } = useQuery<{
    conversations: any[];
    hotLeads: any[];
    kpis: any;
    recentActivity: any[];
    leads: any[];
    bookings: any[];
  }>({
    queryKey: [`/api/dashboard/${selectedClientId}`],
    enabled: !!selectedClientId,
  });

  // Fetch system health
  const { data: systemHealth } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 30000,
  }) as {
    data:
      | {
          whatsapp?: string;
          ai?: string;
          vsl?: string;
          calendar?: string;
          uptime?: string;
        }
      | undefined;
  };

  // Handle real-time updates
  useEffect(() => {
    if (wsData) {
      console.log("WebSocket update:", wsData);
      refetch();
    }
  }, [wsData, refetch]);

  // Skeleton Loader
  if (isLoading && selectedClientId) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="h-8 bg-slate-200 rounded w-64 animate-pulse mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-96 animate-pulse"></div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="h-96 bg-slate-100 rounded animate-pulse"></div>
        </main>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {
    totalLeads: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    aiHandledPercentage: 0,
  };

  const conversations = dashboardData?.conversations || [];
  const hotLeads = dashboardData?.hotLeads || [];
  const recentActivity = dashboardData?.recentActivity || [];
  const leads = dashboardData?.leads || [];

  const hasData = kpis.totalLeads > 0 || conversations.length > 0;

  // Prepare chart data
  const leadTrendData = [
    { name: "Week 1", leads: 12, conversions: 3 },
    { name: "Week 2", leads: 19, conversions: 5 },
    { name: "Week 3", leads: 15, conversions: 4 },
    { name: "Week 4", leads: 25, conversions: 8 },
  ];

  const temperatureData = [
    {
      name: "Hot",
      value: leads.filter((l: any) => l.temperature === "hot").length,
      color: "#ef4444",
    },
    {
      name: "Warm",
      value: leads.filter((l: any) => l.temperature === "warm").length,
      color: "#f59e0b",
    },
    {
      name: "Cold",
      value: leads.filter((l: any) => l.temperature === "cold").length,
      color: "#3b82f6",
    },
  ];

  const responseTimeData = [
    { time: "Mon", avgTime: 2.5 },
    { time: "Tue", avgTime: 1.8 },
    { time: "Wed", avgTime: 2.1 },
    { time: "Thu", avgTime: 1.5 },
    { time: "Fri", avgTime: 2.0 },
    { time: "Sat", avgTime: 1.2 },
    { time: "Sun", avgTime: 1.7 },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Welcome back, {user?.firstName || "User"}! 👋
            </h2>
            <p className="text-slate-600 mt-1">
              Here's what's happening with your leads today
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Quick Action Buttons - Moved Here */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/conversations")}
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Conversations</span>
              <Badge variant="secondary" className="text-xs">
                {conversations.length}
              </Badge>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/leads")}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Leads</span>
              <Badge variant="secondary" className="text-xs">
                {kpis.totalLeads}
              </Badge>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/calendar")}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </Button>

            {/* Status Indicator */}
            <div
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
                isConnected
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              ></div>
              <span className="font-medium hidden sm:inline">
                {isConnected ? "Live" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Empty State */}
        {!hasData ? (
          <div className="h-full flex items-center justify-center p-6">
            <Card className="max-w-2xl w-full">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  No Data Yet
                </h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  Start generating leads to see your dashboard come to life with
                  insights and analytics
                </p>

                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setLocation("/clients")}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Setup WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/conversations")}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    View Conversations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Total Leads"
                value={kpis.totalLeads.toLocaleString()}
                change="+12.5%"
                changeType="positive"
                icon={<TrendingUp className="text-blue-600 text-xl" />}
                bgColor="bg-blue-50"
                subtitle="Last 30 days"
              />
              <KPICard
                title="Conversion Rate"
                value={`${kpis.conversionRate.toFixed(1)}%`}
                change="+3.2%"
                changeType="positive"
                icon={<Percent className="text-green-600 text-xl" />}
                bgColor="bg-green-50"
                subtitle="Lead to booking"
              />
              <KPICard
                title="Response Time"
                value={`${(kpis.avgResponseTime / 60).toFixed(1)}min`}
                change="-15s"
                changeType="positive"
                icon={<Clock className="text-orange-600 text-xl" />}
                bgColor="bg-orange-50"
                subtitle="Average"
              />
              <KPICard
                title="AI Automated"
                value={`${kpis.aiHandledPercentage.toFixed(0)}%`}
                change="+5.1%"
                changeType="positive"
                icon={<Bot className="text-purple-600 text-xl" />}
                bgColor="bg-purple-50"
                subtitle="Conversations"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - 2/3 width */}
              <div className="lg:col-span-2 space-y-6">
                {/* Lead Generation Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Lead Generation Trend</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation("/analytics")}
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={leadTrendData}>
                        <defs>
                          <linearGradient
                            id="colorLeads"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorConversions"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10b981"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10b981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="leads"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorLeads)"
                        />
                        <Area
                          type="monotone"
                          dataKey="conversions"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorConversions)"
                        />
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Temperature Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Lead Temperature
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={temperatureData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {temperatureData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center space-x-4 mt-4">
                        {temperatureData.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center space-x-2"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="text-sm text-slate-600">
                              {item.name}: {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Response Time Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Response Time (min)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={responseTimeData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis dataKey="time" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="avgTime"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={{ fill: "#f59e0b" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Right Column - 1/3 width */}
              <div className="space-y-6">
                {/* Needs Attention */}
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Flame className="w-5 h-5 text-red-500 mr-2" />
                      Needs Attention
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hotLeads.length > 0 ? (
                      <div className="space-y-3">
                        {hotLeads.slice(0, 5).map((lead: any) => (
                          <div
                            key={lead.id}
                            className="p-3 bg-red-50 rounded-lg border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                            onClick={() =>
                              setLocation(`/conversations?leadId=${lead.id}`)
                            }
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="font-medium text-slate-900 text-sm">
                                {lead.lead?.firstName} {lead.lead?.lastName}
                              </div>
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                🔥 Hot
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-600">
                              {lead.lead?.company || "No company"}
                            </div>
                            <div className="flex items-center space-x-2 mt-2 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(
                                  lead.lastMessageAt
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="link"
                          className="w-full text-sm text-red-600"
                          onClick={() => setLocation("/leads")}
                        >
                          View all hot leads →
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">
                          No urgent leads
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          All caught up!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {recentActivity
                          .slice(0, 6)
                          .map((activity: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-start space-x-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  activity.type === "booking"
                                    ? "bg-green-100"
                                    : activity.type === "vsl"
                                    ? "bg-orange-100"
                                    : "bg-blue-100"
                                }`}
                              >
                                {activity.type === "booking" && (
                                  <CheckCircle className="text-green-600 w-4 h-4" />
                                )}
                                {activity.type === "vsl" && (
                                  <Video className="text-orange-600 w-4 h-4" />
                                )}
                                {activity.type === "lead" && (
                                  <UserPlus className="text-blue-600 w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-900 font-medium truncate">
                                  {activity.description}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {activity.leadName || activity.company} •{" "}
                                  {new Date(
                                    activity.createdAt
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">
                          No activity yet
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* System Health */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">System Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-slate-700">
                            WhatsApp
                          </span>
                        </div>
                        <span className="text-xs text-green-600 font-medium">
                          {systemHealth?.whatsapp || "Active"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-slate-700">
                            AI System
                          </span>
                        </div>
                        <span className="text-xs text-green-600 font-medium">
                          {systemHealth?.ai || "Active"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              systemHealth?.vsl === "maintenance"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                          ></div>
                          <span className="text-sm text-slate-700">VSL</span>
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            systemHealth?.vsl === "maintenance"
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {systemHealth?.vsl || "Active"}
                        </span>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Uptime</span>
                          <span className="text-xs font-semibold text-slate-900">
                            {systemHealth?.uptime || "99.8%"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
