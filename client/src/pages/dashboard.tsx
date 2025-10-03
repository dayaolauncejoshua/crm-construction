import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { KPICard } from "@/components/ui/kpi-card";
import { LiveConversations } from "@/components/ui/live-conversations";
import { useWebSocket } from "@/hooks/useWebSocket";
import { 
  Bot, 
  TrendingUp, 
  Clock, 
  Percent, 
  Plus,
  CheckCircle,
  AlertTriangle,
  Video,
  UserPlus
} from "lucide-react";

export default function Dashboard() {
  const { clientId } = useParams();
  const [selectedClientId, setSelectedClientId] = useState(clientId || "demo-client");
  const [activeTab, setActiveTab] = useState("conversations");

  // WebSocket for real-time updates
  const { data: wsData, isConnected } = useWebSocket();

  // Fetch dashboard data
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ["/api/dashboard", selectedClientId],
    enabled: !!selectedClientId,
  }) as { 
    data: { 
      kpis?: any; 
      conversations?: any[]; 
      hotLeads?: any[]; 
      recentActivity?: any[] 
    } | undefined; 
    isLoading: boolean; 
    refetch: () => void 
  };

  // Fetch clients list
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch(`/api/clients?userId=demo-user`);
      return response.json();
    },
  });

  // Fetch system health
  const { data: systemHealth } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 30000, // Refresh every 30 seconds
  }) as { data: { whatsapp?: string; ai?: string; vsl?: string; calendar?: string; uptime?: string } | undefined };

  // Handle real-time updates
  useEffect(() => {
    if (wsData) {
      console.log("WebSocket update:", wsData);
      // Refetch data when we get updates
      refetch();
    }
  }, [wsData, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Dashboard Overview</h2>
              <p className="text-sm sm:text-base text-slate-600">Monitor your AI lead generation performance</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Response Time Indicator */}
              <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="font-medium">
                  Avg Response: {(kpis.avgResponseTime / 60).toFixed(1)}min
                </span>
              </div>
              <Button className="bg-primary text-white hover:bg-primary/90 w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <KPICard
              title="Total Leads Generated"
              value={kpis.totalLeads.toLocaleString()}
              change="+12.5%"
              changeType="positive"
              icon={<TrendingUp className="text-primary text-xl" />}
              bgColor="bg-primary/10"
              subtitle="Last 30 days"
            />
            <KPICard
              title="Conversion Rate"
              value={`${kpis.conversionRate.toFixed(1)}%`}
              change="+3.2%"
              changeType="positive"
              icon={<Percent className="text-accent text-xl" />}
              bgColor="bg-accent/10"
              subtitle="Lead to booking"
            />
            <KPICard
              title="Avg Response Time"
              value={`${(kpis.avgResponseTime / 60).toFixed(1)}min`}
              change="-15s"
              changeType="positive"
              icon={<Clock className="text-warning text-xl" />}
              bgColor="bg-warning/10"
              subtitle="Target: <2min"
            />
            <KPICard
              title="AI Handled"
              value={`${kpis.aiHandledPercentage.toFixed(0)}%`}
              change="+5.1%"
              changeType="positive"
              icon={<Bot className="text-purple-600 text-xl" />}
              bgColor="bg-purple-100"
              subtitle="Qualified automatically"
            />
          </div>

          {/* Main Dashboard Tabs */}
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-slate-200">
                <TabsList className="w-full justify-start bg-transparent p-0">
                  <TabsTrigger 
                    value="conversations" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                  >
                    Live Conversations
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pipeline" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                  >
                    Lead Pipeline
                  </TabsTrigger>
                  <TabsTrigger 
                    value="vsl" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                  >
                    VSL Performance
                  </TabsTrigger>
                  <TabsTrigger 
                    value="clients" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                  >
                    Client Management
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="conversations" className="p-6">
                <LiveConversations 
                  conversations={conversations}
                  hotLeads={hotLeads}
                  clientId={selectedClientId}
                />
              </TabsContent>

              <TabsContent value="pipeline" className="p-6">
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Lead Pipeline</h3>
                  <p className="text-slate-600">Pipeline view coming soon</p>
                </div>
              </TabsContent>

              <TabsContent value="vsl" className="p-6">
                <div className="text-center py-12">
                  <Video className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">VSL Performance</h3>
                  <p className="text-slate-600">Video performance analytics coming soon</p>
                </div>
              </TabsContent>

              <TabsContent value="clients" className="p-6">
                <div className="text-center py-12">
                  <UserPlus className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Client Management</h3>
                  <p className="text-slate-600">Client management interface coming soon</p>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Secondary Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Recent Activity */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {recentActivity.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.type === 'booking' ? 'bg-success/10' :
                        activity.type === 'vsl' ? 'bg-warning/10' : 'bg-primary/10'
                      }`}>
                        {activity.type === 'booking' && <CheckCircle className="text-success text-xs" />}
                        {activity.type === 'vsl' && <Video className="text-warning text-xs" />}
                        {activity.type === 'lead' && <UserPlus className="text-primary text-xs" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{activity.description}</p>
                        <p className="text-xs text-slate-500">
                          {activity.leadName || activity.company} • {new Date(activity.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <p className="text-slate-500 text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">System Health</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-success rounded-full"></div>
                      <span className="text-sm text-slate-900">WhatsApp API</span>
                    </div>
                    <span className="text-sm text-success font-medium">
                      {systemHealth?.whatsapp || 'Operational'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-success rounded-full"></div>
                      <span className="text-sm text-slate-900">AI Chat System</span>
                    </div>
                    <span className="text-sm text-success font-medium">
                      {systemHealth?.ai || 'Operational'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        systemHealth?.vsl === 'maintenance' ? 'bg-warning' : 'bg-success'
                      }`}></div>
                      <span className="text-sm text-slate-900">VSL Generator</span>
                    </div>
                    <span className={`text-sm font-medium ${
                      systemHealth?.vsl === 'maintenance' ? 'text-warning' : 'text-success'
                    }`}>
                      {systemHealth?.vsl || 'Operational'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-success rounded-full"></div>
                      <span className="text-sm text-slate-900">Calendar Integration</span>
                    </div>
                    <span className="text-sm text-success font-medium">
                      {systemHealth?.calendar || 'Operational'}
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">System Uptime</span>
                      <span className="text-sm font-medium text-slate-900">
                        {systemHealth?.uptime || '99.8%'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
    </div>
  );
}
