// client/src/pages/vsl.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import { ShareVSLDialog } from "@/components/ShareVSLDialog";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Video,
  Play,
  Eye,
  TrendingUp,
  MoreVertical,
  Trash2,
  Download,
  Share,
  Wand2,
  Copy,
  Check,
  Code,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  BarChart3,
} from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { getApiUrl } from "@/lib/api-config";

const createVSLSchema = z.object({
  title: z.string().min(1, "Title is required"),
  niche: z.string().min(1, "Niche is required"),
  targetDuration: z
    .enum(["30s", "1min", "2min", "3min", "5min"])
    .default("2min"),
  targetAudience: z.string().optional(),
  painPoints: z.string().optional(),
  solution: z.string().optional(),
  proofElements: z.string().optional(),
  subtitleType: z.enum(["none", "traditional", "karaoke"]).default("none"),
});

type CreateVSLData = z.infer<typeof createVSLSchema>;

export default function VSL() {
  usePageTitle("VSL Generator");

  const { selectedClientId } = useClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedVSL, setSelectedVSL] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [vslToDelete, setVslToDelete] = useState<string | null>(null);
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const [selectedScript, setSelectedScript] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<CreateVSLData>({
    resolver: zodResolver(createVSLSchema),
    defaultValues: {
      title: "",
      niche: "",
      targetDuration: "2min",
      targetAudience: "",
      painPoints: "",
      solution: "",
      proofElements: "",
      subtitleType: "none",
    },
  });

  const { data: vsls, isLoading } = useQuery({
    queryKey: ["/api/vsls", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const url = getApiUrl(`/api/vsls/${selectedClientId}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load VSLs");
      return response.json();
    },
    refetchInterval: showPreview ? false : 10000,
  });

  const createVSLMutation = useMutation({
    mutationFn: async (data: CreateVSLData) => {
      const response = await apiRequest("POST", "/api/vsls", {
        ...data,
        clientId: selectedClientId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/vsls", selectedClientId],
      });
      setShowCreateDialog(false);
      form.reset();
      toast({
        title: "Success!",
        description:
          "VSL script generated successfully. Video creation in progress...",
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

  const deleteVSLMutation = useMutation({
    mutationFn: async (vslId: string) => {
      const response = await apiRequest("DELETE", `/api/vsls/${vslId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/vsls", selectedClientId],
      });
      toast({
        title: "Success",
        description: "VSL deleted successfully",
      });
      setShowDeleteDialog(false);
      setVslToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateVSLData) => {
    createVSLMutation.mutate(data);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (vsl: any) => {
    if (vsl.videoUrl) {
      return <Badge className="bg-green-100 text-green-800">Published</Badge>;
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">Generating</Badge>
      );
    }
  };

  const handlePreview = (vsl: any) => {
    setSelectedVSL(vsl);
    setShowPreview(true);
  };

  const handleAnalytics = (vsl: any) => {
    setSelectedVSL(vsl);
    setShowAnalytics(true);
  };

  const handleShare = (vsl: any) => {
    setSelectedVSL(vsl);
    setShowShare(true);
  };

  const handleDelete = (vslId: string) => {
    setVslToDelete(vslId);
    setShowDeleteDialog(true);
  };

  const handleDownload = (vsl: any) => {
    if (vsl.videoUrl) {
      window.open(vsl.videoUrl, "_blank");
      toast({
        title: "Download Started",
        description: "Your video is downloading...",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ✅ Responsive Header Skeleton */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 sm:h-8 w-40 sm:w-48" />
              <Skeleton className="h-3 sm:h-4 w-64 sm:w-96" />
            </div>
            <Skeleton className="h-9 sm:h-10 w-full sm:w-40" />
          </div>
        </header>
        {/* ✅ Responsive Grid Skeleton */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-16 sm:h-20 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="aspect-video w-full mb-4" />
                  <Skeleton className="h-20 sm:h-24 w-full" />
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
      {/* ✅ Responsive Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              VSL Generator
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              Create automated video sales letters for your clients
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-primary/90 w-full sm:w-auto">
                <Wand2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Generate VSL</span>
                <span className="sm:hidden">Create VSL</span>
              </Button>
            </DialogTrigger>
            {/* ✅ Responsive Dialog */}
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-0">
              <div className="p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">
                    Generate New VSL
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4 mt-4"
                  >
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">VSL Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Construction Lead Generation VSL"
                              {...field}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="niche"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            Target Niche
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="text-sm sm:text-base">
                                <SelectValue placeholder="Select target niche" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="construction">
                                Construction Companies
                              </SelectItem>
                              <SelectItem value="agency">
                                Marketing Agencies
                              </SelectItem>
                              <SelectItem value="medspa">
                                Medical Spas
                              </SelectItem>
                              <SelectItem value="realestate">
                                Real Estate
                              </SelectItem>
                              <SelectItem value="automotive">
                                Automotive
                              </SelectItem>
                              <SelectItem value="finance">Finance</SelectItem>
                              <SelectItem value="healthcare">
                                Healthcare
                              </SelectItem>
                              <SelectItem value="legal">
                                Legal Services
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            Video Duration
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || "2min"}
                          >
                            <FormControl>
                              <SelectTrigger className="text-sm sm:text-base">
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="30s">
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">
                                    30 seconds
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Quick elevator pitch
                                  </span>
                                </div>
                              </SelectItem>
                              <SelectItem value="1min">
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">1 minute</span>
                                  <span className="text-xs text-muted-foreground">
                                    Short intro
                                  </span>
                                </div>
                              </SelectItem>
                              <SelectItem value="2min">
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">
                                    2 minutes ⭐
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Standard (Recommended)
                                  </span>
                                </div>
                              </SelectItem>
                              <SelectItem value="3min">
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">3 minutes</span>
                                  <span className="text-xs text-muted-foreground">
                                    Detailed presentation
                                  </span>
                                </div>
                              </SelectItem>
                              <SelectItem value="5min">
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">5 minutes</span>
                                  <span className="text-xs text-muted-foreground">
                                    Comprehensive deep dive
                                  </span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subtitleType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-sm font-semibold">
                            Subtitle Style 📝
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-1 gap-3"
                            >
                              {/* No Subtitles Option */}
                              <label
                                htmlFor="subtitle-none"
                                className={cn(
                                  "relative flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all",
                                  field.value === "none"
                                    ? "border-primary bg-primary/5"
                                    : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                                )}
                              >
                                <RadioGroupItem
                                  value="none"
                                  id="subtitle-none"
                                  className="mt-0.5 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-slate-900">
                                    No Subtitles (Clean Look)
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">
                                    Professional appearance without text
                                    overlays
                                  </p>
                                </div>
                              </label>

                              {/* Traditional Captions Option */}
                              <label
                                htmlFor="subtitle-traditional"
                                className={cn(
                                  "relative flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all",
                                  field.value === "traditional"
                                    ? "border-primary bg-primary/5"
                                    : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                                )}
                              >
                                <RadioGroupItem
                                  value="traditional"
                                  id="subtitle-traditional"
                                  className="mt-0.5 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-slate-900">
                                    Traditional Captions
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">
                                    Standard closed captions (phrase-by-phrase)
                                  </p>
                                </div>
                              </label>

                              {/* Karaoke Style Option */}
                              <label
                                htmlFor="subtitle-karaoke"
                                className={cn(
                                  "relative flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all",
                                  field.value === "karaoke"
                                    ? "border-primary bg-primary/5"
                                    : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                                )}
                              >
                                <RadioGroupItem
                                  value="karaoke"
                                  id="subtitle-karaoke"
                                  className="mt-0.5 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-slate-900 flex items-center gap-1.5">
                                    Karaoke Style
                                    <span className="text-yellow-500">⭐</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">
                                    Word-by-word highlighting (engaging &
                                    dynamic)
                                  </p>
                                </div>
                              </label>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetAudience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            Target Audience (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Construction company owners with 10-50 employees"
                              {...field}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="painPoints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            Main Pain Points (Optional)
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g., Struggling to get quality leads, losing projects to competitors"
                              rows={3}
                              {...field}
                              className="text-sm sm:text-base resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="solution"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            Solution Overview (Optional)
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g., AI-powered lead system that responds in under 2 minutes"
                              rows={3}
                              {...field}
                              className="text-sm sm:text-base resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="proofElements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            Proof Elements (Optional)
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g., 300% increase in leads, 50+ happy clients"
                              rows={3}
                              {...field}
                              className="text-sm sm:text-base resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* ✅ Responsive Button Group */}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createVSLMutation.isPending}
                        className="bg-primary text-white hover:bg-primary/90 w-full sm:w-auto"
                      >
                        {createVSLMutation.isPending
                          ? "Generating..."
                          : "Generate VSL"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* ✅ Responsive Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <Breadcrumb className="mb-4 sm:mb-6">
          <BreadcrumbList className="text-sm">
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
              <BreadcrumbPage>VSL Generator</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {vsls?.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <Video className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">
              No VSLs Created Yet
            </h3>
            <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6 max-w-md mx-auto">
              Generate your first AI-powered video sales letter
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary text-white hover:bg-primary/90 w-full sm:w-auto"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Your First VSL
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
            {vsls?.map((vsl: any) => (
              <Card
                key={vsl.id}
                className="hover:shadow-md transition-shadow flex flex-col"
              >
                <CardHeader className="pb-3 px-4 sm:px-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Video className="text-primary w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base lg:text-lg truncate">
                          {vsl.title}
                        </CardTitle>
                        <div className="mt-1">{getStatusBadge(vsl)}</div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDownload(vsl)}
                          disabled={!vsl.videoUrl}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(vsl.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 flex-1 flex flex-col">
                  {vsl.videoUrl ? (
                    <div
                      className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden group cursor-pointer"
                      onClick={() => handlePreview(vsl)}
                    >
                      <img
                        src={vsl.thumbnailUrl}
                        alt={vsl.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                      <div className="text-center px-4">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs sm:text-sm text-slate-600">
                          Generating video...
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                    <div>
                      <div className="text-base sm:text-lg font-semibold text-slate-900">
                        {vsl.viewCount || 0}
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500">
                        Views
                      </div>
                    </div>
                    <div>
                      <div className="text-base sm:text-lg font-semibold text-slate-900">
                        {vsl.duration ? formatDuration(vsl.duration) : "0:00"}
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500">
                        Duration
                      </div>
                    </div>
                    <div>
                      <div className="text-base sm:text-lg font-semibold text-slate-900">
                        {vsl.completionRate?.toFixed(1) ?? "0.0"}%
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500">
                        Convert
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {vsl.script && (
                    <div className="bg-slate-50 rounded-lg p-2 sm:p-3">
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <h4 className="text-xs sm:text-sm font-medium text-slate-900">
                          Script Preview
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto py-0 px-1 text-xs text-primary hover:text-primary/80"
                          onClick={() => {
                            setSelectedScript(vsl.script);
                            setShowScriptDialog(true);
                          }}
                        >
                          View Full
                        </Button>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-600 line-clamp-3">
                        {vsl.script.substring(0, 150)}...
                      </p>
                    </div>
                  )}

                  {/*  Responsive Actions */}
                  <div className="space-y-2 mt-auto">
                    {/* ✅ Better Mobile-Optimized Actions */}
                    <div className="flex gap-2 mt-auto">
                      {vsl.videoUrl ? (
                        <>
                          {/* Primary Play Button */}
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 text-xs sm:text-sm bg-primary hover:bg-primary/90"
                            onClick={() => handlePreview(vsl)}
                          >
                            <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Play
                          </Button>

                          {/* More Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs sm:text-sm"
                              >
                                <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                <span className="hidden sm:inline">More</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleAnalytics(vsl)}
                              >
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Analytics
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleShare(vsl)}
                              >
                                <Share className="w-4 h-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDownload(vsl)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(vsl.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ) : (
                        <>
                          {/* When Video is Generating */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs sm:text-sm"
                            onClick={() => handleAnalytics(vsl)}
                          >
                            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            <span className="hidden xs:inline">Analytics</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs sm:text-sm text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(vsl.id)}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            <span className="hidden xs:inline">Delete</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] sm:text-xs text-slate-400 text-center pt-2">
                    Created {new Date(vsl.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* ✅ Responsive Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] p-0">
          <div className="p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl pr-8">
                {selectedVSL?.title}
              </DialogTitle>
              <DialogDescription>Full VSL Preview</DialogDescription>
            </DialogHeader>
            {selectedVSL?.videoUrl && (
              <VideoPlayerWithTracking vsl={selectedVSL} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ Responsive Analytics Dialog */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                VSL Analytics
              </DialogTitle>
              <DialogDescription className="line-clamp-1">
                {selectedVSL?.title}
              </DialogDescription>
            </DialogHeader>
            <RealAnalyticsContent vsl={selectedVSL} />
          </div>
        </DialogContent>
      </Dialog>
      {/* ✅ New Share Dialog Component */}
      {selectedVSL && (
        <ShareVSLDialog
          open={showShare}
          onOpenChange={setShowShare}
          vsl={selectedVSL}
        />
      )}
      {/* ✅ Responsive Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="w-[95vw] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This action cannot be undone. This will permanently delete the VSL
              and remove it from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto m-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                vslToDelete && deleteVSLMutation.mutate(vslToDelete)
              }
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showScriptDialog} onOpenChange={setShowScriptDialog}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] flex flex-col p-0">
          <div className="p-4 sm:p-6 flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Full VSL Script
              </DialogTitle>
              <DialogDescription>
                Complete script for video generation
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="bg-slate-50 rounded-lg p-4 sm:p-6">
              <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-700 leading-relaxed">
                {selectedScript}
              </pre>
            </div>
          </div>

          <div className="flex-shrink-0 border-t px-4 sm:px-6 py-3 sm:py-4 bg-slate-50">
            <div className="flex justify-between items-center gap-2">
              <p className="text-xs text-slate-500">
                {selectedScript.split(" ").length} words
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedScript);
                    toast({
                      title: "Copied!",
                      description: "Script copied to clipboard",
                    });
                  }}
                >
                  <Copy className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Copy</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowScriptDialog(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  // ✅ Video Player with Analytics Tracking
  function VideoPlayerWithTracking({ vsl }: { vsl: any }) {
    const { toast } = useToast();
    const [sessionId] = useState(
      () => `session_${Date.now()}_${Math.random()}`
    );
    const [lastUpdateTime, setLastUpdateTime] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Track play event
    const handlePlay = async () => {
      console.log("🎬 [VIDEO] Play event triggered for VSL:", vsl.id);
      console.log("📍 [VIDEO] Session ID:", sessionId);
      try {
        // ✅ FIX: Use getApiUrl() to point to backend
        const url = getApiUrl(`/api/vsls/${vsl.id}/track-play`);
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
          credentials: "include",
        });

        if (response.ok) {
          console.log("✅ [VIDEO] Play tracked successfully");
        } else {
          const errorText = await response.text();
          console.error(
            "❌ [VIDEO] Play tracking failed:",
            response.status,
            errorText
          );
        }
      } catch (error) {
        console.error("❌ [VIDEO] Failed to track play:", error);
      }
    };

    // Track progress (every 5 seconds)
    const handleTimeUpdate = async () => {
      const video = videoRef.current;
      if (!video) return;

      const currentTime = Math.floor(video.currentTime);
      const duration = Math.floor(video.duration);

      // Update every 5 seconds
      if (currentTime - lastUpdateTime >= 5) {
        console.log(
          `📊 [VIDEO] Progress update - Time: ${currentTime}s / ${duration}s`
        );
        setLastUpdateTime(currentTime);

        const completionPercentage = Math.floor((currentTime / duration) * 100);
        const completed = completionPercentage >= 95;

        console.log(
          `📊 [VIDEO] Sending: ${completionPercentage}%, Completed: ${completed}`
        );

        try {
          // ✅ FIX: Use getApiUrl() to point to backend
          const url = getApiUrl(`/api/vsls/${vsl.id}/track-progress`);
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              watchTime: currentTime,
              completionPercentage,
              completed,
            }),
            credentials: "include",
          });

          if (response.ok) {
            console.log(
              `✅ [VIDEO] Progress tracked: ${completionPercentage}%`
            );
          } else {
            const errorText = await response.text();
            console.error(
              `❌ [VIDEO] Progress tracking failed:`,
              response.status,
              errorText
            );
          }
        } catch (error) {
          console.error("❌ [VIDEO] Failed to track progress:", error);
        }
      }
    };

    // Track completion
    const handleEnded = async () => {
      const video = videoRef.current;
      if (!video) return;

      console.log("🎉 [VIDEO] Video ended - tracking 100% completion");

      try {
        // ✅ FIX: Use getApiUrl() to point to backend
        const url = getApiUrl(`/api/vsls/${vsl.id}/track-progress`);
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            watchTime: Math.floor(video.duration),
            completionPercentage: 100,
            completed: true,
          }),
          credentials: "include",
        });

        if (response.ok) {
          console.log("✅ [VIDEO] Completion tracked successfully");
        } else {
          const errorText = await response.text();
          console.error(
            "❌ [VIDEO] Completion tracking failed:",
            response.status,
            errorText
          );
        }
      } catch (error) {
        console.error("❌ [VIDEO] Failed to track completion:", error);
      }
    };

    return (
      <div className="aspect-video w-full mt-4 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={vsl.videoUrl}
          controls
          className="w-full h-full"
          onPlay={handlePlay}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          autoPlay
        />
      </div>
    );
  }

  function RealAnalyticsContent({ vsl }: { vsl: any }) {
    const { data: analytics, isLoading } = useQuery({
      queryKey: [`/api/vsls/${vsl?.id}/analytics`],
      enabled: !!vsl?.id,
      queryFn: async () => {
        const url = getApiUrl(`/api/vsls/${vsl.id}/analytics`);
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error("Failed to load analytics");
        return response.json();
      },
    });

    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (isLoading) {
      return (
        <div className="space-y-4 sm:space-y-6 mt-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    return (
      <div className="space-y-4 sm:space-y-6 mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-center">
                <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl sm:text-3xl font-bold">
                  {analytics?.totalViews || 0}
                </div>
                <div className="text-xs sm:text-sm text-slate-500">
                  Total Views
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-center">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl sm:text-3xl font-bold">
                  {analytics?.completionRate?.toFixed(1) || 0}%
                </div>
                <div className="text-xs sm:text-sm text-slate-500">
                  Completion Rate
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">
              Performance Metrics
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Average Watch Time</span>
                <span className="font-medium">
                  {formatDuration(analytics?.averageWatchTime || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Average Completion</span>
                <span className="font-medium">
                  {analytics?.averageCompletionPercentage || 0}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Watch Time</span>
                <span className="font-medium">
                  {formatDuration(analytics?.totalWatchTime || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
