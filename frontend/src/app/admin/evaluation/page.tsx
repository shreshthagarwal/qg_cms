"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Avatar,
  IconButton,
  LinearProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Rating,
  Switch,
  FormControlLabel,
  Checkbox,
  ListItemText,
} from "@mui/material";
import {
  Assessment,
  Add,
  Edit,
  Delete,
  Search,
  Timer,
  Person,
  CheckCircle,
  Warning,
  Schedule,
  Flag,
  Visibility,
  Refresh,
  PlayArrow,
  Stop,
  Archive,
  Unarchive,
  TrendingUp,
  TrendingDown,
} from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { ThemeProvider } from "../../../components/theme";
import { format, subDays, isPast, isToday, isValid } from "date-fns";

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

interface Quiz {
  id: string;
  title: string;
  description: string;
  duration: number;
  deadline: string;
  assignedTo: string[];
  createdAt: string;
  status: 'draft' | 'active' | 'archived';
  course: string;
}

interface SubmittedQuiz {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  score: number | null;
  windowSwitches: number;
  cheatingFlagged: boolean;
  status: 'submitted' | 'graded' | 'archived';
  timeTaken?: number;
}

interface QuizAssignment {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  deadline: string;
  duration: number;
  status: string;
  assignedAt: string;
}

interface CombinedQuizData {
  id: string;
  type: 'assignment' | 'submission';
  studentId: string;
  studentName: string;
  studentEmail: string;
  quizId: string;
  quizTitle: string;
  deadline: string;
  duration: number;
  assignedAt: string;
  submittedAt: string | null;
  score: number | null;
  timeTaken: number | null;
  windowSwitches: number;
  cheatingFlagged: boolean;
  status: string;
}

