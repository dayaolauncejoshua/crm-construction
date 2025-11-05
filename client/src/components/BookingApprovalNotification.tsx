// client/src/components/BookingApprovalNotification.tsx

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function BookingApprovalNotification({ booking }: { booking: any }) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/bookings/${booking.id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to approve booking");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Booking Approved!",
        description: "Confirmation sent to lead via email and WhatsApp.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/bookings/${booking.id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Agent reviewed and declined" }),
      });
      if (!response.ok) throw new Error("Failed to reject booking");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking Rejected",
        description: "The proposed booking has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });

  const handleApprove = () => {
    setIsProcessing(true);
    approveMutation.mutate();
  };

  const handleReject = () => {
    setIsProcessing(true);
    rejectMutation.mutate();
  };

  return (
    <Card className="border-l-4 border-l-amber-500 bg-amber-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-amber-900">🤖 AI Proposed Booking</h4>
            <Badge className="bg-amber-200 text-amber-900">Needs Approval</Badge>
          </div>

          <div className="space-y-2 text-sm text-amber-800">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="font-medium">{booking.attendeeName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(booking.scheduledFor).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  timeZone: "America/Vancouver",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {new Date(booking.scheduledFor).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Vancouver",
                })} ({booking.duration} min)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{booking.location || "TBD"}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve & Send Invite
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              size="sm"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Decline
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}