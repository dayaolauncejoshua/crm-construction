// client/src/pages/monitoring.tsx

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertTriangle,
  TrendingUp,
  Search,
  MessageSquare,
  Bug,
  CheckCircle,
  Clock,
  Eye,
  Target,
  Zap,
  Activity,
  BarChart3,
  ExternalLink,
  RefreshCw
} from "lucide-react";

export default function Monitoring() {
  const [selectedClientId, setSelectedClientId] = useState("demo-client");
  const [activeTab, setActiveTab] = useState("competitors");
  const { toast } = useToast();

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch(`/api/clients?userId=demo-user`);
      return response.json();
    },
  });

  // Fetch monitoring data
  const { data: monitoringData, isLoading, refetch } = useQuery({
    queryKey: ["/api/monitoring", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await fetch(`/api/monitoring/${selectedClientId}`);
      return response.json();
    },
  });

  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiRequest("PATCH", `/api/alerts/${alertId}/acknowledge`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring", selectedClientId] });
      toast({
        title: "Alert acknowledged",
        description: "The alert has been marked as acknowledged.",
      });
    },
  });

  // Mock data for demo
  const competitorData = [
    {
      name: "Competitor A",
      platform: "Facebook",
      adSpend: 15420,
      adCount: 127,
      impressions: 2400000,
      reach: 850000,
      engagement: 3.2,
      change: "+15%",
      status: "increasing"
    },
    {
      name: "Competitor B", 
      platform: "Google",
      adSpend: 8750,
      adCount: 89,
      impressions: 1800000,
      reach: 620000,
      engagement: 2.8,
      change: "-8%",
      status: "decreasing"
    },
    {
      name: "Competitor C",
      platform: "LinkedIn",
      adSpend: 12300,
      adCount: 156,
      impressions: 950000,
      reach: 340000,
      engagement: 4.1,
      change: "+22%",
      status: "increasing"
    }
  ];

  const serpData = [
    { keyword: "lead generation software", currentPosition: 3, previousPosition: 5, searchVolume: 18100, competition: "high", cpc: 12.50, change: "+2" },
    { keyword: "automated lead capture", currentPosition: 7, previousPosition: 8, searchVolume: 8900, competition: "medium", cpc: 8.20, change: "+1" },
    { keyword: "ai sales automation", currentPosition: 12, previousPosition: 9, searchVolume: 14200, competition: "high", cpc: 15.30, change: "-3" },
    { keyword: "whatsapp lead generation", currentPosition: 2, previousPosition: 3, searchVolume: 5200, competition: "low", cpc: 6.80, change: "+1" },
    { keyword: "crm integration tools", currentPosition: 15, previousPosition: 12, searchVolume: 11800, competition: "medium", cpc: 9.90, change: "-3" }
  ];

  const brandMentions = [
    {
      platform: "Reddit",
      content: "Has anyone tried [Client Name]'s lead generation tool? Looking for reviews...",
      author: "BusinessOwner123",
      sentiment: "neutral",
      sentimentScore: 0.0,
      reach: 850,
      engagement: 23,
      responseNeeded: true,
      mentionDate: "2024-01-15T10:30:00Z"
    },
    {
      platform: "LinkedIn",
      content: "Just had amazing results with [Client Name]! Generated 50+ qualified leads in first week.",
      author: "Marketing Director",
      sentiment: "positive",
      sentimentScore: 0.85,
      reach: 2400,
      engagement: 156,
      responseNeeded: false,
      mentionDate: "2024-01-14T15:45:00Z"
    },
    {
      platform: "Twitter",
      content: "Disappointed with [Client Name]'s customer service response time. Still waiting...",
      author: "@FrustratedUser",
      sentiment: "negative",
      sentimentScore: -0.72,
      reach: 1200,
      engagement: 45,
      responseNeeded: true,
      mentionDate: "2024-01-13T09:15:00Z"
    }
  ];

  const opportunityAlerts = [
    {
      title: "Trending Keyword: 'AI Lead Qualification'",
      description: "Search volume increased 340% this week. Low competition opportunity.",
      priority: "high",
      alertType: "trending_keyword",
      estimatedImpact: "high",
      actionRequired: true,
      createdAt: "2024-01-15T08:00:00Z"
    },
    {
      title: "Competitor Gap: Mobile Landing Pages",
      description: "Top 3 competitors have poor mobile experience. Opportunity to capture mobile traffic.",
      priority: "medium",
      alertType: "competitor_gap",
      estimatedImpact: "medium",
      actionRequired: true,
      createdAt: "2024-01-14T14:30:00Z"
    }
  ];

  const technicalIssues = [
    {
      issueType: "form_failure",
      severity: "high",
      affectedComponent: "Lead Capture Form",
      errorMessage: "Form submission timeout after 30 seconds",
      resolved: false,
      createdAt: "2024-01-15T11:20:00Z"
    },
    {
      issueType: "slow_load",
      severity: "medium",
      affectedComponent: "VSL Page",
      errorMessage: "Page load time > 3 seconds",
      resolved: true,
      resolvedAt: "2024-01-14T16:45:00Z",
      createdAt: "2024-01-14T16:30:00Z"
    }
  ];

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-green-600 bg-green-50";
      case "negative": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "low": return "text-green-600 bg-green-50";
      case "urgent": return "text-purple-600 bg-purple-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Advanced Monitoring</h2>
              <p className="text-slate-600">Real-time competitor tracking, SERP monitoring, and brand mentions</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="competitors">Competitor Tracking</TabsTrigger>
              <TabsTrigger value="serp">SERP Monitoring</TabsTrigger>
              <TabsTrigger value="mentions">Brand Mentions</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="technical">Technical Issues</TabsTrigger>
            </TabsList>

            <TabsContent value="competitors" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Ad Spend Tracked</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$36,470</div>
                    <p className="text-xs text-muted-foreground">+12% from last week</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Ads</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">372</div>
                    <p className="text-xs text-muted-foreground">Across all platforms</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">1.81M</div>
                    <p className="text-xs text-muted-foreground">Combined competitor reach</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Competitor Ad Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {competitorData.map((competitor, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {competitor.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-medium">{competitor.name}</h4>
                            <p className="text-sm text-slate-600">{competitor.platform}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-8 text-sm">
                          <div className="text-center">
                            <p className="font-medium">${competitor.adSpend.toLocaleString()}</p>
                            <p className="text-slate-500">Ad Spend</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium">{competitor.adCount}</p>
                            <p className="text-slate-500">Active Ads</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium">{(competitor.impressions / 1000000).toFixed(1)}M</p>
                            <p className="text-slate-500">Impressions</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium">{competitor.engagement}%</p>
                            <p className="text-slate-500">Engagement</p>
                          </div>
                          <Badge className={competitor.status === "increasing" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {competitor.change}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="serp" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Keyword Rankings (Top 50 Keywords)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {serpData.map((keyword, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{keyword.keyword}</h4>
                          <div className="flex items-center space-x-4 text-sm text-slate-600 mt-1">
                            <span>Volume: {keyword.searchVolume.toLocaleString()}</span>
                            <span>Competition: {keyword.competition}</span>
                            <span>CPC: ${keyword.cpc}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <p className="font-bold text-lg">#{keyword.currentPosition}</p>
                            <p className="text-xs text-slate-500">Current</p>
                          </div>
                          <div className="flex items-center">
                            {keyword.change.startsWith("+") ? (
                              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-red-600 mr-1 transform rotate-180" />
                            )}
                            <span className={`text-sm font-medium ${keyword.change.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                              {keyword.change}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mentions" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Mentions</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">127</div>
                    <p className="text-xs text-muted-foreground">This week</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Positive Sentiment</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">73%</div>
                    <p className="text-xs text-muted-foreground">+8% from last week</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Response Needed</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">5</div>
                    <p className="text-xs text-muted-foreground">Urgent responses</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Brand Mentions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {brandMentions.map((mention, index) => (
                      <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline">{mention.platform}</Badge>
                            <Badge className={getSentimentColor(mention.sentiment)}>
                              {mention.sentiment}
                            </Badge>
                            {mention.responseNeeded && (
                              <Badge className="bg-red-100 text-red-800">
                                Response Needed
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-800 mb-2">{mention.content}</p>
                          <div className="flex items-center space-x-4 text-xs text-slate-500">
                            <span>By: {mention.author}</span>
                            <span>Reach: {mention.reach.toLocaleString()}</span>
                            <span>Engagement: {mention.engagement}</span>
                            <span>{new Date(mention.mentionDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                          {mention.responseNeeded && (
                            <Button size="sm">
                              Respond
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="opportunities" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Opportunity Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {opportunityAlerts.map((alert, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-start space-x-3">
                          <Zap className="w-5 h-5 text-yellow-500 mt-1" />
                          <div>
                            <h4 className="font-medium">{alert.title}</h4>
                            <p className="text-sm text-slate-600 mt-1">{alert.description}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge className={getPriorityColor(alert.priority)}>
                                {alert.priority} priority
                              </Badge>
                              <Badge variant="outline">
                                {alert.estimatedImpact} impact
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                          {alert.actionRequired && (
                            <Button size="sm">
                              Take Action
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="technical" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
                    <Bug className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-xs text-muted-foreground">Needs attention</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">8</div>
                    <p className="text-xs text-muted-foreground">+2 from yesterday</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">2.4h</div>
                    <p className="text-xs text-muted-foreground">-0.8h from last week</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Technical Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {technicalIssues.map((issue, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className={`w-3 h-3 rounded-full mt-2 ${issue.resolved ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <h4 className="font-medium">{issue.affectedComponent}</h4>
                            <p className="text-sm text-slate-600 mt-1">{issue.errorMessage}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge className={issue.severity === "high" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                                {issue.severity} severity
                              </Badge>
                              <Badge variant="outline">
                                {issue.issueType.replace("_", " ")}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {new Date(issue.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {issue.resolved ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Resolved
                            </Badge>
                          ) : (
                            <Button size="sm" variant="outline">
                              Investigate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
    </div>
  );
}