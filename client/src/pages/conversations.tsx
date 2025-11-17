// client/src/pages/conversations.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Slider } from "@/components/ui/slider";
import { useClient } from "@/contexts/ClientContext";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Clock,
  Star,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  UserCheck,
  RefreshCw,
  Info,
  Sparkles,
  Edit3,
  History,
  Target,
  XCircle,
  Check,
  Eye,
  MapPin,
  Menu,
  X,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Date formatting helpers
const formatDateDivider = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);
  if (messageDate.getTime() === today.getTime()) {
    return "Today";
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else if (messageDate.getFullYear() === today.getFullYear()) {
    return messageDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } else {
    return messageDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
};

const groupMessagesByDate = (messages: any[]) => {
  const groups: { date: string; messages: any[] }[] = [];
  messages.forEach((message) => {
    const messageDate = new Date(message.sentAt);
    const dateKey = messageDate.toDateString();
    let group = groups.find((g) => g.date === dateKey);
    if (!group) {
      group = { date: dateKey, messages: [] };
      groups.push(group);
    }
    group.messages.push(message);
  });
  return groups;
};

// Date Divider Component
const DateDivider = ({ date }: { date: string }) => {
  const formattedDate = formatDateDivider(new Date(date));
  return (
    <div className="flex items-center justify-center my-6">
      <div className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200/60">
        <span className="text-xs font-semibold text-slate-500 tracking-wide">
          {formattedDate}
        </span>
      </div>
    </div>
  );
};

// Message Info Modal Component
const MessageInfoModal = ({
  message,
  isOpen,
  onClose,
}: {
  message: any;
  isOpen: boolean;
  onClose: () => void;
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatDetailedTime = (date: Date | string | null) => {
    if (!date) return "Not available";
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Message Info
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors touch-target"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Message</p>
              <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 line-clamp-3">
                {message.content}
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Send className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">Sent</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {formatDetailedTime(message.sentAt)}
                  </p>
                </div>
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              </div>
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.deliveredAt ? "bg-green-50" : "bg-slate-50"
                  }`}
                >
                  <CheckCircle
                    className={`w-5 h-5 ${
                      message.deliveredAt ? "text-green-600" : "text-slate-400"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    Delivered
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      message.deliveredAt ? "text-slate-600" : "text-slate-400"
                    }`}
                  >
                    {formatDetailedTime(message.deliveredAt)}
                  </p>
                </div>
                {message.deliveredAt && (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                )}
              </div>
              {message.sender !== "lead" && (
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.readAt ? "bg-blue-50" : "bg-slate-50"
                    }`}
                  >
                    <Eye
                      className={`w-5 h-5 ${
                        message.readAt ? "text-blue-600" : "text-slate-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">Read</p>
                    <p
                      className={`text-xs mt-0.5 ${
                        message.readAt ? "text-slate-600" : "text-slate-400"
                      }`}
                    >
                      {formatDetailedTime(message.readAt)}
                    </p>
                  </div>
                  {message.readAt && (
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {message.readAt
                    ? `Read ${Math.floor(
                        (new Date(message.readAt).getTime() -
                          new Date(message.sentAt).getTime()) /
                          1000
                      )}s after sending`
                    : message.deliveredAt
                    ? `Delivered ${Math.floor(
                        (new Date(message.deliveredAt).getTime() -
                          new Date(message.sentAt).getTime()) /
                          1000
                      )}s after sending`
                    : "Sending..."}
                </span>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
            <Button
              onClick={onClose}
              className="w-full touch-target"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default function Conversations() {
  usePageTitle("Conversations");
  const { user } = useAuth();
  const { selectedClientId } = useClient();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const leadIdFromCalendar = new URLSearchParams(window.location.search).get(
    "leadId"
  );

  // 🆕 Mobile state management
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showManualControls, setShowManualControls] = useState(false);
  const [manualScore, setManualScore] = useState(0);
  const [internalNote, setInternalNote] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState<Date>();
  const [bookingTime, setBookingTime] = useState("10:00");
  const [bookingDuration, setBookingDuration] = useState("60");
  const [bookingType, setBookingType] = useState("consultation");
  const [bookingLocation, setBookingLocation] = useState("Office");
  const [bookingNotes, setBookingNotes] = useState("");
  const [conflictError, setConflictError] = useState<any>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(
    null
  );

  const { data: availableTags } = useQuery<any[]>({
    queryKey: ["/api/lead-tags", selectedClientId],
    enabled: !!selectedClientId,
  });

  const { data: activityLog } = useQuery<any[]>({
    queryKey: ["/api/leads", selectedConversation?.lead?.id, "activity"],
    enabled: !!selectedConversation?.lead?.id,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [approvingBookingId, setApprovingBookingId] = useState<string | null>(
    null
  );
  const [decliningBookingId, setDecliningBookingId] = useState<string | null>(
    null
  );
  const [showDeclineConfirm, setShowDeclineConfirm] = useState<string | null>(
    null
  );

  const { data: templates } = useQuery({
    queryKey: ["/api/quick-replies", selectedClientId],
    enabled: !!selectedClientId,
  });

  const [typingIndicators, setTypingIndicators] = useState<
    Record<string, { isTyping: boolean; sender: string; leadName?: string }>
  >({});
  const [showMessageInfo, setShowMessageInfo] = useState<string | null>(null);

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

  const { data: messages } = useQuery({
    queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
    enabled: !!selectedConversation?.id,
    queryFn: async () => {
      const response = await fetch(
        `/api/conversations/${selectedConversation.id}/messages`
      );
      const data = await response.json();
      return data.reverse();
    },
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ["/api/bookings", selectedClientId],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/${selectedClientId}`);
      return response.json();
    },
    enabled: !!selectedClientId,
  });

  const { data: pendingBookings = [] } = useQuery({
    queryKey: ["/api/bookings", selectedClientId, "pending"],
    queryFn: async () => {
      const response = await fetch(
        `/api/bookings/${selectedClientId}/pending`,
        {
          credentials: "include",
        }
      );
      return response.json();
    },
    enabled: !!selectedClientId,
    refetchInterval: 5000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch(
        `/api/conversations/${conversationId}/read`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/${selectedClientId}`],
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/conversations/${conversationId}/messages`,
        {
          content,
          channel: "whatsapp",
        }
      );
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
      });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      toast({
        title: "Message sent",
        description: "Your message has been delivered.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTyping = () => {
    if (!selectedConversation) return;
    if (!isTyping) {
      setIsTyping(true);
      fetch(`/api/conversations/${selectedConversation.id}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isTyping: true }),
      }).catch((err) => console.error("Failed to send typing indicator:", err));
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (selectedConversation) {
        fetch(`/api/conversations/${selectedConversation.id}/typing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isTyping: false }),
        }).catch((err) =>
          console.error("Failed to stop typing indicator:", err)
        );
      }
    }, 3000);
  };

  const reactToMessageMutation = useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/messages/${messageId}/react`,
        { emoji }
      );
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
      });
      toast({
        title: "Reaction added",
        description: `You reacted with ${variables.emoji}`,
      });
    },
  });

  const getUserReaction = (message: any): string | null => {
    if (!message.reactions || !user?.id) return null;
    const userReaction = message.reactions.find(
      (r: any) => r.userId === user.id
    );
    return userReaction?.emoji || null;
  };

  const removeReactionMutation = useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      const response = await apiRequest(
        "DELETE",
        `/api/messages/${messageId}/react`,
        { emoji }
      );
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
      });
      toast({
        title: "Reaction removed",
        description: `Removed ${variables.emoji}`,
      });
    },
  });

  const takeoverMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/conversations/${conversationId}/takeover`,
        {}
      );
      return response.json();
    },
    onSuccess: (data, conversationId) => {
      // 🆕 IMMEDIATELY update local state (no waiting for refetch)
      setSelectedConversation((prev: any) => {
        if (!prev || prev.id !== conversationId) return prev;
        return {
          ...prev,
          isAiHandled: false, // 🔥 This is the key fix!
          humanTakeoverAt: new Date(),
        };
      });

      // 🆕 Also update the conversations list cache
      queryClient.setQueryData(
        [`/api/dashboard/${selectedClientId}`],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            conversations: oldData.conversations.map((conv: any) => {
              if (conv.id === conversationId) {
                return {
                  ...conv,
                  isAiHandled: false,
                  humanTakeoverAt: new Date(),
                };
              }
              return conv;
            }),
          };
        }
      );

      // Refetch for server sync (background)
      refetch();

      toast({
        title: "✅ Conversation taken over",
        description: "You can now send messages manually.",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Takeover failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const conversations = dashboardData?.conversations || [];

  const updateLeadMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest(
        "PATCH",
        `/api/leads/${selectedConversation.lead.id}/manual`,
        updates
      );
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedConversation((prev: any) => ({
        ...prev,
        lead: { ...prev.lead, ...data },
        qualificationScore: data.manualScore || prev.qualificationScore,
      }));
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/${selectedClientId}`],
      });
      refetch();
      toast({
        title: "Lead updated",
        description: "Changes saved successfully",
      });
    },
  });

  const updateScore = (score: number) => {
    updateLeadMutation.mutate({
      manualScore: (score / 100).toString(),
      isManualOverride: true,
    });
  };

  const updateStatus = (status: string) => {
    updateLeadMutation.mutate({ status });
  };

  const toggleTag = (tagName: string) => {
    const currentTags = selectedConversation?.lead?.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((t: string) => t !== tagName)
      : [...currentTags, tagName];
    updateLeadMutation.mutate({ tags: newTags });
  };

  const bookMeetingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await fetch("/api/bookings/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bookingData),
      });
      const data = await response.json();
      if (!response.ok) {
        const error: any = new Error(
          data.message || "Failed to create booking"
        );
        error.status = response.status;
        error.code = data.error;
        error.conflictingBooking = data.conflictingBooking;
        error.fullData = data;
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/bookings", selectedClientId],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/${selectedClientId}`],
      });
      toast({
        title: "Meeting Scheduled!",
        description: "Calendar invite sent to lead via email and WhatsApp.",
      });
      setShowBookingModal(false);
      setConflictError(null);
      setBookingDate(undefined);
      setBookingTime("10:00");
      setBookingDuration("60");
      setBookingNotes("");
    },
    onError: (error: any) => {
      if (error.status === 409 || error.code === "Booking conflict detected") {
        setConflictError(
          error.fullData || {
            error: "Booking conflict detected",
            message: error.message,
            conflictingBooking: error.conflictingBooking,
          }
        );
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create booking",
          variant: "destructive",
        });
      }
    },
  });

  const handleBookMeeting = () => {
    if (!bookingDate || !selectedConversation) {
      toast({
        title: "Error",
        description: "Please select a date and time",
        variant: "destructive",
      });
      return;
    }
    const [hours, minutes] = bookingTime.split(":");
    const scheduledFor = new Date(bookingDate);
    scheduledFor.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    bookMeetingMutation.mutate({
      leadId: selectedConversation.lead.id,
      clientId: selectedConversation.clientId,
      scheduledFor: scheduledFor.toISOString(),
      duration: parseInt(bookingDuration),
      meetingType: bookingType,
      location: bookingLocation,
      notes: bookingNotes,
    });
  };

  const saveNote = () => {
    if (!internalNote.trim()) return;
    updateLeadMutation.mutate({
      internalNotes: internalNote,
    });
    setInternalNote("");
  };

  const setFollowUpReminder = (days: number) => {
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + days);
    updateLeadMutation.mutate({
      nextFollowUpAt: followUpDate,
    });
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get("id");
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
        markAsReadMutation.mutate(conversationId);
        window.history.replaceState({}, "", "/conversations");
      }
    }
  }, [conversations]);

  useEffect(() => {
    if (leadIdFromCalendar && conversations.length > 0) {
      const targetConversation = conversations.find(
        (c: any) => c.leadId === leadIdFromCalendar
      );
      if (targetConversation) {
        setSelectedConversation(targetConversation);
        markAsReadMutation.mutate(targetConversation.id);
        window.history.replaceState({}, "", "/conversations");
      }
    }
  }, [leadIdFromCalendar, conversations]);

  const filteredConversations = conversations.filter((conv: any) => {
    const matchesSearch =
      searchQuery === "" ||
      conv.lead?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lead?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lead?.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "hot" &&
        parseFloat(conv.qualificationScore || "0") >= 0.7) ||
      (filterStatus === "ai" && conv.isAiHandled === true) ||
      (filterStatus === "human" && conv.isAiHandled === false) ||
      (filterStatus === "not-lead" && conv.lead?.status === "not-a-lead");
    return matchesSearch && matchesStatus;
  });

  const hotCount = conversations.filter((c: any) => {
    const score = parseFloat(
      c.lead?.manualScore ||
        c.lead?.qualificationScore ||
        c.qualificationScore ||
        "0"
    );
    return score >= 0.6 || c.lead?.temperature === "hot";
  }).length;
  const aiHandlingCount = conversations.filter(
    (c: any) => c.isAiHandled === true
  ).length;
  const humanHandlingCount = conversations.filter(
    (c: any) => c.isAiHandled === false
  ).length;

