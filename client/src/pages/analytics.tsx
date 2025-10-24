// client/src/pages/analytics.tsx
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
  LabelList,
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
  Calendar,
  MessageCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { Badge } from "@/components/ui/badge";

// ✅ Type definitions
interface LeadTrendData {
  date: string;
  leads: number;
}

interface ResponseTimeData {
  hour: number;
  hourLabel: string;
  totalTime: number;
  count: number;
  avgTime: number;
}

interface TemperatureData {
  name: string;
  value: number;
  color: string;
}

interface StatusData {
  status: string;
  count: number;
  percentage: string;
}

interface AIPerformance {
  totalAiHandled: number;
  totalHumanHandled: number;
  aiPercentage: string;
  aiAvgResponseTime: number;
  humanAvgResponseTime: number;
  aiQualificationRate: string;
  handoffRate: string;
  aiSpeedAdvantage: string;
}

interface AnalyticsSummary {
  totalLeads: number;
  totalConversations: number;
  totalBookings: number;
  conversionRate: string;
  avgTimeToBook: string;
}

interface AnalyticsData {
  timeRange: number;
  summary: AnalyticsSummary;
  leadTrend: LeadTrendData[];
  responseTimeByHour: ResponseTimeData[];
  temperatureData: TemperatureData[];
  statusData: StatusData[];
  aiPerformance: AIPerformance;
  bookingTimeline: any[];
}

