import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  MessageCircle,
  Target,
  Tag,
  MapPin,
  Activity,
  Edit,
  Trash2,
  Send,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Star,
  Zap,
  FileText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Booking {
  id: number;
  leadId: number;
  clientId: number;
  title: string;
  status: string;
  scheduledFor: string;
  location?: string;
}

interface ActivityLog {
  id: number;
  action: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

interface LeadDetailsModalProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewConversation?: () => void;
}

const getTimeAgo = (date: Date | string | null): string => {
  if (!date) return "Never";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
};

const getScoreColor = (score: number) => {
  if (score >= 0.8) return "from-red-500 to-orange-500";
  if (score >= 0.6) return "from-orange-500 to-yellow-500";
  if (score >= 0.4) return "from-yellow-500 to-green-500";
  return "from-blue-500 to-cyan-500";
};

const getTemperatureBadge = (score: number) => {
  if (score >= 0.8) {
    return (
      <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">
        <Zap className="w-3 h-3 mr-1" />
        Very Hot
      </Badge>
    );
  } else if (score >= 0.6) {
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200">
        <TrendingUp className="w-3 h-3 mr-1" />
        Hot
      </Badge>
    );
  } else if (score >= 0.4) {
    return (
      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
        🌡️ Warm
      </Badge>
    );
  } else {
    return (
      <Badge className="bg-blue-50 text-blue-700 border-blue-200">
        ❄️ Cold
      </Badge>
    );
  }
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    new: {
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: Star,
      label: "New",
    },
    contacted: {
      color: "bg-purple-50 text-purple-700 border-purple-200",
      icon: MessageCircle,
      label: "Contacted",
    },
    qualified: {
      color: "bg-green-50 text-green-700 border-green-200",
      icon: CheckCircle2,
      label: "Qualified",
    },
    "proposal-sent": {
      color: "bg-orange-50 text-orange-700 border-orange-200",
      icon: FileText,
      label: "Proposal Sent",
    },
    negotiation: {
      color: "bg-pink-50 text-pink-700 border-pink-200",
      icon: Activity,
      label: "Negotiating",
    },
    converted: {
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
      label: "Converted",
    },
    lost: {
      color: "bg-gray-50 text-gray-700 border-gray-200",
      icon: XCircle,
      label: "Lost",
    },
  };

  const config = statusConfig[status] || statusConfig.new;
  const Icon = config.icon;

  return (
    <Badge className={config.color}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};


export default function LeadDetailsModal({
  lead,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onViewConversation,
}: LeadDetailsModalProps) {
  // ✅ Guard clause
  if (!lead) return null;

  // Fetch bookings for this lead
  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: [`/api/bookings/${lead.clientId}`],
    enabled: isOpen && !!lead,
  });

  // Fetch activity log
  const { data: activityLog = [], isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: [`/api/leads/${lead.id}/activity`],
    enabled: isOpen && !!lead,
  });

  const leadBookings = bookings.filter((b) => b.leadId === lead.id);
  const score = parseFloat(
    lead.manualScore || lead.qualificationScore || "0"
  );
  const scorePercentage = (score * 100).toFixed(0);

  const initials =
    (lead.firstName?.[0] || "U") + (lead.lastName?.[0] || "");

  const responseTime = lead.responseTimeSeconds
    ? lead.responseTimeSeconds < 60
      ? `${lead.responseTimeSeconds}s`
      : `${(lead.responseTimeSeconds / 60).toFixed(1)}m`
    : "N/A";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-slate-50 to-white border-b px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="w-12 h-12 shrink-0">
                <AvatarFallback
                  className={cn(
                    "text-lg font-bold text-white bg-gradient-to-br",
                    getScoreColor(score)
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold text-slate-900 truncate">
                  {lead.firstName} {lead.lastName}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5">
                  {lead.company && (
                    <>
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{lead.company}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {getTemperatureBadge(score)}
                  {getStatusBadge(lead.status || "new")}
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-1 shrink-0">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              
            </div>
          </div>

          {/* Compact Metrics */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white rounded-lg p-2 border">
              <div className="text-xs text-slate-600 mb-1">Score</div>
              <div className="text-xl font-bold text-slate-900">
                {scorePercentage}%
              </div>
            </div>
            <div className="bg-white rounded-lg p-2 border">
              <div className="text-xs text-slate-600 mb-1">Response</div>
              <div className="text-xl font-bold text-slate-900">
                {responseTime}
              </div>
            </div>
            <div className="bg-white rounded-lg p-2 border">
              <div className="text-xs text-slate-600 mb-1">Meetings</div>
              <div className="text-xl font-bold text-slate-900">
                {leadBookings.length}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(85vh-220px)]">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
              <TabsTrigger value="meetings" className="text-xs">Meetings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="px-4 pb-4 space-y-3">
              {/* Contact Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Contact
                </h3>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-900 truncate">
                        {lead.email}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 shrink-0"
                      onClick={() =>
                        (window.location.href = `mailto:${lead.email}`)
                      }
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>

                  {lead.phone && (
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-900 truncate">
                          {lead.phone}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 shrink-0"
                        onClick={() =>
                          (window.location.href = `tel:${lead.phone}`)
                        }
                      >
                        <Phone className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  Timeline
                </h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Created</span>
                    <span className="text-slate-900">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {lead.lastContactedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Last Contact</span>
                      <span className="text-blue-600 font-medium">
                        {getTimeAgo(lead.lastContactedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {lead.tags && lead.tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.tags.map((tag: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-slate-50 text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Source */}
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4" />
                  Source
                </h3>
                <Badge variant="outline" className="text-xs">
                  {lead.source || "Unknown"}
                </Badge>
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="px-4 pb-4">
              <div className="space-y-2">
                {activityLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : activityLog && activityLog.length > 0 ? (
                  activityLog.slice(0, 10).map((activity: any) => (
                    <div
                      key={activity.id}
                      className="p-2.5 bg-slate-50 rounded-lg border"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {activity.action
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l: string) =>
                                l.toUpperCase()
                              )}
                          </p>
                          {activity.fieldChanged && (
                            <p className="text-xs text-slate-600 mt-0.5 truncate">
                              {activity.fieldChanged}: {activity.oldValue} →{" "}
                              {activity.newValue}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 shrink-0">
                          {getTimeAgo(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Activity className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">No activity yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Meetings Tab */}
            <TabsContent value="meetings" className="px-4 pb-4">
              <div className="space-y-2">
                {leadBookings.length > 0 ? (
                  leadBookings.map((booking: any) => (
                    <div
                      key={booking.id}
                      className="p-3 border rounded-lg bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-semibold text-sm text-slate-900 flex-1 min-w-0 truncate">
                          {booking.title}
                        </h4>
                        <Badge
                          variant={
                            booking.status === "scheduled"
                              ? "default"
                              : "outline"
                          }
                          className="text-xs shrink-0"
                        >
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mb-1">
                        {new Date(booking.scheduledFor).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                      {booking.location && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{booking.location}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">No meetings scheduled</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t bg-slate-50 px-4 py-3 flex items-center justify-between gap-2">
          {onViewConversation ? (
            <Button
              size="sm"
              onClick={onViewConversation}
              className="gap-2 flex-1"
            >
              <MessageCircle className="w-4 h-4" />
              Open Chat
            </Button>
          ) : (
            <div />
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}