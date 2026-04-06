"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Tooltip,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  BarChart,
  TrendingUp,
  TrendingDown,
  Description,
  CheckCircle,
  Cancel,
  Schedule,
  OpenInNew,
  Chat,
  Search,
  FilterList,
  Person,
  CalendarMonth,
  PieChart,
  ShowChart,
} from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart as MuiBarChart } from "@mui/x-charts/BarChart";
import { PieChart as MuiPieChart } from "@mui/x-charts/PieChart";
import { ThemeProvider } from "../../../components/theme";
import { format, subDays, startOfWeek, addDays, isSameWeek, isValid } from "date-fns";

// Helper function for safe date formatting
const safeFormat = (date: string | Date | undefined, formatString: string, fallback: string = "N/A") => {
  if (!date) return fallback;
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return fallback;
  try {
    return format(d, formatString);
  } catch {
    return fallback;
  }
};

interface TradingReport {
  id: string;
  studentId: string;
  student: {
    firstname: string;
    lastname: string;
    email: string;
  };
  reportDate: string;
  instrument: string;
  dailyPnL: number;
  strategyName: string;
  strategyDescription: string;
  resultsDocLink: string;
  status: "submitted";
  adminNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

interface WeeklyPnL {
  week: string;
  startDate: Date;
  endDate: Date;
  totalPnL: number;
  trades: number;
  positiveDays: number;
  negativeDays: number;
}

export default function AdminTradingPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<TradingReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<TradingReport[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedStudentForChart, setSelectedStudentForChart] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<string>("daily");

