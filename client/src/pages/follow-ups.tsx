import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Clock,
  MessageSquare,
  Users,
  Play,
  Pause,
  Plus,
  Trash2,
  Calendar,
  Check,
  X,
  Send,
  SkipForward,
  Activity,
  AlertCircle,
  Settings,
  Filter,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiUrl } from "@/lib/api-config";

interface FollowUpSequence {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  channel: string;
  status: string;
  isDefault: boolean;
  steps: FollowUpStep[];
}

interface FollowUpStep {
  id: string;
  stepNumber: number;
  delayMinutes: number;
  content: string;
  channel: string;
}

interface PendingFollowUp {
  id: string;
  leadName: string;
  leadCompany?: string;
  content: string;
  scheduledFor: string;
  status: string;
  stepNumber: number;
}

interface FollowUpStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
}

export default function FollowUpsPage() {
  usePageTitle("Follow-ups");
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clients, setClients] = useState<any[]>([]);
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [pendingFollowUps, setPendingFollowUps] = useState<PendingFollowUp[]>([]);
  const [stats, setStats] = useState<FollowUpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    stepNumber: "all",
    timeRange: "all",
    searchTerm: "",
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch clients
  useEffect(() => {
    async function fetchClients() {
      try {
        const url = getApiUrl(`/api/clients?userId=${user?.id}`);
        console.log("🔍 [FOLLOW-UPS] Fetching clients from:", url);
        
        const res = await fetch(url, {
          credentials: "include",
        });
        
        console.log("📡 [FOLLOW-UPS] Clients response:", res.status);
        
        if (!res.ok) {
          throw new Error("Failed to fetch clients");
        }
        
        const data = await res.json();
        setClients(data);
        if (data.length > 0) {
          setSelectedClientId(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast({
          title: "Error",
          description: "Failed to fetch clients. Please try again.",
          variant: "destructive",
        });
      }
    }
    if (user?.id) {
      fetchClients();
    }
  }, [user, toast]);

  // Fetch sequences, pending follow-ups, and stats
  useEffect(() => {
    async function fetchData() {
      if (!selectedClientId) return;
      setLoading(true);
      try {
        const sequencesUrl = getApiUrl(`/api/follow-ups/sequences/${selectedClientId}`);
        const pendingUrl = getApiUrl(`/api/follow-ups/${selectedClientId}/pending`);
        const statsUrl = getApiUrl(`/api/follow-ups/${selectedClientId}/stats`);
        
        console.log("🔍 [FOLLOW-UPS] Fetching data...");
        console.log("  - Sequences:", sequencesUrl);
        console.log("  - Pending:", pendingUrl);
        console.log("  - Stats:", statsUrl);
        
        const [seqRes, pendingRes, statsRes] = await Promise.all([
          fetch(sequencesUrl, { credentials: "include" }),
          fetch(pendingUrl, { credentials: "include" }),
          fetch(statsUrl, { credentials: "include" }),
        ]);
        
        console.log("📡 [FOLLOW-UPS] Responses:", {
          sequences: seqRes.status,
          pending: pendingRes.status,
          stats: statsRes.status,
        });
        
        if (!seqRes.ok || !pendingRes.ok || !statsRes.ok) {
          throw new Error("Failed to fetch follow-up data");
        }
        
        const seqData = await seqRes.json();
        const pendingData = await pendingRes.json();
        const statsData = await statsRes.json();
        setSequences(seqData);
        setPendingFollowUps(pendingData);
        setStats(statsData);
      } catch (error) {
        console.error("Error fetching follow-up data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch follow-up data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedClientId, toast]);

  async function toggleSequenceStatus(
    sequenceId: string,
    currentStatus: string
  ) {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      const url = getApiUrl(`/api/follow-ups/sequences/${sequenceId}`);
      await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      setSequences(
        sequences.map((seq) =>
          seq.id === sequenceId ? { ...seq, status: newStatus } : seq
        )
      );
      toast({
        title: "Success",
        description: `Sequence ${newStatus === "active" ? "activated" : "paused"} successfully.`,
      });
    } catch (error) {
      console.error("Error toggling sequence:", error);
      toast({
        title: "Error",
        description: "Failed to update sequence status. Please try again.",
        variant: "destructive",
      });
    }
  }

  async function deleteSequence(sequenceId: string) {
    try {
      const url = getApiUrl(`/api/follow-ups/sequences/${sequenceId}`);
      await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      setSequences(sequences.filter((seq) => seq.id !== sequenceId));
      toast({
        title: "Success",
        description: "Sequence deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting sequence:", error);
      toast({
        title: "Error",
        description: "Failed to delete sequence. Please try again.",
        variant: "destructive",
      });
    }
  }

  async function sendFollowUpNow(followUpId: string) {
    try {
      const url = getApiUrl(`/api/follow-ups/${followUpId}/send-now`);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (response.ok) {
        setPendingFollowUps(pendingFollowUps.filter((fu) => fu.id !== followUpId));
        if (stats) {
          setStats({
            ...stats,
            pending: stats.pending - 1,
            sent: stats.sent + 1,
          });
        }
        toast({
          title: "Success",
          description: "Follow-up sent successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send follow-up. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending follow-up:", error);
      toast({
        title: "Error",
        description: "Error sending follow-up. Please try again.",
        variant: "destructive",
      });
    }
  }

  async function skipFollowUp(followUpId: string) {
    try {
      const url = getApiUrl(`/api/follow-ups/${followUpId}/cancel`);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (response.ok) {
        setPendingFollowUps(pendingFollowUps.filter((fu) => fu.id !== followUpId));
        if (stats) {
          setStats({
            ...stats,
            pending: stats.pending - 1,
            cancelled: stats.cancelled + 1,
          });
        }
        toast({
          title: "Success",
          description: "Follow-up skipped successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to skip follow-up. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error skipping follow-up:", error);
      toast({
        title: "Error",
        description: "Error skipping follow-up. Please try again.",
        variant: "destructive",
      });
    }
  }

  function formatDelay(minutes: number): string {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hours`;
    return `${Math.round(minutes / 1440)} days`;
  }

  function formatScheduledTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 0) return "Overdue";
    if (diffMins < 60) return `in ${diffMins}m`;
    if (diffMins < 1440) return `in ${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString();
  }

  // Filter pending follow-ups based on active filters
  const filteredFollowUps = useMemo(() => {
    let filtered = [...pendingFollowUps];
    if (filters.stepNumber !== "all") {
      filtered = filtered.filter(
        (fu) => fu.stepNumber === parseInt(filters.stepNumber)
      );
    }
    if (filters.timeRange !== "all") {
      const now = new Date();
      filtered = filtered.filter((fu) => {
        const scheduledDate = new Date(fu.scheduledFor);
        const diffMs = scheduledDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        switch (filters.timeRange) {
          case "overdue":
            return diffMs < 0;
          case "today":
            return diffHours >= 0 && diffHours <= 24;
          case "thisWeek":
            return diffHours >= 0 && diffHours <= 168;
          case "upcoming":
            return diffHours > 168;
          default:
            return true;
        }
      });
    }
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (fu) =>
          fu.leadName.toLowerCase().includes(searchLower) ||
          fu.leadCompany?.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [pendingFollowUps, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.stepNumber !== "all") count++;
    if (filters.timeRange !== "all") count++;
    if (filters.searchTerm.trim()) count++;
    return count;
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      stepNumber: "all",
      timeRange: "all",
      searchTerm: "",
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-24 bg-slate-200 rounded animate-pulse"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Follow-ups
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Automated message sequences to nurture leads
            </p>
          </div>
          <div className="flex items-center gap-3">
            {clients.length > 1 && (
              <Select
                value={selectedClientId}
                onValueChange={setSelectedClientId}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Sequence
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <CreateSequenceForm
                  clientId={selectedClientId}
                  onSuccess={() => {
                    setIsCreateDialogOpen(false);
                    window.location.reload();
                  }}
                />
              </DialogContent>
            </Dialog>
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
              <BreadcrumbPage>Follow-ups</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="text-sm font-medium text-slate-600">
                  Total Follow-ups
                </div>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {stats.total}
                </div>
                <p className="text-xs text-slate-500 mt-1">All time</p>
              </CardContent>
            </Card>
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="text-sm font-medium text-slate-600">
                  Pending
                </div>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">
                  {stats.pending}
                </div>
                <p className="text-xs text-slate-500 mt-1">Scheduled</p>
              </CardContent>
            </Card>
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="text-sm font-medium text-slate-600">Sent</div>
                <Send className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats.sent}
                </div>
                <p className="text-xs text-slate-500 mt-1">Delivered</p>
              </CardContent>
            </Card>
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="text-sm font-medium text-slate-600">Failed</div>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {stats.failed}
                </div>
                <p className="text-xs text-slate-500 mt-1">Errors</p>
              </CardContent>
            </Card>
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="text-sm font-medium text-slate-600">
                  Cancelled
                </div>
                <X className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-600">
                  {stats.cancelled}
                </div>
                <p className="text-xs text-slate-500 mt-1">Skipped</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Sequences */}
        <Card className="border-2 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Active Sequences</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Manage your automated follow-up workflows
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Sequence
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sequences.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 mb-4">No sequences created yet</p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Sequence
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sequences.map((sequence) => (
                  <SequenceCard
                    key={sequence.id}
                    sequence={sequence}
                    onToggleStatus={toggleSequenceStatus}
                    onDelete={deleteSequence}
                    formatDelay={formatDelay}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Follow-ups */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Pending Follow-ups
                  {stats && stats.pending > 0 && (
                    <Badge variant="secondary">{stats.pending}</Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Review and manage scheduled messages
                </p>
              </div>
              <div className="flex gap-2">
                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 relative">
                      <Filter className="w-4 h-4" />
                      Filters
                      {activeFiltersCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                        >
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Filter Follow-ups</h4>
                        {activeFiltersCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetFilters}
                            className="h-auto py-1 px-2 text-xs"
                          >
                            Reset All
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Search Lead</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            placeholder="Search by name or company..."
                            value={filters.searchTerm}
                            onChange={(e) =>
                              setFilters({ ...filters, searchTerm: e.target.value })
                            }
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Step Number</Label>
                        <Select
                          value={filters.stepNumber}
                          onValueChange={(value) =>
                            setFilters({ ...filters, stepNumber: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Steps</SelectItem>
                            <SelectItem value="1">Step 1 (30 min)</SelectItem>
                            <SelectItem value="2">Step 2 (6 hours)</SelectItem>
                            <SelectItem value="3">Step 3 (24 hours)</SelectItem>
                            <SelectItem value="4">Step 4 (48 hours)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Time Range</Label>
                        <Select
                          value={filters.timeRange}
                          onValueChange={(value) =>
                            setFilters({ ...filters, timeRange: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="today">Today (Next 24h)</SelectItem>
                            <SelectItem value="thisWeek">This Week</SelectItem>
                            <SelectItem value="upcoming">Upcoming (7+ days)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {activeFiltersCount > 0 && (
                        <div className="pt-3 border-t">
                          <p className="text-xs text-slate-600 mb-2">Active filters:</p>
                          <div className="flex flex-wrap gap-2">
                            {filters.stepNumber !== "all" && (
                              <Badge variant="secondary" className="text-xs">
                                Step {filters.stepNumber}
                                <button
                                  onClick={() =>
                                    setFilters({ ...filters, stepNumber: "all" })
                                  }
                                  className="ml-1 hover:text-destructive"
                                >
                                  ×
                                </button>
                              </Badge>
                            )}
                            {filters.timeRange !== "all" && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {filters.timeRange.replace(/([A-Z])/g, " $1")}
                                <button
                                  onClick={() =>
                                    setFilters({ ...filters, timeRange: "all" })
                                  }
                                  className="ml-1 hover:text-destructive"
                                >
                                  ×
                                </button>
                              </Badge>
                            )}
                            {filters.searchTerm.trim() && (
                              <Badge variant="secondary" className="text-xs">
                                "{filters.searchTerm}"
                                <button
                                  onClick={() =>
                                    setFilters({ ...filters, searchTerm: "" })
                                  }
                                  className="ml-1 hover:text-destructive"
                                >
                                  ×
                                </button>
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Sort
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeFiltersCount > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  Showing <strong>{filteredFollowUps.length}</strong> of{" "}
                  <strong>{pendingFollowUps.length}</strong> follow-ups
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="ml-2 text-blue-600 hover:underline font-medium"
                    >
                      Clear filters
                    </button>
                  )}
                </p>
              </div>
            )}
            {filteredFollowUps.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                {activeFiltersCount > 0 ? (
                  <>
                    <p className="text-slate-600 mb-2">No follow-ups match your filters</p>
                    <p className="text-sm text-slate-500 mb-4">
                      Try adjusting or clearing your filters
                    </p>
                    <Button variant="outline" onClick={resetFilters}>
                      Clear All Filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-slate-600">No pending follow-ups</p>
                    <p className="text-sm text-slate-500 mt-2">
                      All scheduled messages have been sent or cancelled
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFollowUps.map((followUp) => (
                  <div
                    key={followUp.id}
                    className="flex items-start gap-4 p-4 border-2 rounded-lg bg-white hover:border-primary/50 transition-all"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">
                        {followUp.leadName.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">
                          {followUp.leadName}
                        </h4>
                        {followUp.leadCompany && (
                          <span className="text-sm text-slate-500">
                            • {followUp.leadCompany}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs ml-auto">
                          Step {followUp.stepNumber}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {followUp.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(followUp.scheduledFor).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatScheduledTime(followUp.scheduledFor)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="gap-1">
                            <Send className="w-4 h-4" />
                            Send Now
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Send Follow-up Now?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will immediately send the follow-up message to{" "}
                              <strong>{followUp.leadName}</strong>. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => sendFollowUpNow(followUp.id)}>
                              Send Now
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="gap-1">
                            <SkipForward className="w-4 h-4" />
                            Skip
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Skip This Follow-up?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will cancel the scheduled follow-up for{" "}
                              <strong>{followUp.leadName}</strong>. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => skipFollowUp(followUp.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Skip Follow-up
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function SequenceCard({
  sequence,
  onToggleStatus,
  onDelete,
  formatDelay,
}: {
  sequence: FollowUpSequence;
  onToggleStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  formatDelay: (minutes: number) => string;
}) {
  const [showSteps, setShowSteps] = useState(false);
  
  return (
    <div className="border-2 rounded-lg bg-white overflow-hidden hover:border-primary/50 transition-all">
      <div className="flex items-center justify-between p-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-slate-900">{sequence.name}</h3>
            {sequence.isDefault && (
              <Badge variant="outline" className="text-xs">
                Default
              </Badge>
            )}
            <Badge
              variant={sequence.status === "active" ? "default" : "secondary"}
              className="text-xs"
            >
              {sequence.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mb-2">{sequence.description}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {sequence.steps.length} steps
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {sequence.channel}
            </span>
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              {showSteps ? (
                <>
                  <X className="w-3 h-3" />
                  Hide Steps
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  View All Steps
                </>
              )}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToggleStatus(sequence.id, sequence.status)}
          >
            {sequence.status === "active" ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Activate
              </>
            )}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost">
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Sequence?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "<strong>{sequence.name}</strong>"? 
                  This will permanently remove the sequence and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(sequence.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Sequence
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {showSteps && (
        <div className="border-t bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            Sequence Steps
          </h4>
          <div className="space-y-3">
            {sequence.steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-start gap-3 p-3 bg-white rounded-lg border"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {step.stepNumber}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-900">
                      Step {step.stepNumber}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-500">
                      After {formatDelay(step.delayMinutes)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.content}
                  </p>
                </div>
                {index < sequence.steps.length - 1 && (
                  <div className="flex-shrink-0 text-slate-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateSequenceForm({
  clientId,
  onSuccess,
}: {
  clientId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("no_response");
  type StepInput = { delayMinutes: number; content: string };
  const [steps, setSteps] = useState<StepInput[]>([
    { delayMinutes: 30, content: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  function addStep() {
    setSteps([...steps, { delayMinutes: 360, content: "" }]);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(
    index: number,
    field: keyof StepInput,
    value: number | string
  ) {
    const newSteps = [...steps];
    if (field === "delayMinutes") {
      newSteps[index][field] = value as number;
    } else {
      newSteps[index][field] = value as string;
    }
    setSteps(newSteps);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = getApiUrl("/api/follow-ups/sequences");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientId,
          name,
          description,
          triggerType,
          channel: "whatsapp",
          steps: steps.map((step, i) => ({
            stepNumber: i + 1,
            delayMinutes: step.delayMinutes,
            content: step.content,
            channel: "whatsapp",
          })),
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Follow-up sequence created successfully.",
        });
        onSuccess();
      } else {
        throw new Error("Failed to create sequence");
      }
    } catch (error) {
      console.error("Error creating sequence:", error);
      toast({
        title: "Error",
        description: "Failed to create sequence. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="flex flex-col max-h-[85vh]">
      <DialogHeader className="px-6 pt-6 pb-4 border-b">
        <DialogTitle>Create Follow-up Sequence</DialogTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Set up an automated message sequence for leads
        </p>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <Label className="text-sm font-medium">Sequence Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 48-Hour Fast Lane"
              required
              className="mt-1.5"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when to use this sequence"
              rows={2}
              className="mt-1.5"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium">Trigger Type</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_response">No Response</SelectItem>
                <SelectItem value="time_based">Time Based</SelectItem>
                <SelectItem value="behavior">Behavior Triggered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between sticky top-0 bg-white py-2 z-10">
              <Label className="text-sm font-medium">Follow-up Steps</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addStep}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Step
              </Button>
            </div>
            
            <div className="space-y-3">
              {steps.map((step, index) => (
                <Card key={index} className="border-2">
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">
                            {index + 1}
                          </span>
                        </div>
                        <Label className="text-sm font-medium">
                          Step {index + 1}
                        </Label>
                      </div>
                      {steps.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeStep(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Delay (minutes)
                      </Label>
                      <Input
                        type="number"
                        value={step.delayMinutes}
                        onChange={(e) =>
                          updateStep(index, "delayMinutes", parseInt(e.target.value))
                        }
                        min="1"
                        required
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        30 min = 30, 6 hrs = 360, 24 hrs = 1440
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Message Content
                      </Label>
                      <Textarea
                        value={step.content}
                        onChange={(e) => updateStep(index, "content", e.target.value)}
                        placeholder="Use {{firstName}}, {{lastName}}, {{company}} for variables"
                        required
                        rows={3}
                        className="mt-1.5"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
        
        <div className="border-t px-6 py-4 bg-white">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {steps.length} step{steps.length !== 1 ? "s" : ""} configured
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onSuccess}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Sequence"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}