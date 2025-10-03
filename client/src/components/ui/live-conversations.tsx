import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  MessageCircle, 
  Calendar, 
  Eye, 
  Reply, 
  AlertTriangle,
  Bot,
  Smartphone
} from "lucide-react";

interface LiveConversationsProps {
  conversations: any[];
  hotLeads: any[];
  clientId: string;
}

export function LiveConversations({ conversations, hotLeads, clientId }: LiveConversationsProps) {
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const takeoverMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/takeover`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", clientId] });
      toast({
        title: "Conversation taken over",
        description: "You are now handling this conversation manually.",
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

  const handleTakeover = (conversationId: string) => {
    takeoverMutation.mutate(conversationId);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      case "sms":
        return <Smartphone className="w-4 h-4 text-blue-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (conversation: any) => {
    const score = parseFloat(conversation.qualificationScore || "0");
    
    if (score >= 0.7) {
      return <Badge variant="destructive">Hot Lead (Score: {score.toFixed(1)})</Badge>;
    } else if (conversation.isAiHandled) {
      return <Badge className="bg-primary text-white">AI Handling</Badge>;
    } else {
      return <Badge variant="secondary">Human Active</Badge>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Active Conversations</h3>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-slate-600">Auto-refresh: ON</span>
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Hot Leads Alert */}
      {hotLeads.length > 0 && (
        <div className="bg-danger/10 border border-danger/20 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="text-danger mr-3" />
            <div>
              <h4 className="font-medium text-danger">
                {hotLeads.length} High-Priority Lead{hotLeads.length > 1 ? 's' : ''} Require Human Attention
              </h4>
              <p className="text-sm text-danger/80">
                Leads with qualification score {'>'} 0.7 detected
              </p>
            </div>
            <Button 
              className="ml-auto bg-danger text-white hover:bg-danger/90"
              onClick={() => {
                // Handle taking action on all hot leads
                hotLeads.forEach(lead => handleTakeover(lead.id));
              }}
            >
              Take Action
            </Button>
          </div>
        </div>
      )}

      {/* Conversation List */}
      <div className="space-y-4">
        {conversations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Conversations</h3>
              <p className="text-slate-600">New conversations will appear here as leads engage with your system.</p>
            </CardContent>
          </Card>
        ) : (
          conversations.map((conversation) => (
            <Card key={conversation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
                        <User className="text-slate-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">
                          {conversation.lead.firstName} {conversation.lead.lastName}
                        </h4>
                        <p className="text-sm text-slate-500">{conversation.lead.company}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(conversation)}
                      </div>
                    </div>

                    {/* Last message preview */}
                    <div className="bg-slate-50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-slate-700">
                        {conversation.isAiHandled 
                          ? "AI: Thanks for your interest! How can I help you today?"
                          : "Lead is waiting for human response..."
                        }
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-500">
                          via {conversation.channel} • {new Date(conversation.lastMessageAt).toLocaleTimeString()}
                        </span>
                        <div className="flex items-center space-x-1">
                          {getChannelIcon(conversation.channel)}
                          <span className="text-xs text-slate-500">
                            {conversation.isAiHandled ? "AI Active" : "Human Active"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {conversation.isAiHandled ? (
                        <Button 
                          size="sm" 
                          className="bg-primary text-white hover:bg-primary/90"
                          onClick={() => handleTakeover(conversation.id)}
                          disabled={takeoverMutation.isPending}
                        >
                          <Reply className="w-4 h-4 mr-1" />
                          Take Over
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            // Navigate to conversation detail
                            window.open(`/conversations/${conversation.id}`, '_blank');
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Continue Chat
                        </Button>
                      )}
                      
                      <Button 
                        size="sm" 
                        className="bg-accent text-white hover:bg-accent/90"
                        onClick={() => {
                          // Handle booking
                          toast({
                            title: "Booking feature",
                            description: "Calendar integration coming soon",
                          });
                        }}
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Book Now
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          const newExpanded = expandedConversation === conversation.id ? null : conversation.id;
                          setExpandedConversation(newExpanded);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Expanded conversation details */}
                    {expandedConversation === conversation.id && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-slate-900">Email:</span>
                            <p className="text-slate-600">{conversation.lead.email}</p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-900">Phone:</span>
                            <p className="text-slate-600">{conversation.lead.phone}</p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-900">Source:</span>
                            <p className="text-slate-600">{conversation.lead.source}</p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-900">Created:</span>
                            <p className="text-slate-600">
                              {new Date(conversation.lead.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Show More Button */}
      {conversations.length > 0 && (
        <div className="text-center mt-6">
          <Button variant="ghost" className="text-primary hover:text-primary/80">
            View All Conversations ({Math.max(0, conversations.length - 10)} more)
          </Button>
        </div>
      )}
    </div>
  );
}
