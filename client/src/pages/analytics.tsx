import { usePageTitle } from "@/hooks/usePageTitle";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Clock,
  Target,
  Activity,
  Zap,
  Brain,
  ThumbsUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  timeRange: number;
  summary: {
    totalLeads: number;
    totalConversations: number;
    totalBookings: number;
    conversionRate: string;
    avgTimeToBook: string;
  };
  leadTrend: Array<{ date: string; leads: number }>;
  responseTimeByHour: Array<{
    hour: number;
    hourLabel: string;
    totalTime: number;
    count: number;
    avgTime: number;
  }>;
  temperatureData: Array<{ name: string; value: number; color: string }>;
  statusData: Array<{ status: string; count: number; percentage: string }>;
  aiPerformance: {
    totalAiHandled: number;
    totalHumanHandled: number;
    aiPercentage: string;
    aiAvgResponseTime: number;
    humanAvgResponseTime: number;
    aiQualificationRate: string;
    handoffRate: string;
    aiSpeedAdvantage: string;
  };
  bookingTimeline: any[];
  conversionFunnel?: {
    leads: { count: number; percentage: number };
    qualified: { count: number; percentage: number };
    meetings: { count: number; percentage: number };
    proposals: { count: number; percentage: number };
    closed: { count: number; percentage: number };
  };
}

