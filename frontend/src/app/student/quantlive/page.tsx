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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  Alert,
  LinearProgress,
  Avatar,
} from "@mui/material";
import {
  Description,
  TrendingUp,
  TrendingDown,
  Add,
  Edit,
  Delete,
  OpenInNew,
  CalendarMonth,
  AttachMoney,
  CheckCircle,
  Warning,
} from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { ThemeProvider } from "../../../components/theme";
import PnLLeaderboard from "../../../components/PnLLeaderboard";
import { format, startOfWeek, addDays, isSameWeek, subWeeks } from "date-fns";

interface TradingReport {
  id: string;
  reportDate: string;
  instrument: string;
  dailyPnL: number;
  strategyName: string;
  strategyDescription: string;
  resultsDocLink: string;
  status: "pending" | "reviewed" | "approved" | "rejected";
  adminNotes?: string;
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

export default function StudentQuantLivePage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<TradingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<TradingReport | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [reportDate, setReportDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [instrument, setInstrument] = useState("");
  const [dailyPnL, setDailyPnL] = useState("");
  const [strategyName, setStrategyName] = useState("");
  const [strategyDescription, setStrategyDescription] = useState("");
  const [resultsDocLink, setResultsDocLink] = useState("");

  // Stats
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    approvedReports: 0,
    totalPnL: 0,
    weeklyPnL: [] as WeeklyPnL[],
  });

  // Leaderboard states
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");


  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/trading/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        
        // Map snake_case to camelCase
        const mappedData = data.map((r: any) => ({
          id: r.id,
          reportDate: r.report_date || r.reportDate,
          instrument: r.instrument,
          dailyPnL: r.daily_pnl !== undefined ? r.daily_pnl : (r.dailyPnL || 0),
          strategyName: r.strategy_name || r.strategyName,
          strategyDescription: r.strategy_description || r.strategyDescription,
          resultsDocLink: r.results_doc_link || r.resultsDocLink,
          status: r.status,
          adminNotes: r.admin_notes || r.adminNotes,
          createdAt: r.created_at || r.createdAt,
        }));
        
        setReports(mappedData);
        
        const totalPnL = mappedData.reduce((sum: number, r: TradingReport) => sum + r.dailyPnL, 0);
        const weeklyPnL = calculateWeeklyPnL(mappedData);
        
        setStats({
          totalReports: mappedData.length,
          totalPnL,
          weeklyPnL,
          pendingReports: 0, // Keep for compatibility but not used
          approvedReports: 0, // Keep for compatibility but not used
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

  const resetForm = () => {
    setReportDate(format(new Date(), "yyyy-MM-dd"));
    setInstrument("");
    setDailyPnL("");
    setStrategyName("");
    setStrategyDescription("");
    setResultsDocLink("");
    setEditingReport(null);
  };

  const openTradingView = () => {
    window.open("https://www.tradingview.com/chart/", "_blank");
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!reportDate || !instrument || !dailyPnL || !strategyName || !resultsDocLink) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const token = (session?.user as any)?.accessToken;
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/trading/reports${editingReport ? `/${editingReport.id}` : ""}`;
      const method = editingReport ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportDate,
          instrument,
          dailyPnL: parseFloat(dailyPnL),
          strategyName,
          strategyDescription,
          resultsDocLink,
        }),
      });

      if (!res.ok) throw new Error(editingReport ? "Failed to update report" : "Failed to create report");

      setSuccess(editingReport ? "Report updated successfully!" : "Report submitted successfully!");
      setDialogOpen(false);
      resetForm();
      fetchReports();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Error saving report");
      console.error(err);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/trading/reports/${reportId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete report");

      setSuccess("Report deleted successfully!");
      fetchReports();
    } catch (err) {
      setError("Error deleting report");
    }
  };

  const openEditModal = (report: TradingReport) => {
    setEditingReport(report);
    setReportDate(report.reportDate);
    setInstrument(report.instrument);
    setDailyPnL(report.dailyPnL.toString());
    setStrategyName(report.strategyName);
    setStrategyDescription(report.strategyDescription || "");
    setResultsDocLink(report.resultsDocLink);
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "success";
      case "rejected": return "error";
      case "reviewed": return "info";
      default: return "warning";
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    return stats.weeklyPnL.slice(-8);
  }, [stats.weeklyPnL]);

  const dailyChartData = useMemo(() => {
    return [...reports]
      .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
      .slice(-30);
  }, [reports]);

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} mt={1} color="#1f2937">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark` }}>
            <Icon />
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

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
              QuantLive Trading
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Submit your daily trading reports and track your PnL
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button variant="outlined" startIcon={<OpenInNew />} onClick={openTradingView}>
              Open TradingView
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
            >
              New Report
            </Button>
          </Box>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        {/* Stats */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Total Reports"
              value={stats.totalReports}
              subtitle="All submitted reports"
              icon={Description}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Net PnL"
              value={`₹${stats.totalPnL.toLocaleString()}`}
              subtitle="Total profit/loss"
              icon={stats.totalPnL >= 0 ? TrendingUp : TrendingDown}
              color={stats.totalPnL >= 0 ? "success" : "error"}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Win Rate"
              value={stats.totalReports > 0 ? `${Math.round((reports.filter(r => r.dailyPnL > 0).length / stats.totalReports) * 100)}%` : 'N/A'}
              subtitle="Profitable days"
              icon={CheckCircle}
              color="primary"
            />
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} mb={3}>
          {/* Weekly PnL Chart */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Weekly PnL Performance
                </Typography>
                <Box height={320}>
                  <BarChart
                    series={[
                      {
                        data: chartData.map((w) => w.totalPnL),
                        label: "Weekly PnL",
                        color: "#e27719",
                      },
                    ]}
                    xAxis={[
                      {
                        data: chartData.map((w) => w.week),
                        scaleType: "band",
                      },
                    ]}
                    height={320}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Daily PnL Trend */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Daily PnL Trend (Last 30 Days)
                </Typography>
                <Box height={320}>
                  <LineChart
                    series={[
                      {
                        data: dailyChartData.map((r) => r.dailyPnL),
                        label: "Daily PnL",
                        color: "#e27719",
                        area: true,
                      },
                    ]}
                    xAxis={[
                      {
                        data: dailyChartData.map((r) => format(new Date(r.reportDate), "MMM d")),
                        scaleType: "point",
                      },
                    ]}
                    height={320}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* P&L Leaderboard */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <PnLLeaderboard
                  reports={reports}
                  students={[{ id: session?.user?.id || '', firstname: session?.user?.name?.split(' ')[0] || 'Student', lastname: session?.user?.name?.split(' ').slice(1).join(' ') || '', email: session?.user?.email || '' }]}
                  period={leaderboardPeriod}
                  onPeriodChange={setLeaderboardPeriod}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Reports Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              My Trading Reports
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Instrument</TableCell>
                    <TableCell>Strategy</TableCell>
                    <TableCell>PnL</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...reports]
                    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
                    .map((report) => (
                      <TableRow key={report.id} hover>
                        <TableCell>
                          {format(new Date(report.reportDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Chip label={report.instrument} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {report.strategyName}
                          </Typography>
                          {report.strategyDescription && (
                            <Typography variant="caption" color="text.secondary" noWrap maxWidth={200}>
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
                          <Box display="flex" gap={1}>
                            <Button
                              size="small"
                              startIcon={<OpenInNew />}
                              href={report.resultsDocLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </Button>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openEditModal(report)}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(report.id)}
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            {reports.length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary" mb={2}>
                  No reports submitted yet
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setDialogOpen(true)}
                >
                  Create Your First Report
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingReport ? "Edit Trading Report" : "Create Trading Report"}</DialogTitle>
          <DialogContent>
            <Box mt={2} display="flex" flexDirection="column" gap={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Report Date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Instrument"
                    value={instrument}
                    onChange={(e) => setInstrument(e.target.value)}
                    placeholder="e.g., NIFTY50, BTC/USDT, RELIANCE, etc."
                    helperText="Enter any instrument, crypto, or stock you traded"
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                type="number"
                label="Daily PnL (₹)"
                value={dailyPnL}
                onChange={(e) => setDailyPnL(e.target.value)}
                placeholder="Enter positive for profit, negative for loss"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney />
                    </InputAdornment>
                  ),
                }}
                helperText="Enter positive for profit, negative for loss"
              />

              <TextField
                fullWidth
                label="Strategy Name"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder="e.g., Moving Average Crossover"
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Strategy Description"
                value={strategyDescription}
                onChange={(e) => setStrategyDescription(e.target.value)}
                placeholder="Describe your trading strategy, entry/exit rules, etc."
              />

              <TextField
                fullWidth
                label="Results Document Link (Google Doc)"
                value={resultsDocLink}
                onChange={(e) => setResultsDocLink(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Description />
                    </InputAdornment>
                  ),
                }}
                helperText="Link to Google Doc with backtesting and paper trading screenshots"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {editingReport ? "Update Report" : "Submit Report"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
