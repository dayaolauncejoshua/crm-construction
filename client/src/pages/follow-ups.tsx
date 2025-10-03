import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Clock,
  MessageSquare,
  Phone,
  Mail,
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Zap,
  Users,
  TrendingUp
} from "lucide-react";

const createFollowUpSchema = z.object({
  leadId: z.string().min(1, "Lead is required"),
  channel: z.enum(["whatsapp", "email", "sms"]),
  triggerType: z.enum(["no_response", "time_based", "behavior"]),
  scheduleTime: z.string().min(1, "Schedule time is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
});

type CreateFollowUpData = z.infer<typeof createFollowUpSchema>;

export default function FollowUps() {
  const [selectedClientId, setSelectedClientId] = useState("demo-client");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<any>(null);
  const { toast } = useToast();

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch(`/api/clients?userId=demo-user`);
      return response.json();
    },
  });

  // Fetch dashboard data for leads
  const { data: dashboardData } = useQuery({
    queryKey: ["/api/dashboard", selectedClientId],
    enabled: !!selectedClientId,
  }) as { data: { leads?: any[] } | undefined };

  // Fetch follow-ups
  const { data: followUpsData, isLoading } = useQuery({
    queryKey: ["/api/follow-ups", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await fetch(`/api/follow-ups/${selectedClientId}`);
      return response.json();
    },
  });

  const form = useForm<CreateFollowUpData>({
    resolver: zodResolver(createFollowUpSchema),
    defaultValues: {
      leadId: "",
      channel: "whatsapp",
      triggerType: "no_response",
      scheduleTime: "",
      content: "",
    },
  });

  // Create follow-up mutation
  const createFollowUpMutation = useMutation({
    mutationFn: async (data: CreateFollowUpData) => {
      const response = await apiRequest("POST", "/api/follow-ups", {
        ...data,
        clientId: selectedClientId,
        scheduleTime: new Date(data.scheduleTime),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-ups", selectedClientId] });
      setShowCreateDialog(false);
      form.reset();
      toast({
        title: "Follow-up scheduled!",
        description: "Automated follow-up has been created successfully.",
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

  // Mock data for demonstration
  const followUpSequences = [
    {
      id: "seq-1",
      name: "Lead Nurturing Sequence",
      trigger: "no_response",
      steps: 5,
      activeLeads: 23,
      conversionRate: 18.5,
      status: "active"
    },
    {
      id: "seq-2", 
      name: "Demo No-Show Follow-up",
      trigger: "behavior",
      steps: 3,
      activeLeads: 8,
      conversionRate: 35.2,
      status: "active"
    },
    {
      id: "seq-3",
      name: "Cold Lead Reactivation",
      trigger: "time_based",
      steps: 7,
      activeLeads: 45,
      conversionRate: 12.8,
      status: "paused"
    }
  ];

  const activeFollowUps = [
    {
      id: "fu-1",
      leadName: "John Smith",
      company: "TechCorp",
      channel: "whatsapp",
      triggerType: "no_response",
      content: "Hi John! I noticed you haven't responded to our last message. Are you still interested in learning how we can help TechCorp generate more qualified leads?",
      scheduledAt: "2024-01-16T10:00:00Z",
      status: "pending",
      stepNumber: 2,
      sequenceName: "Lead Nurturing Sequence"
    },
    {
      id: "fu-2",
      leadName: "Sarah Johnson", 
      company: "Digital Agency",
      channel: "email",
      triggerType: "behavior",
      content: "Hi Sarah, I see you visited our pricing page but didn't book a demo. Would you like me to answer any questions about our plans?",
      scheduledAt: "2024-01-16T14:30:00Z",
      status: "pending",
      stepNumber: 1,
      sequenceName: "Demo No-Show Follow-up"
    },
    {
      id: "fu-3",
      leadName: "Mike Chen",
      company: "E-commerce Plus",
      channel: "sms",
      triggerType: "time_based",
      content: "Hi Mike! It's been a while since we last spoke. Have your lead generation needs changed? We've got some exciting new features that might interest you.",
      scheduledAt: "2024-01-16T16:00:00Z", 
      status: "sent",
      stepNumber: 3,
      sequenceName: "Cold Lead Reactivation"
    }
  ];

  const recentActivity = [
    {
      leadName: "Emma Wilson",
      action: "Responded to WhatsApp follow-up",
      result: "Booked demo call",
      timestamp: "2024-01-15T15:30:00Z"
    },
    {
      leadName: "David Brown",
      action: "Opened email follow-up",
      result: "Visited pricing page",
      timestamp: "2024-01-15T14:20:00Z"
    },
    {
      leadName: "Lisa Garcia", 
      action: "SMS follow-up delivered",
      result: "No response yet",
      timestamp: "2024-01-15T12:45:00Z"
    }
  ];

  const leads = dashboardData?.leads || [];

  const onSubmit = (data: CreateFollowUpData) => {
    createFollowUpMutation.mutate(data);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp": return <MessageSquare className="w-4 h-4" />;
      case "email": return <Mail className="w-4 h-4" />;
      case "sms": return <Phone className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "sent": return "bg-blue-100 text-blue-800";
      case "responded": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading follow-ups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Automated Follow-ups</h2>
              <p className="text-slate-600">Intelligent multi-channel follow-up automation</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Follow-up
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Automated Follow-up</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="leadId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Lead</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a lead" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {leads.map((lead: any) => (
                                <SelectItem key={lead.id} value={lead.id}>
                                  {lead.firstName} {lead.lastName} - {lead.company}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="channel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Communication Channel</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="sms">SMS</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="triggerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trigger Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="no_response">No Response</SelectItem>
                              <SelectItem value="time_based">Time Based</SelectItem>
                              <SelectItem value="behavior">Behavior Triggered</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="scheduleTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Schedule Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              {...field} 
                              min={new Date().toISOString().slice(0, 16)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message Content</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter your follow-up message..."
                              rows={4}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createFollowUpMutation.isPending}
                        className="bg-primary text-white hover:bg-primary/90"
                      >
                        {createFollowUpMutation.isPending ? "Creating..." : "Create Follow-up"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">2 running, 1 paused</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">76</div>
                <p className="text-xs text-muted-foreground">Scheduled this week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24.8%</div>
                <p className="text-xs text-muted-foreground">+3.2% from last week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leads in Sequences</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">76</div>
                <p className="text-xs text-muted-foreground">Across all sequences</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Follow-up Sequences */}
            <Card>
              <CardHeader>
                <CardTitle>Follow-up Sequences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {followUpSequences.map((sequence) => (
                    <div key={sequence.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${sequence.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div>
                          <h4 className="font-medium">{sequence.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-slate-600 mt-1">
                            <span>{sequence.steps} steps</span>
                            <span>{sequence.activeLeads} active leads</span>
                            <span>{sequence.conversionRate}% conversion</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={sequence.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {sequence.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          {sequence.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Follow-ups */}
            <Card>
              <CardHeader>
                <CardTitle>Active Follow-ups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeFollowUps.map((followUp) => {
                    const dateTime = formatDateTime(followUp.scheduledAt);
                    return (
                      <div key={followUp.id} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            {getChannelIcon(followUp.channel)}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{followUp.leadName}</h4>
                            <p className="text-sm text-slate-600">{followUp.company}</p>
                            <p className="text-sm text-slate-800 mt-2 line-clamp-2">{followUp.content}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-slate-500">
                                {dateTime.date} at {dateTime.time}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                Step {followUp.stepNumber}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className={getStatusColor(followUp.status)}>
                            {followUp.status}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{activity.leadName}</h4>
                        <p className="text-sm text-slate-600">{activity.action}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">{activity.result}</p>
                      <p className="text-xs text-slate-500">{new Date(activity.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
    </div>
  );
}