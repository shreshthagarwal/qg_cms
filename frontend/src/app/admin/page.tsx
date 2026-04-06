"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Avatar,
  Button,
  Tooltip,
} from "@mui/material";
import {
  TrendingUp,
  People,
  School,
  AttachMoney,
  CalendarToday,
  Assessment,
  ArrowForward,
  CalendarMonth,
  Assignment,
  Description,
  Notifications,
  Warning,
  CheckCircle,
} from "@mui/icons-material";
import { BarChart } from "@mui/x-charts/BarChart";
import { ThemeProvider } from "../../components/theme";
import { format, isValid } from "date-fns";

interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  activeStudents: number;
  totalRevenue: number;
  pendingRevenue: number;
  attendanceRate: number;
  weeklyLeads: number[];
  weeklyLeadDates: string[];
  studentFees: { id: string | number; name: string; paid: number; pending: number; total: number }[];
  dailyLeads: { date: string; count: number; day: string }[];
  pendingSubmissions: number;
  recentSubmissions: number;
  pendingGrading: number;
  overdueAssignments: number;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeLeads: 0,
    activeStudents: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    attendanceRate: 0,
    weeklyLeads: [0, 0, 0, 0, 0, 0, 0],
    weeklyLeadDates: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    studentFees: [],
    dailyLeads: [],
    pendingSubmissions: 0,
    recentSubmissions: 0,
    pendingGrading: 0,
    overdueAssignments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper functions for weekly leads calculation - using same logic as leads page
  const calculateWeeklyLeads = (leads: any[]) => {
    const today = new Date();
    const weekData = [0, 0, 0, 0, 0, 0, 0]; // 7 days: Sun to Sat
    
    leads.forEach((lead: any) => {
      // Use same logic as leads page - check both created_at and createdAt
      const createdAt = lead.created_at || lead.createdAt;
      if (!createdAt) return;
      
      const leadDate = new Date(createdAt);
      if (!isValid(leadDate)) return;
      
      const daysDiff = Math.floor((today.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0 && daysDiff < 7) {
        // Map to day index (0 = today, 6 = 6 days ago)
        const dayIndex = 6 - daysDiff;
        if (dayIndex >= 0 && dayIndex < 7) {
          weekData[dayIndex]++;
        }
      }
    });
    
    return weekData;
  };

  const calculateDailyLeads = (leads: any[]) => {
    const today = new Date();
    const dailyData = [];
    
    // Get last 30 days of lead data
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayLeads = leads.filter((lead: any) => {
        const leadDate = new Date(lead.createdAt || lead.created_at || lead.date);
        return leadDate.toISOString().split('T')[0] === dateStr;
      });
      
      dailyData.push({
        date: dateStr,
        count: dayLeads.length,
        day: date.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }
    
    return dailyData;
  };

  const getLast7DaysLabels = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      labels.push(days[d.getDay()]);
    }
    return labels;
  };

  const fetchDashboardData = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      
      // Fetch active leads
      const leadsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const activeLeads = leadsRes.ok ? await leadsRes.json() : [];
      
      // Fetch archived leads (includes CONVERTED and UNSUCCESSFUL)
      const archivedRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/archived`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const archivedLeads = archivedRes.ok ? await archivedRes.json() : [];
      
      // Combine all leads
      const leadsData = [...activeLeads, ...archivedLeads];
      console.log("Leads data fetched:", leadsData.length, "leads (active:", activeLeads.length, ", archived:", archivedLeads.length, ")");

      // Fetch students
      const studentsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const studentsData = studentsRes.ok ? await studentsRes.json() : [];
      console.log("Students data:", studentsData);

      // Calculate revenue from student profiles
      let totalRevenue = 0;
      let pendingRevenue = 0;
      
      studentsData.forEach((student: any) => {
        // Get fee info from student_profiles (handle both camelCase and snake_case)
        const profile = student.student_profiles || {};
        const feesPaid = parseFloat(profile.paid_fees || profile.paidfees || profile.paidFees || 0);
        const totalFees = parseFloat(profile.total_fees || profile.totalfees || profile.totalFees || 0);
        totalRevenue += feesPaid;
        pendingRevenue += (totalFees - feesPaid);
      });

      // Calculate real weekly leads data from actual lead creation dates
      const weeklyLeads = calculateWeeklyLeads(leadsData);
      const weeklyLeadDates = getLast7DaysLabels();
      
      // Calculate daily leads for better granularity
      const dailyLeads = calculateDailyLeads(leadsData);

      // Build student-wise fees data - separate by ID but show only names
      const studentFees = studentsData.map((student: any) => {
        const profile = student.student_profiles || {};
        const feesPaid = parseFloat(profile.paid_fees || profile.paidfees || profile.paidFees || 0);
        const totalFees = parseFloat(profile.total_fees || profile.totalfees || profile.totalFees || 0);
        const firstName = student.firstname || student.firstName || '';
        const lastName = student.lastname || student.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || `Student ${student.id}`;
        return {
          id: student.id, // Keep ID for internal reference
          name: fullName, // Show only name in chart
          paid: feesPaid,
          pending: totalFees - feesPaid,
          total: totalFees,
        };
      }).filter((s: any) => s.total > 0); // Only show students with fee info
      
      console.log("Student fees data:", studentFees);

      // Fetch submissions data
      const submissionsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/assignments/submissions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const submissionsData = submissionsRes.ok ? await submissionsRes.json() : [];
      
      // Calculate submission stats
      const pendingSubmissions = submissionsData.filter((s: any) => s.status === 'submitted').length;
      const recentSubmissions = submissionsData.filter((s: any) => {
        const submittedDate = new Date(s.submittedAt);
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        return submittedDate >= twoDaysAgo;
      }).length;
      const pendingGrading = submissionsData.filter((s: any) => s.status === 'submitted' && !s.gradedAt).length;
      
      // Fetch assignments for overdue stats
      const assignmentsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/assignments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const assignmentsData = assignmentsRes.ok ? await assignmentsRes.json() : [];
      const overdueAssignments = assignmentsData.filter((a: any) => {
        const deadline = new Date(a.deadline);
        return !a.submitted && deadline < new Date();
      }).length;
      
      const courseRevenue = []; // Not used anymore

      setStats({
        totalLeads: leadsData.length || 0,
        activeLeads: activeLeads.length || 0,
        activeStudents: studentsData.length || 0,
        totalRevenue,
        pendingRevenue,
        attendanceRate: 87,
        weeklyLeads,
        weeklyLeadDates,
        studentFees: studentFees.length > 0 ? studentFees : [],
        dailyLeads: dailyLeads || [],
        pendingSubmissions,
        recentSubmissions,
        pendingGrading,
        overdueAssignments,
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

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
        <Box sx={{ width: "100%", mt: 4, p: 3 }}>
          <Typography variant="h6" textAlign="center">
            Loading dashboard...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Box sx={{ p: 3, bgcolor: "#fafafa", minHeight: "100vh" }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="#1f2937">
              Admin Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome back! Here's what's happening today.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<CalendarMonth />}
            onClick={() => router.push("/admin/attendance")}
          >
            Mark Attendance
          </Button>
        </Box>

        {/* Stats Grid */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Active Leads"
              value={stats.activeLeads}
              subtitle="Leads requiring follow-up"
              icon={People}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Active Students"
              value={stats.activeStudents}
              icon={School}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Revenue Collected"
              value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
              subtitle={`Pending: ₹${stats.pendingRevenue.toLocaleString('en-IN')}`}
              icon={AttachMoney}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Attendance Rate"
              value={`${stats.attendanceRate}%`}
              icon={CalendarToday}
              color="warning"
            />
          </Grid>
        </Grid>

        {/* Submissions & Grading Stats */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Pending Submissions"
              value={stats.pendingSubmissions}
              subtitle="Awaiting review"
              icon={Description}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Recent Submissions"
              value={stats.recentSubmissions}
              subtitle="Last 48 hours"
              icon={Assignment}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Pending Grading"
              value={stats.pendingGrading}
              subtitle="Need evaluation"
              icon={Assessment}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Overdue Assignments"
              value={stats.overdueAssignments}
              subtitle="Past deadline"
              icon={Warning}
              color="error"
            />
          </Grid>
        </Grid>

        {/* Charts Row 1 - Weekly Leads Only */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12 }}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight={600}>
                    Weekly Leads Overview
                  </Typography>
                  <Button size="small" endIcon={<ArrowForward />} onClick={() => router.push("/admin/leads")}>
                    View All
                  </Button>
                </Box>
                <BarChart
                  series={[
                    {
                      data: stats.weeklyLeads,
                      label: "New Leads",
                      color: "#e27719",
                    },
                  ]}
                  xAxis={[
                    {
                      data: stats.weeklyLeadDates,
                      scaleType: "band",
                    },
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts Row 2 - Student Fees: Paid vs Pending */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={3}>
                  Student Fees: Paid vs Pending
                </Typography>
                {stats.studentFees.length > 0 ? (
                  <BarChart
                    series={[
                      { data: stats.studentFees.map((s) => s.paid), label: "Paid", color: "#22c55e" },
                      { data: stats.studentFees.map((s) => s.pending), label: "Pending", color: "#e27719" },
                    ]}
                    xAxis={[
                      {
                        data: stats.studentFees.map((s, index) => `${s.name} (${s.id})`),
                        scaleType: "band",
                      },
                    ]}
                    height={300}
                  />
                ) : (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    No fee data available. Students will appear here once they have fee information.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions Only */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Quick Actions
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<People />}
                      onClick={() => router.push("/admin/leads")}
                      sx={{ justifyContent: "flex-start", py: 1.5 }}
                    >
                      Manage Leads
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<School />}
                      onClick={() => router.push("/admin/students")}
                      sx={{ justifyContent: "flex-start", py: 1.5 }}
                    >
                      Students
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<AttachMoney />}
                      onClick={() => router.push("/admin/fees")}
                      sx={{ justifyContent: "flex-start", py: 1.5 }}
                    >
                      Fee Management
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Assessment />}
                      onClick={() => router.push("/admin/trading")}
                      sx={{ justifyContent: "flex-start", py: 1.5 }}
                    >
                      QuantLive Reports
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<CalendarToday />}
                      onClick={() => router.push("/admin/attendance")}
                      sx={{ justifyContent: "flex-start", py: 1.5 }}
                    >
                      Attendance
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<TrendingUp />}
                      onClick={() => router.push("/admin/evaluation")}
                      sx={{ justifyContent: "flex-start", py: 1.5 }}
                    >
                      Evaluations
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
}