export default function AdminEvaluationPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submittedQuizzes, setSubmittedQuizzes] = useState<SubmittedQuiz[]>([]);
  const [quizAssignments, setQuizAssignments] = useState<QuizAssignment[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [deadline, setDeadline] = useState("");
  const [course, setCourse] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmittedQuiz | null>(null);
  const [submissionDetails, setSubmissionDetails] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    activeQuizzes: 0,
    submittedQuizzes: 0,
    averageScore: 0,
    cheatingIncidents: 0,
    weeklySubmissions: [] as any[],
    scoreDistribution: [] as any[],
  });

  useEffect(() => {
    fetchQuizzes();
    fetchSubmittedQuizzes();
    fetchQuizAssignments();
    fetchStudents();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [quizzes, submittedQuizzes]);

  const fetchQuizzes = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch quizzes");
      
      const data = await res.json();
      setQuizzes(data);
    } catch (err) {
      setError("Error loading quizzes");
      console.error(err);
    }
  };

  const fetchSubmittedQuizzes = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/submitted`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch submitted quizzes");
      
      const data = await res.json();
      setSubmittedQuizzes(data);
    } catch (err) {
      console.error("Error fetching submitted quizzes:", err);
    }
  };

  const fetchQuizAssignments = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch quiz assignments");
      
      const data = await res.json();
      setQuizAssignments(data);
    } catch (err) {
      console.error("Error fetching quiz assignments:", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch students");
      
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalQuizzes = (quizzes || []).length;
    const activeQuizzes = (quizzes || []).filter(q => q.status === "active").length;
    const submittedQuizzesCount = (submittedQuizzes || []).length;
    const gradedQuizzes = (submittedQuizzes || []).filter(s => s.score !== null);
    const averageScore = gradedQuizzes.length > 0
      ? Math.round(gradedQuizzes.reduce((sum, s) => sum + (s.score || 0), 0) / gradedQuizzes.length)
      : 0;
    const cheatingIncidents = (submittedQuizzes || []).filter(s => s.cheatingFlagged).length;

    // Calculate weekly submissions
    const weeklyData = [];
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      
      const weekSubmissions = (submittedQuizzes || []).filter(s => {
        const submittedDate = new Date(s.submittedAt);
        return submittedDate >= weekStart && submittedDate < weekEnd;
      }).length;
      
      weeklyData.push({
        week: `Week ${4 - i}`,
        submissions: weekSubmissions,
      });
    }

    // Calculate score distribution
    const scoreRanges = [
      { range: "0-20", count: 0 },
      { range: "21-40", count: 0 },
      { range: "41-60", count: 0 },
      { range: "61-80", count: 0 },
      { range: "81-100", count: 0 },
    ];

    gradedQuizzes.forEach(quiz => {
      const score = quiz.score || 0;
      if (score <= 20) scoreRanges[0].count++;
      else if (score <= 40) scoreRanges[1].count++;
      else if (score <= 60) scoreRanges[2].count++;
      else if (score <= 80) scoreRanges[3].count++;
      else scoreRanges[4].count++;
    });

    setStats({
      totalQuizzes,
      activeQuizzes,
      submittedQuizzes: submittedQuizzesCount,
      averageScore,
      cheatingIncidents,
      weeklySubmissions: weeklyData,
      scoreDistribution: scoreRanges,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleCreateQuiz = async () => {
    if (!title || !description || !duration || !uploadedFile) {
      setError("Please fill in all required fields and upload a file");
      return;
    }

    try {
      const token = (session?.user as any)?.accessToken;
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('duration', duration);
      formData.append('file', uploadedFile);
      formData.append('assignedTo', JSON.stringify(selectedStudents));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to create quiz from Excel");

      setSuccess("Quiz created successfully from Excel file!");
      setCreateDialogOpen(false);
      resetForm();
      fetchQuizzes();
    } catch (err) {
      setError("Error creating quiz from Excel file");
    }
  };

  const handleUpdateQuiz = async () => {
    if (!selectedQuiz || !title || !description || !duration || !deadline || !course) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${selectedQuiz.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          duration: parseInt(duration),
          deadline,
          course,
          assignedTo: selectedStudents,
        }),
      });

      if (!res.ok) throw new Error("Failed to update quiz");

      setSuccess("Quiz updated successfully!");
      setEditDialogOpen(false);
      resetForm();
      fetchQuizzes();
    } catch (err) {
      setError("Error updating quiz");
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${quizId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete quiz");

      setSuccess("Quiz deleted successfully!");
      fetchQuizzes();
    } catch (err) {
      setError("Error deleting quiz");
    }
  };

  const handleToggleQuizStatus = async (quizId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "draft" : "active";
    
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${quizId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update quiz status");

      setSuccess(`Quiz ${newStatus === "active" ? "activated" : "deactivated"} successfully!`);
      fetchQuizzes();
    } catch (err) {
      setError("Error updating quiz status");
    }
  };

  const handleAssignQuiz = async () => {
    if (!selectedQuiz || selectedStudents.length === 0) {
      setError("Please select students to assign");
      return;
    }

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${selectedQuiz.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          studentIds: selectedStudents,
          deadline: deadline,
          duration: selectedQuiz.duration
        }),
      });

      if (!res.ok) throw new Error("Failed to assign quiz");

      setSuccess("Quiz assigned successfully!");
      setAssignDialogOpen(false);
      fetchQuizAssignments();
    } catch (err) {
      setError("Error assigning quiz");
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/assignments/${assignmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete assignment");

      setSuccess("Assignment deleted successfully!");
      fetchQuizAssignments();
    } catch (err) {
      setError("Error deleting assignment");
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/submissions/${submissionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("Delete submission error:", errorData);
        throw new Error(errorData.error || "Failed to delete submission");
      }

      setSuccess("Submission deleted successfully!");
      // Refresh both submissions and assignments to update the combined table
      await fetchSubmittedQuizzes();
      await fetchQuizAssignments();
    } catch (err: any) {
      console.error("Delete submission error:", err);
      setError(err.message || "Error deleting submission");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDuration("");
    setDeadline("");
    setCourse("");
    setSelectedStudents([]);
    setSelectedQuiz(null);
    setUploadedFile(null);
  };

  const openEditDialog = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setTitle(quiz.title);
    setDescription(quiz.description);
    setDuration(quiz.duration.toString());
    setDeadline(quiz.deadline);
    setCourse(quiz.course);
    setSelectedStudents(quiz.assignedTo || []);
    setEditDialogOpen(true);
  };

  const openAssignDialog = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setSelectedStudents([]);
    setAssignDialogOpen(true);
  };

  const openViewDialog = async (submission: SubmittedQuiz) => {
    setSelectedSubmission(submission);
    setViewDialogOpen(true);
    
    // Fetch submission details with answers
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/submissions/${submission.id}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setSubmissionDetails(data);
      }
    } catch (err) {
      console.error("Error fetching submission details:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "success";
      case "draft": return "warning";
      case "archived": return "default";
      case "submitted": return "info";
      case "graded": return "success";
      default: return "default";
    }
  };

  const getDeadlineStatus = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    if (isPast(deadlineDate) && !isToday(deadlineDate)) return "error";
    if (isToday(deadlineDate)) return "warning";
    return "success";
  };

  const filteredQuizzes = (quizzes || []).filter(quiz =>
    (quiz.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (quiz.course?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const filteredSubmissions = (submittedQuizzes || []).filter(submission =>
    (submission.studentName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (submission.quizTitle?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // Combine assignments and submissions into unified data
  const combinedData = useMemo((): CombinedQuizData[] => {
    const result: CombinedQuizData[] = [];
    
    // Process all assignments
    (quizAssignments || []).forEach(assignment => {
      // Check if this assignment has a submission
      const submission = submittedQuizzes?.find(s => 
        s.quizId === assignment.quizId && s.studentId === assignment.studentId
      );
      
      if (submission) {
        // This assignment has been submitted - show submission data
        result.push({
          id: submission.id,
          type: 'submission',
          studentId: assignment.studentId,
          studentName: assignment.studentName,
          studentEmail: assignment.studentEmail,
          quizId: assignment.quizId,
          quizTitle: submission.quizTitle,
          deadline: assignment.deadline,
          duration: assignment.duration,
          assignedAt: assignment.assignedAt,
          submittedAt: submission.submittedAt,
          score: submission.score,
          timeTaken: submission.timeTaken || null,
          windowSwitches: submission.windowSwitches,
          cheatingFlagged: submission.cheatingFlagged,
          status: submission.status,
        });
      } else {
        // This assignment hasn't been submitted yet - show assignment data
        result.push({
          id: assignment.id,
          type: 'assignment',
          studentId: assignment.studentId,
          studentName: assignment.studentName,
          studentEmail: assignment.studentEmail,
          quizId: assignment.quizId,
          quizTitle: quizzes.find(q => q.id === assignment.quizId)?.title || "Unknown Quiz",
          deadline: assignment.deadline,
          duration: assignment.duration,
          assignedAt: assignment.assignedAt,
          submittedAt: null,
          score: null,
          timeTaken: null,
          windowSwitches: 0,
          cheatingFlagged: false,
          status: assignment.status,
        });
      }
    });
    
    return result.sort((a, b) => {
      // Sort by submittedAt (submissions first), then by assignedAt
      if (a.type === 'submission' && b.type === 'assignment') return -1;
      if (a.type === 'assignment' && b.type === 'submission') return 1;
      if (a.type === 'submission' && b.type === 'submission') {
        return new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime();
      }
      return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
    });
  }, [quizAssignments, submittedQuizzes, quizzes]);

  const filteredCombinedData = combinedData.filter((item: CombinedQuizData) =>
    (item.studentName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (item.quizTitle?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <Card sx={{ height: "100%" }}>
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
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="#1f2937">
              Tests & Evaluations
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage student assessments
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchQuizzes}>
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetForm();
                setCreateDialogOpen(true);
              }}
            >
              Create Quiz
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
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Quizzes"
              value={stats.totalQuizzes}
              subtitle="Created assessments"
              icon={Assessment}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Active Quizzes"
              value={stats.activeQuizzes}
              subtitle="Currently running"
              icon={PlayArrow}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Submissions"
              value={stats.submittedQuizzes}
              subtitle="Student responses"
              icon={CheckCircle}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Average Score"
              value={`${stats.averageScore}%`}
              subtitle="Performance metric"
              icon={TrendingUp}
              color={stats.averageScore >= 60 ? "success" : "warning"}
            />
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Weekly Submissions
                </Typography>
                <Box height={250}>
                  <LineChart
                    series={[
                      {
                        data: (stats.weeklySubmissions || []).map(w => w.submissions),
                        label: "Submissions",
                        color: "#e27719",
                        area: true,
                      },
                    ]}
                    xAxis={[
                      {
                        data: (stats.weeklySubmissions || []).map(w => w.week),
                        scaleType: "point",
                      },
                    ]}
                    height={250}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Score Distribution
                </Typography>
                <Box height={250}>
                  <BarChart
                    series={[
                      {
                        data: (stats.scoreDistribution || []).map(s => s.count),
                        color: "#e27719",
                      },
                    ]}
                    xAxis={[
                      {
                        data: (stats.scoreDistribution || []).map(s => s.range),
                        scaleType: "band",
                      },
                    ]}
                    height={250}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Card>
          <CardContent>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
              <Tab label="Quizzes" />
              <Tab label="Submissions & Assignments" />
            </Tabs>

            {/* Quizzes Tab */}
            {activeTab === 0 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight={600}>
                    Quiz List
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Search quizzes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                    }}
                  />
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Assigned</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredQuizzes.map((quiz) => (
                        <TableRow key={quiz.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {quiz.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {quiz.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" display="flex" alignItems="center" gap={1}>
                              <Timer fontSize="small" />
                              {quiz.duration} min
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {quizAssignments.filter(a => a.quizId === quiz.id).length} students
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <IconButton
                                size="small"
                                onClick={() => openEditDialog(quiz)}
                                title="Edit"
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => openAssignDialog(quiz)}
                                title="Assign to Students"
                              >
                                <Person />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteQuiz(quiz.id)}
                                title="Delete"
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

                {filteredQuizzes.length === 0 && (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary" mb={2}>
                      No quizzes found
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      Create First Quiz
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Submissions & Assignments Tab */}
            {activeTab === 1 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight={600}>
                    Student Submissions & Assignments ({filteredCombinedData.length})
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Search submissions and assignments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                    }}
                  />
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Quiz</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Submitted/Assigned</TableCell>
                        <TableCell>Score/Deadline</TableCell>
                        <TableCell>Time/Duration</TableCell>
                        <TableCell>Flags</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredCombinedData.map((item: CombinedQuizData) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.studentName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.studentEmail}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {item.quizTitle}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.type === 'submission' ? 'Submitted' : 'Assigned'}
                              size="small"
                              color={item.type === 'submission' ? 'success' : 'info'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {item.type === 'submission' 
                                ? safeFormat(item.submittedAt!, "MMM d, yyyy HH:mm")
                                : safeFormat(item.assignedAt, "MMM d, yyyy")
                              }
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {item.type === 'submission' ? (
                              item.score !== null ? (
                                <Typography variant="body2" fontWeight={600}>
                                  {item.score}/100
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  Not graded
                                </Typography>
                              )
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Due: {safeFormat(item.deadline, "MMM d, yyyy")}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" display="flex" alignItems="center" gap={1}>
                              <Timer fontSize="small" />
                              {item.type === 'submission' 
                                ? (item.timeTaken ? `${Math.round(item.timeTaken / 60)} min` : "N/A")
                                : `${item.duration} min`
                              }
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {item.type === 'submission' && (
                              <Box display="flex" gap={1}>
                                {item.cheatingFlagged && (
                                  <Chip
                                    icon={<Warning />}
                                    label="Flagged"
                                    size="small"
                                    color="error"
                                  />
                                )}
                                {item.windowSwitches > 0 && (
                                  <Chip
                                    icon={<Flag />}
                                    label={`${item.windowSwitches} switches`}
                                    size="small"
                                    color="warning"
                                  />
                                )}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.type === 'submission' ? (
                              <Box display="flex" gap={1}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Visibility />}
                                  onClick={() => window.open(`/admin/evaluation/submission/${item.id}`, '_blank')}
                                >
                                  View Details
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  startIcon={<Delete />}
                                  onClick={() => handleDeleteSubmission(item.id)}
                                >
                                  Delete
                                </Button>
                              </Box>
                            ) : (
                              <Box display="flex" gap={1}>
                                <Typography variant="body2" color="text.secondary">
                                  Not submitted
                                </Typography>
                                <Button
                                  size="small"
                                  color="error"
                                  startIcon={<Delete />}
                                  onClick={() => handleDeleteAssignment(item.id)}
                                >
                                  Delete
                                </Button>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {filteredCombinedData.length === 0 && (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary">
                      No submissions or assignments found
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Create Quiz Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create Quiz</DialogTitle>
          <DialogContent>
            <Box mt={2} display="flex" flexDirection="column" gap={2}>
              <TextField
                fullWidth
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <TextField
                fullWidth
                type="number"
                label="Duration (minutes)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <Box
                sx={{
                  border: "2px dashed #ccc",
                  borderRadius: 1,
                  p: 3,
                  textAlign: "center",
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: "primary.main",
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                }}
                onClick={() => document.getElementById('quiz-file-upload')?.click()}
              >
                <input
                  id="quiz-file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
                {uploadedFile ? (
                  <Box>
                    <Typography variant="body1" fontWeight={600} color="primary.main" mb={1}>
                      {uploadedFile.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click to change file
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body1" fontWeight={600} mb={1}>
                      Upload Excel File for Quiz
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click to browse or drag and drop your Excel file here
                    </Typography>
                    <Typography variant="caption" color="text.secondary" mt={1}>
                      Supported formats: .xlsx, .xls
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleCreateQuiz}>
              Create Quiz
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Quiz Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Edit Quiz</DialogTitle>
          <DialogContent>
            <Box mt={2} display="flex" flexDirection="column" gap={2}>
              <TextField
                fullWidth
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <TextField
                fullWidth
                type="number"
                label="Duration (minutes)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdateQuiz}>
              Update Quiz
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assign Quiz Dialog */}
        <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Assign Quiz to Students</DialogTitle>
          <DialogContent>
            {selectedQuiz && (
              <Box mt={2}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  {selectedQuiz.title}
                </Typography>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Deadline"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Students</InputLabel>
                  <Select
                    multiple
                    value={selectedStudents}
                    onChange={(e) => setSelectedStudents(e.target.value as string[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const student = students?.find(s => s.id === value);
                          return student ? (
                            <Chip
                              key={value}
                              label={`${student.firstname} ${student.lastname}`}
                              size="small"
                            />
                          ) : null;
                        })}
                      </Box>
                    )}
                  >
                    {(students || []).map((student) => (
                      <MenuItem key={student.id} value={student.id}>
                        <Checkbox checked={selectedStudents.includes(student.id)} />
                        <ListItemText primary={`${student.firstname} ${student.lastname} (${student.email})`} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAssignQuiz}>
              Assign Quiz
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Submission Dialog */}
        <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Submission Details</DialogTitle>
          <DialogContent>
            {selectedSubmission && (
              <Box mt={2}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Student
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {selectedSubmission.studentName}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Quiz
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {selectedSubmission.quizTitle}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Submitted
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {safeFormat(selectedSubmission?.submittedAt, "MMM d, yyyy HH:mm")}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Score
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {selectedSubmission.score ? `${selectedSubmission.score}%` : "Not graded"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Time Taken
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {selectedSubmission.timeTaken ? `${Math.round(selectedSubmission.timeTaken / 60)} minutes` : "N/A"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Window Switches
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {selectedSubmission.windowSwitches}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    Cheating Flagged
                  </Typography>
                  <Chip
                    label={selectedSubmission.cheatingFlagged ? "Yes" : "No"}
                    size="small"
                    color={selectedSubmission.cheatingFlagged ? "error" : "success"}
                  />
                </Box>

                {/* Quiz Answers Review */}
                {submissionDetails?.answers && (
                  <Box mt={4}>
                    <Typography variant="h6" fontWeight={600} mb={2}>
                      Quiz Answers Review
                    </Typography>
                    {submissionDetails.answers.map((answer: any, index: number) => (
                      <Card 
                        key={answer.questionId} 
                        sx={{ 
                          mb: 2, 
                          bgcolor: answer.isCorrect ? "success.light" : "error.light",
                          border: answer.isCorrect ? "1px solid" : "1px solid",
                          borderColor: answer.isCorrect ? "success.main" : "error.main"
                        }}
                      >
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight={600} mb={1}>
                            Question {index + 1}: {answer.question}
                          </Typography>
                          <Box mt={1}>
                            {answer.options.map((option: string, optIndex: number) => (
                              <Typography
                                key={optIndex}
                                variant="body2"
                                sx={{
                                  p: 1,
                                  mb: 0.5,
                                  borderRadius: 1,
                                  bgcolor: optIndex === answer.correctAnswer
                                    ? "success.main"
                                    : optIndex === answer.userAnswer && !answer.isCorrect
                                    ? "error.main"
                                    : "transparent",
                                  color: optIndex === answer.correctAnswer || (optIndex === answer.userAnswer && !answer.isCorrect)
                                    ? "white"
                                    : "inherit",
                                  fontWeight: optIndex === answer.correctAnswer || optIndex === answer.userAnswer ? 600 : 400,
                                }}
                              >
                                {String.fromCharCode(65 + optIndex)}. {option}
                                {optIndex === answer.correctAnswer && " ✓ Correct Answer"}
                                {optIndex === answer.userAnswer && !answer.isCorrect && " ✗ Student's Answer (Incorrect)"}
                                {optIndex === answer.userAnswer && answer.isCorrect && " ✓ Student's Answer (Correct)"}
                              </Typography>
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