useEffect(() => {
  if (!wsData) return;

  console.log(`📨 ========== WEBSOCKET EVENT RECEIVED ==========`);
  console.log(`   Type: ${wsData.type}`);
  console.log(`   Full Payload:`, wsData);
  console.log(`================================================`);

  switch (wsData.type) {
    case "typing_indicator":
      setTypingIndicators((prev) => ({
        ...prev,
        [wsData.conversationId]: {
          isTyping: wsData.isTyping,
          sender: wsData.sender,
          leadName: wsData.leadName,
        },
      }));
      if (wsData.isTyping) {
        setTimeout(() => {
          setTypingIndicators((prev) => {
            const current = prev[wsData.conversationId];
            if (current && current.isTyping) {
              return {
                ...prev,
                [wsData.conversationId]: {
                  ...current,
                  isTyping: false,
                },
              };
            }
            return prev;
          });
        }, 5000);
      }
      break;

    case "conversation_updated":
      console.log(`🔄 CONVERSATION_UPDATED Event Processing...`);
      console.log(`   Conversation ID: ${wsData.conversationId}`);
      console.log(`   Updates:`, wsData.updates);

      // Update dashboard cache
      queryClient.setQueryData(
        [`/api/dashboard/${selectedClientId}`],
        (oldData: any) => {
          if (!oldData) {
            console.warn(`⚠️ No dashboard data in cache`);
            return oldData;
          }

          console.log(`   Updating dashboard cache...`);
          const updated = {
            ...oldData,
            conversations: oldData.conversations.map((conv: any) => {
              if (conv.id === wsData.conversationId) {
                console.log(`   ✅ Found conversation in cache`);
                console.log(`      BEFORE: isAiHandled = ${conv.isAiHandled}`);
                const updatedConv = {
                  ...conv,
                  ...wsData.updates,
                };
                console.log(`      AFTER: isAiHandled = ${updatedConv.isAiHandled}`);
                return updatedConv;
              }
              return conv;
            }),
          };
          return updated;
        }
      );

      // Update selected conversation
      if (selectedConversation?.id === wsData.conversationId) {
        console.log(`   Updating SELECTED conversation state...`);
        setSelectedConversation((prev: any) => {
          if (!prev) return prev;
          console.log(`      BEFORE: isAiHandled = ${prev.isAiHandled}`);
          const updated = {
            ...prev,
            ...wsData.updates,
          };
          console.log(`      AFTER: isAiHandled = ${updated.isAiHandled}`);
          return updated;
        });
      }

      // Refetch in background
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/${selectedClientId}`],
      });

      console.log(`✅ conversation_updated processing complete`);
      break;

    case "hot_lead_alert":
      console.log(`🔥 HOT_LEAD_ALERT Event Processing...`);
      console.log(`   Conversation ID: ${wsData.conversationId || wsData.conversation?.id}`);
      console.log(`   Conversation Object:`, wsData.conversation);
      console.log(`   isAiHandled in payload: ${wsData.conversation?.isAiHandled}`);

      const targetConvId = wsData.conversationId || wsData.conversation?.id;

      // TRIPLE UPDATE STRATEGY

      // Update 1: Dashboard cache
      queryClient.setQueryData(
        [`/api/dashboard/${selectedClientId}`],
        (oldData: any) => {
          if (!oldData) {
            console.warn(`⚠️ No dashboard data in cache for hot_lead_alert`);
            return oldData;
          }

          console.log(`   Updating dashboard cache for hot lead...`);
          console.log(`   Looking for conversation: ${targetConvId}`);
          
          const updated = {
            ...oldData,
            conversations: oldData.conversations.map((conv: any) => {
              if (conv.id === targetConvId) {
                console.log(`   ✅ FOUND conversation in cache!`);
                console.log(`      BEFORE: isAiHandled = ${conv.isAiHandled}`);
                
                const updatedConv = {
                  ...conv,
                  isAiHandled: false, // FORCE
                  humanTakeoverAt: new Date(),
                  lead: wsData.conversation?.lead || conv.lead,
                  qualificationScore: wsData.conversation?.qualificationScore || conv.qualificationScore,
                };
                
                console.log(`      AFTER: isAiHandled = ${updatedConv.isAiHandled}`);
                return updatedConv;
              }
              return conv;
            }),
          };

          return updated;
        }
      );

      // Update 2: Selected conversation state
      if (selectedConversation?.id === targetConvId) {
        console.log(`   Updating SELECTED conversation for hot lead...`);
        setSelectedConversation((prev: any) => {
          if (!prev) return prev;
          
          console.log(`      BEFORE: isAiHandled = ${prev.isAiHandled}`);
          
          const updated = {
            ...prev,
            isAiHandled: false, // FORCE
            humanTakeoverAt: new Date(),
            lead: wsData.conversation?.lead || prev.lead,
            qualificationScore: wsData.conversation?.qualificationScore || prev.qualificationScore,
          };
          
          console.log(`      AFTER: isAiHandled = ${updated.isAiHandled}`);
          return updated;
        });
      } else {
        console.log(`   Selected conversation (${selectedConversation?.id}) does not match target (${targetConvId})`);
      }

      // Update 3: Force refetch
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/${selectedClientId}`],
      });

      // Show toast
      toast({
        title: "🔥 Hot Lead Alert!",
        description: `${wsData.conversation?.lead?.firstName || "Lead"} needs immediate attention - handed over to you`,
        variant: "destructive",
        duration: 8000,
      });

      console.log(`✅ hot_lead_alert processing complete`);
      break;

    case "new_message":
      console.log(`💬 New Message Event: ${wsData.conversationId}`);
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", wsData.conversationId, "messages"],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/${selectedClientId}`],
      });
      break;

    case "message_read":
      if (wsData.conversationId === selectedConversation?.id) {
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", wsData.conversationId, "messages"],
        });
      }
      break;

    case "new_conversation":
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/${selectedClientId}`],
      });
      break;

    case "lead_updated":
      console.log(`👤 Lead Updated Event: ${wsData.conversationId}`);
      
      queryClient.setQueryData(
        [`/api/dashboard/${selectedClientId}`],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            conversations: oldData.conversations.map((conv: any) => {
              if (conv.id === wsData.conversationId) {
                return {
                  ...conv,
                  lead: wsData.lead,
                };
              }
              return conv;
            }),
          };
        }
      );

      if (selectedConversation?.id === wsData.conversationId) {
        setSelectedConversation((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            lead: wsData.lead,
          };
        });
      }

      if (wsData.lead.temperature === "hot") {
        toast({
          title: "🔥 Lead is now HOT!",
          description: `${wsData.lead.firstName || "Lead"} is now a hot lead (${(
            parseFloat(wsData.lead.qualificationScore || "0") * 100
          ).toFixed(0)}%)`,
          variant: "default",
        });
      }
      break;

    case "conversation_reopened":
    case "message_reacted":
      if (wsData.conversationId === selectedConversation?.id) {
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", wsData.conversationId, "messages"],
        });
      }
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/${selectedClientId}`],
      });
      if (wsData.type === "conversation_reopened") {
        toast({
          title: "⚠️ Conversation Reopened",
          description: `${wsData.lead?.firstName || "Lead"} messaged again after termination. Please review.`,
          variant: "default",
          duration: 10000,
        });
      }
      break;

    default:
      console.log(`📡 Unhandled WebSocket event: ${wsData.type}`);
      refetch();
  }
}, [wsData, selectedClientId, queryClient, toast, refetch, selectedConversation]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, selectedConversation?.id]);

  useEffect(() => {
    if (selectedConversation) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (selectedConversation && messages && messages.length > 0) {
      const unreadMessages = messages.filter(
        (m: any) => m.sender === "lead" && !m.readAt
      );
      if (unreadMessages.length > 0) {
        fetch(`/api/conversations/${selectedConversation.id}/messages/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            messageIds: unreadMessages.map((m: any) => m.id),
          }),
        }).catch((err) => console.error("Failed to mark as read:", err));
      }
    }
  }, [selectedConversation, messages]);

  useEffect(() => {
    if (
      selectedConversation?.lead?.id &&
      selectedConversation.lead.viewedAt === null
    ) {
      fetch(`/api/leads/${selectedConversation.lead.id}/view`, {
        method: "POST",
        credentials: "include",
      }).catch((err) => console.error("Failed to mark lead as viewed:", err));
    }
  }, [selectedConversation?.lead?.id]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      content: newMessage,
    });
  };

  const handleTakeover = (conversationId: string) => {
    takeoverMutation.mutate(conversationId);
  };

  const getStatusBadge = (conversation: any) => {
    const temperature = conversation.lead?.temperature;
    const status = conversation.lead?.status;
    const tags = conversation.lead?.tags || [];
    const isAiHandled = conversation.isAiHandled;
    const score = parseFloat(
      conversation.lead?.manualScore ||
        conversation.lead?.qualificationScore ||
        conversation.qualificationScore ||
        "0"
    );

    const isReopened = tags.includes("reopened");
    const wasTerminated = tags.includes("terminated");

    // PRIORITY 1: Reopened conversations
    if (isReopened && !isAiHandled) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 text-xs">
          🔄 Reopened
        </Badge>
      );
    }

    // PRIORITY 2: Terminated/Spam
    if (status === "spam" || wasTerminated) {
      return (
        <Badge className="bg-gray-100 text-gray-800 border border-gray-300 text-xs">
          🚫 Terminated
        </Badge>
      );
    }

    // PRIORITY 3: Not a lead
    if (status === "not-a-lead") {
      return (
        <Badge className="bg-gray-100 text-gray-800 text-xs">
          🚫 Not a Lead
        </Badge>
      );
    }

    // PRIORITY 4: VERY HOT (0.8+)
    if (temperature === "hot" && score >= 0.8) {
      return (
        <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 text-xs font-bold shadow-sm">
          🔥🔥 Very Hot
        </Badge>
      );
    }

    // PRIORITY 5: HOT (0.6-0.79)
    if (temperature === "hot" || score >= 0.6) {
      return (
        <Badge className="bg-red-100 text-red-800 border border-red-200 text-xs font-semibold">
          🔥 Hot
        </Badge>
      );
    }

    // PRIORITY 6: WARM (0.4-0.59)
    if (temperature === "warm" || score >= 0.4) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 text-xs">😐 Warm</Badge>
      );
    }

    // 🆕 PRIORITY 7: Show handling mode for all other states
    if (!isAiHandled) {
      return (
        <Badge className="bg-green-100 text-green-800 border border-green-200 text-xs flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          You
        </Badge>
      );
    }

    // DEFAULT: AI handling
    return (
      <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-xs flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
        AI
      </Badge>
    );
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Vancouver",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  const replaceVariables = (content: string, lead: any) => {
    return content
      .replace(/{firstName}/g, lead?.firstName || "[First Name]")
      .replace(/{lastName}/g, lead?.lastName || "[Last Name]")
      .replace(/{company}/g, lead?.company || "[Company]")
      .replace(/{service}/g, "construction")
      .replace(/{price}/g, "[Price]")
      .replace(/{date}/g, "[Date]")
      .replace(/{time}/g, "[Time]")
      .replace(/{location}/g, "[Location]");
  };

  const useTemplate = async (template: any) => {
    if (!selectedConversation) return;
    const replacedContent = replaceVariables(
      template.content,
      selectedConversation.lead
    );
    setNewMessage(replacedContent);
    setShowTemplates(false);
    await fetch(`/api/quick-replies/${template.id}/use`, {
      method: "POST",
      credentials: "include",
    });
  };

  const filteredTemplates = ((templates as any[]) || []).filter((t: any) => {
    const matchesSearch =
      templateSearch === "" ||
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.content.toLowerCase().includes(templateSearch.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const notLeadCount = conversations.filter(
    (c: any) => c.lead?.status === "not-a-lead"
  ).length;

  const handleApproveBooking = async (bookingId: string) => {
    setApprovingBookingId(bookingId);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to approve");

      const approvedBooking = await response.json();
      queryClient.setQueryData(
        ["/api/bookings", selectedClientId, "pending"],
        (old: any[]) => old?.filter((b) => b.id !== bookingId) || []
      );
      await queryClient.invalidateQueries({
        queryKey: ["/api/bookings", selectedClientId, "pending"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["/api/bookings", selectedClientId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
      });

      toast({
        title: "✅ Booking Approved & Sent!",
        description: (
          <div className="space-y-1 text-sm">
            <p className="font-medium">Confirmation sent to lead via:</p>
            <div className="flex flex-col gap-0.5 text-xs">
              <span>📧 Email: Calendar invite</span>
              <span>💬 WhatsApp: Meeting details</span>
            </div>
          </div>
        ),
        duration: 6000,
      });

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 500);
    } catch (error) {
      toast({
        title: "❌ Approval Failed",
        description: "Could not approve booking. Please try again.",
        variant: "destructive",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApproveBooking(bookingId)}
          >
            Retry
          </Button>
        ),
      });
    } finally {
      setApprovingBookingId(null);
    }
  };

  const handleDeclineBooking = async (bookingId: string) => {
    setDecliningBookingId(bookingId);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/decline`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to decline");

      queryClient.setQueryData(
        ["/api/bookings", selectedClientId, "pending"],
        (old: any[]) => old?.filter((b) => b.id !== bookingId) || []
      );
      await queryClient.invalidateQueries({
        queryKey: ["/api/bookings", selectedClientId, "pending"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
      });

      toast({
        title: "Booking Declined",
        description: "The lead has been notified and can propose a new time.",
        duration: 5000,
      });

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 500);
    } catch (error) {
      toast({
        title: "❌ Decline Failed",
        description: "Could not decline booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDecliningBookingId(null);
      setShowDeclineConfirm(null);
    }
  };

  // 🆕 Close mobile menu when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      setIsMobileMenuOpen(false);
    }
  }, [selectedConversation]);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* 🆕 Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {selectedConversation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedConversation(null)}
              className="touch-target flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          {!selectedConversation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
              className="touch-target flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 truncate">
              {selectedConversation
                ? `${selectedConversation.lead?.firstName} ${selectedConversation.lead?.lastName}`
                : "Conversations"}
            </h1>
            {/* 🆕 Inline status pill (mobile) */}
            {selectedConversation && (
              <div className="flex items-center gap-2 mt-0.5">
                {(() => {
                  const score = parseFloat(
                    selectedConversation.lead?.manualScore ||
                      selectedConversation.lead?.qualificationScore ||
                      selectedConversation.qualificationScore ||
                      "0"
                  );

                  if (score >= 0.8) {
                    return (
                      <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold px-1.5 py-0">
                        🔥🔥 Very Hot
                      </Badge>
                    );
                  } else if (score >= 0.6) {
                    return (
                      <Badge className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-semibold px-1.5 py-0">
                        🔥 Hot
                      </Badge>
                    );
                  }
                  return null;
                })()}

                {/* 🆕 Handling mode indicator */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200">
                  {selectedConversation.isAiHandled ? (
                    <>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-medium text-slate-700">
                        AI
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-[10px] font-medium text-slate-700">
                        You
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🆕 Mobile Action Buttons */}
        {selectedConversation && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Take Over Button - ONLY if AI handling */}
            {selectedConversation.isAiHandled && (
              <Button
                onClick={() => handleTakeover(selectedConversation.id)}
                disabled={takeoverMutation.isPending}
                size="sm"
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50 h-8 px-2.5 text-xs touch-target"
              >
                {takeoverMutation.isPending ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Take Over</span>
                  </>
                )}
              </Button>
            )}

            {/* Lead Details Button */}
            <Sheet open={showLeadDetails} onOpenChange={setShowLeadDetails}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="touch-target h-8 w-8"
                >
                  <Info className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:max-w-md p-0 overflow-y-auto"
              >
                <SheetHeader className="p-4 border-b border-slate-200">
                  <SheetTitle>Lead Details</SheetTitle>
                </SheetHeader>
                {/* Lead Details Content - Same as desktop right sidebar */}
                <div className="p-4 space-y-4">
                  {parseFloat(
                    selectedConversation.lead?.manualScore ||
                      selectedConversation.lead?.qualificationScore ||
                      selectedConversation.qualificationScore ||
                      "0"
                  ) >= 0.6 && ( // 🆕 Changed from 0.7 to 0.6
                    <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-semibold text-red-800">
                        {parseFloat(
                          selectedConversation.lead?.manualScore ||
                            selectedConversation.lead?.qualificationScore ||
                            selectedConversation.qualificationScore ||
                            "0"
                        ) >= 0.8
                          ? "🔥🔥 VERY HOT LEAD"
                          : "🔥 HOT LEAD"}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-xs">Phone</span>
                      <span className="text-slate-900 font-medium text-sm">
                        {selectedConversation.lead?.phone || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-xs">Email</span>
                      <span className="text-slate-900 text-xs truncate ml-2">
                        {selectedConversation.lead?.email || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-xs">Company</span>
                      <span className="text-slate-900 font-medium text-sm">
                        {selectedConversation.lead?.company || "—"}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Temperature
                      </span>
                      <Badge
                        className={`text-xs ${
                          selectedConversation.lead?.temperature === "hot"
                            ? "bg-red-100 text-red-800"
                            : selectedConversation.lead?.temperature === "warm"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {selectedConversation.lead?.temperature === "hot" &&
                          "🔥 Hot"}
                        {selectedConversation.lead?.temperature === "warm" &&
                          "😐 Warm"}
                        {selectedConversation.lead?.temperature === "cold" &&
                          "❄️ Cold"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Status</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {selectedConversation.lead?.status || "new"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Score</span>
                      <Badge
                        className={`text-xs ${
                          parseFloat(
                            selectedConversation.lead?.manualScore ||
                              selectedConversation.lead?.qualificationScore ||
                              selectedConversation.qualificationScore ||
                              "0"
                          ) >= 0.8 // 🆕 VERY HOT threshold
                            ? "bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold"
                            : parseFloat(
                                selectedConversation.lead?.manualScore ||
                                  selectedConversation.lead
                                    ?.qualificationScore ||
                                  selectedConversation.qualificationScore ||
                                  "0"
                              ) >= 0.6 // 🆕 HOT threshold
                            ? "bg-red-100 text-red-800 font-semibold"
                            : parseFloat(
                                selectedConversation.lead?.manualScore ||
                                  selectedConversation.lead
                                    ?.qualificationScore ||
                                  selectedConversation.qualificationScore ||
                                  "0"
                              ) >= 0.4 // WARM threshold
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800" // COLD/AI
                        }`}
                      >
                        {(
                          parseFloat(
                            selectedConversation.lead?.manualScore ||
                              selectedConversation.lead?.qualificationScore ||
                              selectedConversation.qualificationScore ||
                              "0"
                          ) * 100
                        ).toFixed(0)}
                        %
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Manual Controls */}
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowManualControls(!showManualControls)}
                      className="w-full justify-between p-2 h-auto hover:bg-slate-50 touch-target"
                    >
                      <span className="text-xs font-semibold text-slate-700">
                        Manual Controls
                      </span>
                      <Target
                        className={`w-3 h-3 transition-transform ${
                          showManualControls ? "rotate-90" : ""
                        }`}
                      />
                    </Button>
                    {showManualControls && (
                      <div className="mt-3 space-y-3">
                        {/* Score Slider */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500">
                              Override Score
                            </span>
                            <span className="text-xs font-semibold text-slate-900">
                              {(
                                parseFloat(
                                  selectedConversation.lead?.manualScore ||
                                    selectedConversation.qualificationScore ||
                                    "0"
                                ) * 100
                              ).toFixed(0)}
                              %
                            </span>
                          </div>
                          <Slider
                            value={[
                              parseFloat(
                                selectedConversation.lead?.manualScore ||
                                  selectedConversation.qualificationScore ||
                                  "0"
                              ) * 100,
                            ]}
                            onValueChange={(value) => updateScore(value[0])}
                            max={100}
                            step={1}
                            className="w-full touch-target"
                          />
                        </div>

                        {/* Temperature */}
                        <div>
                          <span className="text-xs text-slate-500 block mb-1">
                            Temperature
                          </span>
                          <Select
                            value={
                              selectedConversation.lead?.temperature || "cold"
                            }
                            onValueChange={(temp) =>
                              updateLeadMutation.mutate({ temperature: temp })
                            }
                          >
                            <SelectTrigger className="w-full h-11 text-sm touch-target">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cold">❄️ Cold</SelectItem>
                              <SelectItem value="warm">😐 Warm</SelectItem>
                              <SelectItem value="hot">🔥 Hot</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Status */}
                        <div>
                          <span className="text-xs text-slate-500 block mb-1">
                            Sales Stage
                          </span>
                          <Select
                            value={selectedConversation.lead?.status || "new"}
                            onValueChange={updateStatus}
                          >
                            <SelectTrigger className="w-full h-11 text-sm touch-target">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">🆕 New</SelectItem>
                              <SelectItem value="contacted">
                                📞 Contacted
                              </SelectItem>
                              <SelectItem value="qualified">
                                ✅ Qualified
                              </SelectItem>
                              <SelectItem value="proposal-sent">
                                📄 Proposal Sent
                              </SelectItem>
                              <SelectItem value="negotiation">
                                🤝 Negotiation
                              </SelectItem>
                              <SelectItem value="converted">
                                💰 Converted
                              </SelectItem>
                              <SelectItem value="lost">❌ Lost</SelectItem>
                              <SelectItem value="on-hold">
                                ⏸️ On Hold
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Tags */}
                        <div>
                          <span className="text-xs text-slate-500 block mb-1">
                            Tags
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {availableTags?.slice(0, 6).map((tag: any) => {
                              const isSelected =
                                selectedConversation.lead?.tags?.includes(
                                  tag.name
                                );
                              return (
                                <button
                                  key={tag.id}
                                  onClick={() => toggleTag(tag.name)}
                                  className={`px-3 py-2 rounded-full text-xs font-medium transition-all touch-target ${
                                    isSelected
                                      ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  {tag.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-11 text-sm touch-target"
                      onClick={() => {
                        updateLeadMutation.mutate({
                          tags: [
                            ...(selectedConversation.lead?.tags || []),
                            "Hot Lead",
                          ],
                          manualScore: "0.9",
                          isManualOverride: true,
                        });
                      }}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Mark Hot Lead
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-11 text-sm touch-target"
                      onClick={() => updateStatus("converted")}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Converted
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-11 text-sm text-red-600 touch-target"
                      onClick={() => updateStatus("lost")}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Mark Lost
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 🆕 Mobile Conversations Sidebar (Drawer) */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-full sm:max-w-md p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-200">
                <Breadcrumb className="mb-3">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        onClick={() => (window.location.href = "/dashboard")}
                        className="cursor-pointer"
                      >
                        Dashboard
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Conversations</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Conversations
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="touch-target"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                  </Button>
                </div>

                <div
                  className={`flex items-center space-x-2 text-sm px-3 py-2 rounded-lg mb-4 ${
                    isConnected
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  <span>{isConnected ? "Connected" : "Disconnected"}</span>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-11 touch-target"
                  />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[140px] h-11 touch-target">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All ({conversations.length})
                      </SelectItem>
                      <SelectItem value="hot">Hot ({hotCount})</SelectItem>
                      <SelectItem value="ai">AI ({aiHandlingCount})</SelectItem>
                      <SelectItem value="human">
                        Human ({humanHandlingCount})
                      </SelectItem>
                      <SelectItem value="not-lead">
                        Not Lead ({notLeadCount})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-3">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">
                        {searchQuery || filterStatus !== "all"
                          ? "No conversations match"
                          : "No conversations"}
                      </p>
                    </div>
                  ) : (
                    filteredConversations.map((conversation: any) => (
                      <Card
                        key={conversation.id}
                        className={`cursor-pointer transition-colors hover:bg-slate-50 active:bg-slate-100 ${
                          selectedConversation?.id === conversation.id
                            ? "ring-2 ring-primary"
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedConversation(conversation);
                          markAsReadMutation.mutate(conversation.id);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <CardContent className="p-4 touch-target">
                          <div className="flex items-start space-x-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="text-base">
                                  {(conversation.lead?.firstName?.[0] || "U") +
                                    (conversation.lead?.lastName?.[0] || "")}
                                </AvatarFallback>
                              </Avatar>
                              {conversation.unreadCount > 0 && (
                                <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center px-1">
                                  <span className="text-xs font-bold text-white">
                                    {conversation.unreadCount}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4
                                  className={`text-sm font-medium truncate ${
                                    conversation.unreadCount > 0
                                      ? "text-slate-900 font-semibold"
                                      : "text-slate-900"
                                  }`}
                                >
                                  {conversation.lead?.firstName}{" "}
                                  {conversation.lead?.lastName}
                                </h4>
                                <span className="text-xs text-slate-500">
                                  {formatTime(conversation.lastMessageAt)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mb-2 truncate">
                                {conversation.lead?.company}
                              </p>
                              {getStatusBadge(conversation)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Left: Desktop Conversations List */}
        <div className="hidden lg:block w-80 bg-white border-r border-slate-200 flex-col">
          <div className="p-3 border-b border-slate-200 flex-shrink-0">
            <Breadcrumb className="mb-3">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => (window.location.href = "/dashboard")}
                    className="cursor-pointer"
                  >
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Conversations</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-slate-900">
                Conversations
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            <div
              className={`flex items-center space-x-2 text-sm px-3 py-2 rounded-lg mb-4 ${
                isConnected
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span>{isConnected ? "Connected" : "Disconnected"}</span>
            </div>
            <div className="flex gap-1.5 mb-3">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-2"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All ({conversations.length})
                  </SelectItem>
                  <SelectItem value="hot">Hot Leads ({hotCount})</SelectItem>
                  <SelectItem value="ai">
                    AI Handling ({aiHandlingCount})
                  </SelectItem>
                  <SelectItem value="human">
                    Human ({humanHandlingCount})
                  </SelectItem>
                  <SelectItem value="not-lead">
                    Not a Lead ({notLeadCount})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-3">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">
                    {searchQuery || filterStatus !== "all"
                      ? "No conversations match your filters"
                      : "No active conversations"}
                  </p>
                  {(searchQuery || filterStatus !== "all") && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterStatus("all");
                      }}
                      className="mt-2"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                filteredConversations.map((conversation: any) => (
                  <Card
                    key={conversation.id}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                      selectedConversation?.id === conversation.id
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      markAsReadMutation.mutate(conversation.id);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {(conversation.lead?.firstName?.[0] || "U") +
                                (conversation.lead?.lastName?.[0] || "")}
                            </AvatarFallback>
                          </Avatar>
                          {conversation.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center px-1">
                              <span className="text-xs font-bold text-white">
                                {conversation.unreadCount}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4
                              className={`text-sm font-medium truncate ${
                                conversation.unreadCount > 0
                                  ? "text-slate-900 font-semibold"
                                  : "text-slate-900"
                              }`}
                            >
                              {conversation.lead?.firstName}{" "}
                              {conversation.lead?.lastName}
                            </h4>
                            <span className="text-xs text-slate-500">
                              {formatTime(conversation.lastMessageAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mb-2 truncate">
                            {conversation.lead?.company}
                          </p>
                          {getStatusBadge(conversation)}
                          {parseFloat(
                            conversation.lead?.manualScore ||
                              conversation.lead?.qualificationScore ||
                              conversation.qualificationScore ||
                              "0"
                          ) >= 0.6 && ( // 🆕 Changed from 0.7 to 0.6
                            <div className="flex items-center space-x-1 mt-2 text-xs text-red-600">
                              <AlertTriangle className="w-3 h-3" />
                              <span>
                                {parseFloat(
                                  conversation.lead?.manualScore ||
                                    conversation.lead?.qualificationScore ||
                                    conversation.qualificationScore ||
                                    "0"
                                ) >= 0.8
                                  ? "🔥 Urgent!"
                                  : "Needs attention"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center: Chat Interface */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Desktop Header */}
              <div className="hidden lg:flex bg-white border-b border-slate-200 p-4 flex-shrink-0 items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {(selectedConversation.lead?.firstName?.[0] || "U") +
                        (selectedConversation.lead?.lastName?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {selectedConversation.lead?.firstName}{" "}
                      {selectedConversation.lead?.lastName}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {selectedConversation.lead?.company}
                    </p>
                  </div>
                </div>

                {/* 🆕 RIGHT SIDE - Minimal Status Indicators */}
                <div className="flex items-center gap-3">
                  {/* 🆕 Lead Score Badge (ONLY if Hot/Very Hot) */}
                  {(() => {
                    const score = parseFloat(
                      selectedConversation.lead?.manualScore ||
                        selectedConversation.lead?.qualificationScore ||
                        selectedConversation.qualificationScore ||
                        "0"
                    );

                    if (score >= 0.8) {
                      return (
                        <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold shadow-sm">
                          🔥🔥 Very Hot
                        </Badge>
                      );
                    } else if (score >= 0.6) {
                      return (
                        <Badge className="bg-red-100 text-red-800 border border-red-200 text-xs font-semibold">
                          🔥 Hot Lead
                        </Badge>
                      );
                    }
                    return null;
                  })()}

                  {/* 🆕 HANDLING MODE PILL - Clean, minimal */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
                    {selectedConversation.isAiHandled ? (
                      <>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-slate-700">
                          AI
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs font-medium text-slate-700">
                          You
                        </span>
                      </>
                    )}
                  </div>

                  {/* Lead Details Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLeadDetails(!showLeadDetails)}
                    className={`p-2 ${showLeadDetails ? "bg-slate-100" : ""}`}
                    title="Lead Details"
                  >
                    <Info className="w-6 h-6 text-slate-600" />
                  </Button>

                  {/* 🆕 Take Over Button - ONLY shows when AI is handling */}
                  {selectedConversation.isAiHandled && (
                    <Button
                      onClick={() => handleTakeover(selectedConversation.id)}
                      disabled={takeoverMutation.isPending}
                      size="sm"
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                      {takeoverMutation.isPending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                          Taking over...
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5 mr-2" />
                          Take Over
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-50">
                <div className="space-y-2 max-w mx-auto">
                  {messages?.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">No messages yet</p>
                    </div>
                  ) : (
                    (() => {
                      if (!messages || messages.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <MessageCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-600">
                              No messages yet
                            </p>
                          </div>
                        );
                      }

                      const lastAiMessageIndex = messages
                        .map((m: any, idx: number) =>
                          m.sender === "ai" ? idx : -1
                        )
                        .filter((idx: number) => idx !== -1)
                        .pop();

                      const messageGroups = groupMessagesByDate(messages);
                      let globalIndex = -1;

                      return messageGroups.map((group) => (
                        <div key={group.date}>
                          <DateDivider date={group.date} />
                          <div className="space-y-4">
                            {group.messages.map((message: any) => {
                              globalIndex++;
                              const isLastAiMessage =
                                globalIndex === lastAiMessageIndex;

                              return (
                                <div key={message.id}>
                                  <div
                                    className={`flex ${
                                      message.sender === "lead"
                                        ? "justify-start"
                                        : "justify-end"
                                    }`}
                                  >
                                    <div className="relative max-w-xs lg:max-w-md group">
                                      <div
                                        className={`px-3 py-2 rounded-lg ${
                                          message.sender === "lead"
                                            ? "bg-slate-100 text-slate-900"
                                            : message.sender === "ai"
                                            ? "bg-blue-100 text-blue-900"
                                            : "bg-primary text-white"
                                        } ${
                                          message.isStatusMessage
                                            ? "opacity-60 italic text-xs"
                                            : ""
                                        }`}
                                      >
                                        <div className="flex items-center space-x-1.5 mb-0.5">
                                          {message.sender === "ai" && (
                                            <Bot className="w-3 h-3" />
                                          )}
                                          {message.sender === "lead" && (
                                            <User className="w-3 h-3" />
                                          )}
                                          {message.sender === "human" && (
                                            <UserCheck className="w-3 h-3" />
                                          )}
                                          <span className="text-xs opacity-75">
                                            {message.sender === "ai"
                                              ? "AI"
                                              : message.sender === "lead"
                                              ? "Lead"
                                              : "You"}
                                          </span>
                                        </div>
                                        <p className="text-sm break-words">
                                          {message.content}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          {message.sender === "lead" ? (
                                            <>
                                              {message.reactions &&
                                                message.reactions.length >
                                                  0 && (
                                                  <div className="flex items-center gap-1">
                                                    {(() => {
                                                      const reactionCounts =
                                                        message.reactions.reduce(
                                                          (
                                                            acc: any,
                                                            r: any
                                                          ) => {
                                                            if (
                                                              !r.emoji ||
                                                              r.emoji.trim() ===
                                                                ""
                                                            )
                                                              return acc;
                                                            acc[r.emoji] =
                                                              (acc[r.emoji] ||
                                                                0) + 1;
                                                            return acc;
                                                          },
                                                          {}
                                                        );
                                                      return Object.entries(
                                                        reactionCounts
                                                      )
                                                        .filter(
                                                          ([emoji]) =>
                                                            emoji &&
                                                            emoji.trim() !== ""
                                                        )
                                                        .map(
                                                          ([
                                                            emoji,
                                                            count,
                                                          ]: any) => {
                                                            const userReacted =
                                                              message.reactions.some(
                                                                (r: any) =>
                                                                  r.emoji ===
                                                                    emoji &&
                                                                  r.userId ===
                                                                    user?.id
                                                              );
                                                            return (
                                                              <button
                                                                key={emoji}
                                                                className={`relative inline-flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 ${
                                                                  userReacted
                                                                    ? "bg-blue-100 ring-1 ring-blue-300"
                                                                    : "bg-slate-100 hover:bg-slate-200"
                                                                }`}
                                                                style={{
                                                                  width: "28px",
                                                                  height:
                                                                    "28px",
                                                                  borderRadius:
                                                                    "50%",
                                                                  padding: "0",
                                                                  minWidth:
                                                                    "28px",
                                                                  minHeight:
                                                                    "28px",
                                                                }}
                                                                title={message.reactions
                                                                  .filter(
                                                                    (r: any) =>
                                                                      r.emoji ===
                                                                      emoji
                                                                  )
                                                                  .map(
                                                                    (r: any) =>
                                                                      r.userName
                                                                  )
                                                                  .join(", ")}
                                                                onClick={(
                                                                  e
                                                                ) => {
                                                                  e.stopPropagation();
                                                                  if (
                                                                    userReacted
                                                                  ) {
                                                                    removeReactionMutation.mutate(
                                                                      {
                                                                        messageId:
                                                                          message.id,
                                                                        emoji,
                                                                      }
                                                                    );
                                                                  } else {
                                                                    reactToMessageMutation.mutate(
                                                                      {
                                                                        messageId:
                                                                          message.id,
                                                                        emoji,
                                                                      }
                                                                    );
                                                                  }
                                                                }}
                                                              >
                                                                <span
                                                                  className="text-sm leading-none block"
                                                                  style={{
                                                                    lineHeight:
                                                                      "1",
                                                                  }}
                                                                >
                                                                  {emoji}
                                                                </span>
                                                                {count > 1 && (
                                                                  <span
                                                                    className="absolute -top-1 -right-1 text-[8px] font-bold text-white bg-slate-800 flex items-center justify-center"
                                                                    style={{
                                                                      width:
                                                                        "12px",
                                                                      height:
                                                                        "12px",
                                                                      borderRadius:
                                                                        "50%",
                                                                      lineHeight:
                                                                        "1",
                                                                    }}
                                                                  >
                                                                    {count}
                                                                  </span>
                                                                )}
                                                              </button>
                                                            );
                                                          }
                                                        );
                                                    })()}
                                                  </div>
                                                )}
                                              <span className="text-xs font-medium text-slate-600">
                                                {formatTime(message.sentAt)}
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <span
                                                className={`text-xs font-medium ${
                                                  message.sender === "human"
                                                    ? "text-white/90"
                                                    : "text-blue-800/80"
                                                }`}
                                              >
                                                {formatTime(message.sentAt)}
                                              </span>
                                              <div
                                                className="flex items-center transition-all duration-200"
                                                title={
                                                  !message.deliveredAt
                                                    ? "Sending..."
                                                    : message.readAt
                                                    ? `Read`
                                                    : "Delivered"
                                                }
                                              >
                                                {!message.deliveredAt ? (
                                                  <Check
                                                    className={`w-3.5 h-3.5 animate-pulse ${
                                                      message.sender === "human"
                                                        ? "text-white/60"
                                                        : "text-slate-400"
                                                    }`}
                                                    strokeWidth={2}
                                                  />
                                                ) : message.readAt ? (
                                                  <div className="flex items-center -space-x-1">
                                                    <Check
                                                      className={`w-3.5 h-3.5 ${
                                                        message.sender ===
                                                        "human"
                                                          ? "text-white"
                                                          : "text-blue-700"
                                                      }`}
                                                      strokeWidth={3}
                                                    />
                                                    <Check
                                                      className={`w-3.5 h-3.5 ${
                                                        message.sender ===
                                                        "human"
                                                          ? "text-white"
                                                          : "text-blue-700"
                                                      }`}
                                                      strokeWidth={3}
                                                    />
                                                  </div>
                                                ) : (
                                                  <div className="flex items-center -space-x-1">
                                                    <Check
                                                      className={`w-3.5 h-3.5 ${
                                                        message.sender ===
                                                        "human"
                                                          ? "text-white/70"
                                                          : "text-blue-600/70"
                                                      }`}
                                                      strokeWidth={2.5}
                                                    />
                                                    <Check
                                                      className={`w-3.5 h-3.5 ${
                                                        message.sender ===
                                                        "human"
                                                          ? "text-white/70"
                                                          : "text-blue-600/70"
                                                      }`}
                                                      strokeWidth={2.5}
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                              {message.reactions &&
                                                message.reactions.length >
                                                  0 && (
                                                  <div className="flex items-center gap-1 ml-1">
                                                    {(() => {
                                                      const reactionCounts =
                                                        message.reactions.reduce(
                                                          (
                                                            acc: any,
                                                            r: any
                                                          ) => {
                                                            if (
                                                              !r.emoji ||
                                                              r.emoji.trim() ===
                                                                ""
                                                            )
                                                              return acc;
                                                            acc[r.emoji] =
                                                              (acc[r.emoji] ||
                                                                0) + 1;
                                                            return acc;
                                                          },
                                                          {}
                                                        );
                                                      return Object.entries(
                                                        reactionCounts
                                                      )
                                                        .filter(
                                                          ([emoji]) =>
                                                            emoji &&
                                                            emoji.trim() !== ""
                                                        )
                                                        .map(
                                                          ([
                                                            emoji,
                                                            count,
                                                          ]: any) => {
                                                            const userReacted =
                                                              message.reactions.some(
                                                                (r: any) =>
                                                                  r.emoji ===
                                                                    emoji &&
                                                                  r.userId ===
                                                                    user?.id
                                                              );
                                                            return (
                                                              <button
                                                                key={emoji}
                                                                className={`relative inline-flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 ${
                                                                  userReacted
                                                                    ? message.sender ===
                                                                      "human"
                                                                      ? "bg-white/30 backdrop-blur-sm ring-1 ring-white/50"
                                                                      : "bg-blue-200 ring-1 ring-blue-400"
                                                                    : message.sender ===
                                                                      "human"
                                                                    ? "bg-white/20 backdrop-blur-sm hover:bg-white/30"
                                                                    : "bg-blue-100 hover:bg-blue-200"
                                                                }`}
                                                                style={{
                                                                  width: "28px",
                                                                  height:
                                                                    "28px",
                                                                  borderRadius:
                                                                    "50%",
                                                                  padding: "0",
                                                                  minWidth:
                                                                    "28px",
                                                                  minHeight:
                                                                    "28px",
                                                                }}
                                                                title={message.reactions
                                                                  .filter(
                                                                    (r: any) =>
                                                                      r.emoji ===
                                                                      emoji
                                                                  )
                                                                  .map(
                                                                    (r: any) =>
                                                                      r.userName
                                                                  )
                                                                  .join(", ")}
                                                                onClick={(
                                                                  e
                                                                ) => {
                                                                  e.stopPropagation();
                                                                  if (
                                                                    userReacted
                                                                  ) {
                                                                    removeReactionMutation.mutate(
                                                                      {
                                                                        messageId:
                                                                          message.id,
                                                                        emoji,
                                                                      }
                                                                    );
                                                                  } else {
                                                                    reactToMessageMutation.mutate(
                                                                      {
                                                                        messageId:
                                                                          message.id,
                                                                        emoji,
                                                                      }
                                                                    );
                                                                  }
                                                                }}
                                                              >
                                                                <span
                                                                  className="text-sm leading-none block"
                                                                  style={{
                                                                    lineHeight:
                                                                      "1",
                                                                  }}
                                                                >
                                                                  {emoji}
                                                                </span>
                                                                {count > 1 && (
                                                                  <span
                                                                    className="absolute -top-1 -right-1 text-[8px] font-bold text-white bg-slate-800 flex items-center justify-center"
                                                                    style={{
                                                                      width:
                                                                        "12px",
                                                                      height:
                                                                        "12px",
                                                                      borderRadius:
                                                                        "50%",
                                                                      lineHeight:
                                                                        "1",
                                                                    }}
                                                                  >
                                                                    {count}
                                                                  </span>
                                                                )}
                                                              </button>
                                                            );
                                                          }
                                                        );
                                                    })()}
                                                  </div>
                                                )}
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Reaction button - hidden on mobile for simplicity */}
                                      {!message.isStatusMessage && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowReactionPicker(
                                              showReactionPicker === message.id
                                                ? null
                                                : message.id
                                            );
                                          }}
                                          className={`hidden sm:block absolute top-1/2 -translate-y-1/2 ${
                                            message.sender === "lead"
                                              ? "-right-8"
                                              : "-left-8"
                                          } opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm z-20 inline-flex items-center justify-center flex-shrink-0`}
                                          style={{
                                            width: "28px",
                                            height: "28px",
                                            borderRadius: "50%",
                                            padding: "0",
                                            minWidth: "28px",
                                            minHeight: "28px",
                                          }}
                                          title="React"
                                        >
                                          <span
                                            className="text-sm leading-none block"
                                            style={{ lineHeight: "1" }}
                                          >
                                            😊
                                          </span>
                                        </button>
                                      )}

                                      {/* Info button - hidden on mobile */}
                                      {!message.isStatusMessage &&
                                        message.sender !== "lead" && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowMessageInfo(message.id);
                                            }}
                                            className={`absolute top-1/2 -translate-y-1/2 ${
                                              message.sender === "lead"
                                                ? "-right-16"
                                                : "-left-16"
                                            } opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm z-20 inline-flex items-center justify-center flex-shrink-0`}
                                            style={{
                                              width: "28px",
                                              height: "28px",
                                              borderRadius: "50%",
                                              padding: "0",
                                              minWidth: "28px",
                                              minHeight: "28px",
                                            }}
                                            title="Message Info"
                                          >
                                            <Info className="w-3 h-3 text-slate-600" />
                                          </button>
                                        )}

                                      {/* Reaction Picker */}
                                      {showReactionPicker === message.id && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-30"
                                            onClick={() =>
                                              setShowReactionPicker(null)
                                            }
                                          />
                                          <div
                                            className={`absolute ${
                                              message.sender === "lead"
                                                ? "left-0"
                                                : "right-0"
                                            } bottom-full mb-1 bg-white rounded-full shadow-lg border border-slate-300 px-1.5 py-1 flex items-center gap-0.5 z-40 animate-in fade-in slide-in-from-bottom-1 duration-150`}
                                          >
                                            {[
                                              "👍",
                                              "❤️",
                                              "😂",
                                              "😮",
                                              "😢",
                                              "🙏",
                                              "🔥",
                                              "👏",
                                            ].map((emoji) => {
                                              const isCurrentReaction =
                                                getUserReaction(message) ===
                                                emoji;
                                              return (
                                                <button
                                                  key={emoji}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    reactToMessageMutation.mutate(
                                                      {
                                                        messageId: message.id,
                                                        emoji,
                                                      }
                                                    );
                                                    setShowReactionPicker(null);
                                                  }}
                                                  className={`relative inline-flex items-center justify-center flex-shrink-0 transition-transform hover:scale-125 active:scale-100 ${
                                                    isCurrentReaction
                                                      ? "bg-blue-50 ring-1 ring-blue-400"
                                                      : "hover:bg-slate-50"
                                                  }`}
                                                  style={{
                                                    width: "32px",
                                                    height: "32px",
                                                    borderRadius: "50%",
                                                    padding: "0",
                                                    minWidth: "32px",
                                                    minHeight: "32px",
                                                  }}
                                                >
                                                  <span
                                                    className="text-lg leading-none block"
                                                    style={{ lineHeight: "1" }}
                                                  >
                                                    {emoji}
                                                  </span>
                                                  {isCurrentReaction && (
                                                    <span
                                                      className="absolute bg-blue-600 flex items-center justify-center"
                                                      style={{
                                                        width: "10px",
                                                        height: "10px",
                                                        borderRadius: "50%",
                                                        top: "-2px",
                                                        right: "-2px",
                                                      }}
                                                    >
                                                      <span
                                                        className="bg-white"
                                                        style={{
                                                          width: "4px",
                                                          height: "4px",
                                                          borderRadius: "50%",
                                                        }}
                                                      ></span>
                                                    </span>
                                                  )}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* AI Disclaimer */}
                                  {isLastAiMessage && (
                                    <div className="flex justify-end mt-2">
                                      <div className="max-w-xs lg:max-w-md bg-slate-50 border border-slate-200 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                          <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                              <span className="font-medium text-slate-700">
                                                AI can make mistakes.
                                              </span>{" "}
                                              Please double-check responses,
                                              dates, times, and booking details.
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()
                  )}

                  {showMessageInfo &&
                    (() => {
                      const selectedMessage = messages?.find(
                        (m: any) => m.id === showMessageInfo
                      );
                      return selectedMessage ? (
                        <MessageInfoModal
                          message={selectedMessage}
                          isOpen={!!showMessageInfo}
                          onClose={() => setShowMessageInfo(null)}
                        />
                      ) : null;
                    })()}

                  {/* Typing Indicator */}
                  {typingIndicators[selectedConversation?.id]?.isTyping && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-200">
                      <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center space-x-3">
                          {typingIndicators[selectedConversation.id].sender ===
                          "ai" ? (
                            <Bot className="w-4 h-4 text-blue-600" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-green-600" />
                          )}
                          <div className="flex space-x-1">
                            <div
                              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                              style={{
                                animationDelay: "0ms",
                                animationDuration: "1s",
                              }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                              style={{
                                animationDelay: "150ms",
                                animationDuration: "1s",
                              }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                              style={{
                                animationDelay: "300ms",
                                animationDuration: "1s",
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-600 font-medium">
                            {typingIndicators[selectedConversation.id]
                              .sender === "ai"
                              ? "AI is typing..."
                              : "Agent is typing..."}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 🆕 MOBILE-RESPONSIVE Booking Approval Cards */}
                  {pendingBookings
                    .filter(
                      (b: any) => b.leadId === selectedConversation?.lead?.id
                    )
                    .map((booking: any) => {
                      const isApproving = approvingBookingId === booking.id;
                      const isDeclining = decliningBookingId === booking.id;
                      const showConfirm = showDeclineConfirm === booking.id;
                      const isProcessing = isApproving || isDeclining;
                      const isExpired =
                        new Date(booking.scheduledFor) < new Date();

                      return (
                        <div
                          key={booking.id}
                          className="flex justify-center my-4 px-2 sm:px-4"
                        >
                          <div className="w-full max-w-4xl">
                            {/* 🆕 Mobile & Desktop Card */}
                            <div className="bg-white rounded-lg border-l-4 border-amber-400 shadow-sm overflow-hidden">
                              {/* Header */}
                              <div className="px-3 sm:px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg
                                      className="w-4 h-4 text-amber-600"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                    </svg>
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="text-sm sm:text-md font-medium text-slate-900 truncate">
                                      Booking Pending Approval
                                    </h3>
                                    <p className="text-xs text-slate-500 hidden sm:block">
                                      AI-suggested based on conversation
                                    </p>
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="border-amber-500 text-amber-700 bg-amber-50 text-xs font-medium px-2 py-0.5 flex-shrink-0"
                                >
                                  Action
                                </Badge>
                              </div>

                              {/* Content Grid - Mobile Stack, Desktop 2 Columns */}
                              <div className="px-3 sm:px-4 py-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Date */}
                                  <div className="flex items-start gap-2.5">
                                    <CalendarIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-500 mb-0.5">
                                        Date
                                      </p>
                                      <p className="text-sm font-medium text-slate-900">
                                        {new Date(
                                          booking.scheduledFor
                                        ).toLocaleDateString("en-US", {
                                          weekday: "short",
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                          timeZone: "America/Vancouver",
                                        })}
                                      </p>
                                      {isExpired && (
                                        <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3" />
                                          Passed
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Time & Duration */}
                                  <div className="flex items-start gap-2.5">
                                    <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-500 mb-0.5">
                                        Time & Duration
                                      </p>
                                      <p className="text-sm font-medium text-slate-900">
                                        {new Date(
                                          booking.scheduledFor
                                        ).toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                          hour12: true,
                                          timeZone: "America/Vancouver",
                                        })}{" "}
                                        • {booking.duration} min
                                      </p>
                                    </div>
                                  </div>

                                  {/* Location */}
                                  <div className="flex items-start gap-2.5">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-500 mb-0.5">
                                        Location
                                      </p>
                                      <p className="text-sm font-medium text-slate-900 truncate">
                                        {booking.location || "To be determined"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Type */}
                                  <div className="flex items-start gap-2.5">
                                    <svg
                                      className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-500 mb-0.5">
                                        Type
                                      </p>
                                      <p className="text-sm font-medium text-slate-900 capitalize">
                                        {booking.meetingType || "Consultation"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              {!showConfirm && !isExpired && (
                                <div className="px-3 sm:px-4 pb-3">
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                      onClick={() =>
                                        handleApproveBooking(booking.id)
                                      }
                                      disabled={isProcessing}
                                      className="flex-[2] bg-green-600 hover:bg-green-700 text-white h-11 text-sm font-medium rounded-lg shadow-sm transition-colors touch-target"
                                    >
                                      {isApproving ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                          Approving...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Approve & Send
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      onClick={() =>
                                        setShowDeclineConfirm(booking.id)
                                      }
                                      disabled={isProcessing}
                                      variant="outline"
                                      className="flex-1 h-11 text-sm font-medium rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors touch-target"
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Decline
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Decline Confirmation */}
                              {showConfirm && (
                                <div className="px-3 sm:px-4 pb-3">
                                  <div className="space-y-2.5">
                                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-red-900">
                                          Decline this booking?
                                        </p>
                                        <p className="text-xs text-red-700 mt-0.5">
                                          Lead will be notified and can
                                          reschedule.
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <Button
                                        onClick={() =>
                                          handleDeclineBooking(booking.id)
                                        }
                                        disabled={isDeclining}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white h-11 text-sm font-medium rounded-lg touch-target"
                                      >
                                        {isDeclining ? (
                                          <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Declining...
                                          </>
                                        ) : (
                                          "Yes, Decline"
                                        )}
                                      </Button>
                                      <Button
                                        onClick={() =>
                                          setShowDeclineConfirm(null)
                                        }
                                        variant="outline"
                                        className="flex-1 h-11 text-sm rounded-lg touch-target"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Expired State */}
                              {isExpired && (
                                <div className="px-3 sm:px-4 pb-3">
                                  <div className="space-y-2.5">
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                      <p className="text-xs text-red-800">
                                        This time has passed. Decline to clear.
                                      </p>
                                    </div>
                                    <Button
                                      onClick={() =>
                                        handleDeclineBooking(booking.id)
                                      }
                                      disabled={isDeclining}
                                      variant="outline"
                                      className="w-full h-11 text-sm border-red-300 text-red-700 hover:bg-red-50 rounded-lg touch-target"
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Clear Expired
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Footer */}
                              <div className="px-3 sm:px-4 py-2.5 bg-blue-50 border-t border-blue-100 rounded-b-lg">
                                <div className="flex items-start sm:items-center gap-2 text-xs text-blue-800">
                                  <svg
                                    className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                  </svg>
                                  <span className="font-medium leading-tight">
                                    AI will send calendar invite and
                                    confirmation automatically
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input Area */}
              <div className="bg-white border-t border-slate-200 p-3 sm:p-4 flex-shrink-0">
                {/* 🆕 SUCCESS MESSAGE - Shows for 3 seconds after takeover */}
                {!selectedConversation.isAiHandled &&
                  selectedConversation.humanTakeoverAt &&
                  new Date().getTime() -
                    new Date(selectedConversation.humanTakeoverAt).getTime() <
                    3000 && (
                    <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-xs text-green-800 font-medium">
                        You're now handling this conversation
                      </span>
                    </div>
                  )}

                {/* 🆕 AI HANDLING BANNER - Compact with inline action */}
                {selectedConversation.isAiHandled && (
                  <div className="mb-3 flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Bot className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span className="text-xs text-blue-800">
                        AI is handling •{" "}
                        <button
                          onClick={() =>
                            handleTakeover(selectedConversation.id)
                          }
                          className="underline hover:text-blue-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1"
                          disabled={takeoverMutation.isPending}
                        >
                          {takeoverMutation.isPending
                            ? "Taking over..."
                            : "Take over now"}
                        </button>
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-600 rotate-[-90deg] lg:hidden flex-shrink-0 animate-bounce" />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  {/* Mobile: Stacked buttons above input */}
                  <div className="flex gap-2 sm:hidden">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowTemplates(!showTemplates)}
                      disabled={selectedConversation.isAiHandled}
                      className={`flex-1 h-11 touch-target transition-opacity ${
                        showTemplates ? "bg-blue-50" : ""
                      } ${
                        selectedConversation.isAiHandled
                          ? "opacity-40 cursor-not-allowed"
                          : ""
                      }`}
                      title={
                        selectedConversation.isAiHandled
                          ? "Take over to use templates"
                          : "Templates"
                      }
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>
                    {(() => {
                      const hasActiveBooking = allBookings.some(
                        (booking: any) =>
                          booking.leadId === selectedConversation?.lead?.id &&
                          booking.status === "scheduled"
                      );
                      return (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowBookingModal(true)}
                          title={
                            hasActiveBooking
                              ? "Active meeting exists"
                              : selectedConversation.isAiHandled
                              ? "Take over to book meeting"
                              : "Book Meeting"
                          }
                          disabled={
                            hasActiveBooking || selectedConversation.isAiHandled
                          }
                          className={`flex-1 h-11 touch-target transition-opacity ${
                            hasActiveBooking || selectedConversation.isAiHandled
                              ? "opacity-40 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </Button>
                      );
                    })()}
                  </div>

                  {/* Desktop: Side-by-side buttons */}
                  <div className="hidden sm:flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowTemplates(!showTemplates)}
                      disabled={selectedConversation.isAiHandled}
                      className={`touch-target transition-opacity ${
                        showTemplates ? "bg-blue-50" : ""
                      } ${
                        selectedConversation.isAiHandled
                          ? "opacity-40 cursor-not-allowed"
                          : ""
                      }`}
                      title={
                        selectedConversation.isAiHandled
                          ? "Take over to use templates"
                          : "Quick Replies"
                      }
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>
                    {(() => {
                      const hasActiveBooking = allBookings.some(
                        (booking: any) =>
                          booking.leadId === selectedConversation?.lead?.id &&
                          booking.status === "scheduled"
                      );
                      return (
                        <>
                          {hasActiveBooking && (
                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md">
                              <AlertCircle className="w-3 h-3" />
                              Active meeting
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowBookingModal(true)}
                            title={
                              hasActiveBooking
                                ? "Active meeting exists"
                                : selectedConversation.isAiHandled
                                ? "Take over to book meeting"
                                : "Book Meeting"
                            }
                            disabled={
                              hasActiveBooking ||
                              selectedConversation.isAiHandled
                            }
                            className={`touch-target transition-opacity ${
                              hasActiveBooking ||
                              selectedConversation.isAiHandled
                                ? "opacity-40 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <CalendarIcon className="w-4 h-4" />
                          </Button>
                        </>
                      );
                    })()}
                  </div>

                  {/* 🆕 Input with inline status indicator */}
                  <div className="flex gap-2 flex-1 relative">
                    {/* 🆕 INLINE STATUS DOT - Inside input */}
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10">
                      {selectedConversation.isAiHandled ? (
                        <>
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-slate-500">
                            AI
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-medium text-slate-500">
                            You
                          </span>
                        </>
                      )}
                    </div>

                    <Input
                      placeholder={
                        selectedConversation.isAiHandled
                          ? "AI is handling..."
                          : "Type message..."
                      }
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) =>
                        e.key === "Enter" && !e.shiftKey && handleSendMessage()
                      }
                      disabled={
                        sendMessageMutation.isPending ||
                        selectedConversation.isAiHandled
                      }
                      className={`flex-1 h-11 touch-target transition-all ${
                        selectedConversation.isAiHandled
                          ? "pl-16 bg-slate-50 cursor-not-allowed text-slate-500"
                          : "pl-16"
                      }`}
                    />

                    <Button
                      onClick={handleSendMessage}
                      disabled={
                        !newMessage.trim() ||
                        sendMessageMutation.isPending ||
                        selectedConversation.isAiHandled
                      }
                      className={`h-11 px-4 touch-target transition-all ${
                        selectedConversation.isAiHandled
                          ? "bg-slate-300 cursor-not-allowed"
                          : "bg-primary text-white hover:bg-primary/90"
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Templates Dropdown - Only shows when human is handling */}
                {showTemplates && !selectedConversation.isAiHandled && (
                  <div className="mt-3 border border-slate-200 rounded-lg bg-white shadow-lg max-h-80 sm:max-h-96 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-slate-200 space-y-2">
                      <Input
                        placeholder="Search templates..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="w-full h-11 touch-target"
                      />
                      <div className="flex gap-2 flex-wrap">
                        {[
                          "all",
                          "greeting",
                          "pricing",
                          "booking",
                          "follow-up",
                          "general",
                        ].map((cat) => (
                          <Button
                            key={cat}
                            variant={
                              selectedCategory === cat ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setSelectedCategory(cat)}
                            className="capitalize h-9 touch-target text-xs"
                          >
                            {cat}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2">
                      {filteredTemplates.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          No templates found
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredTemplates.map((template: any) => (
                            <button
                              key={template.id}
                              onClick={() => useTemplate(template)}
                              className="w-full text-left p-3 rounded-lg hover:bg-slate-50 border border-slate-200 transition-colors touch-target"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm text-slate-900">
                                  {template.name}
                                </span>
                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                  {template.category}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2">
                                {replaceVariables(
                                  template.content,
                                  selectedConversation?.lead
                                )}
                              </p>
                              {template.usageCount > 0 && (
                                <div className="mt-1 text-xs text-slate-400">
                                  Used {template.usageCount} times
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50 p-4">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Select a Conversation
                </h3>
                <p className="text-slate-600 text-sm px-4">
                  Choose from the list to start chatting
                </p>
                <Button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="mt-4 lg:hidden touch-target"
                  variant="outline"
                >
                  <Menu className="w-4 h-4 mr-2" />
                  View Conversations
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Desktop Lead Detail Sidebar */}
        {selectedConversation && showLeadDetails && (
          <div className="hidden lg:block w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
            {/* ... Same content as mobile Sheet ... */}
            {/* Copy the entire lead details content from the mobile Sheet above */}
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Lead Details
              </h3>
              {parseFloat(
                selectedConversation.lead?.manualScore ||
                  selectedConversation.lead?.qualificationScore ||
                  selectedConversation.qualificationScore ||
                  "0"
              ) >= 0.7 && (
                <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold text-red-800">
                    🔥 HOT LEAD
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Phone</span>
                  <span className="text-slate-900 font-medium">
                    {selectedConversation.lead?.phone || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Email</span>
                  <span className="text-slate-900 text-xs truncate ml-2">
                    {selectedConversation.lead?.email || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Company</span>
                  <span className="text-slate-900 font-medium">
                    {selectedConversation.lead?.company || "—"}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Temperature</span>
                  <Badge
                    className={`text-xs ${
                      selectedConversation.lead?.temperature === "hot"
                        ? "bg-red-100 text-red-800"
                        : selectedConversation.lead?.temperature === "warm"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {selectedConversation.lead?.temperature === "hot" &&
                      "🔥 Hot"}
                    {selectedConversation.lead?.temperature === "warm" &&
                      "😐 Warm"}
                    {selectedConversation.lead?.temperature === "cold" &&
                      "❄️ Cold"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Status</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {selectedConversation.lead?.status || "new"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Score</span>
                  <Badge
                    className={`text-xs ${
                      parseFloat(
                        selectedConversation.lead?.manualScore ||
                          selectedConversation.lead?.qualificationScore ||
                          selectedConversation.qualificationScore ||
                          "0"
                      ) >= 0.7
                        ? "bg-red-100 text-red-800"
                        : parseFloat(
                            selectedConversation.lead?.manualScore ||
                              selectedConversation.lead?.qualificationScore ||
                              selectedConversation.qualificationScore ||
                              "0"
                          ) >= 0.4
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {(
                      parseFloat(
                        selectedConversation.lead?.manualScore ||
                          selectedConversation.lead?.qualificationScore ||
                          selectedConversation.qualificationScore ||
                          "0"
                      ) * 100
                    ).toFixed(0)}
                    %
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Source</span>
                  <span className="text-xs text-slate-600">
                    {selectedConversation.lead?.source || "unknown"}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Manual Controls */}
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualControls(!showManualControls)}
                  className="w-full justify-between p-2 h-auto hover:bg-slate-50"
                >
                  <span className="text-xs font-semibold text-slate-700">
                    Manual Controls
                  </span>
                  <Target
                    className={`w-3 h-3 transition-transform ${
                      showManualControls ? "rotate-90" : ""
                    }`}
                  />
                </Button>
                {showManualControls && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">
                          Override Score
                        </span>
                        <span className="text-xs font-semibold text-slate-900">
                          {(
                            parseFloat(
                              selectedConversation.lead?.manualScore ||
                                selectedConversation.qualificationScore ||
                                "0"
                            ) * 100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <Slider
                        value={[
                          parseFloat(
                            selectedConversation.lead?.manualScore ||
                              selectedConversation.qualificationScore ||
                              "0"
                          ) * 100,
                        ]}
                        onValueChange={(value) => updateScore(value[0])}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">
                        Temperature Override
                      </span>
                      <Select
                        value={selectedConversation.lead?.temperature || "cold"}
                        onValueChange={(temp) =>
                          updateLeadMutation.mutate({ temperature: temp })
                        }
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cold">❄️ Cold</SelectItem>
                          <SelectItem value="warm">😐 Warm</SelectItem>
                          <SelectItem value="hot">🔥 Hot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">
                        Sales Stage
                      </span>
                      <Select
                        value={selectedConversation.lead?.status || "new"}
                        onValueChange={updateStatus}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">🆕 New</SelectItem>
                          <SelectItem value="contacted">
                            📞 Contacted
                          </SelectItem>
                          <SelectItem value="qualified">
                            ✅ Qualified
                          </SelectItem>
                          <SelectItem value="proposal-sent">
                            📄 Proposal Sent
                          </SelectItem>
                          <SelectItem value="negotiation">
                            🤝 Negotiation
                          </SelectItem>
                          <SelectItem value="converted">
                            💰 Converted
                          </SelectItem>
                          <SelectItem value="lost">❌ Lost</SelectItem>
                          <SelectItem value="on-hold">⏸️ On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">
                        Tags
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {availableTags?.slice(0, 6).map((tag: any) => {
                          const isSelected =
                            selectedConversation.lead?.tags?.includes(tag.name);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => toggleTag(tag.name)}
                              className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                                isSelected
                                  ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">
                        Internal Note
                      </span>
                      {selectedConversation.lead?.internalNotes && (
                        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          {selectedConversation.lead.internalNotes}
                        </div>
                      )}
                      <div className="flex gap-1">
                        <Input
                          placeholder="Add note..."
                          value={internalNote}
                          onChange={(e) => setInternalNote(e.target.value)}
                          className="text-xs h-8"
                        />
                        <Button
                          size="sm"
                          onClick={saveNote}
                          disabled={!internalNote.trim()}
                          className="h-8 px-2"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">
                        Follow-up
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFollowUpReminder(1)}
                          className="h-7 text-xs"
                        >
                          1d
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFollowUpReminder(3)}
                          className="h-7 text-xs"
                        >
                          3d
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFollowUpReminder(7)}
                          className="h-7 text-xs"
                        >
                          7d
                        </Button>
                      </div>
                      {selectedConversation.lead?.nextFollowUpAt && (
                        <p className="text-xs text-slate-500 mt-1">
                          📅{" "}
                          {new Date(
                            selectedConversation.lead.nextFollowUpAt
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    updateLeadMutation.mutate({
                      tags: [
                        ...(selectedConversation.lead?.tags || []),
                        "Hot Lead",
                      ],
                      manualScore: "0.9",
                      isManualOverride: true,
                    });
                  }}
                >
                  <Star className="w-3 h-3 mr-1" />
                  Mark Hot Lead
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => updateStatus("converted")}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Mark Converted
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-8 text-xs text-red-600"
                  onClick={() => updateStatus("lost")}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Mark Lost
                </Button>
              </div>

              <Separator />

              {showManualControls && activityLog && activityLog.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Activity Log
                    </span>
                    <History className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {activityLog.slice(0, 5).map((log: any) => (
                      <div
                        key={log.id}
                        className="text-xs p-2 bg-slate-50 rounded"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-slate-900 text-xs">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {log.oldValue && log.newValue && (
                          <div className="text-slate-600 text-xs mt-0.5">
                            {log.oldValue} → {log.newValue}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Created</span>
                  <span>
                    {new Date(
                      selectedConversation.lead?.createdAt
                    ).toLocaleDateString()}
                  </span>
                </div>
                {selectedConversation.lead?.responseTimeSeconds && (
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Response</span>
                    <span className="font-semibold text-green-600">
                      {selectedConversation.lead.responseTimeSeconds}s
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Book Meeting Modal */}
      <Dialog
        open={showBookingModal}
        onOpenChange={(open) => {
          setShowBookingModal(open);
          if (!open) setConflictError(null);
        }}
      >
        <DialogContent className="max-w-full sm:max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>
              Book a meeting with {selectedConversation?.lead?.firstName}{" "}
              {selectedConversation?.lead?.lastName}
            </DialogDescription>
          </DialogHeader>

          {conflictError && (
            <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-red-900 mb-1">
                    Time Slot Conflict
                  </h3>
                  <p className="text-sm text-red-700 mb-2">
                    {conflictError.message}
                  </p>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-800 font-medium hover:text-red-900 touch-target">
                      View conflicting meeting
                    </summary>
                    <div className="mt-2 p-2 bg-white rounded border border-red-200">
                      <p className="font-semibold text-red-900">
                        {conflictError.conflictingBooking?.title}
                      </p>
                      <p className="text-red-700 mt-1">
                        {conflictError.conflictingBooking?.attendeeName}
                      </p>
                      <p className="text-red-600 text-xs mt-1">
                        {new Date(
                          conflictError.conflictingBooking?.scheduledFor
                        ).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "America/Vancouver",
                        })}{" "}
                        ({conflictError.conflictingBooking?.duration} min)
                      </p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-type">Meeting Type</Label>
              <Select value={bookingType} onValueChange={setBookingType}>
                <SelectTrigger id="meeting-type" className="h-11 touch-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="site-visit">Site Visit</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="meeting-date"
                    variant="outline"
                    className={`w-full justify-start text-left font-normal h-11 touch-target ${
                      !bookingDate && "text-muted-foreground"
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bookingDate ? (
                      format(bookingDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={bookingDate}
                    onSelect={(date) => {
                      setBookingDate(date);
                      setConflictError(null);
                    }}
                    disabled={(date: Date) =>
                      date < new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {bookingDate &&
                allBookings.length > 0 &&
                (() => {
                  const dayBookings = allBookings.filter((b: any) => {
                    const bDate = new Date(b.scheduledFor);
                    return (
                      b.status === "scheduled" &&
                      bDate.getDate() === bookingDate.getDate() &&
                      bDate.getMonth() === bookingDate.getMonth() &&
                      bDate.getFullYear() === bookingDate.getFullYear()
                    );
                  });
                  if (dayBookings.length === 0) return null;
                  return (
                    <div className="text-xs bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                      <p className="font-semibold text-blue-900 mb-2 flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {dayBookings.length} meeting
                        {dayBookings.length > 1 ? "s" : ""} on{" "}
                        {format(bookingDate, "MMM d")}
                      </p>
                      <div className="space-y-1">
                        {dayBookings.map((b: any) => {
                          const start = new Date(b.scheduledFor);
                          const end = new Date(
                            start.getTime() + b.duration * 60000
                          );
                          return (
                            <div
                              key={b.id}
                              className="flex items-center gap-2 text-blue-700"
                            >
                              <Clock className="w-3 h-3" />
                              <span className="font-mono text-xs">
                                {start.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "America/Vancouver",
                                })}{" "}
                                -{" "}
                                {end.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "America/Vancouver",
                                })}
                              </span>
                              <span className="text-blue-600 text-xs truncate">
                                ({b.attendeeName})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meeting-time">Time</Label>
                <Input
                  id="meeting-time"
                  type="time"
                  value={bookingTime}
                  onChange={(e) => {
                    setBookingTime(e.target.value);
                    setConflictError(null);
                  }}
                  className="h-11 touch-target"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-duration">Duration</Label>
                <Select
                  value={bookingDuration}
                  onValueChange={(val) => {
                    setBookingDuration(val);
                    setConflictError(null);
                  }}
                >
                  <SelectTrigger
                    id="meeting-duration"
                    className="h-11 touch-target"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {bookingDate && bookingTime && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <Clock className="w-3 h-3" />
                <span>
                  Ends at{" "}
                  <strong className="text-slate-900">
                    {(() => {
                      const [hours, minutes] = bookingTime.split(":");
                      const start = new Date(bookingDate);
                      start.setHours(parseInt(hours), parseInt(minutes));
                      const end = new Date(
                        start.getTime() + parseInt(bookingDuration) * 60000
                      );
                      return end.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Vancouver",
                      });
                    })()}
                  </strong>
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="meeting-location">Location</Label>
              <Input
                id="meeting-location"
                value={bookingLocation}
                onChange={(e) => setBookingLocation(e.target.value)}
                placeholder="Office, Site, Virtual, etc."
                className="h-11 touch-target"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-notes">Notes (Optional)</Label>
              <Textarea
                id="meeting-notes"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={3}
                className="resize-none touch-target"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowBookingModal(false);
                setConflictError(null);
              }}
              className="flex-1 h-11 touch-target"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBookMeeting}
              disabled={!bookingDate || bookMeetingMutation.isPending}
              className="flex-1 h-11 touch-target"
            >
              {bookMeetingMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
