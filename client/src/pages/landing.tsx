// client/src/pages/landing.tsx

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Play, Check, Users, TrendingUp, Clock } from "lucide-react";

const step1Schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  company: z.string().min(1, "Company name is required"),
  industry: z.string().default("business"),
});

const step2Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  consent: z.boolean().refine(val => val === true, "Consent is required"),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

export default function Landing() {
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [auditResult, setAuditResult] = useState<any>(null);
  const { toast } = useToast();

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      email: "",
      company: "",
      industry: "business",
    },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      firstName: "",
      phone: "",
      consent: false,
    },
  });

  const submitLeadMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/leads", data);
      return response.json();
    },
    onSuccess: (data) => {
      setAuditResult(data.auditResults);
      toast({
        title: "Success!",
        description: "Your audit is ready! Check your phone for instant results.",
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

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setStep(2);
  };

  const onStep2Submit = (data: Step2Data) => {
    if (!step1Data) return;

    const leadData = {
      ...step1Data,
      ...data,
      clientId: "demo-client", // TODO: Replace with actual client selection
      source: "landing_page",
      consentGiven: data.consent,
      auditInputs: {
        website: step1Data.company.toLowerCase().replace(/\s/g, "") + ".com",
        industry: step1Data.industry,
      },
      auditType: "business",
    };

    submitLeadMutation.mutate(leadData);
  };

  if (auditResult) {
    return <AuditResultsPage auditResult={auditResult} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-blue-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Stop Losing Leads to Slow Response Times
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-blue-100 max-w-3xl mx-auto">
              Get qualified leads in your pipeline within 2 minutes with our AI-powered system
            </p>

            {/* VSL Placeholder */}
            <div className="max-w-4xl mx-auto mb-12">
              <Card className="bg-black/30 border-0">
                <CardContent className="p-8">
                  <div className="bg-slate-800 rounded-lg h-64 md:h-80 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Play className="text-white text-xl ml-1" />
                      </div>
                      <p className="text-white font-medium text-lg">
                        How We Generate 200+ Qualified Leads/Month
                      </p>
                      <p className="text-blue-200 text-sm">3:42 • Click to play</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lead Capture Form */}
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  Get Your Free 2-Minute Lead Audit
                </h3>

                {step === 1 && (
                  <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                        Business Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@company.com"
                        {...step1Form.register("email")}
                        className="w-full"
                      />
                      {step1Form.formState.errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {step1Form.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-2">
                        Company Name
                      </Label>
                      <Input
                        id="company"
                        type="text"
                        placeholder="Your Company LLC"
                        {...step1Form.register("company")}
                        className="w-full"
                      />
                      {step1Form.formState.errors.company && (
                        <p className="text-red-500 text-sm mt-1">
                          {step1Form.formState.errors.company.message}
                        </p>
                      )}
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                      Continue to Phone Capture
                    </Button>
                  </form>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center text-success font-medium text-sm">
                        <Check className="w-4 h-4 mr-2" />
                        Email verified successfully
                      </div>
                    </div>
                    
                    <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
                      <div>
                        <Label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="John"
                          {...step2Form.register("firstName")}
                          className="w-full"
                        />
                        {step2Form.formState.errors.firstName && (
                          <p className="text-red-500 text-sm mt-1">
                            {step2Form.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          {...step2Form.register("phone")}
                          className="w-full"
                        />
                        {step2Form.formState.errors.phone && (
                          <p className="text-red-500 text-sm mt-1">
                            {step2Form.formState.errors.phone.message}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                        <label className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            {...step2Form.register("consent")}
                            className="mt-1"
                          />
                          <span>
                            By providing your phone number, you consent to receive automated text messages 
                            about your lead audit results and follow-up information. Message and data rates may apply. 
                            Reply STOP to opt out anytime.
                          </span>
                        </label>
                        {step2Form.formState.errors.consent && (
                          <p className="text-red-500 text-sm mt-1">
                            {step2Form.formState.errors.consent.message}
                          </p>
                        )}
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-accent hover:bg-accent/90"
                        disabled={submitLeadMutation.isPending}
                      >
                        {submitLeadMutation.isPending ? "Processing..." : "Get My Free Audit Now"}
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-slate-600 mb-8">Trusted by 200+ businesses across industries</p>
            <div className="flex justify-center items-center space-x-8 opacity-60">
              <div className="bg-slate-200 px-6 py-3 rounded">Construction Co.</div>
              <div className="bg-slate-200 px-6 py-3 rounded">Marketing Agency</div>
              <div className="bg-slate-200 px-6 py-3 rounded">MedSpa Group</div>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="text-primary text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                &lt;2 Minute Response
              </h3>
              <p className="text-slate-600">
                Lightning-fast AI responses while competitors take hours
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="text-accent text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                5-10x More Leads
              </h3>
              <p className="text-slate-600">
                Capture leads that would otherwise go to slower competitors
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-warning text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                70% AI Qualified
              </h3>
              <p className="text-slate-600">
                AI handles qualification, you focus on closing hot leads
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditResultsPage({ auditResult }: { auditResult: any }) {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Your Business Audit Results
          </h1>
          <p className="text-slate-600">
            Here's what we found and how we can help you improve
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <Check className="text-success w-5 h-5 mr-2" />
                Quick Wins
              </h3>
              <ul className="space-y-2">
                {auditResult.wins?.map((win: string, index: number) => (
                  <li key={index} className="text-slate-700 flex items-start">
                    <div className="w-2 h-2 bg-success rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    {win}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Key Metrics
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600">Audit Score</p>
                  <p className="text-2xl font-bold text-primary">{auditResult.score}/100</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Estimated ROI</p>
                  <p className="text-lg font-semibold text-slate-900">{auditResult.estimatedROI}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Implementation Timeline</p>
                  <p className="text-lg font-semibold text-slate-900">{auditResult.timeline}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-primary text-white">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Implement These Improvements?
            </h3>
            <p className="text-blue-100 mb-6">
              Book a 15-minute strategy call to discuss your specific needs and get a custom implementation plan.
            </p>
            <Button className="bg-white text-primary hover:bg-slate-100">
              Book Free Strategy Call
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>You'll receive a text message within 2 minutes with additional details and next steps.</p>
        </div>
      </div>
    </div>
  );
}
