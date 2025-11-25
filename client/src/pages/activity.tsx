// client/src/pages/activity.tsx

import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import {
  Calendar as CalendarIcon,
  Loader2,
  List,
  LogIn,
  Lock,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Helper for displaying icons (same as in settings.tsx)
const getActivityIcon = (action: string) => {
  switch (action) {
    case "login":
      return <LogIn className="w-4 h-4 text-slate-500" />;
    case "password_changed":
      return <Lock className="w-4 h-4 text-slate-500" />;
    case "2fa_enabled":
    case "2fa_disabled":
      return <ShieldCheck className="w-4 h-4 text-slate-500" />;
    default:
      return <List className="w-4 h-4 text-slate-500" />;
  }
};

const formatActionText = (action: string) => {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function ActivityLog() {
  usePageTitle("Activity Log");
  const [, setLocation] = useLocation();

  // State for filters
  const [activityType, setActivityType] = useState("all");
  const [date, setDate] = useState<DateRange | undefined>(undefined);

  // ✅ NEW: Create a clean filters object
  const filters = {
    type: activityType === 'all' ? undefined : activityType,
    startDate: date?.from ? format(date.from, "yyyy-MM-dd") : undefined,
    endDate: date?.to ? format(date.to, "yyyy-MM-dd") : undefined,
  };

  // Dynamic query that refetches when filters change
  const {
    data: activityData,
    isLoading: isActivityLoading,
  } = useQuery<{ activities: any[] }>({
  
    // Our new getQueryFn knows how to handle this.
    queryKey: ["/api/user/activity", filters],
    
    // No `queryFn` is needed because it will use the (now fixed) default.
    placeholderData: keepPreviousData,
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Header - Fixed at top */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-slate-900">Account Activity</h2>
      </header>

      {/* Main Content - No scrolling, uses flexbox layout */}
      <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
        {/* Breadcrumb - Always visible */}
        <Breadcrumb className="flex-shrink-0">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => setLocation("/settings")}
                className="cursor-pointer"
              >
                Settings
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => setLocation("/settings?tab=security")}
                className="cursor-pointer"
              >
                Security
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Activity Log</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Filter Card - Always visible */}
        <Card className="border-2 flex-shrink-0">
          <CardHeader>
            <CardTitle>Filter Activities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="grid gap-2 flex-1">
              <Label htmlFor="activity-type">Activity Type</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger id="activity-type">
                  <SelectValue placeholder="Filter by type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="password_changed">
                    Password Change
                  </SelectItem>
                  <SelectItem value="2fa_enabled">2FA Enabled</SelectItem>
                  <SelectItem value="2fa_disabled">2FA Disabled</SelectItem>
                  <SelectItem value="profile_updated">
                    Profile Updated
                  </SelectItem>
                  <SelectItem value="preferences_updated">
                    Preferences Updated
                  </SelectItem>
                  <SelectItem value="trial_activated">
                    Trial Activated
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 flex-1">
              <Label htmlFor="date-range">Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-range"
                    variant={"outline"}
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} -{" "}
                          {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Results Card - Scrollable content */}
        <Card className="border-2 flex-1 flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0">
            <CardTitle>Activity History</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-[250px]">Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isActivityLoading && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">
                        <Loader2 className="mx-auto w-6 h-6 animate-spin text-slate-400" />
                      </TableCell>
                    </TableRow>
                  )}
                  {!isActivityLoading &&
                    activityData?.activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium flex items-center gap-3">
                          {getActivityIcon(activity.action)}
                          {formatActionText(activity.action)}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {activity.ipAddress || "No IP recorded"}
                        </TableCell>
                        <TableCell className="text-right text-slate-500 text-sm">
                          {new Date(activity.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  {!isActivityLoading &&
                    activityData?.activities.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center h-24 text-slate-500"
                        >
                          No activities found for the selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}