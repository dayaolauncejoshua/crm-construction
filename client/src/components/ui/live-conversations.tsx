import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import {
  MessageCircle,
  Send,
  Eye,
  AlertTriangle,
  Clock,
  TrendingUp,
  Flame,
  BellRing,
  Activity,
} from "lucide-react";

interface LiveConversationsProps {
  conversations: any[];
  hotLeads: any[];
  clientId: string;
}

export function LiveConversations({
  conversations,
  hotLeads,
  clientId,
}: LiveConversationsProps) {
  const [, setLocation] = useLocation();

  const handleViewConversation = () => {
    setLocation("/conversations");
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getScoreBadge = (score: string) => {
    const numScore = parseFloat(score || "0");
    if (numScore >= 0.7) {
      return (
        <Badge className="bg-red-100 text-red-800 text-xs">
          <Flame className="w-3 h-3 mr-1" />
          Hot
        </Badge>
      );
    } else if (numScore >= 0.4) {
      return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Warm</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800 text-xs">Cold</Badge>;
  };

  // Filter: Needs Response (unread OR last message from lead)
  const needsResponse = conversations.filter(
    (conv) => conv.unreadCount > 0
  );

  // Filter: Recent Activity (last 24 hours)
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);
  
  const recentActivity = conversations.filter(
    (conv) => new Date(conv.lastMessageAt) > oneDayAgo
  );

  // Compact Conversation Card Component
  const ConversationCard = ({ conversation }: { conversation: any }) => (
    <div
      className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border border-slate-100"
      onClick={handleViewConversation}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">
              {(conversation.lead?.firstName?.[0] || "U") +
                (conversation.lead?.lastName?.[0] || "")}
            </AvatarFallback>
          </Avatar>
          {conversation.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center px-1">
              <span className="text-[10px] font-bold text-white">
                {conversation.unreadCount}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-sm text-slate-900 truncate">
              {conversation.lead?.firstName} {conversation.lead?.lastName}
            </h4>
            {getScoreBadge(conversation.qualificationScore)}
          </div>
          <p className="text-xs text-slate-500 truncate">
            {conversation.lead?.company} • {formatTime(conversation.lastMessageAt)}
          </p>
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-3 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          handleViewConversation();
        }}
      >
        <Send className="w-3.5 h-3.5 mr-1" />
        Reply
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Section 1: Hot Leads Alert */}
      {hotLeads.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-900">Hot Leads</h3>
                <Badge className="bg-red-600 text-white">{hotLeads.length}</Badge>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={handleViewConversation}
                className="text-red-700"
              >
                View All
              </Button>
            </div>

            <div className="space-y-2">
              {hotLeads.slice(0, 3).map((lead) => (
                <ConversationCard key={lead.id} conversation={lead} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 2: Needs Response */}
      {needsResponse.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <BellRing className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-slate-900">Needs Response</h3>
                <Badge variant="outline">{needsResponse.length}</Badge>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={handleViewConversation}
              >
                View All
              </Button>
            </div>

            <div className="space-y-2">
              {needsResponse.slice(0, 3).map((conv) => (
                <ConversationCard key={conv.id} conversation={conv} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Recent Activity (Last 24h) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Recent Activity</h3>
              <Badge variant="outline" className="text-xs">Last 24h</Badge>
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={handleViewConversation}
            >
              View All
            </Button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">No activity in last 24 hours</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.slice(0, 5).map((conv) => (
                <ConversationCard key={conv.id} conversation={conv} />
              ))}
            </div>
          )}
          </CardContent>
        </Card>
      

      {/* Quick Stats Footer */}
      <Card className="bg-slate-50">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="cursor-pointer hover:bg-white rounded-lg p-2 transition-colors" onClick={handleViewConversation}>
              <div className="flex items-center justify-center space-x-1 text-slate-600 mb-1">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Total</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {conversations.length}
              </p>
            </div>
            <div className="cursor-pointer hover:bg-white rounded-lg p-2 transition-colors" onClick={handleViewConversation}>
              <div className="flex items-center justify-center space-x-1 text-red-600 mb-1">
                <Flame className="w-4 h-4" />
                <span className="text-xs font-medium">Hot</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {hotLeads.length}
              </p>
            </div>
            <div className="cursor-pointer hover:bg-white rounded-lg p-2 transition-colors" onClick={handleViewConversation}>
              <div className="flex items-center justify-center space-x-1 text-orange-600 mb-1">
                <BellRing className="w-4 h-4" />
                <span className="text-xs font-medium">Unread</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {needsResponse.length}
              </p>
            </div>
          </div>
          
          <Button
            className="w-full mt-4"
            onClick={handleViewConversation}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            View All Conversations
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}