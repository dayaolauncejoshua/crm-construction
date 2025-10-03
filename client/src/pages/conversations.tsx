// client/src/pages/conversations.tsx

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
  RefreshCw
} from "lucide-react";

export default function Conversations() {
  const [selectedClientId, setSelectedClientId] = useState("demo-client");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // WebSocket for real-time updates
  const { data: wsData, isConnected } = useWebSocket();

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch(`/api/clients?userId=demo-user`);
      return response.json();
    },
  });

  // Fetch conversations
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ["/api/dashboard", selectedClientId],
    enabled: !!selectedClientId,
  }) as { data: { conversations?: any[]; hotLeads?: any[] } | undefined; isLoading: boolean; refetch: () => void };

  // Fetch messages for selected conversation
  const { data: messages } = useQuery({
    queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
    enabled: !!selectedConversation?.id,
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${selectedConversation.id}/messages`);
      return response.json();
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content,
        sender: "human",
        channel: "dashboard",
      });
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation?.id, "messages"] });
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
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/takeover`, {});
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

  useEffect(() => {
    if (wsData) {
      refetch();
    }
  }, [wsData, refetch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      return <Badge className="bg-red-100 text-red-800">Hot Lead (Score: {score.toFixed(1)})</Badge>;
    } else if (conversation.isAiHandled) {
      return <Badge className="bg-blue-100 text-blue-800">AI Handling</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">Human Active</Badge>;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Conversations List */}
        <div className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col lg:h-full max-h-96 lg:max-h-none">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Conversations</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            {/* Connection Status */}
            <div className={`flex items-center space-x-2 text-sm px-3 py-2 rounded-lg ${
              isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No active conversations</p>
                </div>
              ) : (
                conversations.map((conversation: any) => (
                  <Card
                    key={conversation.id}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                      selectedConversation?.id === conversation.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {(conversation.lead?.firstName?.[0] || 'U') + (conversation.lead?.lastName?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-slate-900 truncate">
                              {conversation.lead?.firstName} {conversation.lead?.lastName}
                            </h4>
                            <span className="text-xs text-slate-500">
                              {formatTime(conversation.lastMessageAt)}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-600 mb-2 truncate">
                            {conversation.lead?.company}
                          </p>
                          
                          {getStatusBadge(conversation)}
                          
                          {parseFloat(conversation.qualificationScore || "0") >= 0.7 && (
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
          </ScrollArea>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {(selectedConversation.lead?.firstName?.[0] || 'U') + (selectedConversation.lead?.lastName?.[0] || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {selectedConversation.lead?.firstName} {selectedConversation.lead?.lastName}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {selectedConversation.lead?.company} • {selectedConversation.lead?.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(selectedConversation)}
                    
                    {selectedConversation.isAiHandled && (
                      <Button
                        onClick={() => handleTakeover(selectedConversation.id)}
                        className="bg-primary text-white hover:bg-primary/90"
                        disabled={takeoverMutation.isPending}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        {takeoverMutation.isPending ? "Taking over..." : "Take Over"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
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
                        className={`flex ${message.sender === 'lead' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender === 'lead'
                              ? 'bg-slate-100 text-slate-900'
                              : message.sender === 'ai'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-primary text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            {message.sender === 'ai' && <Bot className="w-3 h-3" />}
                            {message.sender === 'lead' && <User className="w-3 h-3" />}
                            {message.sender === 'human' && <UserCheck className="w-3 h-3" />}
                            <span className="text-xs opacity-75">
                              {message.sender === 'ai' ? 'AI Assistant' : 
                               message.sender === 'lead' ? 'Lead' : 'You'}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-60 mt-1">
                            {formatTime(message.sentAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="bg-white border-t border-slate-200 p-4">
                <div className="flex space-x-3">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="bg-primary text-white hover:bg-primary/90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a Conversation</h3>
                <p className="text-slate-600">Choose a conversation from the list to start chatting</p>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}