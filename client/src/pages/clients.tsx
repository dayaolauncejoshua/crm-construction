// client/src/pages/clients.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClient } from "@/contexts/ClientContext";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2,
  Plus,
  Phone,
  Mail,
  Globe,
  Settings,
  MoreVertical,
  Eye,
  XCircle,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const createClientSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  website: z
    .string()
    .url("Please enter a valid website URL")
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Please enter a valid email")
    .optional()
    .or(z.literal("")),
  whatsappNumber: z.string().optional(),
  whatsappPhoneNumberId: z.string().optional(),
});

type CreateClientData = z.infer<typeof createClientSchema>;

export default function Clients() {
  usePageTitle("Clients");

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { setSelectedClientId } = useClient();
  const [, setLocation] = useLocation();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<any | null>(null);

  // Setup form state
  const [setupName, setSetupName] = useState("");
  const [setupIndustry, setSetupIndustry] = useState("");
  const [setupWebsite, setSetupWebsite] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [setupWhatsappNumber, setSetupWhatsappNumber] = useState("");
  const [setupWhatsappPhoneNumberId, setSetupWhatsappPhoneNumberId] = useState("");

  // ✅ Validation errors for setup form
  const [setupErrors, setSetupErrors] = useState<Record<string, string>>({});

  // Fetch clients
  const {
    data: clients,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/clients", user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id) return [];

      let url = `/api/clients?userId=${user.id}`;
      if (user?.role === "super_admin") {
        url = "/api/super-admin/clients";
      }

      const response = await fetch(url);

      if (response.status === 401) {
        window.location.href = "/login";
        return [];
      }

      if (response.status === 403) {
        throw new Error("Access denied");
      }

      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }

      return response.json();
    },
    enabled: !!user?.id,
    retry: false,
  });

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Access Denied
          </h3>
          <p className="text-slate-600">
            You don't have permission to view clients.
          </p>
        </div>
      </div>
    );
  }

  // Create client form
  const form = useForm<CreateClientData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: "",
      industry: "",
      website: "",
      phone: "",
      email: "",
      whatsappNumber: "",
      whatsappPhoneNumberId: "",
    },
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: CreateClientData) => {
      const response = await apiRequest("POST", "/api/clients", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create client");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/clients", user?.id, user?.role],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/clients"],
      });
      setShowCreateDialog(false);
      form.reset();
      toast({
        title: "Success!",
        description: "Client created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ✅ FIX 3: Validate setup form before saving
  const validateSetupForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!setupName.trim()) {
      errors.name = "Company name is required";
    }

    if (!setupIndustry) {
      errors.industry = "Industry is required";
    }

    // Optional: Add more validations if needed
    if (setupWebsite && !/^https?:\/\/.+/.test(setupWebsite)) {
      errors.website = "Please enter a valid URL";
    }

    if (setupEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setupEmail)) {
      errors.email = "Please enter a valid email";
    }

    setSetupErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      updates: Partial<CreateClientData>;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/clients/${data.id}`,
        data.updates
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update client");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/clients", user?.id, user?.role],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/clients"],
      });
      setShowSetupDialog(false);
      setSelectedClient(null);
      setSetupErrors({});
      toast({
        title: "Success!",
        description: "Client settings updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ✅ FIX 2: Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete client");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Client Deleted",
        description: "The client and all associated data have been deleted.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/clients", user?.id, user?.role],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/clients"],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Deleting Client",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setClientToDelete(null);
    },
  });

  const onSubmit = (data: CreateClientData) => {
    createClientMutation.mutate(data);
  };

  const handleSaveSetup = () => {
    if (!selectedClient) return;

    // ✅ FIX 3: Validate before saving
    if (!validateSetupForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    updateClientMutation.mutate({
      id: selectedClient.id,
      updates: {
        name: setupName,
        industry: setupIndustry,
        website: setupWebsite || "",
        email: setupEmail || "",
        phone: setupPhone || "",
        whatsappNumber: setupWhatsappNumber || "",
      },
    });
  };

  // ✅ FIX 1: Export clients
  const handleExportClients = async () => {
    try {
      const url =
        user?.role === "super_admin"
          ? "/api/clients/export"
          : `/api/clients/export?userId=${user?.id}`;

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export clients");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `clients-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "Your clients have been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export clients. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
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
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <Skeleton className="h-px w-full" />
                  <div className="grid grid-cols-3 gap-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                  <Skeleton className="h-px w-full" />
                  <div className="flex space-x-2">
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

  const canCreateClient = user?.role !== "super_admin";

  // Fetch real stats for each client
  const { data: clientStats } = useQuery({
    queryKey: ["/api/clients/stats", user?.id],
    queryFn: async () => {
      if (!clients) return {};

      const statsPromises = clients.map(async (client: any) => {
        const response = await fetch(`/api/dashboard/${client.id}`, {
          credentials: "include",
        });
        if (!response.ok) return { id: client.id, leads: 0, active: 0, hot: 0 };

        const data = await response.json();
        return {
          id: client.id,
          leads: data.kpis?.totalLeads || 0,
          active:
            data.conversations?.filter(
              (c: any) => c.isAiHandled || !c.humanTakeoverAt
            ).length || 0,
          hot: data.hotLeads?.length || 0,
        };
      });

      const stats = await Promise.all(statsPromises);
      return stats.reduce((acc: any, stat: any) => {
        acc[stat.id] = stat;
        return acc;
      }, {});
    },
    enabled: !!clients && clients.length > 0,
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {user?.role === "super_admin"
                ? "All Clients (View Only)"
                : "Client Management"}
            </h2>
            <p className="text-slate-600">
              {user?.role === "super_admin"
                ? "View all clients across the platform"
                : "Manage your business clients and their settings"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ FIX 1: Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportClients}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            {canCreateClient && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-white hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Client</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter company name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select industry" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="construction">
                                  Construction
                                </SelectItem>
                                <SelectItem value="agency">
                                  Marketing Agency
                                </SelectItem>
                                <SelectItem value="medspa">
                                  Medical Spa
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
                                <SelectItem value="legal">Legal</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://example.com"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="+1 (555) 123-4567"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="contact@company.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="whatsappNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp Business Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 (555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="whatsappPhoneNumberId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp Phone Number ID</FormLabel>
                            <FormControl>
                              <Input placeholder="808896282312368" {...field} />
                            </FormControl>
                            <p className="text-xs text-slate-500 mt-1">
                              From Meta Business Suite → WhatsApp → API Setup.
                              Leave blank to use global setting.
                            </p>
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
                          disabled={createClientMutation.isPending}
                          className="bg-primary text-white hover:bg-primary/90"
                        >
                          {createClientMutation.isPending
                            ? "Creating..."
                            : "Create Client"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {/* Breadcrumb */}
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
              <BreadcrumbPage>Client Management</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {!clients || clients.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {user?.role === "super_admin"
                ? "No Clients Yet"
                : "No Clients Yet"}
            </h3>
            <p className="text-slate-600 mb-6">
              {user?.role === "super_admin"
                ? "Users haven't created any clients yet"
                : "Get started by adding your first client"}
            </p>
            {canCreateClient && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Client
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client: any) => (
              <Card
                key={client.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="text-primary text-lg" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {client.industry}
                        </Badge>
                        {user?.role === "super_admin" && client.user && (
                          <p className="text-xs text-slate-500 mt-1">
                            Owner: {client.user.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ✅ FIX 2: Working 3-Dot Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedClientId(client.id);
                            setLocation("/dashboard");
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Dashboard
                        </DropdownMenuItem>
                        {canCreateClient && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedClient(client);
                                setSetupName(client.name || "");
                                setSetupIndustry(client.industry || "");
                                setSetupWebsite(client.website || "");
                                setSetupEmail(client.email || "");
                                setSetupPhone(client.phone || "");
                                setSetupWhatsappNumber(client.whatsappNumber || "");
                                setSetupWhatsappPhoneNumberId(
                                  client.whatsappPhoneNumberId || ""
                                );
                                setSetupErrors({});
                                setShowSetupDialog(true);
                              }}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setClientToDelete(client)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Client
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-2">
                    {client.website && (
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Globe className="w-4 h-4" />
                        <span className="truncate">{client.website}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {clientStats?.[client.id]?.leads || 0}
                      </div>
                      <div className="text-xs text-slate-500">Leads</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {clientStats?.[client.id]?.active || 0}
                      </div>
                      <div className="text-xs text-slate-500">Active</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {clientStats?.[client.id]?.hot || 0}
                      </div>
                      <div className="text-xs text-slate-500">Hot</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setLocation("/dashboard");
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {canCreateClient && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedClient(client);
                          setSetupName(client.name || "");
                          setSetupIndustry(client.industry || "");
                          setSetupWebsite(client.website || "");
                          setSetupEmail(client.email || "");
                          setSetupPhone(client.phone || "");
                          setSetupWhatsappNumber(client.whatsappNumber || "");
                          setSetupWhatsappPhoneNumberId(
                            client.whatsappPhoneNumberId || ""
                          );
                          setSetupErrors({});
                          setShowSetupDialog(true);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Setup
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* ✅ FIX 3: Setup Dialog with Required Field Validation */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure {selectedClient?.name}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="ai">AI Settings</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={setupName}
                    onChange={(e) => {
                      setSetupName(e.target.value);
                      if (setupErrors.name) {
                        setSetupErrors((prev) => ({ ...prev, name: "" }));
                      }
                    }}
                    placeholder="Enter company name"
                    className={setupErrors.name ? "border-red-500" : ""}
                  />
                  {setupErrors.name && (
                    <p className="text-sm text-red-500 mt-1">{setupErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Industry <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={setupIndustry}
                    onValueChange={(value) => {
                      setSetupIndustry(value);
                      if (setupErrors.industry) {
                        setSetupErrors((prev) => ({ ...prev, industry: "" }));
                      }
                    }}
                  >
                    <SelectTrigger className={setupErrors.industry ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="agency">Marketing Agency</SelectItem>
                      <SelectItem value="medspa">Medical Spa</SelectItem>
                      <SelectItem value="realestate">Real Estate</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {setupErrors.industry && (
                    <p className="text-sm text-red-500 mt-1">{setupErrors.industry}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Website</label>
                  <Input
                    value={setupWebsite}
                    onChange={(e) => {
                      setSetupWebsite(e.target.value);
                      if (setupErrors.website) {
                        setSetupErrors((prev) => ({ ...prev, website: "" }));
                      }
                    }}
                    placeholder="https://example.com"
                    className={setupErrors.website ? "border-red-500" : ""}
                  />
                  {setupErrors.website && (
                    <p className="text-sm text-red-500 mt-1">{setupErrors.website}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={setupEmail}
                    onChange={(e) => {
                      setSetupEmail(e.target.value);
                      if (setupErrors.email) {
                        setSetupErrors((prev) => ({ ...prev, email: "" }));
                      }
                    }}
                    placeholder="contact@company.com"
                    className={setupErrors.email ? "border-red-500" : ""}
                  />
                  {setupErrors.email && (
                    <p className="text-sm text-red-500 mt-1">{setupErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={setupPhone}
                    onChange={(e) => setSetupPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </TabsContent>

            {/* WhatsApp Tab */}
            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">
                    WhatsApp Business Number
                  </label>
                  <Input
                    value={setupWhatsappNumber}
                    onChange={(e) => setSetupWhatsappNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Your verified WhatsApp Business number
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    WhatsApp Phone Number ID
                  </label>
                  <Input
                    value={setupWhatsappPhoneNumberId}
                    onChange={(e) => setSetupWhatsappPhoneNumberId(e.target.value)}
                    placeholder="808896282312368"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    From Meta Business Suite → WhatsApp → API Setup
                  </p>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    💡 <strong>How to find your Phone Number ID:</strong>
                  </p>
                  <ol className="text-xs text-blue-800 mt-2 ml-4 list-decimal space-y-1">
                    <li>Go to Meta Business Suite</li>
                    <li>Select your WhatsApp Business Account</li>
                    <li>Go to API Setup</li>
                    <li>Copy the Phone Number ID</li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            {/* AI Settings Tab */}
            <TabsContent value="ai" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">AI Response Tone</label>
                  <Select defaultValue="professional">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual & Friendly</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Auto-Response Delay
                  </label>
                  <Select defaultValue="instant">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant (0s)</SelectItem>
                      <SelectItem value="natural">Natural (5-10s)</SelectItem>
                      <SelectItem value="slow">Slow (15-30s)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Simulate human response timing
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Qualification Threshold
                  </label>
                  <Select defaultValue="0.7">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">
                        Low (0.5) - More human takeovers
                      </SelectItem>
                      <SelectItem value="0.7">
                        Medium (0.7) - Balanced
                      </SelectItem>
                      <SelectItem value="0.85">
                        High (0.85) - Fewer takeovers
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    When should AI escalate to human?
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowSetupDialog(false);
                setSelectedClient(null);
                setSetupErrors({});
              }}
              disabled={updateClientMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSetup}
              disabled={updateClientMutation.isPending}
            >
              {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ FIX 2: Delete Confirmation Dialog */}
      <AlertDialog
        open={!!clientToDelete}
        onOpenChange={() => setClientToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong className="text-slate-900">{clientToDelete?.name}</strong>{" "}
              and all associated data including:
              <ul className="list-disc ml-6 mt-2">
                <li>All leads and conversations</li>
                <li>All messages and bookings</li>
                <li>All analytics and reports</li>
                <li>All follow-up sequences</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteClientMutation.mutate(clientToDelete.id)}
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete Client"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}