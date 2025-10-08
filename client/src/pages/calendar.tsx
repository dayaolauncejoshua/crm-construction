import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";
import { useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  User,
  FileText,
} from "lucide-react";

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["/api/clients", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/clients?userId=${user?.id}`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  const selectedClientId = clients?.[0]?.id;

  // Fetch bookings
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["/api/bookings", selectedClientId],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/${selectedClientId}`);
      return response.json();
    },
    enabled: !!selectedClientId,
  });

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
  const completedBookings = bookings.filter((b: any) => b.status === "completed");
  const totalBookings = bookings.length;
  const showRate =
    totalBookings > 0
      ? Math.round((completedBookings.length / totalBookings) * 100)
      : 0;

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

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
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
      completed: { bg: "bg-green-50", text: "text-green-700", icon: CheckCircle },
      cancelled: { bg: "bg-red-50", text: "text-red-700", icon: XCircle },
      "no-show": { bg: "bg-yellow-50", text: "text-yellow-700", icon: AlertCircle },
    };

    const variant = variants[status] || variants.scheduled;
    const Icon = variant.icon;

    return (
      <Badge variant="outline" className={`${variant.bg} ${variant.text} border-0`}>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading calendar...</p>
        </div>
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
          <Button variant="outline" className="w-full sm:w-auto">
            Export Schedule
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBookings}</div>
              <p className="text-xs text-muted-foreground">All time bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Meetings</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayBookings.length}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                Active today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingBookings.length}</div>
              <p className="text-xs text-muted-foreground">Scheduled meetings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Show Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{showRate}%</div>
              <p className="text-xs text-muted-foreground">Completion rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader className="border-b py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Calendar View</CardTitle>
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={previousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xl font-semibold min-w-[140px] text-center">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <Button variant="ghost" size="icon" onClick={nextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Calendar Grid */}
                <div className="w-full">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 border-b bg-slate-50">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-semibold text-slate-600 py-2 border-r last:border-r-0"
                      >
                        {day}
                      </div>
                    ))}
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
                                {new Date(booking.scheduledFor).toLocaleTimeString("en-US", {
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

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Bookings</CardTitle>
                  <Badge variant="secondary">
                    {upcomingBookings.length} upcoming
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-base font-medium text-slate-900 mb-1">
                      No upcoming bookings
                    </h3>
                    <p className="text-slate-600 text-sm">
                      Schedule meetings from the Conversations page
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.map((booking: any) => (
                      <Card
                        key={booking.id}
                        className="border border-slate-200 hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => handleEventClick(booking)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 text-sm mb-1">
                                {booking.title}
                              </h4>
                              <p className="text-xs text-slate-600">{booking.attendeeName}</p>
                            </div>
                            {getStatusBadge(booking.status)}
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                            <div className="flex items-center">
                              <CalendarIcon className="w-3 h-3 mr-1" />
                              {new Date(booking.scheduledFor).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(booking.scheduledFor).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {booking.location}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                <h3 className="font-semibold text-lg">{selectedBooking.title}</h3>
                {getStatusBadge(selectedBooking.status)}
              </div>

              {/* Date & Time */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex items-center text-sm">
                  <CalendarIcon className="w-4 h-4 mr-2 text-slate-600" />
                  <span className="font-medium">
                    {new Date(selectedBooking.scheduledFor).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 mr-2 text-slate-600" />
                  <span>
                    {new Date(selectedBooking.scheduledFor).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
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
                <h4 className="font-semibold text-sm text-slate-700">Attendee Information</h4>
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
                    <p className="text-sm text-amber-900">{selectedBooking.notes}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  Reschedule
                </Button>
                <Button variant="outline" className="flex-1 text-red-600 hover:bg-red-50">
                  Cancel Meeting
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}