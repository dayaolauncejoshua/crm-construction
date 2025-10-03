// client/src/pages/analytics.tsx

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Building2,
  Phone,
  Mail,
  Calendar,
  MessageCircle,
  TrendingUp,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Eye,
  UserCheck,
  Star,
  AlertTriangle
} from "lucide-react";

export default function Leads() {
  const [selectedClientId, setSelectedClientId] = useState("demo-client");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch(`/api/clients?userId=demo-user`);
      return response.json();
    },
  });

  // Fetch leads
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["/api/dashboard", selectedClientId],
    enabled: !!selectedClientId,
  }) as { data: { leads?: any[] } | undefined; isLoading: boolean };

  const leads = leadsData?.leads || [];
  const hotLeads = leads.filter((lead: any) => parseFloat(lead.qualificationScore || "0") >= 0.7);
  const newLeads = leads.filter((lead: any) => lead.status === "new");
  const qualifiedLeads = leads.filter((lead: any) => lead.status === "qualified");
  const convertedLeads = leads.filter((lead: any) => lead.status === "converted");

  const getStatusBadge = (status: string) => {
    const variants = {
      new: "bg-blue-100 text-blue-800",
      qualified: "bg-yellow-100 text-yellow-800", 
      hot: "bg-red-100 text-red-800",
      converted: "bg-green-100 text-green-800",
      lost: "bg-gray-100 text-gray-800"
    };
    return variants[status as keyof typeof variants] || variants.new;
  };

  const getScoreBadge = (score: string) => {
    const numScore = parseFloat(score || "0");
    if (numScore >= 0.8) return "bg-red-100 text-red-800";
    if (numScore >= 0.6) return "bg-yellow-100 text-yellow-800";
    if (numScore >= 0.4) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  const filteredLeads = leads.filter((lead: any) => {
    const matchesSearch = lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getTabLeads = (tab: string) => {
    switch(tab) {
      case "hot": return hotLeads;
      case "new": return newLeads;
      case "qualified": return qualifiedLeads;
      case "converted": return convertedLeads;
      default: return filteredLeads;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Lead Management</h2>
              <p className="text-sm sm:text-base text-slate-600">Track and manage your lead pipeline</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Quick Stats */}
              <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">{leads.length} Total</span>
              </div>
              <div className="flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">{hotLeads.length} Hot</span>
              </div>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:items-center sm:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search leads by name, company, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
              <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                All ({leads.length})
              </TabsTrigger>
              <TabsTrigger value="hot" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                Hot ({hotLeads.length})
              </TabsTrigger>
              <TabsTrigger value="new" className="text-xs sm:text-sm px-2 sm:px-4 py-2 col-span-1 sm:col-span-1">
                New ({newLeads.length})
              </TabsTrigger>
              <TabsTrigger value="qualified" className="text-xs sm:text-sm px-2 sm:px-4 py-2 col-span-1 sm:col-span-1">
                Qualified ({qualifiedLeads.length})
              </TabsTrigger>
              <TabsTrigger value="converted" className="text-xs sm:text-sm px-2 sm:px-4 py-2 col-span-2 sm:col-span-1">
                Converted ({convertedLeads.length})
              </TabsTrigger>
            </TabsList>

            {["all", "hot", "new", "qualified", "converted"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                {getTabLeads(tab).length === 0 ? (
                  <div className="text-center py-12">
                    <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Leads Found</h3>
                    <p className="text-slate-600">
                      {tab === "all" ? "No leads match your current filters" : `No ${tab} leads found`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {getTabLeads(tab).map((lead: any) => (
                      <Card key={lead.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                                <User className="text-slate-600 text-lg" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">
                                  {lead.firstName} {lead.lastName}
                                </CardTitle>
                                <p className="text-sm text-slate-500">{lead.company}</p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Start Conversation
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Mark Qualified
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Status & Score */}
                          <div className="flex items-center justify-between">
                            <Badge className={getStatusBadge(lead.status)}>
                              {lead.status?.charAt(0).toUpperCase() + lead.status?.slice(1)}
                            </Badge>
                            <Badge className={getScoreBadge(lead.qualificationScore)}>
                              Score: {parseFloat(lead.qualificationScore || "0").toFixed(1)}
                            </Badge>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-slate-600">
                              <Mail className="w-4 h-4" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                            {lead.phone && (
                              <div className="flex items-center space-x-2 text-sm text-slate-600">
                                <Phone className="w-4 h-4" />
                                <span>{lead.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Lead Info */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-slate-600">
                              <TrendingUp className="w-4 h-4" />
                              <span>Source: {lead.source || "Landing Page"}</span>
                            </div>
                            {lead.responseTimeSeconds && (
                              <div className="flex items-center space-x-2 text-sm text-slate-600">
                                <Clock className="w-4 h-4" />
                                <span>Response: {Math.floor(lead.responseTimeSeconds / 60)}m {lead.responseTimeSeconds % 60}s</span>
                              </div>
                            )}
                          </div>

                          {/* Audit Results Preview */}
                          {lead.auditResults && (
                            <div className="bg-slate-50 rounded-lg p-3">
                              <h4 className="text-sm font-medium text-slate-900 mb-2">Audit Highlights</h4>
                              <p className="text-xs text-slate-600">
                                {lead.auditResults.topFinding || "Audit completed"}
                              </p>
                            </div>
                          )}

                          <Separator />

                          {/* Actions */}
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Contact
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Calendar className="w-4 h-4 mr-1" />
                              Book
                            </Button>
                          </div>

                          {/* Created Date */}
                          <div className="text-xs text-slate-400 text-center">
                            Created {new Date(lead.createdAt).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </main>
    </div>
  );
}