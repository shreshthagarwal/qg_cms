"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Tooltip,
  IconButton,
  Button,
  Alert,
  Paper,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Cancel,
  AccessTime,
  Warning,
  Today,
  CalendarMonth,
  Assessment,
} from "@mui/icons-material";
import { ThemeProvider } from "../../../components/theme";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, subMonths, addMonths, getDay, isSameMonth, isBefore, startOfDay } from "date-fns";

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "LATE";

interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
}

const statusConfig: Record<AttendanceStatus, { 
  label: string; 
  color: "success" | "error" | "warning" | "info"; 
  bgColor: string;
  textColor: string;
  icon: any;
  description: string;
}> = {
  PRESENT: { 
    label: "Present", 
    color: "success", 
    bgColor: "#dcfce7", 
    textColor: "#166534",
    icon: CheckCircle,
    description: "You were present"
  },
  ABSENT: { 
    label: "Absent", 
    color: "error", 
    bgColor: "#fee2e2", 
    textColor: "#991b1b",
    icon: Cancel,
    description: "You were absent"
  },
  HALF_DAY: { 
    label: "Half Day", 
    color: "warning", 
    bgColor: "#fef3c7", 
    textColor: "#92400e",
    icon: AccessTime,
    description: "Half day attendance"
  },
  LATE: { 
    label: "Late", 
    color: "info", 
    bgColor: "#dbeafe", 
    textColor: "#1e40af",
    icon: Warning,
    description: "Late arrival (counts as present)"
  },
};

