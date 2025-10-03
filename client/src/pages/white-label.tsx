// client/src/pages/vsl.tsx

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Palette,
  Globe,
  Upload,
  Eye,
  Save,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Settings,
  Code,
  Image as ImageIcon,
  Type,
  Layout
} from "lucide-react";

const whiteLabelSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().min(4, "Primary color is required"),
  secondaryColor: z.string().min(4, "Secondary color is required"),
  customDomain: z.string().optional(),
  customCss: z.string().optional(),
  favicon: z.string().url().optional().or(z.literal("")),
  loginBgImage: z.string().url().optional().or(z.literal("")),
  footerText: z.string().optional(),
});

type WhiteLabelData = z.infer<typeof whiteLabelSchema>;

export default function WhiteLabel() {
  const [selectedClientId, setSelectedClientId] = useState("demo-client");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const { toast } = useToast();

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch(`/api/clients?userId=demo-user`);
      return response.json();
    },
  });

  // Fetch white label settings
  const { data: whiteLabelSettings, isLoading } = useQuery({
    queryKey: ["/api/white-label", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const response = await fetch(`/api/white-label/${selectedClientId}`);
      return response.json();
    },
  });

  const form = useForm<WhiteLabelData>({
    resolver: zodResolver(whiteLabelSchema),
    defaultValues: {
      brandName: "",
      logoUrl: "",
      primaryColor: "#3b82f6",
      secondaryColor: "#64748b",
      customDomain: "",
      customCss: "",
      favicon: "",
      loginBgImage: "",
      footerText: "",
    },
    values: whiteLabelSettings || undefined,
  });

  // Save white label settings mutation
  const saveWhiteLabelMutation = useMutation({
    mutationFn: async (data: WhiteLabelData) => {
      const response = await apiRequest("POST", `/api/white-label/${selectedClientId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/white-label", selectedClientId] });
      toast({
        title: "Settings saved!",
        description: "White label settings have been updated successfully.",
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

  // Generate custom domain mutation
  const generateDomainMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/white-label/${selectedClientId}/generate-domain`, {});
      return response.json();
    },
    onSuccess: (data) => {
      form.setValue("customDomain", data.domain);
      toast({
        title: "Domain generated!",
        description: `Custom domain ${data.domain} has been configured.`,
      });
    },
  });

  const onSubmit = (data: WhiteLabelData) => {
    saveWhiteLabelMutation.mutate(data);
  };

  // Watch form values for live preview
  const watchedValues = form.watch();

  const getPreviewStyles = () => {
    return {
      '--primary-color': watchedValues.primaryColor || '#3b82f6',
      '--secondary-color': watchedValues.secondaryColor || '#64748b',
    } as React.CSSProperties;
  };

  const getDeviceClass = () => {
    switch (previewDevice) {
      case "mobile": return "max-w-sm";
      case "tablet": return "max-w-2xl";
      default: return "max-w-full";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading white label settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">White Label Portal</h2>
              <p className="text-sm sm:text-base text-slate-600">Customize the platform branding for your clients</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Button
                variant="outline"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="w-full sm:w-auto"
              >
                <Eye className="w-4 h-4 mr-2" />
                {isPreviewMode ? "Edit Mode" : "Preview Mode"}
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={saveWhiteLabelMutation.isPending}
                className="bg-primary text-white hover:bg-primary/90 w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveWhiteLabelMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {isPreviewMode ? (
            // Preview Mode
            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-center mb-6 gap-2 sm:gap-4">
                <Button
                  variant={previewDevice === "desktop" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewDevice("desktop")}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  Desktop
                </Button>
                <Button
                  variant={previewDevice === "tablet" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewDevice("tablet")}
                >
                  <Tablet className="w-4 h-4 mr-2" />
                  Tablet
                </Button>
                <Button
                  variant={previewDevice === "mobile" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewDevice("mobile")}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Mobile
                </Button>
              </div>

              <div className={`mx-auto ${getDeviceClass()}`}>
                <div 
                  className="bg-white rounded-lg shadow-xl overflow-hidden"
                  style={getPreviewStyles()}
                >
                  {/* Preview Header */}
                  <div 
                    className="px-6 py-4 border-b"
                    style={{ backgroundColor: watchedValues.primaryColor }}
                  >
                    <div className="flex items-center space-x-3">
                      {watchedValues.logoUrl && (
                        <img 
                          src={watchedValues.logoUrl} 
                          alt="Logo" 
                          className="h-8 w-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <h1 className="text-xl font-bold text-white">
                        {watchedValues.brandName || "Your Brand Name"}
                      </h1>
                    </div>
                  </div>

                  {/* Preview Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-lg border">
                        <h3 className="font-medium mb-2">Total Leads</h3>
                        <p className="text-2xl font-bold" style={{ color: watchedValues.primaryColor }}>
                          1,247
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <h3 className="font-medium mb-2">Conversion Rate</h3>
                        <p className="text-2xl font-bold" style={{ color: watchedValues.primaryColor }}>
                          24.8%
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <h3 className="font-medium mb-2">Revenue</h3>
                        <p className="text-2xl font-bold" style={{ color: watchedValues.primaryColor }}>
                          $42,350
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-medium mb-2">Recent Activity</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span>New lead from John Smith</span>
                            <span className="text-sm text-slate-500">2 min ago</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Demo booked by Sarah Johnson</span>
                            <span className="text-sm text-slate-500">5 min ago</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview Footer */}
                  {watchedValues.footerText && (
                    <div 
                      className="px-6 py-3 border-t text-center text-sm"
                      style={{ color: watchedValues.secondaryColor }}
                    >
                      {watchedValues.footerText}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Edit Mode
            <div className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <Tabs defaultValue="branding" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="branding">Branding</TabsTrigger>
                      <TabsTrigger value="colors">Colors</TabsTrigger>
                      <TabsTrigger value="domain">Domain</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="branding" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Type className="w-5 h-5 mr-2" />
                            Brand Identity
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="brandName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Brand Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your brand name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="logoUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Logo URL</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://example.com/logo.png" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="favicon"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Favicon URL</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://example.com/favicon.ico" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="footerText"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Footer Text</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="© 2024 Your Company. All rights reserved."
                                    rows={2}
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="colors" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Palette className="w-5 h-5 mr-2" />
                            Color Scheme
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="primaryColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary Color</FormLabel>
                                <div className="flex items-center space-x-3">
                                  <FormControl>
                                    <Input 
                                      type="color" 
                                      className="w-16 h-10 p-1 border rounded cursor-pointer"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormControl>
                                    <Input 
                                      placeholder="#3b82f6" 
                                      className="flex-1"
                                      {...field} 
                                    />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="secondaryColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Secondary Color</FormLabel>
                                <div className="flex items-center space-x-3">
                                  <FormControl>
                                    <Input 
                                      type="color" 
                                      className="w-16 h-10 p-1 border rounded cursor-pointer"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormControl>
                                    <Input 
                                      placeholder="#64748b" 
                                      className="flex-1"
                                      {...field} 
                                    />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="loginBgImage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Login Background Image</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://example.com/background.jpg" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="domain" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Globe className="w-5 h-5 mr-2" />
                            Custom Domain
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="customDomain"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Custom Domain</FormLabel>
                                <div className="flex items-center space-x-3">
                                  <FormControl>
                                    <Input placeholder="app.yourbrand.com" {...field} />
                                  </FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => generateDomainMutation.mutate()}
                                    disabled={generateDomainMutation.isPending}
                                  >
                                    {generateDomainMutation.isPending ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      "Generate"
                                    )}
                                  </Button>
                                </div>
                                <p className="text-sm text-slate-500">
                                  Configure a custom domain for your client portal
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-2">Domain Setup Instructions</h4>
                            <ol className="text-sm text-blue-800 space-y-1">
                              <li>1. Add a CNAME record pointing to platform.leadgen.ai</li>
                              <li>2. Verify domain ownership through DNS</li>
                              <li>3. SSL certificate will be automatically provisioned</li>
                              <li>4. Domain will be active within 24 hours</li>
                            </ol>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Code className="w-5 h-5 mr-2" />
                            Advanced Customization
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="customCss"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Custom CSS</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="/* Add your custom CSS here */
.custom-header {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
}

.custom-button {
  border-radius: 20px;
}"
                                    rows={10}
                                    className="font-mono text-sm"
                                    {...field} 
                                  />
                                </FormControl>
                                <p className="text-sm text-slate-500">
                                  Add custom CSS to further customize the appearance
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="p-4 bg-yellow-50 rounded-lg">
                            <h4 className="font-medium text-yellow-900 mb-2">CSS Guidelines</h4>
                            <ul className="text-sm text-yellow-800 space-y-1">
                              <li>• Use CSS custom properties for colors: var(--primary-color)</li>
                              <li>• Avoid !important declarations when possible</li>
                              <li>• Test changes in preview mode before saving</li>
                              <li>• Changes apply to all client portal pages</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </form>
              </Form>
            </div>
          )}
        </main>
    </div>
  );
}