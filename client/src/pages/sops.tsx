// client/src/pages/sops.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Video,
  FileText,
  Plus,
  Play,
  Clock,
  Eye,
  Download,
  ExternalLink,
  RefreshCw as Sync,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Settings,
  Search,
  Filter,
  Star,
  Share,
  Edit,
  Trash2,
} from "lucide-react";

const createVideoSOPSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["onboarding", "troubleshooting", "advanced", "training"]),
  videoUrl: z.string().url("Valid video URL is required"),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  duration: z.number().min(1, "Duration in seconds is required"),
  tags: z.array(z.string()).optional(),
});

const createNotionSOPSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().optional(),
  notionPageId: z.string().min(1, "Notion page ID is required"),
  pageUrl: z.string().url("Valid Notion page URL is required"),
});

type CreateVideoSOPData = z.infer<typeof createVideoSOPSchema>;
type CreateNotionSOPData = z.infer<typeof createNotionSOPSchema>;

export default function SOPs() {
  usePageTitle("SOPs");

  const [selectedClientId, setSelectedClientId] = useState("demo-client");
  const [activeTab, setActiveTab] = useState("video");
  const [showCreateVideoDialog, setShowCreateVideoDialog] = useState(false);
  const [showCreateNotionDialog, setShowCreateNotionDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch(`/api/clients?userId=demo-user`);
      return response.json();
    },
  });

  // Fetch video SOPs
  const { data: videoSOPs, isLoading: loadingVideoSOPs } = useQuery({
    queryKey: ["/api/video-sops", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await fetch(`/api/video-sops/${selectedClientId}`);
      return response.json();
    },
  });

  // Fetch Notion SOPs
  const { data: notionSOPs, isLoading: loadingNotionSOPs } = useQuery({
    queryKey: ["/api/notion-sops", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await fetch(`/api/notion-sops/${selectedClientId}`);
      return response.json();
    },
  });

  const videoForm = useForm<CreateVideoSOPData>({
    resolver: zodResolver(createVideoSOPSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "onboarding",
      videoUrl: "",
      thumbnailUrl: "",
      duration: 0,
      tags: [],
    },
  });

  const notionForm = useForm<CreateNotionSOPData>({
    resolver: zodResolver(createNotionSOPSchema),
    defaultValues: {
      title: "",
      category: "",
      notionPageId: "",
      pageUrl: "",
    },
  });

  // Create video SOP mutation
  // const createVideoSOPMutation = useMutation({
  //   mutationFn: async (data: CreateVideoSOPData) => {
  //     const response = await apiRequest("POST", "/api/video-sops", {
  //       ...data,
  //       clientId: selectedClientId,
  //     });
  //     return response.json();
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({
  //       queryKey: ["/api/video-sops", selectedClientId],
  //     });
  //     setShowCreateVideoDialog(false);
  //     videoForm.reset();
  //     toast({
  //       title: "Video SOP created!",
  //       description: "Video SOP has been added successfully.",
  //     });
  //   },
  //   onError: (error) => {
  //     toast({
  //       title: "Error",
  //       description: error.message,
  //       variant: "destructive",
  //     });
  //   },
  // });

  // const createVideoSOPMutation = useMutation({
  //   mutationFn: async (data: CreateVideoSOPData) => {
  //     const response = await apiRequest("POST", "/api/video-sops", {
  //       ...data,
  //       clientId: selectedClientId,
  //       category: data.category || "training",
  //     });
  //     return response.json();
  //   },
  // });

  const createVideoSOPMutation = useMutation({
    mutationFn: async (data: CreateVideoSOPData) => {
      const response = await apiRequest("POST", "/api/video-sops", {
        ...data,
        clientId: selectedClientId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/video-sops", selectedClientId],
      });
      setShowCreateVideoDialog(false);
      videoForm.reset();
      toast({
        title: "Video SOP created!",
        description: "Your video is now being analyzed — please wait a bit.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create Notion SOP mutation
  const createNotionSOPMutation = useMutation({
    mutationFn: async (data: CreateNotionSOPData) => {
      const response = await apiRequest("POST", "/api/notion-sops", {
        ...data,
        clientId: selectedClientId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/notion-sops", selectedClientId],
      });
      setShowCreateNotionDialog(false);
      notionForm.reset();
      toast({
        title: "Notion SOP linked!",
        description: "Notion SOP has been connected successfully.",
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

  // Sync Notion SOPs mutation
  const syncNotionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/notion-sops/${selectedClientId}/sync`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/notion-sops", selectedClientId],
      });
      toast({
        title: "Notion SOPs synced!",
        description: "All Notion SOPs have been synchronized.",
      });
    },
  });

  // Mock data for demonstration
  // const filteredVideoSOPs = [
  //   {
  //     id: "v1",
  //     title: "Setting Up Lead Capture Forms",
  //     description:
  //       "Complete guide on configuring and optimizing lead capture forms for maximum conversion",
  //     category: "onboarding",
  //     videoUrl: "https://example.com/video1.mp4",
  //     thumbnailUrl:
  //       "https://via.placeholder.com/320x180/3b82f6/ffffff?text=Lead+Forms",
  //     duration: 480, // 8 minutes
  //     viewCount: 127,
  //     tags: ["forms", "conversion", "setup"],
  //     createdAt: "2024-01-10T10:00:00Z",
  //     isPublic: true,
  //   },
  //   {
  //     id: "v2",
  //     title: "WhatsApp Integration Troubleshooting",
  //     description:
  //       "Common issues and solutions when integrating WhatsApp Business API",
  //     category: "troubleshooting",
  //     videoUrl: "https://example.com/video2.mp4",
  //     thumbnailUrl:
  //       "https://via.placeholder.com/320x180/10b981/ffffff?text=WhatsApp+Fix",
  //     duration: 720, // 12 minutes
  //     viewCount: 89,
  //     tags: ["whatsapp", "api", "troubleshooting"],
  //     createdAt: "2024-01-08T14:30:00Z",
  //     isPublic: true,
  //   },
  //   {
  //     id: "v3",
  //     title: "Advanced Analytics Dashboard",
  //     description:
  //       "Deep dive into analytics features and creating custom reports",
  //     category: "advanced",
  //     videoUrl: "https://example.com/video3.mp4",
  //     thumbnailUrl:
  //       "https://via.placeholder.com/320x180/f59e0b/ffffff?text=Analytics",
  //     duration: 900, // 15 minutes
  //     viewCount: 156,
  //     tags: ["analytics", "reports", "dashboard"],
  //     createdAt: "2024-01-05T09:15:00Z",
  //     isPublic: true,
  //   },
  // ];

  // const filteredNotionSOPs = [
  //   {
  //     id: "n1",
  //     title: "Client Onboarding Checklist",
  //     category: "onboarding",
  //     notionPageId: "abc123",
  //     pageUrl: "https://notion.so/abc123",
  //     lastSynced: "2024-01-15T08:00:00Z",
  //     syncStatus: "active",
  //     createdAt: "2024-01-01T10:00:00Z",
  //   },
  //   {
  //     id: "n2",
  //     title: "Lead Qualification Process",
  //     category: "processes",
  //     notionPageId: "def456",
  //     pageUrl: "https://notion.so/def456",
  //     lastSynced: "2024-01-14T16:30:00Z",
  //     syncStatus: "active",
  //     createdAt: "2024-01-02T11:00:00Z",
  //   },
  //   {
  //     id: "n3",
  //     title: "Emergency Escalation Procedures",
  //     category: "troubleshooting",
  //     notionPageId: "ghi789",
  //     pageUrl: "https://notion.so/ghi789",
  //     lastSynced: "2024-01-10T12:00:00Z",
  //     syncStatus: "failed",
  //     createdAt: "2024-01-03T15:00:00Z",
  //   },
  // ];

  const filteredNotionSOPs = Array.isArray(notionSOPs)
    ? notionSOPs.filter((sop) => {
        const matchesSearch = sop.title
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === "all" || sop.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
    : [];

  const filteredVideoSOPs = Array.isArray(videoSOPs)
    ? videoSOPs.filter((sop) => {
        const matchesSearch =
          sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (sop.description || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === "all" || sop.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
    : [];

  const onSubmitVideoSOP = (data: CreateVideoSOPData) => {
    createVideoSOPMutation.mutate(data);
  };

  const onSubmitNotionSOP = (data: CreateNotionSOPData) => {
    createNotionSOPMutation.mutate(data);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "onboarding":
        return "bg-blue-100 text-blue-800";
      case "troubleshooting":
        return "bg-red-100 text-red-800";
      case "advanced":
        return "bg-purple-100 text-purple-800";
      case "training":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      case "disabled":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const isLoading = loadingVideoSOPs || loadingNotionSOPs;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-80 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </header>

        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>

        <main className="flex-1 overflow-auto p-6">
          <Skeleton className="h-10 w-full mb-6" /> {/* Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <div className="flex justify-between mt-3">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                  </div>
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
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Standard Operating Procedures
            </h2>
            <p className="text-slate-600">
              Video SOPs and Notion documentation for your team
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => syncNotionMutation.mutate()}
              disabled={syncNotionMutation.isPending}
            >
              <Sync
                className={`w-4 h-4 mr-2 ${
                  syncNotionMutation.isPending ? "animate-spin" : ""
                }`}
              />
              Sync Notion
            </Button>
            <Dialog
              open={showCreateVideoDialog}
              onOpenChange={setShowCreateVideoDialog}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Video className="w-4 h-4 mr-2" />
                  Add Video SOP
                </Button>
              </DialogTrigger>
            </Dialog>
            <Dialog
              open={showCreateNotionDialog}
              onOpenChange={setShowCreateNotionDialog}
            >
              <DialogTrigger asChild>
                <Button className="bg-primary text-white hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Link Notion SOP
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search SOPs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="processes">Processes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
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
              <BreadcrumbPage>Standard Operating Procedures</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="video" className="flex items-center">
              <Video className="w-4 h-4 mr-2" />
              Video SOPs
            </TabsTrigger>
            <TabsTrigger value="notion" className="flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Notion SOPs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="video" className="space-y-6">
            {/* Video SOPs Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Videos
                  </CardTitle>
                  <Video className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredVideoSOPs.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all categories
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Views
                  </CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredVideoSOPs
                      .reduce((sum, sop) => sum + sop.viewCount, 0)
                      .toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Duration
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(
                      filteredVideoSOPs.reduce(
                        (sum, sop) => sum + sop.duration,
                        0
                      ) / 60
                    )}{" "}
                    min
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Of training content
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Rating
                  </CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4.8</div>
                  <p className="text-xs text-muted-foreground">
                    Based on user feedback
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Video SOPs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideoSOPs.map((sop) => (
                <Card
                  key={sop.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative">
                    <img
                      src={sop.thumbnailUrl}
                      alt={sop.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Button size="lg" className="rounded-full">
                        <Play className="w-6 h-6 ml-1" />
                      </Button>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                      {formatDuration(sop.duration)}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-lg line-clamp-2">
                        {sop.title}
                      </h3>
                      <Badge className={getCategoryColor(sop.category)}>
                        {sop.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                      {sop.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          {sop.viewCount}
                        </span>
                      </div>
                      <span>
                        {new Date(sop.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Share className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {/* 🧠 AI Summary */}
                    {sop.ai_summary && (
                      <div className="mt-4 border-t pt-3">
                        <h4 className="font-semibold text-slate-800 mb-1">
                          AI Summary
                        </h4>
                        <p className="text-sm text-slate-600">
                          {sop.ai_summary}
                        </p>
                      </div>
                    )}

                    {/* 📝 Transcript */}
                    {sop.transcript && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-blue-600 hover:underline">
                          View Full Transcript
                        </summary>
                        <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap mt-2 bg-slate-50 p-2 rounded-md border text-slate-700">
                          {sop.transcript}
                        </pre>
                      </details>
                    )}

                    {/* ✅ Steps Breakdown */}
                    {sop.ai_breakdown?.steps &&
                      sop.ai_breakdown.steps.length > 0 && (
                        <div className="mt-3">
                          <h4 className="font-semibold text-slate-800 mb-1">
                            Step-by-Step SOP
                          </h4>
                          <ol className="list-decimal pl-5 text-sm space-y-1 text-slate-700">
                            {sop.ai_breakdown.steps.map(
                              (step: string, i: number) => (
                                <li key={i}>{step}</li>
                              )
                            )}
                          </ol>
                        </div>
                      )}

                    {/* ⏳ Status Message */}
                    {!sop.ai_summary && sop.transcript_status === "pending" && (
                      <p className="text-xs text-slate-400 italic mt-3">
                        Analyzing video… please wait a few minutes.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notion" className="space-y-6">
            {/* Notion SOPs Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Linked Pages
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredNotionSOPs.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Synced from Notion
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Sync Status
                  </CardTitle>
                  <Sync className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {
                      filteredNotionSOPs.filter(
                        (sop) => sop.syncStatus === "active"
                      ).length
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">Active syncs</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Last Sync
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2h ago</div>
                  <p className="text-xs text-muted-foreground">
                    Auto-sync enabled
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Notion SOPs List */}
            <Card>
              <CardHeader>
                <CardTitle>Notion SOPs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredNotionSOPs.map((sop) => (
                    <div
                      key={sop.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{sop.title}</h4>
                          <div className="flex items-center space-x-4 text-sm text-slate-600 mt-1">
                            <Badge className={getCategoryColor(sop.category)}>
                              {sop.category}
                            </Badge>
                            <span className="flex items-center">
                              <CheckCircle
                                className={`w-3 h-3 mr-1 ${getSyncStatusColor(
                                  sop.syncStatus
                                )}`}
                              />
                              {sop.syncStatus}
                            </span>
                            <span>
                              Last synced:{" "}
                              {new Date(sop.lastSynced).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={sop.pageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open in Notion
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Video SOP Dialog */}
        <Dialog
          open={showCreateVideoDialog}
          onOpenChange={setShowCreateVideoDialog}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Video SOP</DialogTitle>
            </DialogHeader>
            <Form {...videoForm}>
              <form
                onSubmit={videoForm.handleSubmit(onSubmitVideoSOP)}
                className="space-y-4"
              >
                <FormField
                  control={videoForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter video title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={videoForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter video description"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={videoForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="onboarding">
                              Onboarding
                            </SelectItem>
                            <SelectItem value="troubleshooting">
                              Troubleshooting
                            </SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={videoForm.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (seconds)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="480"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={videoForm.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/video.mp4"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={videoForm.control}
                  name="thumbnailUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail URL (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/thumbnail.jpg"
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
                    onClick={() => setShowCreateVideoDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createVideoSOPMutation.isPending}
                    className="bg-primary text-white hover:bg-primary/90"
                  >
                    {createVideoSOPMutation.isPending
                      ? "Creating..."
                      : "Create Video SOP"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Create Notion SOP Dialog */}
        <Dialog
          open={showCreateNotionDialog}
          onOpenChange={setShowCreateNotionDialog}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Link Notion SOP</DialogTitle>
            </DialogHeader>
            <Form {...notionForm}>
              <form
                onSubmit={notionForm.handleSubmit(onSubmitNotionSOP)}
                className="space-y-4"
              >
                <FormField
                  control={notionForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter SOP title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={notionForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., onboarding, processes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={notionForm.control}
                  name="pageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notion Page URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://notion.so/your-page-id"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={notionForm.control}
                  name="notionPageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notion Page ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Extract from URL or use page ID"
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
                    onClick={() => setShowCreateNotionDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createNotionSOPMutation.isPending}
                    className="bg-primary text-white hover:bg-primary/90"
                  >
                    {createNotionSOPMutation.isPending
                      ? "Linking..."
                      : "Link Notion SOP"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
