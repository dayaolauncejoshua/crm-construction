// client/src/pages/SubscriptionPage.tsx

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getApiUrl } from "@/lib/api-config";

interface Subscription {
  id: string;
  plan: string;
  billingPeriod: string;
  status: string;
  amount: number;
  currency: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const url = getApiUrl("/api/stripe/subscription");
      console.log("🔍 [SUBSCRIPTION] Fetching from:", url);
      
      const response = await fetch(url, {
        credentials: "include",
      });

      console.log("📡 [SUBSCRIPTION] Response:", response.status);

      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }

      const data = await response.json();
      setSubscription(data.subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll still have access until the end of your billing period.")) {
      return;
    }

    setCanceling(true);
    try {
      const url = getApiUrl("/api/stripe/cancel-subscription");
      console.log("🔍 [CANCEL] Posting to:", url);
      
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
      });

      console.log("📡 [CANCEL] Response:", response.status);

      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      toast({
        title: "Subscription Canceled",
        description: "Your subscription will end at the end of the current billing period.",
      });

      // Refresh subscription data
      await fetchSubscription();
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setCanceling(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    setOpeningPortal(true);
    try {
      const url = getApiUrl("/api/stripe/billing-portal");
      console.log("🔍 [BILLING PORTAL] Posting to:", url);
      
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
      });

      console.log("📡 [BILLING PORTAL] Response:", response.status);

      if (!response.ok) {
        throw new Error("Failed to open billing portal");
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error("Error opening billing portal:", error);
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      });
      setOpeningPortal(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPlanDisplayName = (plan: string) => {
    const planNames: Record<string, string> = {
      starter: "Starter",
      professional: "Professional",
      enterprise: "Enterprise",
    };
    return planNames[plan] || plan;
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="destructive">Canceling</Badge>;
    }
    
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case "trialing":
        return <Badge variant="secondary">Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "canceled":
        return <Badge variant="outline">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
            <CardDescription>
              You don't have an active subscription. Upgrade to unlock all features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/pricing")}>
              View Pricing Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>

      {/* Current Subscription Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Manage your subscription and billing</CardDescription>
            </div>
            {getStatusBadge(subscription.status, subscription.cancelAtPeriodEnd)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start space-x-3">
              <CreditCard className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Plan</p>
                <p className="font-semibold">
                  {getPlanDisplayName(subscription.plan)}
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {subscription.billingPeriod}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <DollarSign className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-semibold">
                  {formatAmount(subscription.amount, subscription.currency)}
                </p>
                <p className="text-sm text-gray-500">
                  per {subscription.billingPeriod === "monthly" ? "month" : "year"}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">
                  {subscription.cancelAtPeriodEnd ? "Active Until" : "Next Billing"}
                </p>
                <p className="font-semibold">
                  {formatDate(subscription.currentPeriodEnd)}
                </p>
              </div>
            </div>
          </div>

          {/* Cancellation Warning */}
          {subscription.cancelAtPeriodEnd && (
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Subscription Canceling</p>
                <p className="text-sm text-yellow-700">
                  Your subscription will end on {formatDate(subscription.currentPeriodEnd)}.
                  You'll still have access until then.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleOpenBillingPortal}
              disabled={openingPortal}
            >
              {openingPortal && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Manage Payment Method
            </Button>

            {!subscription.cancelAtPeriodEnd && (
              <Button
                variant="outline"
                onClick={() => navigate("/pricing")}
              >
                Change Plan
              </Button>
            )}

            {!subscription.cancelAtPeriodEnd ? (
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
                disabled={canceling}
              >
                {canceling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cancel Subscription
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={() => navigate("/pricing")}
              >
                Reactivate Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing History Card */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View your past invoices and receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleOpenBillingPortal}
            disabled={openingPortal}
          >
            {openingPortal && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            View All Invoices
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}