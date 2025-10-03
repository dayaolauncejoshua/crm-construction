// client/src/pages/super-admin.tsx

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  Crown,
  Calendar,
  BarChart3,
  Shield,
  Settings,
  Database,
  Zap
} from "lucide-react";

export default function SuperAdmin() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserStatus, setSelectedUserStatus] = useState("all");

  // Fetch super admin dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/super-admin/dashboard", selectedTimeRange],
    retry: false,
  });

  // Fetch all users with filters
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/super-admin/users", searchQuery, selectedUserStatus],
    retry: false,
  });

  // Fetch system metrics
  const { data: systemMetrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["/api/super-admin/metrics", selectedTimeRange],
    retry: false,
  });

  // Fetch recent activities
  const { data: recentActivities, isLoading: loadingActivities } = useQuery({
    queryKey: ["/api/super-admin/activities"],
    retry: false,
  });

  // Mock data for demo (replace with real data when API is ready)
  const mockDashboardData = {
    totalUsers: 1247,
    activeTrials: 89,
    expiredTrials: 23,
    totalRevenue: 124500,
    conversionRate: 24.8,
    avgTrialLength: 12.4,
    dailySignups: 15,
    weeklyGrowth: 8.3
  };

  const mockUsers = [
    {
      id: "1",
      email: "john@techstartup.com",
      firstName: "John",
      lastName: "Smith",
      subscriptionType: "trial",
      isTrialActive: true,
      trialEndsAt: "2024-02-01T00:00:00Z",
      loginCount: 24,
      lastLoginAt: "2024-01-18T10:30:00Z",
      createdAt: "2024-01-10T08:00:00Z",
      clientsCount: 3,
      leadsCount: 156
    },
    {
      id: "2", 
      email: "sarah@localservices.com",
      firstName: "Sarah",
      lastName: "Johnson",
      subscriptionType: "pro",
      isTrialActive: false,
      trialEndsAt: null,
      loginCount: 67,
      lastLoginAt: "2024-01-18T14:15:00Z",
      createdAt: "2023-12-05T10:00:00Z",
      clientsCount: 8,
      leadsCount: 423
    },
    {
      id: "3",
      email: "mike@enterprise.com",
      firstName: "Mike",
      lastName: "Chen",
      subscriptionType: "enterprise",
      isTrialActive: false,
      trialEndsAt: null,
      loginCount: 156,
      lastLoginAt: "2024-01-18T16:45:00Z",
      createdAt: "2023-11-12T09:30:00Z",
      clientsCount: 25,
      leadsCount: 1289
    }
  ];

  const mockActivities = [
    {
      id: "1",
      userId: "1",
      userEmail: "john@techstartup.com",
      action: "trial_activated",
      resource: "trial",
      details: { source: "dashboard", trialDays: 14 },
      createdAt: "2024-01-18T16:30:00Z"
    },
    {
      id: "2",
      userId: "2",
      userEmail: "sarah@localservices.com", 
      action: "feature_used",
      resource: "leads",
      details: { feature: "ai_qualification", count: 12 },
      createdAt: "2024-01-18T16:15:00Z"
    },
    {
      id: "3",
      userId: "3",
      userEmail: "mike@enterprise.com",
      action: "client_created",
      resource: "clients",
      details: { clientName: "New Corp", industry: "Technology" },
      createdAt: "2024-01-18T15:45:00Z"
    }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubscriptionBadge = (type: string) => {
    switch (type) {
      case "trial":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Trial</Badge>;
      case "pro":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Pro</Badge>;
      case "enterprise":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Enterprise</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "trial_activated":
        return <Zap className="w-4 h-4 text-blue-500" />;
      case "feature_used":
        return <Activity className="w-4 h-4 text-green-500" />;
      case "client_created":
        return <Users className="w-4 h-4 text-purple-500" />;
      case "login":
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading super admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
              <p className="text-slate-600">Complete system oversight and management</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockDashboardData.totalUsers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">+{mockDashboardData.dailySignups} today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockDashboardData.activeTrials}</div>
                  <p className="text-xs text-muted-foreground">{mockDashboardData.expiredTrials} expired</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${mockDashboardData.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">+{mockDashboardData.weeklyGrowth}% this week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockDashboardData.conversionRate}%</div>
                  <p className="text-xs text-muted-foreground">Trial to paid</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent User Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockActivities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                          {getActionIcon(activity.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {activity.userEmail}
                          </p>
                          <p className="text-sm text-slate-600 capitalize">
                            {activity.action.replace('_', ' ')} • {activity.resource}
                          </p>
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatDate(activity.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">API Response Time</span>
                      </div>
                      <span className="text-sm font-medium">125ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Database Performance</span>
                      </div>
                      <span className="text-sm font-medium">Optimal</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">WhatsApp Integration</span>
                      </div>
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">Notion Integration</span>
                      </div>
                      <span className="text-sm font-medium">Setup Required</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* User Filters */}
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <Select value={selectedUserStatus} onValueChange={setSelectedUserStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="trial">Trial Users</SelectItem>
                      <SelectItem value="pro">Pro Users</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="expired">Expired Trials</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Users Table */}
                <div className="space-y-4">
                  {mockUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-700">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-slate-600">{user.email}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            {getSubscriptionBadge(user.subscriptionType)}
                            {user.isTrialActive && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                Trial Active
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-900">
                          {user.clientsCount} clients • {user.leadsCount} leads
                        </div>
                        <div className="text-sm text-slate-600">
                          {user.loginCount} logins • Last: {formatDate(user.lastLoginAt)}
                        </div>
                        <div className="text-sm text-slate-600">
                          Joined: {formatDate(user.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="w-3 h-3 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                          {getActionIcon(activity.action)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {activity.userEmail}
                          </div>
                          <div className="text-sm text-slate-600 capitalize">
                            {activity.action.replace('_', ' ')} on {activity.resource}
                          </div>
                          {activity.details && (
                            <div className="text-sm text-slate-500 mt-1">
                              {JSON.stringify(activity.details)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-slate-600">
                        {formatDate(activity.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Database Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Users</span>
                      <span className="font-medium">1,247</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Clients</span>
                      <span className="font-medium">3,891</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Leads</span>
                      <span className="font-medium">127,456</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Conversations</span>
                      <span className="font-medium">89,234</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database Size</span>
                      <span className="font-medium">2.4 GB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Response Time</span>
                      <span className="font-medium text-green-600">1.2s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Uptime (30 days)</span>
                      <span className="font-medium text-green-600">99.8%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Error Rate</span>
                      <span className="font-medium text-green-600">0.02%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Memory Usage</span>
                      <span className="font-medium text-yellow-600">67%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">CPU Usage</span>
                      <span className="font-medium text-green-600">23%</span>
                    </div>
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