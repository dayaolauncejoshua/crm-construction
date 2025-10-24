// client/src/pages/dashboard.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
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
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import VerificationBanner from "@/components/VerificationBanner";
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
  
  Legend,
  Tooltip
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
  AlertCircle,
  CheckCircle,
  Video,
  UserPlus,
  ArrowRight,
  HardHat,
  BarChart3
} from "lucide-react";
import {
  Tooltip as Tooltip1,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";



export default function Dashboard() {
  const { user } = useAuth();
  const { selectedClientId } = useClient();
  const [, setLocation] = useLocation();

  usePageTitle(
    user?.firstName ? `Dashboard - ${user?.firstName}` : "Dashboard"
  );

  const { data: wsData, isConnected } = useWebSocket();

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

  // Lead Trend Data
  // ✅ NEW: Lead Trend Data with REAL DATE RANGES + WORKING CONVERSIONS
  const leadTrendData = React.useMemo(() => {
    const bookings = dashboardData?.bookings || [];

    if (!leads || leads.length === 0) {
      // Get current date range even with no data
      const now = new Date();
      const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

      return [
        {
          name: formatWeekRange(
            fourWeeksAgo,
            new Date(fourWeeksAgo.getTime() + 7 * 24 * 60 * 60 * 1000)
          ),
          leads: 0,
          conversions: 0,
        },
        {
          name: formatWeekRange(
            new Date(fourWeeksAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
            new Date(fourWeeksAgo.getTime() + 14 * 24 * 60 * 60 * 1000)
          ),
          leads: 0,
          conversions: 0,
        },
        {
          name: formatWeekRange(
            new Date(fourWeeksAgo.getTime() + 14 * 24 * 60 * 60 * 1000),
            new Date(fourWeeksAgo.getTime() + 21 * 24 * 60 * 60 * 1000)
          ),
          leads: 0,
          conversions: 0,
        },
        {
          name: formatWeekRange(
            new Date(fourWeeksAgo.getTime() + 21 * 24 * 60 * 60 * 1000),
            now
          ),
          leads: 0,
          conversions: 0,
        },
      ];
    }

    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    // Helper function to format date range
    function formatWeekRange(start: Date, end: Date): string {
      const startMonth = start.toLocaleDateString("en-US", { month: "short" });
      const endMonth = end.toLocaleDateString("en-US", { month: "short" });
      const startDay = start.getDate();
      const endDay = end.getDate();

      // If same month: "Oct 18-24"
      if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}`;
      }
      // If different months: "Oct 28-Nov 3"
      return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
    }

    const weeklyData = [
      {
        name: formatWeekRange(
          fourWeeksAgo,
          new Date(fourWeeksAgo.getTime() + 7 * 24 * 60 * 60 * 1000)
        ),
        leads: 0,
        conversions: 0,
        start: new Date(fourWeeksAgo.getTime()),
        end: new Date(fourWeeksAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        name: formatWeekRange(
          new Date(fourWeeksAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
          new Date(fourWeeksAgo.getTime() + 14 * 24 * 60 * 60 * 1000)
        ),
        leads: 0,
        conversions: 0,
        start: new Date(fourWeeksAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
        end: new Date(fourWeeksAgo.getTime() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        name: formatWeekRange(
          new Date(fourWeeksAgo.getTime() + 14 * 24 * 60 * 60 * 1000),
          new Date(fourWeeksAgo.getTime() + 21 * 24 * 60 * 60 * 1000)
        ),
        leads: 0,
        conversions: 0,
        start: new Date(fourWeeksAgo.getTime() + 14 * 24 * 60 * 60 * 1000),
        end: new Date(fourWeeksAgo.getTime() + 21 * 24 * 60 * 60 * 1000),
      },
      {
        name: formatWeekRange(
          new Date(fourWeeksAgo.getTime() + 21 * 24 * 60 * 60 * 1000),
          now
        ),
        leads: 0,
        conversions: 0,
        start: new Date(fourWeeksAgo.getTime() + 21 * 24 * 60 * 60 * 1000),
        end: now,
      },
    ];

    // ✅ FIX: Count leads AND conversions properly
    leads.forEach((lead: any) => {
      const createdAt = new Date(lead.createdAt);
      const weekIndex = weeklyData.findIndex(
        (w) => createdAt >= w.start && createdAt < w.end
      );

      if (weekIndex !== -1) {
        // Count all leads
        weeklyData[weekIndex].leads++;

        // ✅ NEW: Check if this lead has a booking (conversion)
        const hasBooking = bookings.some((b: any) => b.leadId === lead.id);
        if (hasBooking) {
          weeklyData[weekIndex].conversions++;
        }
      }
    });

    return weeklyData.map(({ name, leads, conversions }) => ({
      name,
      leads,
      conversions,
    }));
  }, [leads, dashboardData?.bookings]);

  // ✅ NEW: Calculate date range for subtitle
  const dateRangeText = React.useMemo(() => {
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const startDate = fourWeeksAgo.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endDate = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startDate} - ${endDate}`;
  }, []);

  // Temperature Data
  const temperatureData = [
    {
      name: "Hot",
      value: leads.filter((l: any) => l.temperature === "hot").length,
      color: "#ea580c",
    },
    {
      name: "Warm",
      value: leads.filter((l: any) => l.temperature === "warm").length,
      color: "#f59e0b",
    },
    {
      name: "Cold",
      value: leads.filter((l: any) => l.temperature === "cold").length,
      color: "#2563eb",
    },
  ];

  // ✅ NEW: Response Time Data with AI vs Human
  const responseTimeData = React.useMemo(() => {
    if (!conversations || conversations.length === 0) {
      return [
        { day: "Mon", aiTime: 0, humanTime: 0 },
        { day: "Tue", aiTime: 0, humanTime: 0 },
        { day: "Wed", aiTime: 0, humanTime: 0 },
        { day: "Thu", aiTime: 0, humanTime: 0 },
        { day: "Fri", aiTime: 0, humanTime: 0 },
        { day: "Sat", aiTime: 0, humanTime: 0 },
        { day: "Sun", aiTime: 0, humanTime: 0 },
      ];
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekData = dayNames.map((day) => ({
      day,
      aiTime: 0,
      aiCount: 0,
      humanTime: 0,
      humanCount: 0,
    }));

    conversations.forEach((conv: any) => {
      if (conv.lead?.responseTimeSeconds) {
        const createdAt = new Date(conv.createdAt);
        const dayIndex = createdAt.getDay();
        const timeInMinutes = conv.lead.responseTimeSeconds / 60;

        if (conv.isAiHandled) {
          weekData[dayIndex].aiTime += timeInMinutes;
          weekData[dayIndex].aiCount++;
        } else {
          weekData[dayIndex].humanTime += timeInMinutes;
          weekData[dayIndex].humanCount++;
        }
      }
    });

    return weekData.map((day) => ({
      day: day.day,
      aiTime:
        day.aiCount > 0 ? Number((day.aiTime / day.aiCount).toFixed(1)) : 0,
      humanTime:
        day.humanCount > 0
          ? Number((day.humanTime / day.humanCount).toFixed(1))
          : 0,
    }));
  }, [conversations]);

  useEffect(() => {
    if (wsData) {
      console.log("WebSocket update:", wsData);
      refetch();
    }
  }, [wsData, refetch]);

  if (isLoading && selectedClientId) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <Skeleton className="h-8 w-1/2 mb-2" />
                  <Skeleton className="h-3 w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <VerificationBanner />

      <header className="bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
  {/* DESKTOP HEADER (md and up) */}
  <div className="hidden md:block px-4 lg:px-6 py-4">
    <div className="flex items-center justify-between gap-4">
      {/* Left: Welcome Section */}
      <div className="flex-1 min-w-0">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-900 truncate">
          Welcome back, {user?.firstName || "User"}! 👋
        </h2>
        <p className="text-sm lg:text-base text-slate-600 mt-1 truncate">
          Here's what's happening with your leads today
        </p>
      </div>

      {/* Right: Action Buttons + Status */}
      <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
        {/* Conversations Button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip1>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/conversations")}
                className="gap-2 border-2 hover:border-construction/30 hover:bg-construction/5 transition-all"
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                <span className="hidden lg:inline">Conversations</span>
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    {conversations.length}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">View all conversations</p>
            </TooltipContent>
          </Tooltip1>
        </TooltipProvider>

        {/* Leads Button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip1>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/leads")}
                className="gap-2 border-2 hover:border-construction/30 hover:bg-construction/5 transition-all"
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="hidden lg:inline">Leads</span>
                {kpis.totalLeads > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    {kpis.totalLeads}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Manage your leads</p>
            </TooltipContent>
          </Tooltip1>
        </TooltipProvider>

        {/* Calendar Button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip1>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/calendar")}
                className="gap-2 border-2 hover:border-construction/30 hover:bg-construction/5 transition-all"
              >
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="hidden xl:inline">Calendar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">View calendar</p>
            </TooltipContent>
          </Tooltip1>
        </TooltipProvider>

        {/* Status Indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
            isConnected
              ? "bg-gradient-to-r from-blue-50 to-orange-50 text-construction border border-construction/20"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-construction animate-pulse" : "bg-red-500"
            }`}
          ></div>
          <span className="hidden xl:inline">
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>
      </div>
    </div>
  </div>

  {/* MOBILE/TABLET HEADER (below md) */}
  <div className="md:hidden px-4 py-3 space-y-3">
    {/* Row 1: Welcome + Status */}
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
          Welcome, {user?.firstName || "User"}! 👋
        </h2>
        <p className="text-xs text-slate-600 mt-0.5 truncate">
          Track your leads today
        </p>
      </div>
      
      {/* Compact Status Indicator */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-sm flex-shrink-0 ${
          isConnected
            ? "bg-gradient-to-r from-blue-50 to-orange-50 text-construction border border-construction/20"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}
      >
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isConnected ? "bg-construction animate-pulse" : "bg-red-500"
          }`}
        ></div>
        <span className="whitespace-nowrap">{isConnected ? "Live" : "Off"}</span>
      </div>
    </div>

    {/* Row 2: Action Buttons - Horizontal Scroll */}
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLocation("/conversations")}
        className="gap-2 border-2 hover:border-construction/30 hover:bg-construction/5 flex-shrink-0 min-w-fit"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-xs font-medium">Chats</span>
        {conversations.length > 0 && (
          <Badge variant="secondary" className="text-xs h-5 px-1.5 ml-1">
            {conversations.length}
          </Badge>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setLocation("/leads")}
        className="gap-2 border-2 hover:border-construction/30 hover:bg-construction/5 flex-shrink-0 min-w-fit"
      >
        <Users className="w-4 h-4" />
        <span className="text-xs font-medium">Leads</span>
        {kpis.totalLeads > 0 && (
          <Badge variant="secondary" className="text-xs h-5 px-1.5 ml-1">
            {kpis.totalLeads}
          </Badge>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setLocation("/calendar")}
        className="gap-2 border-2 hover:border-construction/30 hover:bg-construction/5 flex-shrink-0 min-w-fit"
      >
        <Calendar className="w-4 h-4" />
        <span className="text-xs font-medium">Calendar</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setLocation("/analytics")}
        className="gap-2 border-2 hover:border-construction/30 hover:bg-construction/5 flex-shrink-0 min-w-fit"
      >
        <BarChart3 className="w-4 h-4" />
        <span className="text-xs font-medium">Analytics</span>
      </Button>
    </div>
  </div>
</header>

      <main className="flex-1 overflow-hidden">
        {!hasData ? (
          <div className="h-full flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full border-2">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-construction rounded-full flex items-center justify-center mx-auto mb-6">
                  <HardHat className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  No Data Yet
                </h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  Start generating leads to see your dashboard come to life with
                  insights and analytics
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => setLocation("/clients")}
                    className="bg-gradient-construction hover:opacity-90 text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Setup WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/conversations")}
                    className="border-2 hover:border-construction/30"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    View Conversations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="p-4 flex flex-col h-full">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total Leads"
                value={kpis.totalLeads.toLocaleString()}
                change={
                  kpis.totalLeadsChange && kpis.totalLeadsChange !== 0
                    ? `${
                        kpis.totalLeadsChange > 0 ? "+" : ""
                      }${kpis.totalLeadsChange.toFixed(1)}%`
                    : undefined
                }
                changeType={kpis.totalLeadsChange > 0 ? "positive" : "negative"}
                icon={<TrendingUp className="text-construction text-xl" />}
                bgColor="bg-orange-50"
                subtitle="vs previous 30 days"
              />

              <KPICard
                title="Conversion Rate"
                value={`${kpis.conversionRate.toFixed(1)}%`}
                change={
                  kpis.conversionRateChange && kpis.conversionRateChange !== 0
                    ? `${
                        kpis.conversionRateChange > 0 ? "+" : ""
                      }${kpis.conversionRateChange.toFixed(1)}%`
                    : undefined
                }
                changeType={
                  kpis.conversionRateChange > 0 ? "positive" : "negative"
                }
                icon={<Percent className="text-primary text-xl" />}
                bgColor="bg-blue-50"
                subtitle={
                  kpis.convertedLeads !== undefined
                    ? `${kpis.convertedLeads} of ${kpis.totalLeads} leads booked`
                    : "Lead to booking"
                }
                tooltip="Percentage of leads who booked a meeting"
              />

              <KPICard
                title="AI Response Time"
                value={
                  kpis.aiAvgResponseTime && kpis.aiAvgResponseTime > 0
                    ? `${(kpis.aiAvgResponseTime / 60).toFixed(1)}min`
                    : "N/A"
                }
                change={
                  kpis.avgResponseTimeChange && kpis.avgResponseTimeChange !== 0
                    ? `${Math.abs(kpis.avgResponseTimeChange).toFixed(1)}%`
                    : undefined
                }
                changeType={
                  kpis.avgResponseTimeChange < 0 ? "positive" : "negative"
                }
                icon={<Clock className="text-construction text-xl" />}
                bgColor="bg-orange-50"
                subtitle="Average first response"
                tooltip="Time until AI agent responds to new lead"
              />

              <KPICard
                title="AI Automated"
                value={`${kpis.aiHandledPercentage.toFixed(0)}%`}
                change={
                  kpis.aiHandledPercentageChange &&
                  kpis.aiHandledPercentageChange !== 0
                    ? `${
                        kpis.aiHandledPercentageChange > 0 ? "+" : ""
                      }${kpis.aiHandledPercentageChange.toFixed(1)}%`
                    : undefined
                }
                changeType={
                  kpis.aiHandledPercentageChange > 0 ? "positive" : "negative"
                }
                icon={<Bot className="text-primary text-xl" />}
                bgColor="bg-blue-50"
                subtitle="Conversations handled by AI"
              />
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5">
              {/* LEFT COLUMN */}
              <div className="lg:col-span-2 flex flex-col h-full space-y-6">
                {/* LEAD TREND CHART */}
                <Card className="flex-none border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div>
                        <span>Lead Generation Trend</span>
                        <p className="text-sm font-normal text-slate-500 mt-1">
                          📅 {dateRangeText} (Last 28 days)
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation("/analytics")}
                        className="hover:bg-construction/10 hover:text-construction"
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
                              stopColor="#2563eb"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#2563eb"
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
                              stopColor="#ea580c"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#ea580c"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          style={{ fontSize: "11px" }}
                          tick={{ fill: "#64748b" }}
                        />
                        <YAxis
                          stroke="#64748b"
                          style={{ fontSize: "11px" }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          labelStyle={{
                            fontWeight: "bold",
                            marginBottom: "4px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="leads"
                          stroke="#2563eb"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorLeads)"
                        />
                        <Area
                          type="monotone"
                          dataKey="conversions"
                          stroke="#ea580c"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorConversions)"
                        />
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* CHARTS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* TEMPERATURE CHART */}
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Lead Temperature
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie
                            data={temperatureData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
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

                  {/* ✅ NEW: DUAL-AXIS RESPONSE TIME CHART */}
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Response Time</span>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                            <span className="text-slate-600">AI</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-construction"></div>
                            <span className="text-slate-600">Human</span>
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={170}>
                        <LineChart data={responseTimeData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="day"
                            stroke="#64748b"
                            style={{ fontSize: "11px" }}
                          />
                          {/* LEFT Y-AXIS: AI */}
                          <YAxis
                            yAxisId="left"
                            stroke="#2563eb"
                            width={35}
                            style={{ fontSize: "11px" }}
                          />
                          {/* RIGHT Y-AXIS: Human */}
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#ea580c"
                            width={35}
                            style={{ fontSize: "11px" }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              fontSize: "12px",
                            }}
                            formatter={(value: number, name: string) => [
                              `${value} min`,
                              name === "aiTime" ? "AI" : "Human",
                            ]}
                          />
                          {/* AI LINE */}
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="aiTime"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={{ fill: "#2563eb", r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          {/* HUMAN LINE */}
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="humanTime"
                            stroke="#ea580c"
                            strokeWidth={2}
                            dot={{ fill: "#ea580c", r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>

                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">
                            {kpis.aiAvgResponseTime
                              ? `${(kpis.aiAvgResponseTime / 60).toFixed(1)}m`
                              : "N/A"}
                          </div>
                          <div className="text-xs text-slate-500">Avg AI</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-construction">
                            {kpis.humanAvgResponseTime
                              ? `${(kpis.humanAvgResponseTime / 60).toFixed(
                                  1
                                )}m`
                              : "N/A"}
                          </div>
                          <div className="text-xs text-slate-500">
                            Avg Human
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="flex flex-col h-full justify-between space-y-6">
                {/* NEEDS ATTENTION */}
                <Card className="border-l-4 border-l-construction">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Flame className="w-5 h-5 text-construction mr-2" />
                      Needs Attention
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[320px] overflow-y-auto scrollbar-hide">
                    {hotLeads.length > 0 ? (
                      <div className="space-y-3">
                        {hotLeads.slice(0, 5).map((lead: any) => (
                          <div
                            key={lead.id}
                            className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-2 border-construction/20 cursor-pointer hover:border-construction/40 transition-colors"
                            onClick={() =>
                              setLocation(`/conversations?leadId=${lead.id}`)
                            }
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="font-medium text-slate-900 text-sm">
                                {lead.lead?.firstName} {lead.lead?.lastName}
                              </div>
                              <Badge className="bg-construction/10 text-construction border border-construction/20 text-xs">
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
                          className="w-full text-sm text-construction hover:text-construction/80"
                          onClick={() => setLocation("/leads")}
                        >
                          View all hot leads →
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="w-8 h-8 text-construction mx-auto mb-2" />
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

                {/* RECENT ACTIVITY */}
                <Card className="border-l-4 border-l-primary">
                  <CardHeader>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[125px] overflow-y-auto scrollbar-hide">
                    {recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {recentActivity.map((activity: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-start space-x-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                activity.type === "booking"
                                  ? "bg-construction/10"
                                  : activity.type === "vsl"
                                  ? "bg-primary/10"
                                  : "bg-construction/10"
                              }`}
                            >
                              {activity.type === "booking" && (
                                <CheckCircle className="text-construction w-4 h-4" />
                              )}
                              {activity.type === "vsl" && (
                                <Video className="text-primary w-4 h-4" />
                              )}
                              {activity.type === "lead" && (
                                <UserPlus className="text-construction w-4 h-4" />
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

                {/* SYSTEM STATUS */}
                <Card className="border-l-4 border-l-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">System Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-construction rounded-full"></div>
                          <span className="text-sm text-slate-700">
                            WhatsApp
                          </span>
                        </div>
                        <span className="text-xs text-construction font-medium">
                          {systemHealth?.whatsapp || "Active"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="text-sm text-slate-700">
                            AI System
                          </span>
                        </div>
                        <span className="text-xs text-primary font-medium">
                          {systemHealth?.ai || "Active"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              systemHealth?.vsl === "maintenance"
                                ? "bg-amber-500"
                                : "bg-construction"
                            }`}
                          ></div>
                          <span className="text-sm text-slate-700">VSL</span>
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            systemHealth?.vsl === "maintenance"
                              ? "text-amber-600"
                              : "text-construction"
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