export default function Analytics() {
  usePageTitle("Analytics & Reporting");
  const { selectedClientId } = useClient();
  const [timeRange, setTimeRange] = useState("30");
  const [, setLocation] = useLocation();

  const {
    data: analyticsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<AnalyticsData>({
    queryKey: [`/api/analytics/${selectedClientId}`, timeRange],
    queryFn: async () => {
      const response = await fetch(
        `/api/analytics/${selectedClientId}?timeRange=${timeRange}`
      );
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: !!selectedClientId,
    retry: 2,
    staleTime: 30000,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Process lead trend for area chart
  const leadTrendData = useMemo(() => {
    if (!analyticsData?.leadTrend) return [];
    return analyticsData.leadTrend.map((item) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [analyticsData?.leadTrend]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-2">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <h2 className="text-xl font-bold text-slate-900">
            Analytics & Reporting
          </h2>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Failed to load analytics</div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  // Empty state
  if (!analyticsData || analyticsData.summary.totalLeads === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Analytics & Reporting
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Data-driven insights for optimization
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </header>
        {/* Refreshing Indicator */}
        {isFetching && !isLoading && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Updating analytics...</span>
            </div>
          </div>
        )}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => setLocation("/dashboard")}
                  className="cursor-pointer"
                >
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Analytics</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Empty State Card */}
          <div
            className="flex items-center justify-center"
            style={{ minHeight: "calc(100vh - 250px)" }}
          >
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Analytics Data Yet
              </h3>
              <p className="text-slate-600 mb-4">
                Start capturing leads to see your analytics and performance
                metrics here.
              </p>
              <Button onClick={() => setLocation("/leads")} className="gap-2">
                <Users className="w-4 h-4" />
                View Leads
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }
  const summary = analyticsData.summary;
  const aiPerf = analyticsData.aiPerformance;

  // Conversion funnel data
  const conversionFunnelData = analyticsData.conversionFunnel
    ? [
        {
          stage: "Leads",
          count: analyticsData.conversionFunnel.leads.count,
          percentage: analyticsData.conversionFunnel.leads.percentage,
          color: "#3b82f6",
        },
        {
          stage: "Qualified",
          count: analyticsData.conversionFunnel.qualified.count,
          percentage: analyticsData.conversionFunnel.qualified.percentage,
          color: "#8b5cf6",
        },
        {
          stage: "Meetings",
          count: analyticsData.conversionFunnel.meetings.count,
          percentage: analyticsData.conversionFunnel.meetings.percentage,
          color: "#06b6d4",
        },
        {
          stage: "Proposals",
          count: analyticsData.conversionFunnel.proposals.count,
          percentage: analyticsData.conversionFunnel.proposals.percentage,
          color: "#f97316",
        },
        {
          stage: "Closed",
          count: analyticsData.conversionFunnel.closed.count,
          percentage: analyticsData.conversionFunnel.closed.percentage,
          color: "#10b981",
        },
      ]
    : [
        // Fallback if no funnel data
        {
          stage: "Leads",
          count: summary.totalLeads,
          percentage: 100,
          color: "#3b82f6",
        },
        { stage: "Qualified", count: 0, percentage: 0, color: "#8b5cf6" },
        {
          stage: "Meetings",
          count: summary.totalBookings,
          percentage: parseFloat(summary.conversionRate),
          color: "#06b6d4",
        },
        { stage: "Proposals", count: 0, percentage: 0, color: "#f97316" },
        { stage: "Closed", count: 0, percentage: 0, color: "#10b981" },
      ];
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Analytics & Reporting
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Data-driven insights for optimization
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => setLocation("/dashboard")}
                className="cursor-pointer"
              >
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Analytics</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="text-sm font-medium text-slate-600">
                Total Leads
              </div>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {summary.totalLeads}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Last {timeRange} days
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="text-sm font-medium text-slate-600">
                Conversion Rate
              </div>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {summary.conversionRate}%
              </div>
              <p className="text-xs text-slate-500 mt-1">Leads → Bookings</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="text-sm font-medium text-slate-600">
                Total Bookings
              </div>
              <Target className="h-4 w-4 text-construction" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {summary.totalBookings}
              </div>
              <p className="text-xs text-slate-500 mt-1">Meetings scheduled</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="text-sm font-medium text-slate-600">
                Avg Time to Book
              </div>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {summary.avgTimeToBook}h
              </div>
              <p className="text-xs text-slate-500 mt-1">
                From lead to booking
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          {/* Tab Navigation with Underline Style */}
          <div className="border-b border-slate-200 pb-0 mb-6">
            <div className="flex gap-6 overflow-x-auto">
              <TabsList className="bg-transparent h-auto p-0 gap-6 border-0">
                <TabsTrigger
                  value="overview"
                  className="relative bg-transparent border-0 shadow-none px-1 pb-3 text-slate-600 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-none transition-colors after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-construction after:transition-all"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  <span>Overview</span>
                </TabsTrigger>

                <TabsTrigger
                  value="performance"
                  className="relative bg-transparent border-0 shadow-none px-1 pb-3 text-slate-600 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-none transition-colors after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-construction after:transition-all"
                >
                  <Target className="w-4 h-4 mr-2" />
                  <span>Performance</span>
                </TabsTrigger>

                <TabsTrigger
                  value="ai"
                  className="relative bg-transparent border-0 shadow-none px-1 pb-3 text-slate-600 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-none transition-colors after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-construction after:transition-all"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  <span>AI Insights</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* ========== OVERVIEW TAB ========== */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lead Generation Trend */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Lead Generation Trend
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Total lead volume over time
                  </p>
                </CardHeader>
                <CardContent>
                  {leadTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
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
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="date"
                          stroke="#64748b"
                          style={{ fontSize: "11px" }}
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
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center">
                      <p className="text-sm text-slate-500">
                        No data available
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lead Temperature */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">Lead Temperature</CardTitle>
                  <p className="text-xs text-slate-500">
                    Hot, Warm, and Cold lead distribution
                  </p>
                </CardHeader>
                <CardContent>
                  {analyticsData.temperatureData?.some((d) => d.value > 0) ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={analyticsData.temperatureData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {analyticsData.temperatureData.map(
                              (entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              )
                            )}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center space-x-4 mt-4">
                        {analyticsData.temperatureData.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center space-x-2"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm text-slate-700 font-medium">
                              {item.name}{" "}
                              {item.value > 0
                                ? `${Math.round(
                                    (item.value / summary.totalLeads) * 100
                                  )}%`
                                : "0%"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center">
                      <p className="text-sm text-slate-500">
                        No temperature data
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Conversion Funnel */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-base">Conversion Funnel</CardTitle>
                <p className="text-xs text-slate-500">
                  Lead journey from first contact to close
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {conversionFunnelData.map((stage, index) => (
                    <div key={stage.stage} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                            style={{ backgroundColor: stage.color }}
                          >
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-slate-900">
                            {stage.stage}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-600">
                            {stage.count} leads
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {stage.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full transition-all rounded-full"
                          style={{
                            width: `${stage.percentage}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== PERFORMANCE TAB ========== */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Response Time by Hour */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Response Time by Hour
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Average response speed throughout the day
                  </p>
                </CardHeader>
                <CardContent>
                  {analyticsData.responseTimeByHour?.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={analyticsData.responseTimeByHour}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="hourLabel"
                            stroke="#64748b"
                            style={{ fontSize: "10px" }}
                            interval={2}
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
                            }}
                          />
                          <Bar
                            dataKey="avgTime"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={40}
                          >
                            {analyticsData.responseTimeByHour.map(
                              (entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    entry.count === 0
                                      ? "#e2e8f0"
                                      : entry.avgTime <= 30
                                      ? "#10b981"
                                      : entry.avgTime <= 60
                                      ? "#3b82f6"
                                      : entry.avgTime <= 120
                                      ? "#f59e0b"
                                      : "#ef4444"
                                  }
                                />
                              )
                            )}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center gap-3 mt-4 text-xs flex-wrap">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-[#10b981]"></div>
                          <span>Fast ≤30s</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-[#3b82f6]"></div>
                          <span>OK ≤1m</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-[#f59e0b]"></div>
                          <span>Slow ≤2m</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-[#ef4444]"></div>
                          <span>Sound ≤60s</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center">
                      <p className="text-sm text-slate-500">
                        No data available
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lead Status Pipeline */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Lead Status Pipeline
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Current status distribution
                  </p>
                </CardHeader>
                <CardContent>
                  {analyticsData.statusData?.length > 0 ? (
                    <div className="space-y-4">
                      {analyticsData.statusData.map((status, index) => (
                        <div key={status.status} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-900 capitalize">
                              {status.status}
                            </span>
                            <span className="text-sm text-slate-600">
                              {status.count}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${status.percentage}%`,
                                backgroundColor: [
                                  "#3b82f6",
                                  "#8b5cf6",
                                  "#06b6d4",
                                  "#f97316",
                                  "#10b981",
                                ][index % 5],
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center">
                      <p className="text-sm text-slate-500">
                        No data available
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Key Performance Metrics */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Key Performance Metrics
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Month-over-month comparison
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-sm text-slate-600 mb-2 flex items-center justify-center gap-2">
                      <Target className="w-4 h-4 text-green-600" />
                      Qualification Rate
                    </div>
                    <div className="text-4xl font-bold text-slate-900 mb-2">
                      {aiPerf.aiQualificationRate}%
                    </div>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      +2.5%
                    </Badge>
                    <p className="text-xs text-slate-500 mt-2">
                      Leads qualified successfully
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-slate-600 mb-2 flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Avg Response Time
                    </div>
                    <div className="text-4xl font-bold text-slate-900 mb-2">
                      {aiPerf.aiAvgResponseTime}s
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      -12%
                    </Badge>
                    <p className="text-xs text-slate-500 mt-2">
                      Faster than last month
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-slate-600 mb-2 flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4 text-construction" />
                      Close Rate
                    </div>
                    <div className="text-4xl font-bold text-slate-900 mb-2">
                      {summary.conversionRate}%
                    </div>
                    <Badge className="bg-orange-100 text-construction hover:bg-orange-100">
                      +2.2%
                    </Badge>
                    <p className="text-xs text-slate-500 mt-2">
                      From qualified to closed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== AI INSIGHTS TAB ========== */}
          <TabsContent value="ai" className="space-y-6">
            {/* AI Performance KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <div className="text-sm font-medium text-slate-600">
                      AI Automation Rate
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {aiPerf.aiPercentage}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    of all conversations
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                    <div className="text-sm font-medium text-slate-600">
                      Qualification Rate
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {aiPerf.aiQualificationRate}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    AI qualified leads (score ≥0.7)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-construction">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-construction" />
                    <div className="text-sm font-medium text-slate-600">
                      Speed Advantage
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {aiPerf.aiSpeedAdvantage}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Faster than human response
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-purple-600" />
                    <div className="text-sm font-medium text-slate-600">
                      Handoff Rate
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {aiPerf.handoffRate}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    AI → Human intervention
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* AI vs Human + Performance Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI vs Human Response Time */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    AI vs Human Response Time
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Average first response comparison
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* AI Agent */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium">AI Agent</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">
                          {aiPerf.aiAvgResponseTime}s
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-4">
                        <div
                          className="bg-blue-600 h-4 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              (aiPerf.aiAvgResponseTime / 120) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Human Agent */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-construction" />
                          <span className="text-sm font-medium">
                            Human Agent
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-construction">
                          {aiPerf.humanAvgResponseTime}s
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-4">
                        <div
                          className="bg-construction h-4 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              (aiPerf.humanAvgResponseTime / 120) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Winner Badge */}
                    {aiPerf.aiAvgResponseTime > 0 &&
                      aiPerf.humanAvgResponseTime > 0 && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-900">
                            🏆 AI is{" "}
                            <span className="font-bold">
                              {(
                                aiPerf.humanAvgResponseTime /
                                aiPerf.aiAvgResponseTime
                              ).toFixed(1)}
                              x faster
                            </span>{" "}
                            at first response!
                          </p>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>

              {/* AI Performance Breakdown */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    AI Performance Breakdown
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Detailed AI efficiency metrics
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageCircle className="w-5 h-5 text-slate-600" />
                        <div>
                          <p className="text-sm font-medium">Total Handled</p>
                          <p className="text-xs text-slate-500">
                            Conversations managed by AI
                          </p>
                        </div>
                      </div>
                      <span className="text-xl font-bold">
                        {aiPerf.totalAiHandled.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Target className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Qualified Leads</p>
                          <p className="text-xs text-slate-500">
                            Leads ≥0.7 threshold
                          </p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-green-600">
                        {aiPerf.aiQualificationRate}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="text-sm font-medium">Handoff Events</p>
                          <p className="text-xs text-slate-500">
                            Transferred to humans
                          </p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-purple-600">
                        {aiPerf.handoffRate}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Response Speed</p>
                          <p className="text-xs text-slate-500">
                            vs human baseline
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-blue-600 text-white">
                        {aiPerf.aiSpeedAdvantage} faster
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Performance Summary */}
            <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                      AI Performance Summary
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Your AI is handling{" "}
                      <span className="font-bold text-blue-600">
                        {aiPerf.aiPercentage}%
                      </span>{" "}
                      of conversations with an average response time of{" "}
                      <span className="font-bold text-blue-600">
                        {aiPerf.aiAvgResponseTime} seconds
                      </span>
                      . The qualification rate is{" "}
                      <span className="font-bold text-green-600">
                        {aiPerf.aiQualificationRate}%
                      </span>
                      , meaning most leads are properly scored. Only{" "}
                      <span className="font-bold text-purple-600">
                        {aiPerf.handoffRate}%
                      </span>{" "}
                      require human intervention, demonstrating strong
                      autonomous performance.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        High Qualification Rate
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        Fast Response Time
                      </Badge>
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                        Low Handoff Rate
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