export default function Analytics() {
  usePageTitle("Analytics & Reporting");
  const { selectedClientId } = useClient();
  const [timeRange, setTimeRange] = useState("30");
  const [, setLocation] = useLocation();

  // ✅ Fetch analytics data with error handling
  const {
    data: analyticsData,
    isLoading,
    error,
    refetch,
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
    staleTime: 30000, // 30 seconds
  });

  // ✅ Process lead trend for better visualization
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

  // ✅ PROFESSIONAL LOADING STATE
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {/* KPI Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-2">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24 mb-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Chart Skeletons */}
          <Skeleton className="h-10 w-full mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i} className="border-2">
                <CardHeader>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-3 w-64" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[280px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ✅ PROFESSIONAL ERROR STATE
  if (error) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Analytics & Reporting
          </h2>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <div className="font-semibold mb-2">Failed to load analytics</div>
              <p className="text-sm mb-4">
                {error instanceof Error
                  ? error.message
                  : "An unexpected error occurred"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  // ✅ PROFESSIONAL EMPTY STATE
  if (!analyticsData || analyticsData.summary.totalLeads === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Analytics & Reporting
          </h2>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center">
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
        </main>
      </div>
    );
  }

  const summary = analyticsData.summary;
  const aiPerf = analyticsData.aiPerformance;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Analytics & Reporting
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              Data-driven insights for optimization
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Leads
              </CardTitle>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Conversion Rate
              </CardTitle>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Bookings
              </CardTitle>
              <Calendar className="h-4 w-4 text-construction" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {summary.totalBookings}
              </div>
              <p className="text-xs text-slate-500 mt-1">Meetings scheduled</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Avg Time to Book
              </CardTitle>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="ai">AI Insights</TabsTrigger>
          </TabsList>

          {/* ===== OVERVIEW TAB ===== */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ✅ FIXED: Lead Trend Chart */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Lead Generation Trend
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Daily lead capture over time
                  </p>
                </CardHeader>
                <CardContent>
                  {leadTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={leadTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="date"
                          stroke="#64748b"
                          style={{ fontSize: "11px" }}
                          angle={-45}
                          textAnchor="end"
                          height={70}
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
                          formatter={(value: number) => [value, "Leads"]}
                        />
                        <Bar
                          dataKey="leads"
                          fill="#2563eb"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={60}
                        >
                          <LabelList
                            dataKey="leads"
                            position="top"
                            fill="#1e293b"
                            fontSize={12}
                            fontWeight={600}
                          />
                          {leadTrendData.map((entry: LeadTrendData, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.leads > 0 ? "#2563eb" : "#e2e8f0"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-slate-500">
                      <div className="text-center">
                        <Activity className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm">No lead data for this period</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Temperature Distribution */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">Lead Temperature</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
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
                            label={({ name, value }) =>
                              value > 0 ? `${value}` : ""
                            }
                          >
                            {analyticsData.temperatureData.map(
                              (entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
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
                            ></div>
                            <span className="text-sm text-slate-700 font-medium">
                              {item.name}: {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-slate-500">
                      <div className="text-center">
                        <Activity className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm">No temperature data available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== PERFORMANCE TAB ===== */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ✅ Response Time by Hour - ALL 24 HOURS */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Response Time by Hour
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
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
                            label={{
                              value: "Seconds",
                              angle: -90,
                              position: "insideLeft",
                              style: { fontSize: "12px" },
                            }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => [
                              `${value}s`,
                              "Avg Response",
                            ]}
                          />
                          <Bar
                            dataKey="avgTime"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={40}
                          >
                            {analyticsData.responseTimeByHour.map(
                              (entry: ResponseTimeData, index: number) => (
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
                      {/* Legend */}
                      <div className="flex justify-center gap-3 mt-4 text-xs flex-wrap">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-[#10b981]"></div>
                          <span className="text-slate-600">Fast ≤30s</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-[#3b82f6]"></div>
                          <span className="text-slate-600">Good ≤60s</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-[#f59e0b]"></div>
                          <span className="text-slate-600">OK ≤2min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-[#ef4444]"></div>
                          <span className="text-slate-600">Slow ≥2min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-[#e2e8f0]"></div>
                          <span className="text-slate-600">No data</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-slate-500">
                      <div className="text-center">
                        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm">No response time data</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ✅ Lead Status Distribution with Labels */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Lead Status Pipeline
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Current status distribution
                  </p>
                </CardHeader>
                <CardContent>
                  {analyticsData.statusData?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={analyticsData.statusData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="status"
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
                        <Bar
                          dataKey="count"
                          fill="#2563eb"
                          radius={[8, 8, 0, 0]}
                        >
                          <LabelList
                            dataKey="count"
                            position="top"
                            fill="#1e293b"
                            fontSize={12}
                            fontWeight={600}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-slate-500">
                      <div className="text-center">
                        <Activity className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm">No status data available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== AI INSIGHTS TAB ===== */}
          <TabsContent value="ai" className="space-y-6">
            {/* AI Performance Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    AI Automation Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {aiPerf.aiPercentage}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {aiPerf.totalAiHandled} of{" "}
                    {aiPerf.totalAiHandled + aiPerf.totalHumanHandled}{" "}
                    conversations
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                    Qualification Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {aiPerf.aiQualificationRate}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    AI qualified leads (score ≥40%)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-construction hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-construction" />
                    Speed Advantage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {aiPerf.aiSpeedAdvantage || "N/A"}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Faster than human response
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-purple-600" />
                    Handoff Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {aiPerf.handoffRate}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    AI → Human transfers
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* AI vs Human Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    AI vs Human Response Time
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Average first response comparison
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* AI Response */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Brain className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            AI Agent
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">
                          {aiPerf.aiAvgResponseTime}s
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              (aiPerf.aiAvgResponseTime / 120) * 100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Human Response */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-construction/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-construction" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            Human Agent
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-construction">
                          {aiPerf.humanAvgResponseTime}s
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div
                          className="bg-construction h-3 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              (aiPerf.humanAvgResponseTime / 120) * 100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Winner Badge */}
                    {aiPerf.aiAvgResponseTime > 0 &&
                      aiPerf.humanAvgResponseTime > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-900 font-medium">
                            🏆 AI is{" "}
                            <span className="font-bold">
                              {Math.round(
                                (aiPerf.humanAvgResponseTime -
                                  aiPerf.aiAvgResponseTime) /
                                  aiPerf.aiAvgResponseTime
                              )}
                              x faster
                            </span>{" "}
                            at first response!
                          </p>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>

              {/* AI Performance Metrics */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    AI Performance Breakdown
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Detailed AI efficiency metrics
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageCircle className="w-5 h-5 text-slate-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Total Handled
                          </p>
                          <p className="text-xs text-slate-500">
                            Conversations managed by AI
                          </p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-slate-900">
                        {aiPerf.totalAiHandled}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Target className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Qualified Leads
                          </p>
                          <p className="text-xs text-slate-500">
                            Score ≥40% threshold
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
                          <p className="text-sm font-medium text-slate-900">
                            Handoff Events
                          </p>
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
                          <p className="text-sm font-medium text-slate-900">
                            Response Speed
                          </p>
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

            {/* AI Insights Summary */}
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
                      automation efficiency.
                    </p>
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