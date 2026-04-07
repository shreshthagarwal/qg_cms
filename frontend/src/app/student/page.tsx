"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AnnouncementComponent from "../../components/AnnouncementComponent";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Avatar,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  Badge,
  IconButton,
  Tooltip,
  Alert,
  Fade,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  School,
  Assignment,
  CalendarMonth,
  TrendingUp,
  CheckCircle,
  Warning,
  MenuBook,
  Assessment,
  ArrowForward,
  NotificationImportant,
  NotificationsNone,
  Quiz,
  Grade,
  EventAvailable,
  NewReleases,
  Timer,
  Feedback,
  Send,
  Celebration,
} from "@mui/icons-material";
import { ThemeProvider } from "../../components/theme";
import { format, subDays, isToday, isPast, isValid } from "date-fns";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";

// Notifications Component
interface NotificationsComponentProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  unreadCount: number;
}

const NotificationsComponent: React.FC<NotificationsComponentProps> = ({ 
  notifications, 
  onNotificationClick, 
  unreadCount 
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <Quiz />;
      case 'assignment': return <Assignment />;
      case 'grade': return <Grade />;
      case 'deadline': return <Timer />;
      case 'announcement': return <NewReleases />;
      case 'birthday': return <Celebration />;
      default: return <NotificationsNone />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'quiz': return 'primary';
      case 'assignment': return 'info';
      case 'grade': return 'success';
      case 'deadline': return 'warning';
      case 'announcement': return 'secondary';
      case 'birthday': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box position="relative">
      <Tooltip title="Notifications">
        <IconButton onClick={() => setShowNotifications(!showNotifications)}>
          <Badge badgeContent={unreadCount} color="error">
            {unreadCount > 0 ? <NotificationImportant /> : <NotificationsNone />}
          </Badge>
        </IconButton>
      </Tooltip>
      
      {/* Notifications Dropdown */}
      {showNotifications && (
        <Paper
          sx={{
            position: 'absolute',
            right: 0,
            top: '100%',
            mt: 1,
            width: 360,
            maxHeight: 400,
            overflow: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          {notifications.length > 0 ? (
            <>
              <Box p={2} borderBottom="1px solid #e5e7eb">
                <Typography variant="subtitle2" fontWeight={600}>
                  Notifications ({notifications.filter(n => !n.read).length} unread)
                </Typography>
              </Box>
              <List>
                {notifications.slice(0, 5).map((notification) => (
                  <Box
                    key={notification.id}
                    onClick={() => onNotificationClick(notification)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      bgcolor: notification.read ? 'transparent' : 'primary.light',
                      '&:hover': { bgcolor: 'grey.100' },
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    <Box display="flex" alignItems="flex-start" gap={2}>
                      <Avatar sx={{ bgcolor: `${getNotificationColor(notification.type)}.light`, width: 32, height: 32 }}>
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={notification.read ? 400 : 600}>
                          {notification.title}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(notification.timestamp), 'MMM d, HH:mm')}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </List>
              <Box p={2} borderTop="1px solid #e5e7eb">
                <Button size="small" fullWidth onClick={() => router.push('/student/notifications')}>
                  View All Notifications
                </Button>
              </Box>
            </>
          ) : (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">
                No new notifications
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

interface Notification {
  id: string;
  type: 'quiz' | 'assignment' | 'grade' | 'deadline' | 'announcement' | 'birthday';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string | null;
}

interface DashboardStats {
  attendanceRate: number;
  assignmentsPending: number;
  assignmentsSubmitted: number;
  totalQuizzes: number;
  averageScore: number;
  tradingReports: number;
  coursesEnrolled: number;
  upcomingDeadlines: number;
  unreadNotifications: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  date: string;
  icon: any;
  description?: string;
}

export default function StudentDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    attendanceRate: 0,
    assignmentsPending: 0,
    assignmentsSubmitted: 0,
    totalQuizzes: 0,
    averageScore: 0,
    tradingReports: 0,
    coursesEnrolled: 0,
    upcomingDeadlines: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
      fetchStats();
      fetchRecentActivity();
      fetchNotifications();
    }
  }, [session]);

  const fetchNotifications = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      
      // Fetch assignments for deadline notifications
      const assignmentsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/assignments/student`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const assignmentsData = assignmentsRes.ok ? await assignmentsRes.json() : [];
      
      // Fetch quizzes for new quiz notifications
      const quizzesRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const quizzesData = quizzesRes.ok ? await quizzesRes.json() : [];
      
      // Fetch recent grades
      const gradesRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/evaluation/dashboard/${session?.user?.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const gradesData = gradesRes.ok ? await gradesRes.json() : [];
      
      // Generate notifications from data
      const notificationsList: Notification[] = [];
      
      // Birthday notification
      if (profile?.dateOfBirth) {
        const today = new Date();
        const birthday = new Date(profile.dateOfBirth);
        const isTodayBirthday = 
          today.getDate() === birthday.getDate() && 
          today.getMonth() === birthday.getMonth();
          
        if (isTodayBirthday) {
          notificationsList.push({
            id: `birthday-${profile.id}`,
            type: 'birthday',
            title: '🎉 Happy Birthday!',
            message: `Wishing you a wonderful birthday, ${profile.firstname || 'Student'}! 🎂`,
            timestamp: today.toISOString(),
            read: false,
            actionUrl: null,
          });
        }
      }
      
      // Assignment deadline notifications
      assignmentsData.forEach((assignment: any) => {
        if (!assignment.submitted) {
          const deadline = new Date(assignment.deadline);
          const daysUntil = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntil <= 3 && daysUntil >= 0) {
            notificationsList.push({
              id: `deadline-${assignment.id}`,
              type: 'deadline',
              title: `Assignment Deadline Approaching`,
              message: `"${assignment.title}" is due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
              timestamp: assignment.deadline,
              read: false,
              actionUrl: '/student/assignments',
            });
          }
        }
      });
      
      // New quiz notifications (quizzes from last 2 days)
      const twoDaysAgo = subDays(new Date(), 2);
      quizzesData.forEach((quiz: any) => {
        const quizDate = new Date(quiz.createdAt);
        if (quizDate >= twoDaysAgo) {
          notificationsList.push({
            id: `quiz-${quiz.id}`,
            type: 'quiz',
            title: 'New Quiz Available',
            message: `"${quiz.title}" is now available`,
            timestamp: quiz.createdAt,
            read: false,
            actionUrl: '/student/evaluation',
          });
        }
      });
      
      // Grade notifications (from last 3 days)
      const threeDaysAgo = subDays(new Date(), 3);
      if (Array.isArray(gradesData)) {
        gradesData.forEach((grade: any) => {
          const gradeDate = new Date(grade.gradedAt);
          if (gradeDate >= threeDaysAgo) {
            notificationsList.push({
              id: `grade-${grade.id}`,
              type: 'grade',
              title: 'Assignment Graded',
              message: `"${grade.assignmentTitle}" - Score: ${grade.score}%`,
              timestamp: grade.gradedAt,
              read: false,
              actionUrl: '/student/assignments',
            });
          }
        });
      }
      
      // Sort by timestamp (newest first)
      notificationsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setNotifications(notificationsList);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        console.error('Profile fetch failed:', res.status, res.statusText);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      
      // Fetch attendance
      const attendanceRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/attendance/student`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];
      
      // Fetch assignments
      const assignmentsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/assignments/student`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const assignmentsData = assignmentsRes.ok ? await assignmentsRes.json() : [];
      
      // Fetch trading reports
      const tradingRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/trading/reports`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const tradingData = tradingRes.ok ? await tradingRes.json() : [];
      
      // Fetch quiz results
      const quizRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/attempted`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const quizData = quizRes.ok ? await quizRes.json() : [];

      const present = attendanceData.filter((a: any) => a.status === "PRESENT").length;
      const total = attendanceData.length;
      
      // If no attendance data, don't show 0%
      const attendanceRate = total > 0 ? Math.round((present / total) * 100) : null;
      
      const submitted = assignmentsData.filter((a: any) => a.submitted).length;
      const pending = assignmentsData.filter((a: any) => !a.submitted).length;
      
      // Calculate upcoming deadlines (assignments due in next 7 days)
      const upcomingDeadlines = assignmentsData.filter((a: any) => {
        if (a.submitted) return false;
        const deadline = new Date(a.deadline);
        const daysUntil = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 7;
      }).length;
      
      const avgScore = quizData.length > 0 
        ? quizData.reduce((sum: number, q: any) => sum + (q.score || 0), 0) / quizData.length 
        : 0;

      setStats({
        attendanceRate: attendanceRate !== null ? attendanceRate : 0,
        assignmentsPending: pending,
        assignmentsSubmitted: submitted,
        totalQuizzes: quizData.length,
        averageScore: Math.round(avgScore),
        tradingReports: tradingData.length,
        coursesEnrolled: 1,
        upcomingDeadlines,
        unreadNotifications: notifications.filter(n => !n.read).length,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      
      // Fetch recent assignments
      const assignmentsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/assignments/student`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const assignmentsData = assignmentsRes.ok ? await assignmentsRes.json() : [];
      
      // Fetch recent attendance
      const attendanceRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/attendance/student`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];
      
      // Fetch recent quiz results
      const quizRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const quizData = quizRes.ok ? await quizRes.json() : [];
      
      // Fetch recent trading reports
      const tradingRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/trading/reports`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const tradingData = tradingRes.ok ? await tradingRes.json() : [];
      
      const activity: RecentActivity[] = [];
      
      // Add assignment activities
      assignmentsData.forEach((assignment: any) => {
        const assignmentDate = new Date(assignment.updatedAt);
        if (isValid(assignmentDate)) {
          activity.push({
            id: `assignment-${assignment.id}`,
            type: 'assignment',
            title: assignment.submitted ? `Submitted: ${assignment.title}` : `Started: ${assignment.title}`,
            date: format(assignmentDate, 'MMM d, yyyy'),
            icon: Assignment,
            description: assignment.submitted ? 'Assignment submitted successfully' : 'Assignment in progress',
          });
        }
      });
      
      // Add attendance activities
      attendanceData.forEach((attendance: any) => {
        const attendanceDate = new Date(attendance.date);
        if (isValid(attendanceDate)) {
          activity.push({
            id: `attendance-${attendance.id}`,
            type: 'attendance',
            title: `Marked ${attendance.status}`,
            date: format(attendanceDate, 'MMM d, yyyy'),
            icon: attendance.status === 'present' ? CheckCircle : Warning,
            description: `Attendance recorded for ${format(attendanceDate, 'EEEE')}`,
          });
        }
      });
      
      // Add quiz activities
      quizData.forEach((quiz: any) => {
        const quizDate = new Date(quiz.completedAt);
        if (isValid(quizDate)) {
          activity.push({
            id: `quiz-${quiz.id}`,
            type: 'quiz',
            title: `Quiz completed: ${quiz.title}`,
            date: format(quizDate, 'MMM d, yyyy'),
            icon: Assessment,
            description: `Score: ${quiz.score}%`,
          });
        }
      });
      
      // Add trading report activities
      tradingData.forEach((report: any) => {
        const reportDate = new Date(report.submittedAt);
        if (isValid(reportDate)) {
          activity.push({
            id: `trading-${report.id}`,
            type: 'trading',
            title: `Trading report submitted`,
            date: format(reportDate, 'MMM d, yyyy'),
            icon: TrendingUp,
            description: `P&L: ₹${report.dailyPnL}`,
          });
        }
      });
      
      // Sort by date (most recent first) and take last 10
      activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activity.slice(0, 10));
    } catch (err) {
      console.error("Error fetching recent activity:", err);
      // Fallback to mock data
      setRecentActivity([
        { id: "1", type: "assignment", title: "Assignment 1 submitted", date: "2 hours ago", icon: Assignment, description: "Submitted successfully" },
        { id: "2", type: "attendance", title: "Marked present today", date: "Today", icon: CheckCircle, description: "Attendance recorded" },
        { id: "3", type: "quiz", title: "Quiz 1 completed - Score: 85%", date: "Yesterday", icon: Assessment, description: "Great performance!" },
        { id: "4", type: "trading", title: "Trading report submitted", date: "2 days ago", icon: TrendingUp, description: "P&L: ₹2,500" },
      ]);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <Quiz />;
      case 'assignment': return <Assignment />;
      case 'grade': return <Grade />;
      case 'deadline': return <Timer />;
      case 'announcement': return <NewReleases />;
      default: return <NotificationsNone />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'quiz': return 'primary';
      case 'assignment': return 'info';
      case 'grade': return 'success';
      case 'deadline': return 'warning';
      case 'announcement': return 'secondary';
      default: return 'default';
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    markNotificationAsRead(notification.id);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return;
    
    setFeedbackSubmitting(true);
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedback: feedbackText.trim(),
          studentName: profile?.firstname || session?.user?.name || 'Anonymous',
        }),
      });
      
      if (res.ok) {
        setFeedbackText('');
        setFeedbackOpen(false);
        setFeedbackSuccess(true);
      } else {
        alert('Failed to submit feedback. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color, onClick }: any) => (
    <Card sx={{ height: "100%", cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <CardContent>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} mt={1}>
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
        {/* Welcome Header with Profile Info */}
        <Box mb={4}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h4" fontWeight={700} color="#1f2937">
                Welcome back, {profile?.firstname || session?.user?.name || "Student"}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Here's your learning progress and upcoming activities
              </Typography>
              
              {/* Student Info */}
              <Box mt={2} p={2.5} sx={{ 
                bgcolor: 'background.paper', 
                borderRadius: 2.5, 
                border: '1px solid', 
                borderColor: 'grey.200',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Name
                      </Typography>
                      <Typography variant="body2" color="text.primary" fontWeight={500}>
                        {profile?.firstname || session?.user?.name || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Course
                      </Typography>
                      <Typography variant="body2" color="text.primary" fontWeight={500}>
                        {profile?.student_profiles?.coursename || 'Algorithmic Trading Mastery'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Duration
                      </Typography>
                      <Typography variant="body2" color="text.primary" fontWeight={500}>
                        {
                        profile?.enrolledAt 
                          ? `${Math.floor((new Date().getTime() - new Date(profile.enrolledAt).getTime()) / (1000 * 60 * 60 * 24 * 30))} months`
                          : '6 months'
                      }
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Announcements Section */}
        <Box mb={4}>
          <AnnouncementComponent onUnreadCountChange={(count) => {
            // Update sidebar notification badge
            setUnreadAnnouncements(count);
          }} />
        </Box>

        {/* Stats Grid */}
        <Grid container spacing={3} mb={4}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Attendance Rate"
              value={stats.attendanceRate !== null ? `${stats.attendanceRate}%` : 'No Data'}
              subtitle={stats.attendanceRate !== null ? "Keep it up!" : "No attendance records"}
              icon={CalendarMonth}
              color={stats.attendanceRate !== null ? "success" : "default"}
              onClick={() => router.push("/student/attendance")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Assignments"
              value={stats.assignmentsPending}
              subtitle={`${stats.assignmentsSubmitted} submitted, ${stats.assignmentsPending} pending`}
              icon={Assignment}
              color="warning"
              onClick={() => router.push("/student/assignments")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Average Score"
              value={`${stats.averageScore}%`}
              subtitle={`Across ${stats.totalQuizzes} quizzes`}
              icon={Assessment}
              color="info"
              onClick={() => router.push("/student/evaluation")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Trading Reports"
              value={stats.tradingReports}
              subtitle="Submitted by you"
              icon={TrendingUp}
              color="primary"
              onClick={() => router.push("/student/quantlive")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Upcoming Deadlines"
              value={stats.upcomingDeadlines}
              subtitle="Next 7 days"
              icon={EventAvailable}
              color="error"
              onClick={() => router.push("/student/assignments")}
            />
          </Grid>
        </Grid>

        {/* Overall Progress Graphs */}
        <Grid container spacing={3} mb={3}>
          {/* Activity Distribution - Real Data */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Activity Distribution
                </Typography>
                <Box height={300}>
                  <PieChart
                    series={[
                      {
                        data: [
                          { id: 0, value: stats.assignmentsSubmitted, label: `Completed (${stats.assignmentsSubmitted})` },
                          { id: 1, value: stats.assignmentsPending, label: `Pending (${stats.assignmentsPending})` },
                          { id: 2, value: stats.totalQuizzes, label: `Quizzes (${stats.totalQuizzes})` },
                          { id: 3, value: stats.tradingReports, label: `Reports (${stats.tradingReports})` },
                        ].filter(item => item.value > 0),
                        innerRadius: 30,
                        outerRadius: 100,
                        paddingAngle: 2,
                        cornerRadius: 4,
                      },
                    ]}
                    height={250}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {/* Fees Status */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Fees Status
                </Typography>
                <Box height={300}>
                  <PieChart
                    series={[
                      {
                        data: [
                          { id: 0, value: 25000, label: `Paid (₹25,000)` },
                          { id: 1, value: 15000, label: `Pending (₹15,000)` },
                        ],
                        innerRadius: 30,
                        outerRadius: 100,
                        paddingAngle: 2,
                        cornerRadius: 4,
                      },
                    ]}
                    height={250}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Notifications and Updates */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={3}>
              Notifications & Recent Updates
            </Typography>
            <Grid container spacing={2}>
              {notifications.slice(0, 4).map((notification, index) => (
                <Grid size={{ xs: 12, sm: 6 }} key={index}>
                  <Box 
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: notification.type === 'deadline' ? 'warning.light' : 
                               notification.type === 'grade' ? 'success.light' : 
                               notification.type === 'birthday' ? 'primary.light' : 'grey.100',
                      border: '1px solid',
                      borderColor: notification.type === 'deadline' ? 'warning.main' : 
                                notification.type === 'grade' ? 'success.main' : 
                                notification.type === 'birthday' ? 'primary.main' : 'grey.300'
                    }}
                  >
                    <Typography variant="body2" fontWeight={500} color="text.primary">
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notification.message}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Floating Feedback Button - Hidden during quizzes */}
        {!window.location.pathname.includes('/evaluation') && !window.location.pathname.includes('/quiz') && (
          <Fab
            color="primary"
            aria-label="feedback"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              bgcolor: '#e27719',
              '&:hover': {
                bgcolor: '#d46909',
              },
              zIndex: 1000,
            }}
            onClick={() => setFeedbackOpen(true)}
          >
            <Feedback />
          </Fab>
        )}

        {/* Feedback Dialog */}
        <Dialog
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              We value your feedback! Please share your thoughts, suggestions, or report any issues.
            </Typography>
            <TextField
              autoFocus
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              placeholder="Type your feedback here..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              disabled={feedbackSubmitting}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFeedbackOpen(false)} disabled={feedbackSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={submitFeedback}
              variant="contained"
              disabled={!feedbackText.trim() || feedbackSubmitting}
              startIcon={<Send />}
            >
              {feedbackSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Feedback Success Dialog */}
        <Dialog
          open={feedbackSuccess}
          onClose={() => setFeedbackSuccess(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogContent sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: '#4caf50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2
              }}
            >
              <CheckCircle sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Thank You!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Your feedback has been successfully submitted. We appreciate your input and will review it carefully.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
            <Button
              onClick={() => setFeedbackSuccess(false)}
              variant="contained"
              sx={{
                bgcolor: '#4caf50',
                '&:hover': { bgcolor: '#45a049' }
              }}
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
