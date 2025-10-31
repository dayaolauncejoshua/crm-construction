// client/src/pages/leads.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";
import { useEffect } from "react";
import TranscriptModal from "@/components/TranscriptModal";

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  AlertTriangle,
  Flame,
  Snowflake,
  Wind,
  Trash2, // ✅ Add Trash2 icon
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Leads() {
  usePageTitle("Leads");

  const { user } = useAuth();
  const { selectedClientId } = useClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast(); // ✅ Add toast
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // ✅ 2. Add state for the confirmation dialog
  const [leadToDelete, setLeadToDelete] = useState<any | null>(null);

  // WebSocket for real-time updates
  const { data: wsData } = useWebSocket();

  // Listen for WebSocket updates
  useEffect(() => {
    if (!wsData) return;

    console.log("📡 Leads page WebSocket event:", wsData.type);

    // Refresh leads on relevant events
    if (
      wsData.type === "new_conversation" ||
      wsData.type === "new_message" ||
      wsData.type === "lead_updated" ||
      wsData.type === "hot_lead_alert" ||
      wsData.type === "conversation_updated"
    ) {
      console.log("🔄 Refreshing leads data...");

      // Invalidate leads query to refresh
      queryClient.invalidateQueries({
        queryKey: ["/api/dashboard", selectedClientId],
      });

      // Also invalidate dashboard for conversation data
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/${selectedClientId}`],
      });
    }
  }, [wsData, selectedClientId]);

  // Fetch leads directly
  const { data: leads, isLoading } = useQuery({
    queryKey: ["/api/leads", selectedClientId],
    queryFn: async () => {
      const response = await fetch(`/api/leads/${selectedClientId}`);
      return response.json();
    },
    enabled: !!selectedClientId,
  });

  // ✅ 3. Add the deleteLead mutation hook
  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete lead");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lead Deleted",
        description: "The lead and all associated data have been deleted.",
      });
      // Refresh the leads list automatically
      queryClient.invalidateQueries({
        queryKey: ["/api/leads", selectedClientId],
      });
      // Also refresh the dashboard data
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/${selectedClientId}`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Deleting Lead",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setLeadToDelete(null); // Close the dialog
    },
  });

  // Fetch conversations to link leads
  const { data: dashboardData } = useQuery({
    queryKey: [`/api/dashboard/${selectedClientId}`],
    enabled: !!selectedClientId,
  });

  const allLeads = leads || [];
  const conversations = (dashboardData as any)?.conversations || [];

  // Filter leads by temperature
  const hotLeads = allLeads.filter((lead: any) => lead.temperature === "hot");
  const warmLeads = allLeads.filter((lead: any) => lead.temperature === "warm");
  const coldLeads = allLeads.filter((lead: any) => lead.temperature === "cold");

  // Filter by status
  const newLeads = allLeads.filter((lead: any) => lead.status === "new");
  const qualifiedLeads = allLeads.filter(
    (lead: any) => lead.status === "qualified"
  );
  const convertedLeads = allLeads.filter(
    (lead: any) => lead.status === "converted"
  );

  // Get conversation for a lead
  const getConversationForLead = (leadId: string) => {
    return conversations.find((c: any) => c.leadId === leadId);
  };

  // Navigate to conversation
  const openConversation = (leadId: string) => {
    const conversation = getConversationForLead(leadId);
    if (conversation) {
      setLocation(`/conversations?id=${conversation.id}`); // CORRECT
    }
  };

  const getTemperatureBadge = (temperature: string) => {
    const variants = {
      hot: "bg-red-100 text-red-800",
      warm: "bg-yellow-100 text-yellow-800",
      cold: "bg-blue-100 text-blue-800",
    };
    return variants[temperature as keyof typeof variants] || variants.cold;
  };

  const getTemperatureIcon = (temperature: string) => {
    if (temperature === "hot") return <Flame className="w-3 h-3" />;
    if (temperature === "warm") return <Wind className="w-3 h-3" />;
    if (temperature === "cold") return <Snowflake className="w-3 h-3" />;
    return <Snowflake className="w-3 h-3" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-purple-100 text-purple-800",
      qualified: "bg-yellow-100 text-yellow-800",
      "proposal-sent": "bg-orange-100 text-orange-800",
      negotiation: "bg-pink-100 text-pink-800",
      converted: "bg-green-100 text-green-800",
      lost: "bg-gray-100 text-gray-800",
      "on-hold": "bg-slate-100 text-slate-800",
    };
    return variants[status as keyof typeof variants] || variants.new;
  };

  const getScoreBadge = (lead: any) => {
    const score = parseFloat(
      lead.manualScore || lead.qualificationScore || "0"
    );
    if (score >= 0.7) return "bg-red-100 text-red-800";
    if (score >= 0.4) return "bg-yellow-100 text-yellow-800";
    return "bg-blue-100 text-blue-800";
  };

  const getScore = (lead: any) => {
    return parseFloat(lead.manualScore || lead.qualificationScore || "0");
  };

  // Use debouncedSearch in filter instead of searchTerm:
  const filteredLeads = allLeads.filter((lead: any) => {
    const matchesSearch =
      lead.firstName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      lead.lastName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      lead.company?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      lead.email?.toLowerCase().includes(debouncedSearch.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTabLeads = (tab: string) => {
    switch (tab) {
      case "hot":
        return hotLeads;
      case "warm":
        return warmLeads;
      case "cold":
        return coldLeads;
      case "new":
        return newLeads;
      case "qualified":
        return qualifiedLeads;
      case "converted":
        return convertedLeads;
      default:
        return filteredLeads;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Skeleton */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex items-center space-x-2 mt-3 sm:mt-0">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </header>

        {/* Filters Skeleton */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex space-x-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        {/* Content Skeleton */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Skeleton className="h-10 w-full mb-6" /> {/* Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="w-8 h-8" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Badges */}
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  {/* Contact Info */}
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  {/* Lead Info */}
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  {/* Button */}
                  <Skeleton className="h-10 w-full" />
                  {/* Date */}
                  <Skeleton className="h-3 w-32 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Lead Management
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Track and manage your lead pipeline
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Quick Stats */}
            <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">{allLeads.length} Total</span>
            </div>
            <div className="flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
              <Flame className="w-4 h-4" />
              <span className="font-medium">{hotLeads.length} Hot</span>
            </div>
            <div className="flex items-center space-x-2 bg-yellow-50 text-yellow-700 px-3 py-2 rounded-lg text-sm">
              <Wind className="w-4 h-4" />
              <span className="font-medium">{warmLeads.length} Warm</span>
            </div>
            <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm">
              <Snowflake className="w-4 h-4" />
              <span className="font-medium">{coldLeads.length} Cold</span>
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
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-4">
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
              <BreadcrumbPage>Lead Management</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 sm:space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
            <TabsTrigger
              value="all"
              className="text-xs sm:text-sm px-2 sm:px-4 py-2"
            >
              All ({allLeads.length})
            </TabsTrigger>
            <TabsTrigger
              value="hot"
              className="text-xs sm:text-sm px-2 sm:px-4 py-2"
            >
              🔥 Hot ({hotLeads.length})
            </TabsTrigger>
            <TabsTrigger
              value="warm"
              className="text-xs sm:text-sm px-2 sm:px-4 py-2"
            >
              😐 Warm ({warmLeads.length})
            </TabsTrigger>
            <TabsTrigger
              value="cold"
              className="text-xs sm:text-sm px-2 sm:px-4 py-2"
            >
              ❄️ Cold ({coldLeads.length})
            </TabsTrigger>
            <TabsTrigger
              value="qualified"
              className="text-xs sm:text-sm px-2 sm:px-4 py-2"
            >
              Qualified ({qualifiedLeads.length})
            </TabsTrigger>
            <TabsTrigger
              value="converted"
              className="text-xs sm:text-sm px-2 sm:px-4 py-2"
            >
              Converted ({convertedLeads.length})
            </TabsTrigger>
          </TabsList>

          {["all", "hot", "warm", "cold", "new", "qualified", "converted"].map(
            (tab) => (
              <TabsContent key={tab} value={tab}>
                {getTabLeads(tab).length === 0 ? (
                  <div className="text-center py-12">
                    <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      No Leads Found
                    </h3>
                    <p className="text-slate-600">
                      {tab === "all"
                        ? "No leads match your current filters"
                        : `No ${tab} leads found`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {getTabLeads(tab).map((lead: any) => (
                      <Card
                        key={lead.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => openConversation(lead.id)}
                      >
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
                                <p className="text-sm text-slate-500">
                                  {lead.company}
                                </p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openConversation(lead.id);
                                  }}
                                >
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Open Conversation
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={(e) => {
                                    e.stopPropagation(); // This stops the click from bubbling to the card
                                    setLeadToDelete(lead);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Lead
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {/* Temperature & Status & Score */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <Badge
                              className={getTemperatureBadge(
                                lead.temperature || "cold"
                              )}
                            >
                              <span className="flex items-center gap-1">
                                {getTemperatureIcon(lead.temperature)}
                                {lead.temperature?.charAt(0).toUpperCase() +
                                  lead.temperature?.slice(1) || "Cold"}
                              </span>
                            </Badge>
                            <Badge className={getStatusBadge(lead.status)}>
                              {lead.status?.charAt(0).toUpperCase() +
                                lead.status?.slice(1)}
                            </Badge>
                            <Badge className={getScoreBadge(lead)}>
                              {(getScore(lead) * 100).toFixed(0)}%
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
                              <span>
                                Source: {lead.source || "Landing Page"}
                              </span>
                            </div>
                            {lead.responseTimeSeconds && (
                              <div className="flex items-center space-x-2 text-sm text-slate-600">
                                <Clock className="w-4 h-4" />
                                <span>
                                  Response:{" "}
                                  {Math.floor(lead.responseTimeSeconds / 60)}m{" "}
                                  {lead.responseTimeSeconds % 60}s
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          {lead.tags && lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {lead.tags
                                .slice(0, 3)
                                .map((tag: string, idx: number) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                            </div>
                          )}

                          <Separator />

                          {/* Actions */}
                          {/* <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              openConversation(lead.id);
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Open Conversation
                          </Button> */}
                          {/* Actions */}
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              openConversation(lead.id);
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Open Conversation
                          </Button>

                          {/* 🔽 New button right below */}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (lead.callId) setSelectedCallId(lead.callId);
                              else
                                alert(
                                  "No call transcript available for this lead."
                                );
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            View Transcript
                          </Button>

                          {/* Created Date */}
                          <div className="text-xs text-slate-400 text-center">
                            Created{" "}
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </div>
                          {/* 🆕 Transcript Modal goes here */}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )
          )}
        </Tabs>
      </main>
      <AlertDialog
        open={!!leadToDelete}
        onOpenChange={() => setLeadToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              lead{" "}
              <strong className="text-slate-900">
                {leadToDelete?.firstName} {leadToDelete?.lastName}
              </strong>{" "}
              and all of their associated data, including conversations,
              messages, and bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => {
                e.stopPropagation();
                setLeadToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.stopPropagation();
                deleteLeadMutation.mutate(leadToDelete.id);
              }}
              disabled={deleteLeadMutation.isPending}
            >
              {deleteLeadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete Lead"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <TranscriptModal
        callId={selectedCallId}
        onClose={() => setSelectedCallId(null)}
      />
    </div>
  );
}