export default function StudentAttendancePage() {
  const { data: session } = useSession();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joinDate, setJoinDate] = useState<Date | null>(null);
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    lateDays: 0,
    attendanceRate: 0,
  });

  useEffect(() => {
    // Use created_at from session user as join date
    const userCreatedAt = (session?.user as any)?.created_at;
    if (userCreatedAt) {
      setJoinDate(new Date(userCreatedAt));
      // If current month is before join date, jump to join date month
      const joinMonth = new Date(userCreatedAt);
      if (currentMonth < joinMonth) {
        setCurrentMonth(joinMonth);
      }
    }
    fetchAttendance();
  }, [currentMonth, session]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const token = (session?.user as any)?.accessToken;
      const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/attendance/student?start=${monthStart}&end=${monthEnd}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Failed to fetch attendance");
      
      const data = await res.json();
      setAttendance(data);
      calculateStats(data);
    } catch (err) {
      setError("Error loading attendance records");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: AttendanceRecord[]) => {
    const totalDays = data.length;
    const presentDays = data.filter(a => a.status === "PRESENT").length;
    const absentDays = data.filter(a => a.status === "ABSENT").length;
    const halfDays = data.filter(a => a.status === "HALF_DAY").length;
    const lateDays = data.filter(a => a.status === "LATE").length;
    
    // Present + Late count as full present, Half Day counts as 0.5
    const effectivePresent = presentDays + lateDays + (halfDays * 0.5);
    const attendanceRate = totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 0;

    setStats({
      totalDays,
      presentDays,
      absentDays,
      halfDays,
      lateDays,
      attendanceRate,
    });
  };

  // Check if date is before join date
  const isBeforeJoinDate = (date: Date): boolean => {
    if (!joinDate) return false;
    return isBefore(startOfDay(date), startOfDay(joinDate));
  };

  const getAttendanceForDate = (date: Date): AttendanceRecord | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return attendance.find(a => a.date.startsWith(dateStr));
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const StatCard = ({ title, value, subtitle, icon: Icon, color, bgColor }: any) => (
    <Card sx={{ height: "100%", borderRadius: 3, boxShadow: 2, bgcolor: bgColor || "white" }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: `${color}.main`, color: "white", width: 48, height: 48 }}>
            <Icon />
          </Avatar>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <ThemeProvider>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Typography variant="h6" color="text.secondary">Loading attendance...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="#1f2937">
              My Attendance
            </Typography>
            <Typography variant="body1" color="text.secondary">
              View your attendance records and calendar
            </Typography>
          </Box>
          <Box display="flex" gap={2} alignItems="center">
            <IconButton 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              sx={{ borderRadius: 2, bgcolor: "grey.100" }}
            >
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" fontWeight={600} minWidth={140} textAlign="center">
              {format(currentMonth, "MMMM yyyy")}
            </Typography>
            <IconButton 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              sx={{ borderRadius: 2, bgcolor: "grey.100" }}
              disabled={isSameMonth(currentMonth, new Date())}
            >
              <ChevronRight />
            </IconButton>
            <Button 
              variant="outlined" 
              size="small"
              startIcon={<Today />}
              onClick={() => setCurrentMonth(new Date())}
              sx={{ borderRadius: 2, ml: 2 }}
            >
              Today
            </Button>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* Join Date Alert */}
        {joinDate && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Joined:</strong> {format(joinDate, "MMMM d, yyyy")} | 
              Attendance records are only available from your join date onwards.
            </Typography>
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard
              title="Total Days"
              value={stats.totalDays}
              subtitle="Recorded this month"
              icon={CalendarMonth}
              color="primary"
              bgColor="#f0f9ff"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard
              title="Present"
              value={stats.presentDays}
              subtitle="Full days present"
              icon={CheckCircle}
              color="success"
              bgColor="#f0fdf4"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard
              title="Late"
              value={stats.lateDays}
              subtitle="Late arrivals"
              icon={Warning}
              color="info"
              bgColor="#eff6ff"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard
              title="Absent"
              value={stats.absentDays}
              subtitle="Days missed"
              icon={Cancel}
              color="error"
              bgColor="#fef2f2"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard
              title="Attendance Rate"
              value={`${stats.attendanceRate}%`}
              subtitle={stats.attendanceRate >= 75 ? "Good standing" : "Needs improvement"}
              icon={Assessment}
              color={stats.attendanceRate >= 75 ? "success" : "warning"}
              bgColor={stats.attendanceRate >= 75 ? "#f0fdf4" : "#fffbeb"}
            />
          </Grid>
        </Grid>

        {/* Attendance Rate Progress */}
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight={600}>
                Monthly Attendance Overview
              </Typography>
              <Chip 
                label={`${stats.presentDays + stats.lateDays + stats.halfDays}/${stats.totalDays} Days Present`}
                color="primary"
                size="small"
              />
            </Box>
            <Box 
              sx={{ 
                width: "100%", 
                height: 12, 
                bgcolor: "grey.200", 
                borderRadius: 6,
                overflow: "hidden",
                display: "flex"
              }}
            >
              <Box sx={{ width: `${(stats.presentDays / stats.totalDays) * 100 || 0}%`, bgcolor: "#22c55e" }} />
              <Box sx={{ width: `${(stats.lateDays / stats.totalDays) * 100 || 0}%`, bgcolor: "#3b82f6" }} />
              <Box sx={{ width: `${(stats.halfDays / stats.totalDays) * 100 || 0}%`, bgcolor: "#f59e0b" }} />
              <Box sx={{ width: `${(stats.absentDays / stats.totalDays) * 100 || 0}%`, bgcolor: "#ef4444" }} />
            </Box>
            <Box display="flex" gap={3} mt={2} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#22c55e" }} />
                <Typography variant="caption">Present ({stats.presentDays})</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#3b82f6" }} />
                <Typography variant="caption">Late ({stats.lateDays})</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#f59e0b" }} />
                <Typography variant="caption">Half Day ({stats.halfDays})</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#ef4444" }} />
                <Typography variant="caption">Absent ({stats.absentDays})</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Attendance Calendar
            </Typography>

            {/* Week Days Header */}
            <Grid container spacing={0.5} mb={1} sx={{ maxWidth: 500, mx: "auto" }}>
              {weekDays.map((day) => (
                <Grid size={12 / 7} key={day}>
                  <Typography
                    align="center"
                    variant="caption"
                    fontWeight={600}
                    color="text.secondary"
                    sx={{ py: 0.5, fontSize: "0.7rem", display: "block" }}
                  >
                    {day}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            {/* Calendar Grid */}
            <Grid container spacing={0.5} sx={{ maxWidth: 500, mx: "auto" }}>
              {/* Empty cells for days before month starts */}
              {Array.from({ length: getDay(monthStart) }).map((_, index) => (
                <Grid size={12 / 7} key={`empty-${index}`}>
                  <Box sx={{ aspectRatio: "1", p: 0.25 }} />
                </Grid>
              ))}

              {/* Calendar days */}
              {daysInMonth.map((date: Date) => {
                const isTodayDate = isToday(date);
                const beforeJoin = isBeforeJoinDate(date);
                const record = getAttendanceForDate(date);
                const config = record ? statusConfig[record.status] : null;

                return (
                  <Grid size={12 / 7} key={date.toISOString()}>
                    <Tooltip
                      title={beforeJoin ? "Before your join date" : record ? config?.description : "No record"}
                      arrow
                    >
                      <Paper
                        sx={{
                          aspectRatio: "1",
                          p: 0.5,
                          cursor: beforeJoin ? "not-allowed" : "default",
                          bgcolor: beforeJoin ? "grey.100" : record ? config?.bgColor : "grey.50",
                          color: beforeJoin ? "text.disabled" : record ? config?.textColor : "text.disabled",
                          border: isTodayDate 
                            ? "2px solid #e27719" 
                            : record 
                              ? `2px solid ${config?.bgColor}` 
                              : "1px solid #e5e7eb",
                          borderRadius: 1.5,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s",
                          opacity: beforeJoin ? 0.5 : 1,
                          minHeight: "32px",
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={isTodayDate ? 700 : 600}
                          color={isTodayDate ? "primary.main" : beforeJoin ? "text.disabled" : "inherit"}
                          sx={{ fontSize: "0.75rem" }}
                        >
                          {format(date, "d")}
                        </Typography>
                        {!beforeJoin && record && config && (
                          <Box sx={{ mt: 0.25, lineHeight: 0 }}>
                            <config.icon sx={{ fontSize: 12 }} />
                          </Box>
                        )}
                      </Paper>
                    </Tooltip>
                  </Grid>
                );
              })}
            </Grid>

            {/* Legend - Only status types */}
            <Box display="flex" gap={3} mt={3} justifyContent="center" flexWrap="wrap">
              {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => {
                const config = statusConfig[status];
                return (
                  <Box key={status} display="flex" alignItems="center" gap={1}>
                    <Box 
                      sx={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: 1, 
                        bgcolor: config.bgColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }} 
                    >
                      <config.icon sx={{ fontSize: 12, color: config.textColor }} />
                    </Box>
                    <Typography variant="caption" fontWeight={500}>
                      {config.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
}
