"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  AlertTitle,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Cancel,
  CalendarMonth,
  People,
  Percent,
  Download,
  AccessTime,
  Warning,
  Today,
} from "@mui/icons-material";
import { ThemeProvider } from "../../../components/theme";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, subMonths, addMonths, getDay, isValid, isBefore, startOfDay } from "date-fns";

// Types
type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "LATE";

interface Student {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  profile_image?: string;
  created_at?: string;
}

interface AttendanceRecord {
  id?: string;
  studentid: string;
  date: string;
  status: AttendanceStatus;
}

interface DailyStats {
  present: number;
  absent: number;
  halfDay: number;
  late: number;
  totalMarked: number;
}

const statusConfig: Record<AttendanceStatus, { label: string; color: "success" | "error" | "warning" | "info"; bgColor: string; icon: any }> = {
  PRESENT: { label: "Present", color: "success", bgColor: "#22c55e", icon: CheckCircle },
  ABSENT: { label: "Absent", color: "error", bgColor: "#ef4444", icon: Cancel },
  HALF_DAY: { label: "Half Day", color: "warning", bgColor: "#f59e0b", icon: AccessTime },
  LATE: { label: "Late", color: "info", bgColor: "#3b82f6", icon: Warning },
};

export default function AdminAttendancePage() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalHalfDay: 0,
    totalLate: 0,
    averageRate: 0,
  });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exportEndDate, setExportEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = (session?.user as any)?.accessToken;

      const studentsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const studentsData = studentsRes.ok ? await studentsRes.json() : [];
      setStudents(studentsData);

      const monthStr = format(currentDate, "yyyy-MM");
      const attendanceRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/attendance?month=${monthStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];
      setAttendance(attendanceData);

      calculateMonthlyStats(attendanceData, studentsData.length);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyStats = (attendanceData: AttendanceRecord[], totalStudents: number) => {
    const present = attendanceData.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const late = attendanceData.filter((a) => a.status === "LATE").length;
    const absent = attendanceData.filter((a) => a.status === "ABSENT").length;
    const halfDay = attendanceData.filter((a) => a.status === "HALF_DAY").length;

    const totalDays = attendanceData.length;
    const averageRate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

    setMonthlyStats({
      totalPresent: present,
      totalAbsent: absent,
      totalHalfDay: halfDay,
      totalLate: late,
      averageRate,
    });
  };

  const getDailyStats = (date: Date): DailyStats => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayAttendance = attendance.filter((a) => a.date.startsWith(dateStr));
    
    return {
      present: dayAttendance.filter((a) => a.status === "PRESENT").length,
      absent: dayAttendance.filter((a) => a.status === "ABSENT").length,
      halfDay: dayAttendance.filter((a) => a.status === "HALF_DAY").length,
      late: dayAttendance.filter((a) => a.status === "LATE").length,
      totalMarked: dayAttendance.length,
    };
  };

  const getStudentAttendanceForDate = (studentId: string, date: Date): AttendanceRecord | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return attendance.find((a) => a.studentid === studentId && a.date.startsWith(dateStr));
  };

  // Check if student joined before or on the selected date
  const isStudentJoinedBeforeDate = (student: Student, date: Date): boolean => {
    if (!student.created_at) return true; // If no created_at, show the student
    const joinDate = new Date(student.created_at);
    return !isBefore(startOfDay(date), startOfDay(joinDate));
  };

  const markAttendance = async (studentId: string, date: string, status: AttendanceStatus) => {
    try {
      const token = (session?.user as any)?.accessToken;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentId, date, status }),
      });

      if (res.ok) {
        setTimeout(() => fetchData(), 300);
      } else {
        const errorData = await res.json();
        console.error("Error marking attendance:", errorData);
      }
    } catch (err) {
      console.error("Error marking attendance:", err);
    }
  };

  const getCalendarDayColor = (stats: DailyStats): string => {
    if (stats.totalMarked === 0) return "#f8fafc";
    
    const presentRate = (stats.present + stats.late) / stats.totalMarked;
    if (presentRate >= 0.8) return "#dcfce7";
    if (presentRate >= 0.5) return "#fef3c7";
    return "#fee2e2";
  };

  const exportAttendanceToExcel = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const startDate = new Date(exportStartDate);
      const endDate = new Date(exportEndDate);
      
      if (startDate > endDate) {
        alert("Start date must be before end date");
        return;
      }
      
      // Fetch all attendance for the date range
      const startMonthStr = format(startDate, "yyyy-MM");
      const endMonthStr = format(endDate, "yyyy-MM");
      
      let allAttendanceData: AttendanceRecord[] = [];
      
      // Fetch attendance for each month in the range
      let currentMonth = new Date(startDate);
      while (currentMonth <= endDate) {
        const monthStr = format(currentMonth, "yyyy-MM");
        const attendanceRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/attendance?month=${monthStr}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (attendanceRes.ok) {
          const monthData = await attendanceRes.json();
          allAttendanceData = [...allAttendanceData, ...monthData];
        }
        
        currentMonth = addMonths(currentMonth, 1);
      }
      
      // Filter by date range
      const filteredData = allAttendanceData.filter((a: AttendanceRecord) => {
        const recordDate = new Date(a.date);
        return recordDate >= startDate && recordDate <= endDate;
      });
      
      // Generate all dates in range
      const allDates: Date[] = [];
      let currDate = new Date(startDate);
      while (currDate <= endDate) {
        allDates.push(new Date(currDate));
        currDate.setDate(currDate.getDate() + 1);
      }
      
      // Create header row: Date columns
      const headerRow = ["Student Name", ...allDates.map(d => format(d, "yyyy-MM-dd"))];
      
      // Create data rows - one per student
      const workbookData = [
        [`Attendance Report: ${format(startDate, "yyyy-MM-dd")} to ${format(endDate, "yyyy-MM-dd")}`],
        [],
        headerRow,
      ];
      
      // For each student, create a row with status for each date
      students.forEach((student) => {
        const studentJoinDate = student.created_at ? new Date(student.created_at) : null;
        const row = [`${student.firstname} ${student.lastname}`];
        
        allDates.forEach((date) => {
          // Check if student joined before this date
          if (studentJoinDate && isBefore(startOfDay(date), startOfDay(studentJoinDate))) {
            row.push("NA");
          } else {
            // Find attendance record for this student and date
            // Use multiple format attempts to match database date format
            const dateStrISO = format(date, "yyyy-MM-dd"); // 2026-03-20
            const dateStrSlash = format(date, "yyyy/MM/dd"); // 2026/03/20
            
            const record = filteredData.find((a: AttendanceRecord) => {
              if (a.studentid !== student.id) return false;
              // Try multiple date format matches
              const recordDate = a.date.substring(0, 10); // Get first 10 chars (YYYY-MM-DD)
              return recordDate === dateStrISO || recordDate === dateStrSlash || a.date.startsWith(dateStrISO);
            });
            
            // Show status or empty if no record
            row.push(record ? record.status : "");
          }
        });
        
        workbookData.push(row);
      });
      
      const csvContent = workbookData.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `attendance-report-${format(startDate, "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting attendance:", error);
    } finally {
      setExportDialogOpen(false);
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <Card sx={{ height: "100%", borderRadius: 3, boxShadow: 2 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark`, width: 48, height: 48 }}>
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
          <Typography variant="h6" color="text.secondary">Loading attendance data...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  const selectedDateStats = selectedDate ? getDailyStats(selectedDate) : null;

  return (
    <ThemeProvider>
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="#1f2937">
              Attendance Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track and manage student attendance records
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => setExportDialogOpen(true)}
              sx={{ borderRadius: 2 }}
            >
              Export Report
            </Button>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, value) => value && setViewMode(value)}
              sx={{ borderRadius: 2 }}
            >
              <ToggleButton value="calendar" sx={{ borderRadius: "8px 0 0 8px" }}>
                <CalendarMonth sx={{ mr: 1 }} />
                Calendar
              </ToggleButton>
              <ToggleButton value="list" sx={{ borderRadius: "0 8px 8px 0" }}>
                <People sx={{ mr: 1 }} />
                List
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Monthly Stats */}
        <Grid container spacing={3} mb={4}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard
              title="Total Present"
              value={monthlyStats.totalPresent}
              subtitle={`includes ${monthlyStats.totalLate} late`}
              icon={CheckCircle}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard
              title="Late Arrivals"
              value={monthlyStats.totalLate}
              subtitle="counts as present"
              icon={Warning}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard
              title="Total Absent"
              value={monthlyStats.totalAbsent}
              subtitle="across all students"
              icon={Cancel}
              color="error"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard
              title="Half Days"
              value={monthlyStats.totalHalfDay}
              subtitle="counts as 0.5 present"
              icon={AccessTime}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard
              title="Avg. Rate"
              value={`${monthlyStats.averageRate}%`}
              subtitle="this month"
              icon={Percent}
              color="primary"
            />
          </Grid>
        </Grid>

        {/* Main Content Area */}
        {viewMode === "calendar" ? (
          <Grid container spacing={3} direction="column">
            {/* Top: Calendar */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                  {/* Calendar Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6" fontWeight={600}>
                      {format(currentDate, "MMMM yyyy")}
                    </Typography>
                    <Box display="flex" gap={1}>
                      <IconButton onClick={() => setCurrentDate(subMonths(currentDate, 1))} sx={{ borderRadius: 2 }}>
                        <ChevronLeft />
                      </IconButton>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setCurrentDate(new Date())}
                        startIcon={<Today />}
                        sx={{ borderRadius: 2 }}
                      >
                        Today
                      </Button>
                      <IconButton onClick={() => setCurrentDate(addMonths(currentDate, 1))} sx={{ borderRadius: 2 }}>
                        <ChevronRight />
                      </IconButton>
                    </Box>
                  </Box>

                {/* Week Days Header */}
                <Grid container spacing={1} mb={1}>
                  {weekDays.map((day) => (
                    <Grid size={12 / 7} key={day}>
                      <Typography
                        align="center"
                        variant="body2"
                        fontWeight={600}
                        color="text.secondary"
                        sx={{ py: 1 }}
                      >
                        {day}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>

                {/* Calendar Grid */}
                <Grid container spacing={1}>
                  {/* Empty cells */}
                  {Array.from({ length: getDay(monthStart) }).map((_, index) => (
                    <Grid size={12 / 7} key={`empty-${index}`}>
                      <Box sx={{ aspectRatio: "1", p: 0.5 }} />
                    </Grid>
                  ))}

                  {/* Calendar days */}
                  {daysInMonth.map((date: Date) => {
                    const isSelected = selectedDate && format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                    const isTodayDate = isToday(date);
                    const stats = getDailyStats(date);

                    return (
                      <Grid size={12 / 7} key={date.toISOString()}>
                        <Tooltip
                          title={`Present: ${stats.present + stats.late}, Absent: ${stats.absent}, Half: ${stats.halfDay}`}
                          arrow
                        >
                          <Paper
                            onClick={() => setSelectedDate(date)}
                            sx={{
                              aspectRatio: "1",
                              p: 0.5,
                              cursor: "pointer",
                              bgcolor: isSelected ? "primary.main" : getCalendarDayColor(stats),
                              color: isSelected ? "white" : "inherit",
                              border: isTodayDate ? "2px solid #e27719" : "1px solid #e5e7eb",
                              borderRadius: 2,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s",
                              "&:hover": {
                                transform: "scale(1.05)",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                              },
                            }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight={isTodayDate ? 700 : 500}
                              color={isSelected ? "white" : isTodayDate ? "primary.main" : "inherit"}
                            >
                              {format(date, "d")}
                            </Typography>
                            {stats.totalMarked > 0 && (
                              <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap" justifyContent="center">
                                {stats.present > 0 && (
                                  <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#22c55e" }} />
                                )}
                                {stats.late > 0 && (
                                  <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#3b82f6" }} />
                                )}
                                {stats.halfDay > 0 && (
                                  <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#f59e0b" }} />
                                )}
                                {stats.absent > 0 && (
                                  <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#ef4444" }} />
                                )}
                              </Box>
                            )}
                          </Paper>
                        </Tooltip>
                      </Grid>
                    );
                  })}
                </Grid>

                {/* Legend */}
                <Box display="flex" gap={3} mt={3} justifyContent="center" flexWrap="wrap">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: "#dcfce7", border: "1px solid #22c55e" }} />
                    <Typography variant="caption">Good (80%+)</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: "#fef3c7", border: "1px solid #f59e0b" }} />
                    <Typography variant="caption">Average (50-80%)</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: "#fee2e2", border: "1px solid #ef4444" }} />
                    <Typography variant="caption">Poor (&lt;50%)</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Bottom: Selected Date Detail */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
              <CardContent>
                {selectedDate ? (
                  <>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Typography variant="h6" fontWeight={600}>
                        {format(selectedDate, "MMMM d, yyyy")}
                      </Typography>
                      {selectedDateStats && (
                        <Chip
                          label={`${selectedDateStats.present + selectedDateStats.late}/${students.length} Present`}
                          color="primary"
                          size="small"
                        />
                      )}
                    </Box>

                    {selectedDateStats && (
                      <Grid container spacing={2} mb={3}>
                        <Grid size={6}>
                          <Box p={2} bgcolor="success.50" borderRadius={2} textAlign="center">
                            <Typography variant="h5" fontWeight={700} color="success.main">
                              {selectedDateStats.present}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Present</Typography>
                          </Box>
                        </Grid>
                        <Grid size={6}>
                          <Box p={2} bgcolor="info.50" borderRadius={2} textAlign="center">
                            <Typography variant="h5" fontWeight={700} color="info.main">
                              {selectedDateStats.late}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Late</Typography>
                          </Box>
                        </Grid>
                        <Grid size={6}>
                          <Box p={2} bgcolor="warning.50" borderRadius={2} textAlign="center">
                            <Typography variant="h5" fontWeight={700} color="warning.main">
                              {selectedDateStats.halfDay}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Half Day</Typography>
                          </Box>
                        </Grid>
                        <Grid size={6}>
                          <Box p={2} bgcolor="error.50" borderRadius={2} textAlign="center">
                            <Typography variant="h5" fontWeight={700} color="error.main">
                              {selectedDateStats.absent}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Absent</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    )}

                    <Typography variant="subtitle2" fontWeight={600} mb={2}>
                      Mark Attendance
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        ({students.filter((s) => isStudentJoinedBeforeDate(s, selectedDate)).length} of {students.length} students visible)
                      </Typography>
                    </Typography>

                    <TableContainer sx={{ maxHeight: 400 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Student</TableCell>
                            <TableCell align="center">Current</TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {students
                            .filter((student) => isStudentJoinedBeforeDate(student, selectedDate))
                            .map((student) => {
                            const record = getStudentAttendanceForDate(student.id, selectedDate);
                            const status = record?.status;

                            return (
                              <TableRow key={student.id} hover>
                                <TableCell>
                                  <Box display="flex" alignItems="center" gap={1.5}>
                                    <Avatar src={student.profile_image} sx={{ width: 32, height: 32 }}>
                                      {student.firstname?.[0]}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="body2" fontWeight={500}>
                                        {student.firstname} {student.lastname}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {student.email}
                                      </Typography>
                                      {student.created_at && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          Joined: {format(new Date(student.created_at), "MMM d, yyyy")}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  {status ? (
                                    (() => {
                                      const IconComponent = statusConfig[status].icon;
                                      return (
                                        <Chip
                                          size="small"
                                          label={statusConfig[status].label}
                                          color={statusConfig[status].color}
                                          icon={<IconComponent />}
                                        />
                                      );
                                    })()
                                  ) : (
                                    <Typography variant="caption" color="text.disabled">
                                      Not marked
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Box display="flex" gap={0.5} justifyContent="center" flexWrap="wrap">
                                    {(Object.keys(statusConfig) as AttendanceStatus[]).map((key) => (
                                      <Button
                                        key={key}
                                        size="small"
                                        variant={status === key ? "contained" : "outlined"}
                                        color={statusConfig[key].color}
                                        onClick={() =>
                                          markAttendance(student.id, format(selectedDate, "yyyy-MM-dd"), key)
                                        }
                                        sx={{ minWidth: "auto", px: 1, py: 0.5, fontSize: "0.7rem" }}
                                      >
                                        {statusConfig[key].label}
                                      </Button>
                                    ))}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {students.filter((student) => isStudentJoinedBeforeDate(student, selectedDate)).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} align="center">
                                <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                                  No students available for this date. All students joined after {format(selectedDate, "MMMM d, yyyy")}.
                                </Alert>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                ) : (
                  <Box textAlign="center" py={8}>
                    <CalendarMonth sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      Select a date to view and mark attendance
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        ) : (
          /* List View */
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight={600}>
                  Attendance List - {format(currentDate, "MMMM yyyy")}
                </Typography>
                <Box display="flex" gap={1}>
                  <IconButton onClick={() => setCurrentDate(subMonths(currentDate, 1))} sx={{ borderRadius: 2 }}>
                    <ChevronLeft />
                  </IconButton>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setCurrentDate(new Date())}
                    startIcon={<Today />}
                    sx={{ borderRadius: 2 }}
                  >
                    Today
                  </Button>
                  <IconButton onClick={() => setCurrentDate(addMonths(currentDate, 1))} sx={{ borderRadius: 2 }}>
                    <ChevronRight />
                  </IconButton>
                </Box>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell align="center">Join Date</TableCell>
                      {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => (
                        <TableCell key={status} align="center">{statusConfig[status].label}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student) => {
                      const studentAttendance = attendance.filter((a) => a.studentid === student.id);
                      const present = studentAttendance.filter((a) => a.status === "PRESENT").length;
                      const late = studentAttendance.filter((a) => a.status === "LATE").length;
                      const absent = studentAttendance.filter((a) => a.status === "ABSENT").length;
                      const halfDay = studentAttendance.filter((a) => a.status === "HALF_DAY").length;

                      return (
                        <TableRow key={student.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1.5}>
                              <Avatar src={student.profile_image} sx={{ width: 32, height: 32 }}>
                                {student.firstname?.[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {student.firstname} {student.lastname}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {student.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            {student.created_at ? format(new Date(student.created_at), "MMM d, yyyy") : "N/A"}
                          </TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={present} color="success" sx={{ minWidth: 40 }} />
                          </TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={late} color="info" sx={{ minWidth: 40 }} />
                          </TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={halfDay} color="warning" sx={{ minWidth: 40 }} />
                          </TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={absent} color="error" sx={{ minWidth: 40 }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Export Dialog */}
        <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Export Attendance Report</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="End Date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
            <Button onClick={exportAttendanceToExcel} variant="contained" startIcon={<Download />}>
              Export CSV
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}