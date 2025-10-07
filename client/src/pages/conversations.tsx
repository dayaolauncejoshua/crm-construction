// client/src/pages/conversations.tsx
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
  CheckCircle,
  UserCheck,
  RefreshCw,
  Info,
  Sparkles,
} from "lucide-react";
import { space } from "postcss/lib/list";

export default function Conversations() {
  const { user } = useAuth();
  console.log("=== USER DEBUG ===");
  console.log("User object:", user);
  console.log("User ID:", user?.id);
  console.log("User email:", user?.email);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [showLeadDetails, setShowLeadDetails] = useState(false);

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

  // Fetch clients
  const {
    data: clients,
    isLoading: isLoadingClients,
    error: clientsError,
  } = useQuery({
    queryKey: ["/api/clients", user?.id],
    queryFn: async () => {
      console.log("Fetching clients...");
      const response = await fetch(`/api/clients?userId=${user?.id}`);
      const data = await response.json();
      console.log("Clients response:", data);
      return data;
    },
    enabled: !!user?.id, // Only run if user ID is available
  });

  useEffect(() => {
    if (clientsError) {
      console.error("Error loading clients:", clientsError);
    }
  }, [clientsError]);

  // Then add useEffect to set it from clients:
  useEffect(() => {
    if (clients && clients.length > 0 && !selectedClientId) {
      console.log("Setting client ID to:", clients[0].id);
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

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

  //Debug Logging
  useEffect(() => {
    console.log("=== CONVERSATIONS PAGE DEBUG ===");
    console.log("Selected Client ID:", selectedClientId);
    console.log("Clients available:", clients);
    console.log("Dashboard Data:", dashboardData);
    console.log("Conversations count:", conversations.length);
    console.log("Filtered conversations count:", filteredConversations.length);
    console.log("Is Loading:", isLoading);
  }, [
    selectedClientId,
    dashboardData,
    isLoading,
    conversations,
    filteredConversations,
  ]);

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
    const score = parseFloat(conversation.qualificationScore || "0");

    if (score >= 0.7) {
      return (
        <Badge className="bg-red-100 text-red-800">
          Hot Lead (Score: {score.toFixed(1)})
        </Badge>
      );
    } else if (conversation.isAiHandled) {
      return <Badge className="bg-blue-100 text-blue-800">AI Handling</Badge>;
    } else {
      return (
        <Badge className="bg-green-100 text-green-800">Human Active</Badge>
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
  const filteredTemplates = (templates || []).filter((t: any) => {
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

        {selectedConversation && showLeadDetails && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden pb-4">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                Lead Details
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Contact Information */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Contact Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-900">
                      {selectedConversation.lead?.firstName}{" "}
                      {selectedConversation.lead?.lastName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600">
                      {selectedConversation.lead?.phone || "No phone"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm break-all">
                    <span className="text-slate-500">@</span>
                    <span className="text-slate-600">
                      {selectedConversation.lead?.email || "No email"}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Lead Status */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Status
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Lead Status</span>
                    <Badge variant="outline">
                      {selectedConversation.lead?.status || "new"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Source</span>
                    <Badge variant="outline">
                      {selectedConversation.lead?.source || "unknown"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Qualification Score
                    </span>
                    <Badge
                      className={
                        parseFloat(
                          selectedConversation.qualificationScore || "0"
                        ) >= 0.7
                          ? "bg-red-100 text-red-800"
                          : parseFloat(
                              selectedConversation.qualificationScore || "0"
                            ) >= 0.4
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }
                    >
                      {(
                        parseFloat(
                          selectedConversation.qualificationScore || "0"
                        ) * 100
                      ).toFixed(0)}
                      %
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Audit Results */}
              {selectedConversation.lead?.auditResults && (
                <>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">
                      Audit Results
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-slate-500">
                          Score
                        </span>
                        <div className="mt-1 flex items-center space-x-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${
                                  selectedConversation.lead.auditResults
                                    .score || 0
                                }%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            {selectedConversation.lead.auditResults.score || 0}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-medium text-slate-500">
                          Top Finding
                        </span>
                        <p className="text-sm text-slate-900 mt-1">
                          {selectedConversation.lead.auditResults.topFinding ||
                            "N/A"}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs font-medium text-slate-500">
                          Estimated ROI
                        </span>
                        <p className="text-sm text-green-600 font-semibold mt-1">
                          {selectedConversation.lead.auditResults
                            .estimatedROI || "N/A"}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs font-medium text-slate-500">
                          Timeline
                        </span>
                        <p className="text-sm text-slate-900 mt-1">
                          {selectedConversation.lead.auditResults.timeline ||
                            "N/A"}
                        </p>
                      </div>

                      {selectedConversation.lead.auditResults.wins?.length >
                        0 && (
                        <div>
                          <span className="text-xs font-medium text-slate-500">
                            Opportunities
                          </span>
                          <ul className="mt-1 space-y-1">
                            {selectedConversation.lead.auditResults.wins.map(
                              (win: string, idx: number) => (
                                <li
                                  key={idx}
                                  className="text-sm text-slate-700 flex items-start"
                                >
                                  <CheckCircle className="w-3 h-3 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                                  <span>{win}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Quick Actions */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Quick Actions
                </h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Mark as Hot Lead
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Converted
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    size="sm"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Flag for Review
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Timestamps */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Activity
                </h4>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Lead Created</span>
                    <span>
                      {new Date(
                        selectedConversation.lead?.createdAt
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Message</span>
                    <span>
                      {new Date(
                        selectedConversation.lastMessageAt
                      ).toLocaleString()}
                    </span>
                  </div>
                  {selectedConversation.lead?.responseTimeSeconds && (
                    <div className="flex justify-between">
                      <span>Response Time</span>
                      <span className="font-semibold text-green-600">
                        {selectedConversation.lead.responseTimeSeconds}s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
