// client/src/pages/calendar.tsx
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClient } from "@/contexts/ClientContext";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";
import { useEffect } from "react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Users,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  User,
  FileText,
  Edit3,
  RefreshCw,
  Download,
  Search,
  MoreVertical,
} from "lucide-react";
import { getApiUrl } from "@/lib/api-config";

export default function CalendarPage() {
  usePageTitle("Calendar & Bookings");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState("10:00");
  const [rescheduleDuration, setRescheduleDuration] = useState("60");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [conflictError, setConflictError] = useState<any>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editDuration, setEditDuration] = useState("60");
  const [editLocation, setEditLocation] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editMeetingType, setEditMeetingType] = useState("consultation");

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [typeFilter, setTypeFilter] = useState("all-types");

  const { selectedClientId } = useClient();

  // Fetch bookings - context provides the correct client
  const {
    data: bookings = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/bookings", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];

      const url = getApiUrl(`/api/bookings/${selectedClientId}`);
      console.log("🔍 [CALENDAR] Fetching bookings from:", url);

      const response = await fetch(url, {
        credentials: "include",
      });

      console.log("📡 [CALENDAR] Bookings response:", response.status);

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      return response.json();
    },
    enabled: !!selectedClientId,
  });

  // Log when bookings change
  useEffect(() => {
    console.log("📊 Bookings state updated:", bookings.length, "bookings");
    if (bookings.length > 0) {
      console.log("First booking:", bookings[0]);
    }
  }, [bookings]);

  // Log errors
  useEffect(() => {
    if (error) {
      console.error("❌ Query error:", error);
    }
  }, [error]);

  // Log loading state
  useEffect(() => {
    console.log("⏳ Loading state:", isLoading);
  }, [isLoading]);

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: async (data: {
      bookingId: string;
      scheduledFor: string;
      duration: number;
      notes?: string;
    }) => {
      const url = getApiUrl(`/api/bookings/${data.bookingId}/reschedule`);
      console.log("🔍 [RESCHEDULE] Posting to:", url);

      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scheduledFor: data.scheduledFor,
          duration: data.duration,
          notes: data.notes,
        }),
      });

      console.log("📡 [RESCHEDULE] Response:", response.status);

      const responseData = await response.json();

      if (!response.ok) {
        const error: any = new Error(
          responseData.message || "Failed to reschedule booking"
        );
        error.status = response.status;
        error.code = responseData.error;
        error.conflictingBooking = responseData.conflictingBooking;
        error.fullData = responseData;
        throw error;
      }

      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/bookings", selectedClientId],
      });
      setShowRescheduleModal(false);
      setShowBookingModal(false);
      setConflictError(null);
      toast({
        title: "Meeting Rescheduled!",
        description:
          "Updated calendar invite sent to lead via email and WhatsApp.",
      });
    },
    onError: (error: any) => {
      console.log("❌ Reschedule error:", error);
      console.log("Error status:", error.status);
      console.log("Error code:", error.code);

      if (error.status === 409 || error.code === "Booking conflict detected") {
        setConflictError(
          error.fullData || {
            error: "Booking conflict detected",
            message: error.message,
            conflictingBooking: error.conflictingBooking,
          }
        );

        toast({
          title: "⚠️ Schedule Conflict",
          description:
            error.message ||
            "There is already a meeting scheduled at this time. Please choose a different time slot.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to reschedule booking",
          variant: "destructive",
        });
      }
    },
  });

  // Cancel Booking mutation
  const cancelMutation = useMutation({
    mutationFn: async (data: { bookingId: string; reason?: string }) => {
      const url = getApiUrl(`/api/bookings/${data.bookingId}/cancel`);
      console.log("🔍 [CANCEL] Posting to:", url);

      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reason: data.reason,
        }),
      });

      console.log("📡 [CANCEL] Response:", response.status);

      if (!response.ok) throw new Error("Failed to cancel booking");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/bookings", selectedClientId],
      });
      setShowCancelModal(false);
      setShowBookingModal(false);
      toast({
        title: "Meeting Cancelled",
        description:
          "Cancellation notifications sent to lead via email and WhatsApp.",
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

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: {
      bookingId: string;
      status: string;
      notes?: string;
    }) => {
      const url = getApiUrl(`/api/bookings/${data.bookingId}/status`);
      console.log("🔍 [UPDATE STATUS] Posting to:", url);

      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: data.status,
          notes: data.notes,
        }),
      });

      console.log("📡 [UPDATE STATUS] Response:", response.status);

      if (!response.ok) throw new Error("Failed to update booking status");
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/bookings", selectedClientId],
      });

      const statusMessages: Record<string, string> = {
        completed: "Meeting marked as completed",
        "no-show": "Meeting marked as no-show",
        scheduled: "Meeting status updated",
      };

      toast({
        title: "Status Updated",
        description:
          statusMessages[variables.status] ||
          "Booking status updated successfully",
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

  // Edit booking mutation
  const editBookingMutation = useMutation({
    mutationFn: async (data: {
      bookingId: string;
      duration: number;
      location: string;
      notes?: string;
      meetingType: string;
    }) => {
      const url = getApiUrl(`/api/bookings/${data.bookingId}/edit`);
      console.log("🔍 [EDIT BOOKING] Posting to:", url);

      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          duration: data.duration,
          location: data.location,
          notes: data.notes,
          meetingType: data.meetingType,
        }),
      });

      console.log("📡 [EDIT BOOKING] Response:", response.status);

      const responseData = await response.json();

      if (!response.ok) {
        const error: any = new Error(
          responseData.message || "Failed to update booking"
        );
        error.status = response.status;
        error.code = responseData.error;
        error.conflictingBooking = responseData.conflictingBooking;
        error.fullData = responseData;
        throw error;
      }

      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/bookings", selectedClientId],
      });
      setShowEditModal(false);
      setShowBookingModal(false);
      setConflictError(null);
      toast({
        title: "Meeting Updated!",
        description: "Booking details have been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.log("❌ Edit booking error:", error);

      if (error.status === 409 || error.code === "Booking conflict detected") {
        setConflictError(
          error.fullData || {
            error: "Booking conflict detected",
            message: error.message,
            conflictingBooking: error.conflictingBooking,
          }
        );

        toast({
          title: "⚠️ Schedule Conflict",
          description:
            error.message ||
            "The new duration conflicts with another meeting. Please choose a different duration.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update booking",
          variant: "destructive",
        });
      }
    },
  });

  // Export bookings handler
  const handleExportBookings = async () => {
    try {
      if (!selectedClientId) {
        toast({
          title: "Error",
          description: "No client selected",
          variant: "destructive",
        });
        return;
      }

      const apiUrl = getApiUrl(`/api/bookings/${selectedClientId}/export`);
      console.log("🔍 [EXPORT] Fetching from:", apiUrl);

      const response = await fetch(apiUrl, {
        credentials: "include",
      });

      console.log("📡 [EXPORT] Response:", response.status);

      if (!response.ok) {
        throw new Error("Failed to export bookings");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-export-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "Your bookings have been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export bookings. Please try again.",
        variant: "destructive",
      });
    }
  };

  // WebSocket for real-time updates
  const { data: wsData } = useWebSocket();

  useEffect(() => {
    if (!wsData || !selectedClientId) return;

    if (
      wsData.type === "new_conversation" ||
      wsData.type === "booking_created" ||
      wsData.type === "booking_updated"
    ) {
      queryClient.invalidateQueries({
        queryKey: ["/api/bookings", selectedClientId],
      });
    }
  }, [wsData, selectedClientId]);

  // Calculate stats
  const now = new Date();
  const upcomingBookings = bookings.filter(
    (b: any) => new Date(b.scheduledFor) > now && b.status === "scheduled"
  );
  const todayBookings = bookings.filter((b: any) => {
    const bookingDate = new Date(b.scheduledFor);
    return (
      bookingDate.getDate() === now.getDate() &&
      bookingDate.getMonth() === now.getMonth() &&
      bookingDate.getFullYear() === now.getFullYear()
    );
  });
  const completedBookings = bookings.filter(
    (b: any) => b.status === "completed"
  );
  const totalBookings = bookings.length;
  const showRate =
    totalBookings > 0
      ? Math.round((completedBookings.length / totalBookings) * 100)
      : 0;

  // Calculate trends (vs last 30 days)
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const prevPeriodBookings = bookings.filter((b: any) => {
    const bookingDate = new Date(b.scheduledFor);
    return bookingDate >= sixtyDaysAgo && bookingDate < thirtyDaysAgo;
  });

  const prevTotalBookings = prevPeriodBookings.length;
  const prevTodayCount = prevPeriodBookings.filter((b: any) => {
    const bookingDate = new Date(b.scheduledFor);
    const compareDate = new Date(thirtyDaysAgo);
    return bookingDate.getDate() === compareDate.getDate();
  }).length;
  const prevUpcomingCount = prevPeriodBookings.filter(
    (b: any) => b.status === "scheduled"
  ).length;
  const prevCompletedCount = prevPeriodBookings.filter(
    (b: any) => b.status === "completed"
  ).length;

  // Calculate percentage changes
  const totalBookingsTrend =
    prevTotalBookings > 0
      ? (
          ((totalBookings - prevTotalBookings) / prevTotalBookings) *
          100
        ).toFixed(1)
      : "0.0";
  const todayTrend =
    prevTodayCount > 0
      ? (
          ((todayBookings.length - prevTodayCount) / prevTodayCount) *
          100
        ).toFixed(1)
      : "0.0";
  const upcomingTrend =
    prevUpcomingCount > 0
      ? (
          ((upcomingBookings.length - prevUpcomingCount) / prevUpcomingCount) *
          100
        ).toFixed(1)
      : "0.0";
  const showRateTrend =
    prevCompletedCount > 0 && prevTotalBookings > 0
      ? (
          showRate - Math.round((prevCompletedCount / prevTotalBookings) * 100)
        ).toFixed(1)
      : "0.0";

  // Filter bookings based on search and filters
  const filteredBookings = upcomingBookings.filter((booking: any) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      booking.title?.toLowerCase().includes(searchLower) ||
      booking.attendeeName?.toLowerCase().includes(searchLower) ||
      booking.location?.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus =
      statusFilter === "all-status" || booking.status === statusFilter;

    // Type filter
    const matchesType =
      typeFilter === "all-types" || booking.meetingType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Calendar generation
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Previous month's days
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month's days to fill the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    return bookings.filter((b: any) => {
      const bookingDate = new Date(b.scheduledFor);
      return (
        bookingDate.getDate() === date.getDate() &&
        bookingDate.getMonth() === date.getMonth() &&
        bookingDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Handle event click
  const handleEventClick = (booking: any) => {
    setSelectedBooking(booking);
    setShowBookingModal(true);
  };

  // Handle reschedule
  const handleReschedule = () => {
    if (!rescheduleDate || !selectedBooking) {
      toast({
        title: "Error",
        description: "Please select a new date and time",
        variant: "destructive",
      });
      return;
    }

    const [hours, minutes] = rescheduleTime.split(":");
    const scheduledFor = new Date(rescheduleDate);
    scheduledFor.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    rescheduleMutation.mutate({
      bookingId: selectedBooking.id,
      scheduledFor: scheduledFor.toISOString(),
      duration: parseInt(rescheduleDuration),
      notes: rescheduleNotes || undefined,
    });
  };

  // Open reschedule modal
  const openRescheduleModal = () => {
    if (selectedBooking) {
      const currentDate = new Date(selectedBooking.scheduledFor);
      setRescheduleDate(currentDate);
      setRescheduleTime(
        currentDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
      setRescheduleDuration(selectedBooking.duration.toString());
      setRescheduleNotes(selectedBooking.notes || "");
      setShowRescheduleModal(true);
    }
  };

  const openCancelModal = () => {
    setCancelReason("");
    setShowCancelModal(true);
  };

  // Handle cancel
  const handleCancel = () => {
    if (!selectedBooking) return;

    cancelMutation.mutate({
      bookingId: selectedBooking.id,
      reason: cancelReason || undefined,
    });
  };

  // Handle status update
  const handleStatusUpdate = (status: string) => {
    if (!selectedBooking) return;

    updateStatusMutation.mutate({
      bookingId: selectedBooking.id,
      status,
    });
  };

  // Open edit modal
  const openEditModal = () => {
    if (!selectedBooking) return;

    setEditDuration(selectedBooking.duration.toString());
    setEditLocation(selectedBooking.location || "");
    setEditNotes(selectedBooking.notes || "");
    setEditMeetingType(selectedBooking.meetingType || "consultation");
    setConflictError(null);
    setShowEditModal(true);
  };

  // Handle edit submission
  const handleEditBooking = () => {
    if (!selectedBooking) return;

    editBookingMutation.mutate({
      bookingId: selectedBooking.id,
      duration: parseInt(editDuration),
      location: editLocation,
      notes: editNotes,
      meetingType: editMeetingType,
    });
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-500",
      completed: "bg-green-500",
      cancelled: "bg-red-500",
      "no-show": "bg-yellow-500",
    };
    return colors[status] || "bg-blue-500";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string; icon: any }> = {
      scheduled: { bg: "bg-blue-50", text: "text-blue-700", icon: Clock },
      completed: {
        bg: "bg-green-50",
        text: "text-green-700",
        icon: CheckCircle,
      },
      cancelled: { bg: "bg-red-50", text: "text-red-700", icon: XCircle },
      "no-show": {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        icon: AlertCircle,
      },
    };

    const variant = variants[status] || variants.scheduled;
    const Icon = variant.icon;

    return (
      <Badge
        variant="outline"
        className={`${variant.bg} ${variant.text} border-0`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
      </Badge>
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Replace loading spinner:
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs Skeleton */}
          <Skeleton className="h-10 w-full mb-4" />

          {/* Calendar Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[600px] w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const calendarDays = getDaysInMonth(currentDate);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Calendar & Bookings
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Manage your appointments and meetings
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleExportBookings}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Schedule
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-4">
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
              <BreadcrumbPage>Calendar & Bookings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* KPI Cards - UPDATED */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Bookings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Bookings
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBookings}</div>
              <p className="text-xs text-muted-foreground mb-3">
                All scheduled meetings
              </p>
              <Badge
                variant="secondary"
                className="bg-slate-900 text-white hover:bg-slate-900 text-xs font-medium"
              >
                {parseFloat(totalBookingsTrend) >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {parseFloat(totalBookingsTrend) >= 0 ? "+" : ""}
                {totalBookingsTrend}% vs last period
              </Badge>
            </CardContent>
          </Card>

          {/* Today's Meetings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Meetings
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayBookings.length}</div>
              <p className="text-xs text-muted-foreground mb-3">
                Scheduled for today
              </p>
              <Badge
                variant="secondary"
                className="bg-slate-900 text-white hover:bg-slate-900 text-xs font-medium"
              >
                {parseFloat(todayTrend) >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {parseFloat(todayTrend) >= 0 ? "+" : ""}
                {todayTrend}% vs last period
              </Badge>
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {upcomingBookings.length}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Future appointments
              </p>
              <Badge
                variant="secondary"
                className="bg-slate-900 text-white hover:bg-slate-900 text-xs font-medium"
              >
                {parseFloat(upcomingTrend) >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {parseFloat(upcomingTrend) >= 0 ? "+" : ""}
                {upcomingTrend}% vs last period
              </Badge>
            </CardContent>
          </Card>

          {/* Completion Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completion Rate
              </CardTitle>
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{showRate}%</div>
              <p className="text-xs text-muted-foreground mb-3">
                Successfully completed
              </p>
              <Badge
                variant="secondary"
                className="bg-slate-900 text-white hover:bg-slate-900 text-xs font-medium"
              >
                {parseFloat(showRateTrend) >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {parseFloat(showRateTrend) >= 0 ? "+" : ""}
                {showRateTrend}% vs last period
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Tabs - UPDATED */}
        <Tabs defaultValue="calendar" className="space-y-6">
          {/* Tab Navigation with Underline Style */}
          <div className="border-b border-slate-200">
            <TabsList className="bg-transparent h-auto p-0 border-0">
              <TabsTrigger
                value="calendar"
                className="relative bg-transparent border-0 shadow-none px-4 pb-3 pt-0 text-slate-600 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-none transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-slate-900 after:transition-all rounded-none"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                <span>Calendar</span>
              </TabsTrigger>
              <TabsTrigger
                value="bookings"
                className="relative bg-transparent border-0 shadow-none px-4 pb-3 pt-0 text-slate-600 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-none transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-slate-900 after:transition-all rounded-none"
              >
                <Users className="w-4 h-4 mr-2" />
                <span>Bookings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader className="border-b py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Calendar View</CardTitle>
                  <div className="flex items-center gap-3">
                    {/* Navigation Arrows */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={previousMonth}
                      className="h-8 w-8"
                      title="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Clickable Date with Popover */}
                    <Popover
                      open={showDatePicker}
                      onOpenChange={setShowDatePicker}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="text-lg font-semibold hover:bg-slate-100 px-4"
                        >
                          {monthNames[currentDate.getMonth()]}{" "}
                          {currentDate.getFullYear()}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4" align="center">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-slate-600">
                              Month
                            </Label>
                            <Select
                              value={currentDate.getMonth().toString()}
                              onValueChange={(value) => {
                                const newDate = new Date(currentDate);
                                newDate.setMonth(parseInt(value));
                                setCurrentDate(newDate);
                              }}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {monthNames.map((month, index) => (
                                  <SelectItem
                                    key={index}
                                    value={index.toString()}
                                  >
                                    {month}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-slate-600">
                              Year
                            </Label>
                            <Select
                              value={currentDate.getFullYear().toString()}
                              onValueChange={(value) => {
                                const newDate = new Date(currentDate);
                                newDate.setFullYear(parseInt(value));
                                setCurrentDate(newDate);
                              }}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 10 }, (_, i) => {
                                  const year = new Date().getFullYear() - 2 + i;
                                  return (
                                    <SelectItem
                                      key={year}
                                      value={year.toString()}
                                    >
                                      {year}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setCurrentDate(new Date());
                              setShowDatePicker(false);
                            }}
                          >
                            Jump to Today
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextMonth}
                      className="h-8 w-8"
                      title="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    {/* Separator */}
                    <div className="border-l border-slate-200 h-6 mx-1"></div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(new Date())}
                      className="h-8"
                      title="Jump to current month"
                    >
                      Today
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Calendar Grid */}
                <div className="w-full">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 border-b bg-slate-50">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center text-sm font-semibold text-slate-600 py-2 border-r last:border-r-0"
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7">
                    {calendarDays.map((day, index) => {
                      const dayBookings = getBookingsForDate(day.date);
                      const isTodayDate = isToday(day.date);

                      return (
                        <div
                          key={index}
                          className={`h-[98px] border-r border-b last:border-r-0 p-1.5 overflow-hidden ${
                            !day.isCurrentMonth ? "bg-slate-50" : "bg-white"
                          }`}
                        >
                          <div
                            className={`text-sm font-medium mb-1 ${
                              isTodayDate
                                ? "w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[12px]"
                                : day.isCurrentMonth
                                ? "text-slate-900"
                                : "text-slate-400"
                            }`}
                          >
                            {day.date.getDate()}
                          </div>

                          {/* Events for this day */}
                          <div className="space-y-0.5">
                            {dayBookings.slice(0, 2).map((booking: any) => (
                              <div
                                key={booking.id}
                                onClick={() => handleEventClick(booking)}
                                className={`text-[12px] leading-tight px-1 py-0.5 rounded ${getStatusColor(
                                  booking.status
                                )} text-white truncate cursor-pointer hover:opacity-80 hover:scale-105 transition-all`}
                                title="Click to view details"
                              >
                                {new Date(
                                  booking.scheduledFor
                                ).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}{" "}
                                {booking.attendeeName}
                              </div>
                            ))}
                            {dayBookings.length > 2 && (
                              <div
                                className="text-[9px] text-slate-500 px-1 cursor-pointer hover:text-slate-700"
                                onClick={() => handleEventClick(dayBookings[2])}
                                title="Click to view more"
                              >
                                +{dayBookings.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="px-4 py-2 border-t bg-slate-50">
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-slate-600">Scheduled</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-slate-600">Completed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-slate-600">Cancelled</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className="text-slate-600">No-show</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab - UPDATED */}
          <TabsContent value="bookings">
            {/* Search and Filters */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by client name or title..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-status">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no-show">No-show</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-types">All Types</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="site-visit">Site Visit</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bookings Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">All Bookings</h3>
              <span className="text-sm text-slate-500">
                {filteredBookings.length} of {upcomingBookings.length} bookings
              </span>
            </div>

            {/* Bookings List */}
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                {upcomingBookings.length === 0 ? (
                  <>
                    <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-base font-medium text-slate-900 mb-1">
                      No upcoming bookings
                    </h3>
                    <p className="text-slate-600 text-sm">
                      Schedule meetings from the Conversations page
                    </p>
                  </>
                ) : (
                  <>
                    <Search className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-base font-medium text-slate-900 mb-1">
                      No bookings match your filters
                    </h3>
                    <p className="text-slate-600 text-sm mb-4">
                      Try adjusting your search or filter criteria
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all-status");
                        setTypeFilter("all-types");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking: any) => (
                  <div
                    key={booking.id}
                    className="group relative flex items-start gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => handleEventClick(booking)}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-sm">
                        {booking.attendeeName
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase() || "?"}
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 rounded-r-full bg-green-500" />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 text-base mb-1">
                            {booking.title}
                          </h4>
                          <p className="text-sm text-slate-600">
                            {booking.attendeeName}
                          </p>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600 p-1">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Details Row */}
                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                          <span>
                            {new Date(booking.scheduledFor).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>
                            {new Date(booking.scheduledFor).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              }
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{booking.duration} min</span>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-3">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{booking.location || "TBD"}</span>
                      </div>

                      {/* Badges & Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
                            {booking.status === "scheduled"
                              ? "Confirmed"
                              : booking.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-slate-50 text-slate-700 capitalize"
                          >
                            {booking.meetingType?.replace("-", " ") ||
                              "Consultation"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `mailto:${booking.attendeeEmail}`;
                            }}
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Email
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:${booking.attendeePhone}`;
                            }}
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                          </Button> */}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Booking Details Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Meeting Details</DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  {selectedBooking.title}
                </h3>
                {getStatusBadge(selectedBooking.status)}
              </div>

              {/* Date & Time */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex items-center text-sm">
                  <CalendarIcon className="w-4 h-4 mr-2 text-slate-600" />
                  <span className="font-medium">
                    {new Date(selectedBooking.scheduledFor).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 mr-2 text-slate-600" />
                  <span>
                    {new Date(selectedBooking.scheduledFor).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}{" "}
                    ({selectedBooking.duration} minutes)
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <MapPin className="w-4 h-4 mr-2 text-slate-600" />
                  <span>{selectedBooking.location || "TBD"}</span>
                </div>
              </div>

              {/* Attendee Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-slate-700">
                  Attendee Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <User className="w-4 h-4 mr-2 text-slate-600" />
                    <span>{selectedBooking.attendeeName}</span>
                  </div>
                  {selectedBooking.attendeeEmail && (
                    <div className="flex items-center text-sm">
                      <Mail className="w-4 h-4 mr-2 text-slate-600" />
                      <a
                        href={`mailto:${selectedBooking.attendeeEmail}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedBooking.attendeeEmail}
                      </a>
                    </div>
                  )}
                  {selectedBooking.attendeePhone && (
                    <div className="flex items-center text-sm">
                      <Phone className="w-4 h-4 mr-2 text-slate-600" />
                      <a
                        href={`tel:${selectedBooking.attendeePhone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedBooking.attendeePhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Notes
                  </h4>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-900">
                      {selectedBooking.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-4">
                {/* Primary Actions for Scheduled Meetings */}
                {selectedBooking.status === "scheduled" && (
                  <>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={openEditModal}
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={openRescheduleModal}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 hover:bg-red-50"
                        onClick={openCancelModal}
                      >
                        Cancel Meeting
                      </Button>
                    </div>

                    {/* Status Update Buttons */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="default"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleStatusUpdate("completed")}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Completed
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-yellow-600 hover:bg-yellow-50"
                        onClick={() => handleStatusUpdate("no-show")}
                        disabled={updateStatusMutation.isPending}
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Mark No-Show
                      </Button>
                    </div>
                  </>
                )}

                {/* Read-only status for Cancelled Meetings */}
                {selectedBooking.status === "cancelled" && (
                  <>
                    <div className="flex-1 text-center py-3 text-sm text-slate-600 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle className="w-4 h-4 inline mr-2 text-red-500" />
                      This meeting was cancelled
                    </div>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => {
                        setLocation(
                          `/conversations?leadId=${selectedBooking.leadId}`
                        );
                      }}
                    >
                      Book New Meeting
                    </Button>
                  </>
                )}

                {/* Read-only status for Completed Meetings */}
                {selectedBooking.status === "completed" && (
                  <>
                    <div className="flex-1 text-center py-3 text-sm text-slate-600 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-4 h-4 inline mr-2 text-green-500" />
                      This meeting was completed
                    </div>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => {
                        setLocation(
                          `/conversations?leadId=${selectedBooking.leadId}`
                        );
                      }}
                    >
                      Book New Meeting
                    </Button>
                  </>
                )}

                {/* Actions for No-Show Meetings */}
                {selectedBooking.status === "no-show" && (
                  <>
                    <div className="flex-1 text-center py-3 text-sm text-slate-600 bg-yellow-50 border border-yellow-200 rounded-lg mb-2">
                      <AlertCircle className="w-4 h-4 inline mr-2 text-yellow-500" />
                      This meeting was marked as no-show
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={openRescheduleModal}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="default"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleStatusUpdate("completed")}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Completed
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Meeting</DialogTitle>
          </DialogHeader>

          {/* CONFLICT WARNING HERE */}
          {conflictError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 text-sm mb-1">
                    Time Slot Conflict
                  </h4>
                  <p className="text-sm text-red-700 mb-2">
                    {conflictError.message}
                  </p>
                  <div className="text-xs text-red-600 bg-red-100 rounded p-2">
                    <strong>Conflicting Meeting:</strong>
                    <br />
                    {conflictError.conflictingBooking?.title}
                    <br />
                    with {conflictError.conflictingBooking?.attendeeName}
                  </div>
                </div>
                <button
                  onClick={() => setConflictError(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4 py-4">
            {selectedBooking && (
              <>
                <div className="text-sm text-slate-600 mb-4">
                  Current:{" "}
                  {new Date(selectedBooking.scheduledFor).toLocaleDateString()}{" "}
                  at{" "}
                  {new Date(selectedBooking.scheduledFor).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </div>

                {/* New Date */}
                <div className="space-y-2">
                  <Label>New Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {rescheduleDate ? (
                          format(rescheduleDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={rescheduleDate}
                        onSelect={setRescheduleDate}
                        disabled={(date: Date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* New Time */}
                <div className="space-y-2">
                  <Label>New Time</Label>
                  <Input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={rescheduleDuration}
                    onChange={(e) => setRescheduleDuration(e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={rescheduleNotes}
                    onChange={(e) => setRescheduleNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowRescheduleModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!rescheduleDate || rescheduleMutation.isPending}
              className="flex-1"
            >
              {rescheduleMutation.isPending
                ? "Rescheduling..."
                : "Confirm Reschedule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Details Modal */}
      <Dialog
        open={showEditModal}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) setConflictError(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Meeting Details</DialogTitle>
            <DialogDescription>
              Update the details for your meeting with{" "}
              {selectedBooking?.attendeeName}
            </DialogDescription>
          </DialogHeader>

          {/* Conflict Warning */}
          {conflictError && (
            <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-red-900 mb-1">
                    Duration Conflict
                  </h3>
                  <p className="text-sm text-red-700 mb-2">
                    {conflictError.message}
                  </p>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-800 font-medium hover:text-red-900">
                      View conflicting meeting
                    </summary>
                    <div className="mt-2 p-2 bg-white rounded border border-red-200">
                      <p className="font-semibold text-red-900">
                        {conflictError.conflictingBooking?.title}
                      </p>
                      <p className="text-red-700 mt-1">
                        {conflictError.conflictingBooking?.attendeeName}
                      </p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* Current Time Slot Info */}
          {selectedBooking && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                📅 Scheduled Time
              </p>
              <p className="text-sm text-blue-800">
                {new Date(selectedBooking.scheduledFor).toLocaleString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                To change the date or time, use the Reschedule button
              </p>
            </div>
          )}

          <div className="space-y-4 py-4">
            {/* Meeting Type */}
            <div className="space-y-2">
              <Label htmlFor="edit-meeting-type">Meeting Type</Label>
              <Select
                value={editMeetingType}
                onValueChange={setEditMeetingType}
              >
                <SelectTrigger id="edit-meeting-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="site-visit">Site Visit</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="edit-duration">Duration (minutes)</Label>
              <Select
                value={editDuration}
                onValueChange={(val) => {
                  setEditDuration(val);
                  setConflictError(null);
                }}
              >
                <SelectTrigger id="edit-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                </SelectContent>
              </Select>

              {/* Show new end time */}
              {selectedBooking && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  New end time:{" "}
                  <strong className="text-slate-900">
                    {(() => {
                      const start = new Date(selectedBooking.scheduledFor);
                      const end = new Date(
                        start.getTime() + parseInt(editDuration) * 60000
                      );
                      return end.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    })()}
                  </strong>
                </p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="Office, Site, Virtual, etc."
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setConflictError(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleEditBooking}
              disabled={editBookingMutation.isPending}
              className="flex-1"
            >
              {editBookingMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Cancel Meeting
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedBooking && (
              <>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-sm text-red-900 mb-2">
                    You are about to cancel:
                  </h4>
                  <p className="text-sm text-red-800">
                    <strong>{selectedBooking.title}</strong>
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {new Date(selectedBooking.scheduledFor).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      }
                    )}{" "}
                    at{" "}
                    {new Date(selectedBooking.scheduledFor).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    The lead will be notified via email and WhatsApp.
                  </p>
                </div>

                {/* Cancellation Reason */}
                <div className="space-y-2">
                  <Label>Reason for Cancellation (Optional)</Label>
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="E.g., Schedule conflict, Lead requested cancellation..."
                    rows={3}
                  />
                  <p className="text-xs text-slate-500">
                    This reason will be shared with the lead.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              className="flex-1"
            >
              Keep Meeting
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="flex-1"
            >
              {cancelMutation.isPending
                ? "Cancelling..."
                : "Confirm Cancellation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
