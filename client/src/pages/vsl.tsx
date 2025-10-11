// client/src/pages/vsl.tsx
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
import { Label } from "@/components/ui/label";
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
import { Separator } from "@/components/ui/separator";

import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Video,
  Plus,
  Play,
  Eye,
  TrendingUp,
  Clock,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Share,
  Wand2,
} from "lucide-react";

const createVSLSchema = z.object({
  title: z.string().min(1, "Title is required"),
  niche: z.string().min(1, "Niche is required"),
  targetAudience: z.string().optional(),
  painPoints: z.string().optional(),
  solution: z.string().optional(),
  proofElements: z.string().optional(),
});

type CreateVSLData = z.infer<typeof createVSLSchema>;

export default function VSL() {
  const [selectedClientId, setSelectedClientId] = useState("demo-client");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedVSL, setSelectedVSL] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
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

  // Fetch VSLs
  const { data: vsls, isLoading } = useQuery({
    queryKey: ["/api/vsls", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await fetch(`/api/vsls/${selectedClientId}`);
      return response.json();
    },
  });

  // Create VSL form
  const form = useForm<CreateVSLData>({
    resolver: zodResolver(createVSLSchema),
    defaultValues: {
      title: "",
      niche: "",
      targetAudience: "",
      painPoints: "",
      solution: "",
      proofElements: "",
    },
  });

  // Create VSL mutation
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
    onError: (error) => {
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

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-12 h-12 rounded-lg" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                    <Skeleton className="w-8 h-8" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="aspect-video w-full rounded-lg" />
                  <div className="grid grid-cols-3 gap-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
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
            <h2 className="text-2xl font-bold text-slate-900">VSL Generator</h2>
            <p className="text-slate-600">
              Create automated video sales letters for your clients
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-primary/90">
                <Wand2 className="w-4 h-4 mr-2" />
                Generate VSL
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Generate New VSL</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VSL Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Construction Lead Generation VSL"
                            {...field}
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
                        <FormLabel>Target Niche</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
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
                            <SelectItem value="medspa">Medical Spas</SelectItem>
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
                    name="targetAudience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Audience (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Construction company owners with 10-50 employees"
                            {...field}
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
                        <FormLabel>Main Pain Points (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., Struggling to get quality leads, losing projects to competitors, slow response times"
                            rows={3}
                            {...field}
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
                        <FormLabel>Solution Overview (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., AI-powered lead system that responds in under 2 minutes"
                            rows={3}
                            {...field}
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
                        <FormLabel>Proof Elements (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., 300% increase in leads, 50+ happy clients, case studies"
                            rows={3}
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
                      disabled={createVSLMutation.isPending}
                      className="bg-primary text-white hover:bg-primary/90"
                    >
                      {createVSLMutation.isPending
                        ? "Generating..."
                        : "Generate VSL"}
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
              <BreadcrumbPage>VSL Generator</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {vsls?.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No VSLs Created Yet
            </h3>
            <p className="text-slate-600 mb-6">
              Generate your first AI-powered video sales letter
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Your First VSL
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vsls?.map((vsl: any) => (
              <Card key={vsl.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Video className="text-primary text-lg" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{vsl.title}</CardTitle>
                        {getStatusBadge(vsl)}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Video Preview */}
                  {vsl.videoUrl ? (
                    <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden">
                      <video
                        src={vsl.videoUrl}
                        poster={vsl.thumbnailUrl}
                        className="w-full h-full object-cover"
                        controls
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-slate-600">
                          Generating video...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {vsl.viewCount || 0}
                      </div>
                      <div className="text-xs text-slate-500">Views</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {vsl.duration ? formatDuration(vsl.duration) : "3:00"}
                      </div>
                      <div className="text-xs text-slate-500">Duration</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {parseFloat(vsl.conversionRate || "0").toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-500">Convert</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Script Preview */}
                  {vsl.script && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-slate-900 mb-2">
                        Script Preview
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-3">
                        {vsl.script.substring(0, 150)}...
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {vsl.videoUrl && (
                      <Button variant="outline" size="sm" className="flex-1">
                        <Play className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex-1">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Analytics
                    </Button>
                    {vsl.videoUrl && (
                      <Button variant="outline" size="sm" className="flex-1">
                        <Share className="w-4 h-4 mr-1" />
                        Share
                      </Button>
                    )}
                  </div>

                  {/* Created Date */}
                  <div className="text-xs text-slate-400 text-center">
                    Created {new Date(vsl.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
