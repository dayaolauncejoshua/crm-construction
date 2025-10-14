// client/src/pages/conversations.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Phone,
  Star,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  UserCheck,
  RefreshCw,
  Info,
  Sparkles,
  Tag,
  Edit3,
  History,
  Target,
  XCircle,
} from "lucide-react";
import { space } from "postcss/lib/list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export default function Conversations() {
  usePageTitle("Conversations");

  const { user } = useAuth();
  const { selectedClientId } = useClient();

  console.log("=== USER DEBUG ===");
  console.log("User object:", user);
  console.log("User ID:", user?.id);
  console.log("User email:", user?.email);

  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get leadId from URL query parameter
  const leadIdFromCalendar = new URLSearchParams(window.location.search).get(
    "leadId"
  );

  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showManualControls, setShowManualControls] = useState(false);
  const [manualScore, setManualScore] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [internalNote, setInternalNote] = useState("");

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState<Date>();
  const [bookingTime, setBookingTime] = useState("10:00");
  const [bookingDuration, setBookingDuration] = useState("60");
  const [bookingType, setBookingType] = useState("consultation");
  const [bookingLocation, setBookingLocation] = useState("Office");
  const [bookingNotes, setBookingNotes] = useState("");
  const [conflictError, setConflictError] = useState<any>(null);

  const { data: availableTags } = useQuery<any[]>({
    queryKey: ["/api/lead-tags", selectedClientId],
    enabled: !!selectedClientId,
  });

  // Fetch activity log for selected lead
  const { data: activityLog } = useQuery<any[]>({
    queryKey: ["/api/leads", selectedConversation?.lead?.id, "activity"],
    enabled: !!selectedConversation?.lead?.id,
  });

  const [searchQuery, setSearchQuery] = useState(""); // ADD THIS
  const [filterStatus, setFilterStatus] = useState("all");

  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: templates } = useQuery({
    queryKey: ["/api/quick-replies", selectedClientId],
    enabled: !!selectedClientId,
  });

  const [typingIndicators, setTypingIndicators] = useState<
    Record<string, { isTyping: boolean; sender: string }>
  >({});

  // WebSocket for real-time updates
  const { data: wsData, isConnected } = useWebSocket();

  // Fetch conversations
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

  // Fetch messages for selected conversation
  const { data: messages } = useQuery({
    queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
    enabled: !!selectedConversation?.id,
    queryFn: async () => {
      const response = await fetch(
        `/api/conversations/${selectedConversation.id}/messages`
      );
      const data = await response.json();
      // Reverse to show oldest first (top) to newest (bottom)
      return data.reverse();
    },
  });

  // Fetch bookings for booking prevention
  const { data: allBookings = [] } = useQuery({
    queryKey: ["/api/bookings", selectedClientId],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/${selectedClientId}`);
      return response.json();
    },
    enabled: !!selectedClientId,
  });

  // Mark as read mutation
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

  // Send message mutation
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
      // Force scroll to bottom after sending
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

  // Take over conversation mutation
  const takeoverMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/conversations/${conversationId}/takeover`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Conversation taken over",
        description: "You are now handling this conversation.",
      });
    },
  });

  const conversations = dashboardData?.conversations || [];
  const hotLeads = dashboardData?.hotLeads || [];

  // Update lead manually
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
      // Update the selected conversation with new data
      setSelectedConversation((prev: any) => ({
        ...prev,
        lead: { ...prev.lead, ...data },
        qualificationScore: data.manualScore || prev.qualificationScore,
      }));

      // Refetch dashboard data
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

  // Update lead score
  const updateScore = (score: number) => {
    updateLeadMutation.mutate({
      manualScore: (score / 100).toString(),
      isManualOverride: true,
    });
  };

  // Update lead status
  const updateStatus = (status: string) => {
    updateLeadMutation.mutate({ status });
  };

  // Toggle tag
  const toggleTag = (tagName: string) => {
    const currentTags = selectedConversation?.lead?.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((t: string) => t !== tagName)
      : [...currentTags, tagName];

    updateLeadMutation.mutate({ tags: newTags });
    setSelectedTags(newTags);
  };

  // Book meeting mutation
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
        // Throw the full error data including status code
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
      console.log("❌ Booking error:", error);

      if (error.status === 409 || error.code === "Booking conflict detected") {
        setConflictError(
          error.fullData || {
            error: "Booking conflict detected",
            message: error.message,
            conflictingBooking: error.conflictingBooking,
          }
        );

        // Only show toast if modal is not open
        // Since modal is open, we don't show toast to avoid overlap
        // The in-modal alert is sufficient
      } else {
        // For non-conflict errors, show toast
        toast({
          title: "Error",
          description: error.message || "Failed to create booking",
          variant: "destructive",
        });
      }
    },
  });

  // Handle booking submission
  const handleBookMeeting = () => {
    if (!bookingDate || !selectedConversation) {
      toast({
        title: "Error",
        description: "Please select a date and time",
        variant: "destructive",
      });
      return;
    }

    // Combine date and time
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

  // Save internal note
  const saveNote = () => {
    if (!internalNote.trim()) return;

    updateLeadMutation.mutate({
      internalNotes: internalNote,
    });
    setInternalNote("");
  };

  // Set follow-up reminder
  const setFollowUpReminder = (days: number) => {
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + days);

    updateLeadMutation.mutate({
      nextFollowUpAt: followUpDate,
    });
  };

  // ADD THIS: Auto-select conversation from URL query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get("id");

    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
        markAsReadMutation.mutate(conversationId);

        // Clear URL parameter after selecting
        window.history.replaceState({}, "", "/conversations");
      }
    }
  }, [conversations]); // Run when conversations load

  // Auto-select conversation when coming from calendar
  useEffect(() => {
    if (leadIdFromCalendar && conversations.length > 0) {
      const targetConversation = conversations.find(
        (c: any) => c.leadId === leadIdFromCalendar
      );
      if (targetConversation) {
        setSelectedConversation(targetConversation);
        markAsReadMutation.mutate(targetConversation.id);

        // Clear URL parameter after selecting
        window.history.replaceState({}, "", "/conversations");
      }
    }
  }, [leadIdFromCalendar, conversations]);

  const filteredConversations = conversations.filter((conv: any) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      conv.lead?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lead?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lead?.company?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "hot" &&
        parseFloat(conv.qualificationScore || "0") >= 0.7) ||
      (filterStatus === "ai" && conv.isAiHandled === true) ||
      (filterStatus === "human" && conv.isAiHandled === false);

    return matchesSearch && matchesStatus;
  });

  // Calculate counts for badges
  const hotCount = conversations.filter(
    (c: any) => parseFloat(c.qualificationScore || "0") >= 0.7
  ).length;
  const aiHandlingCount = conversations.filter(
    (c: any) => c.isAiHandled === true
  ).length;
  const humanHandlingCount = conversations.filter(
    (c: any) => c.isAiHandled === false
  ).length;

  console.log("Hot leads from dashboard:", dashboardData?.hotLeads);
  console.log(
    "Hot leads client IDs:",
    dashboardData?.hotLeads?.map((h) => h.clientId)
  );
  // Handle WebSocket messages
  useEffect(() => {
    if (!wsData) return;

    console.log("=== WEBSOCKET EVENT ===");
    console.log("Type:", wsData.type);
    console.log("Full data:", wsData);
    console.log("Current conversations count:", conversations.length);

    console.log("WebSocket update received:", wsData);

    switch (wsData.type) {
      case "typing_indicator":
        // Update typing state
        setTypingIndicators((prev) => ({
          ...prev,
          [wsData.conversationId]: {
            isTyping: wsData.isTyping,
            sender: wsData.sender,
          },
        }));
        break;

      case "conversation_updated":
        queryClient.invalidateQueries({
          queryKey: [`/api/dashboard/${selectedClientId}`],
        });
        break;

      case "new_message":
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", wsData.conversationId, "messages"],
        });
        queryClient.invalidateQueries({
          queryKey: [`/api/dashboard/${selectedClientId}`],
        });
        break;

      case "new_conversation":
      case "hot_lead_alert":
        queryClient.invalidateQueries({
          queryKey: [`/api/dashboard/${selectedClientId}`],
        });

        if (wsData.type === "hot_lead_alert") {
          toast({
            title: "Hot Lead Alert!",
            description: `${wsData.conversation?.lead?.firstName} needs immediate attention`,
            variant: "destructive",
          });
        }
        break;

      case "lead_updated":
        console.log("🔄 Lead updated via WebSocket:", wsData.lead);

        // Update conversations list with new lead data
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
                    lead: wsData.lead, // Update with fresh lead data
                  };
                }
                return conv;
              }),
            };
          }
        );

        // If this is the selected conversation, update it too
        if (selectedConversation?.id === wsData.conversationId) {
          setSelectedConversation((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              lead: wsData.lead,
            };
          });
        }

        // Show toast notification if temperature changed to hot
        if (wsData.lead.temperature === "hot") {
          toast({
            title: "🔥 Lead is now HOT!",
            description: `${
              wsData.lead.firstName || "Lead"
            } is now a hot lead (${(
              parseFloat(wsData.lead.qualificationScore || "0") * 100
            ).toFixed(0)}%)`,
            variant: "default",
          });
        }
        break;

      default:
        console.log("⚠️ Unknown event type, calling refetch");
        refetch();
    }
  }, [wsData, selectedClientId, queryClient, toast, refetch]);

  useEffect(() => {
    // Scroll to bottom when messages load or conversation changes
    if (messages && messages.length > 0) {
      // Use timeout to ensure DOM has updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, selectedConversation?.id]);

  useEffect(() => {
    // Scroll to bottom when selecting a conversation
    if (selectedConversation) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }, [selectedConversation?.id]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation && messages && messages.length > 0) {
      const unreadMessages = messages.filter(
        (m: any) => m.sender === "lead" && !m.readAt
      );

      if (unreadMessages.length > 0) {
        console.log(`Marking ${unreadMessages.length} messages as read`);

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

  // Mark lead as viewed when conversation is selected
  useEffect(() => {
    if (
      selectedConversation?.lead?.id &&
      selectedConversation.lead.viewedAt === null
    ) {
      // Mark lead as viewed
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

    // Show temperature badge
    if (temperature === "hot") {
      return <Badge className="bg-red-100 text-red-800">🔥 Hot Lead</Badge>;
    } else if (temperature === "warm") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">😐 Warm Lead</Badge>
      );
    } else if (conversation.isAiHandled) {
      return (
        <Badge className="bg-blue-100 text-blue-800">❄️ AI Handling</Badge>
      );
    } else {
      return (
        <Badge className="bg-green-100 text-green-800">👤 Human Active</Badge>
      );
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
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

  // Replace variables in template
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

  // Use template
  const useTemplate = async (template: any) => {
    if (!selectedConversation) return;

    const replacedContent = replaceVariables(
      template.content,
      selectedConversation.lead
    );

    setNewMessage(replacedContent);
    setShowTemplates(false);

    // Track usage
    await fetch(`/api/quick-replies/${template.id}/use`, {
      method: "POST",
      credentials: "include",
    });
  };

  // Filter templates
  const filteredTemplates = ((templates as any[]) || []).filter((t: any) => {
    const matchesSearch =
      templateSearch === "" ||
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.content.toLowerCase().includes(templateSearch.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || t.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Conversations List */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          {/* Header */}
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
                  <BreadcrumbPage>
                    Conversations
                  </BreadcrumbPage>
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

            {/* Connection Status */}
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

            {/* Search Bar */}
            {/* Search and Filter - Inline */}
            <div className="flex gap-1.5 mb-3">
              {/* Search Input */}
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-2"
              />

              {/* Filter Dropdown */}
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
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scrollable conversation list */}
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

                          {/* Unread badge with count */}
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

                          {parseFloat(conversation.qualificationScore || "0") >=
                            0.7 && (
                            <div className="flex items-center space-x-1 mt-2 text-xs text-red-600">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Needs attention</span>
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
              <div className="bg-white border-b border-slate-200 p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
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

                  <div className="flex items-center">
                    {getStatusBadge(selectedConversation)}

                    {/* Icon-only button with hover tooltip */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowLeadDetails(!showLeadDetails)}
                      className={`p-2 ${showLeadDetails ? "bg-slate-100" : ""}`}
                      title="Lead Details" // This shows tooltip on hover
                    >
                      <Info className="w-6 h-6 text-slate-600" />
                    </Button>

                    {selectedConversation.isAiHandled && (
                      <Button
                        onClick={() => handleTakeover(selectedConversation.id)}
                        className=""
                        disabled={takeoverMutation.isPending}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        {takeoverMutation.isPending
                          ? "Taking over..."
                          : "Take Over"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                <div className="space-y-4">
                  {messages?.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">No messages yet</p>
                    </div>
                  ) : (
                    messages?.map((message: any) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender === "lead"
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
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
                          <div className="flex items-center space-x-2 mb-1">
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
                                ? "AI Assistant"
                                : message.sender === "lead"
                                ? "Lead"
                                : "You"}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-60 mt-1 flex items-center space-x-1">
                            <span>{formatTime(message.sentAt)}</span>

                            {/* Show delivery status for outgoing messages */}
                            {message.sender !== "lead" && (
                              <>
                                {!message.deliveredAt ? (
                                  <span title="Sending...">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                  </span>
                                ) : message.readAt ? (
                                  <span title="Delivered and Read">
                                    <CheckCircle className="w-3 h-3 text-blue-500" />
                                  </span>
                                ) : (
                                  <span title="Delivered">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  </span>
                                )}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Typing Indicator */}
                  {typingIndicators[selectedConversation?.id]?.isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-blue-50 px-4 py-3 rounded-lg border border-blue-200 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <Bot className="w-4 h-4 text-blue-600" />
                          <div className="flex space-x-1">
                            <div
                              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            ></div>
                          </div>
                          <span className="text-sm text-blue-700 font-medium">
                            {typingIndicators[selectedConversation.id]
                              .sender === "ai"
                              ? "AI is responding..."
                              : "Agent is typing..."}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0">
                <div className="flex space-x-2">
                  {/* Templates Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className={showTemplates ? "bg-blue-50" : ""}
                    title="Quick Replies"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>

                  {/* 🆕 ADD THIS BOOK MEETING BUTTON */}
                  {/* Check for existing booking */}
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
                            Active meeting scheduled
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowBookingModal(true)}
                          title="Book Meeting"
                          disabled={hasActiveBooking}
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </Button>
                      </>
                    );
                  })()}

                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={sendMessageMutation.isPending}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={
                      !newMessage.trim() || sendMessageMutation.isPending
                    }
                    className="bg-primary text-white hover:bg-primary/90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                {/* Templates Dropdown */}
                {showTemplates && (
                  <div className="mt-3 border border-slate-200 rounded-lg bg-white shadow-lg max-h-96 overflow-hidden flex flex-col">
                    {/* Search and Filter */}
                    <div className="p-3 border-b border-slate-200 space-y-2">
                      <Input
                        placeholder="Search templates..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="w-full"
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
                            className="capitalize"
                          >
                            {cat}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Templates List */}
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
                              className="w-full text-left p-3 rounded-lg hover:bg-slate-50 border border-slate-200 transition-colors"
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
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Select a Conversation
                </h3>
                <p className="text-slate-600">
                  Choose a conversation from the list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Lead Detail Sidebar */}

        {/* Right: Lead Detail Sidebar - MINIMAL VERSION */}
        {selectedConversation && showLeadDetails && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
            {/* Header with Hot Lead Indicator */}
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Lead Details
              </h3>

              {/* Hot Lead Banner */}
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
              {/* Contact Info - Compact */}
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

              {/* Status & Score - Compact */}
              <div className="space-y-2">
                {/* Temperature (AI Quality) */}
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

                {/* Status (Sales Stage) */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Status</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {selectedConversation.lead?.status || "new"}
                  </Badge>
                </div>

                {/* Score */}
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

                {/* Source */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Source</span>
                  <span className="text-xs text-slate-600">
                    {selectedConversation.lead?.source || "unknown"}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Manual Controls - Collapsible */}
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
                    {/* Score Slider - Compact */}
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

                    {/* Temperature Control - Compact */}
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

                    {/* Status Dropdown - Compact */}
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

                    {/* Tags - Compact */}
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

                    {/* Internal Note - Compact */}
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

                    {/* Follow-up - Compact */}
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

              {/* Quick Actions - Compact */}
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

              {/* Activity Log - Compact */}
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

              {/* Timestamps - Minimal */}
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
          if (!open) setConflictError(null); // Clear error when closing
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>
              Book a meeting with {selectedConversation?.lead?.firstName}{" "}
              {selectedConversation?.lead?.lastName}
            </DialogDescription>
          </DialogHeader>

          {/* 🎨 COMPACT CONFLICT ALERT */}
          {conflictError && (
            <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
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
                    <summary className="cursor-pointer text-red-800 font-medium hover:text-red-900">
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
            {/* Meeting Type */}
            <div className="space-y-2">
              <Label htmlFor="meeting-type">Meeting Type</Label>
              <Select value={bookingType} onValueChange={setBookingType}>
                <SelectTrigger id="meeting-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="site-visit">Site Visit</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <Label htmlFor="meeting-date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="meeting-date"
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
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

              {/* Show existing bookings for selected date */}
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
                              <span className="font-mono">
                                {start.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                -{" "}
                                {end.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="text-blue-600">
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

            <div className="grid grid-cols-2 gap-4">
              {/* Time */}
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
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="meeting-duration">Duration</Label>
                <Select
                  value={bookingDuration}
                  onValueChange={(val) => {
                    setBookingDuration(val);
                    setConflictError(null);
                  }}
                >
                  <SelectTrigger id="meeting-duration">
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

            {/* Show calculated end time */}
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
                      });
                    })()}
                  </strong>
                </span>
              </div>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="meeting-location">Location</Label>
              <Input
                id="meeting-location"
                value={bookingLocation}
                onChange={(e) => setBookingLocation(e.target.value)}
                placeholder="Office, Site, Virtual, etc."
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="meeting-notes">Notes (Optional)</Label>
              <Textarea
                id="meeting-notes"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowBookingModal(false);
                setConflictError(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBookMeeting}
              disabled={!bookingDate || bookMeetingMutation.isPending}
              className="flex-1"
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