  // Stats
  const [stats, setStats] = useState({
    totalReports: 0,
    totalPnL: 0,
    weeklyPnL: [] as WeeklyPnL[],
  });

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    let filtered = reports;
    
    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.student?.firstname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.student?.lastname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.strategyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.instrument?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedStudent !== "all") {
      filtered = filtered.filter((r) => r.studentId === selectedStudent);
    }
    
    // Apply sorting
    let sortedFiltered = [...filtered];
    if (sortBy === "pnl_high") {
      sortedFiltered.sort((a, b) => b.dailyPnL - a.dailyPnL);
    } else if (sortBy === "pnl_low") {
      sortedFiltered.sort((a, b) => a.dailyPnL - b.dailyPnL);
    } else if (sortBy === "student") {
      sortedFiltered.sort((a, b) => {
        const nameA = `${a.student?.firstname || ""} ${a.student?.lastname || ""}`.toLowerCase();
        const nameB = `${b.student?.firstname || ""} ${b.student?.lastname || ""}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      sortedFiltered.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
    }
    
    setFilteredReports(sortedFiltered);
  }, [searchQuery, reports, selectedStudent, sortBy]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/trading/admin/reports`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        
        // Map snake_case to camelCase
        const mappedData = data.map((r: any) => ({
          id: r.id,
          studentId: r.student_id || r.studentId,
          student: r.student ? {
            firstname: r.student.firstname,
            lastname: r.student.lastname,
            email: r.student.email,
          } : null,
          reportDate: r.report_date || r.reportDate,
          instrument: r.instrument,
          dailyPnL: r.daily_pnl !== undefined ? r.daily_pnl : (r.dailyPnL || 0),
          strategyName: r.strategy_name || r.strategyName,
          strategyDescription: r.strategy_description || r.strategyDescription,
          resultsDocLink: r.results_doc_link || r.resultsDocLink,
          status: r.status,
          adminNotes: r.admin_notes || r.adminNotes,
          reviewedAt: r.reviewed_at || r.reviewedAt,
          createdAt: r.created_at || r.createdAt,
        }));
        
        setReports(mappedData);
        setFilteredReports(mappedData);

        // Calculate stats
        const totalPnL = mappedData.reduce((sum: number, r: TradingReport) => sum + r.dailyPnL, 0);
        
        // Calculate weekly PnL
        const weeklyPnL = calculateWeeklyPnL(mappedData);
        
        setStats({
          totalReports: mappedData.length,
          totalPnL,
          weeklyPnL,
        });
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyPnL = (reports: TradingReport[]): WeeklyPnL[] => {
    const weeks = new Map<string, WeeklyPnL>();
    
    reports.forEach((report) => {
      const date = new Date(report.reportDate);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekKey = format(weekStart, "yyyy-MM-dd");
      
      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, {
          week: `Week of ${format(weekStart, "MMM d")}`,
          startDate: weekStart,
          endDate: addDays(weekStart, 6),
          totalPnL: 0,
          trades: 0,
          positiveDays: 0,
          negativeDays: 0,
        });
      }
      
      const week = weeks.get(weekKey)!;
      week.totalPnL += report.dailyPnL;
      week.trades += 1;
      if (report.dailyPnL >= 0) {
        week.positiveDays += 1;
      } else {
        week.negativeDays += 1;
      }
    });
    
    return Array.from(weeks.values()).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  };


  // Get unique students for filter
  const uniqueStudents = useMemo(() => {
    const students = new Map();
    reports.forEach((r) => {
      if (r.student && !students.has(r.studentId)) {
        students.set(r.studentId, r.student);
      }
    });
    return Array.from(students.entries());
  }, [reports]);

  // Prepare chart data for last 8 weeks
  const chartData = useMemo(() => {
    return stats.weeklyPnL.slice(-8);
  }, [stats.weeklyPnL]);

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }: any) => (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} mt={1} color={color === "success" ? "success.main" : color === "error" ? "error.main" : "#1f2937"}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                <TrendingUp sx={{ fontSize: 16, color: "success.main", mr: 0.5 }} />
                <Typography variant="caption" color="success.main" fontWeight={600}>
                  {trend}
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark` }}>
            <Icon />
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const getStatusColor = (status: string) => {
    return "success";
  };

  if (loading) {
    return (
      <ThemeProvider>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <LinearProgress sx={{ width: "50%" }} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="#1f2937">
              QuantLive Trading Reports
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Review and analyze student trading performance
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<BarChart />} onClick={fetchReports}>
            Refresh
          </Button>
        </Box>

        {/* Stats and Performance Charts */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Box display="flex" gap={3} mb={3}>
              <Box flex={1}>
                <StatCard
                  title="Total Reports"
                  value={stats.totalReports}
                  subtitle="All submissions"
                  icon={Description}
                  color="primary"
                />
              </Box>
              <Box flex={1}>
                <StatCard
                  title="Active Students"
                  value={uniqueStudents.length}
                  subtitle="Trading participants"
                  icon={Person}
                  color="info"
                />
              </Box>
            </Box>
            {/* Student PnL Line Chart */}
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight={600}>
                    Student PnL Trend
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Select Student</InputLabel>
                    <Select
                      value={selectedStudentForChart}
                      onChange={(e) => setSelectedStudentForChart(e.target.value)}
                      label="Select Student"
                    >
                      <MenuItem value="all">All Students</MenuItem>
                      {uniqueStudents.map(([id, student]) => (
                        <MenuItem key={id} value={id}>
                          {student.firstname} {student.lastname}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box height={350}>
                  {selectedStudentForChart !== "all" ? (
                    <LineChart
                      series={[
                        {
                          data: reports
                            .filter(r => r.studentId === selectedStudentForChart)
                            .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
                            .map((r) => r.dailyPnL),
                          label: "Daily PnL",
                          color: "#e27719",
                          area: true,
                        },
                      ]}
                      xAxis={[
                        {
                          data: reports
                            .filter(r => r.studentId === selectedStudentForChart)
                            .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
                            .map((r) => safeFormat(r.reportDate, "MMM d")),
                          scaleType: "point",
                        },
                      ]}
                      height={350}
                    />
                  ) : (
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                      <Typography color="text.secondary">Select a student to view PnL trend</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            {/* Performance Distribution */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Performance Distribution
                </Typography>
                <Box height={200}>
                  <MuiPieChart
                    series={[
                      {
                        data: [
                          { id: 0, value: reports.filter(r => r.dailyPnL > 0).length, label: 'Profitable Days' },
                          { id: 1, value: reports.filter(r => r.dailyPnL < 0).length, label: 'Loss Days' },
                          { id: 2, value: reports.filter(r => r.dailyPnL === 0).length, label: 'Breakeven Days' },
                        ],
                        innerRadius: 60,
                        outerRadius: 80,
                        paddingAngle: 5,
                        cornerRadius: 5,
                      },
                    ]}
                    slotProps={{
                      legend: {
                        direction: 'vertical',
                        position: { vertical: 'middle', horizontal: 'center' },
                      },
                    }}
                    height={200}
                  />
                </Box>
              </CardContent>
            </Card>
            {/* Top Performers */}
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight={600}>
                    Top Performers
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select
                      value={leaderboardPeriod}
                      onChange={(e) => setLeaderboardPeriod(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box>
                  {(() => {
                    const filteredReportsByPeriod = reports.filter(report => {
                      const reportDate = new Date(report.reportDate);
                      const now = new Date();
                      
                      if (leaderboardPeriod === "daily") {
                        return reportDate.toDateString() === now.toDateString();
                      } else if (leaderboardPeriod === "weekly") {
                        const weekStart = new Date(now);
                        weekStart.setDate(now.getDate() - now.getDay());
                        weekStart.setHours(0, 0, 0, 0);
                        return reportDate >= weekStart;
                      } else if (leaderboardPeriod === "monthly") {
                        return reportDate.getMonth() === now.getMonth() && 
                               reportDate.getFullYear() === now.getFullYear();
                      }
                      return true;
                    });
                    
                    return uniqueStudents
                      .map(([id, student]) => {
                        const studentReports = filteredReportsByPeriod.filter(r => r.studentId === id);
                        const totalPnL = studentReports.reduce((sum, r) => sum + r.dailyPnL, 0);
                        return { id, student, totalPnL, reportCount: studentReports.length };
                      })
                      .filter(s => s.reportCount > 0)
                      .sort((a, b) => b.totalPnL - a.totalPnL)
                      .slice(0, 5)
                      .map(({ student, totalPnL, reportCount }, index) => {
                        const isTop3 = index < 3;
                        const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
                        return (
                          <Box 
                            key={student.email} 
                            display="flex" 
                            justifyContent="space-between" 
                            alignItems="center" 
                            mb={2}
                            p={isTop3 ? 1.5 : 1}
                            sx={{
                              backgroundColor: isTop3 ? 'grey.50' : 'transparent',
                              borderRadius: 2,
                              border: isTop3 ? `2px solid ${medalColors[index]}` : 'none'
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={2}>
                              {isTop3 && (
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    backgroundColor: medalColors[index],
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: 14
                                  }}
                                >
                                  {index + 1}
                                </Box>
                              )}
                              {!isTop3 && (
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>
                                  #{index + 1}
                                </Typography>
                              )}
                              <Typography variant="body2" fontWeight={isTop3 ? 600 : 400}>
                                {student.firstname} {student.lastname}
                              </Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={600} color={totalPnL >= 0 ? "success.main" : "error.main"}>
                              {totalPnL >= 0 ? "+" : ""}₹{totalPnL.toLocaleString()}
                            </Typography>
                          </Box>
                        );
                      });
                  })()}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters and Table */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
              <Box display="flex" gap={2} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Student</InputLabel>
                  <Select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    label="Student"
                  >
                    <MenuItem value="all">All Students</MenuItem>
                    {uniqueStudents.map(([id, student]) => (
                      <MenuItem key={id} value={id}>
                        {student.firstname} {student.lastname}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort By"
                  >
                    <MenuItem value="date">Latest First</MenuItem>
                    <MenuItem value="pnl_high">PnL: High to Low</MenuItem>
                    <MenuItem value="pnl_low">PnL: Low to High</MenuItem>
                    <MenuItem value="student">Student Name</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                  }}
                />
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Instrument</TableCell>
                    <TableCell>Strategy</TableCell>
                    <TableCell>PnL</TableCell>
                    <TableCell>Results</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main" }}>
                            {report.student?.firstname?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {report.student?.firstname} {report.student?.lastname}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {report.student?.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{safeFormat(report.reportDate, "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Chip label={report.instrument} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {report.strategyName}
                        </Typography>
                        {report.strategyDescription && (
                          <Typography variant="caption" color="text.secondary" noWrap maxWidth={200} display="block">
                            {report.strategyDescription}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={report.dailyPnL >= 0 ? "success.main" : "error.main"}
                        >
                          {report.dailyPnL >= 0 ? "+" : ""}₹{report.dailyPnL.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<OpenInNew />}
                          href={report.resultsDocLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Doc
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {filteredReports.length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">No reports found</Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        </Box>
    </ThemeProvider>
  );
}
