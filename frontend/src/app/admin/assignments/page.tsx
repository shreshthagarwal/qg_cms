"use client";

import { useEffect, useState } from "react";
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
  TextareaAutosize,
  Checkbox,
  ListItemText,
} from "@mui/material";
import {
  Assignment,
  Add,
  Edit,
  Delete,
  Search,
  Description,
  CalendarMonth,
  Person,
  CheckCircle,
  Pending,
  Schedule,
  Grade,
  Link as LinkIcon,
  GitHub,
  Refresh,
  Visibility,
  Star,
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

interface AssignmentData {
  id: string;
  title: string;
  description: string;
  deadline: string;
  link?: string;
  createdAt: string;
}

interface Student {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
}

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  fileUrl: string;
  githubLink: string;
  notes: string;
  status: 'submitted' | 'graded';
  score: number | null;
  feedback: string;
  submittedAt: string;
}

export default function AdminAssignmentsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Record<string, string[]>>({});
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentData | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [viewAssignedDialogOpen, setViewAssignedDialogOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [link, setLink] = useState("");
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [editSelectedStudents, setEditSelectedStudents] = useState<string[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalAssignments: 0,
    pendingSubmissions: 0,
    submittedAssignments: 0,
    gradedAssignments: 0,
    averageScore: 0,
    weeklySubmissions: [] as any[],
  });

  useEffect(() => {
    fetchAssignments();
    fetchStudents();
    fetchSubmissions();
  }, []);

  useEffect(() => {
    if (assignments.length > 0) {
      fetchAllAssignedStudents();
    }
  }, [assignments]);

  useEffect(() => {
    calculateStats();
  }, [assignments, submissions, assignedStudents]);

  const fetchAssignments = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch assignments");
      
      const data = await res.json();
      setAssignments(data);
    } catch (err) {
      setError("Error loading assignments");
      console.error(err);
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
    }
  };

  const fetchSubmissions = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch submissions");
      
      const data = await res.json();
      setSubmissions(data);
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAssignedStudents = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const assignedMap: Record<string, string[]> = {};
      
      for (const assignment of assignments) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${assignment.id}/assigned-students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          assignedMap[assignment.id] = data.map((a: any) => a.student_id);
        }
      }
      
      setAssignedStudents(assignedMap);
    } catch (err) {
      console.error("Error fetching assigned students:", err);
    }
  };

  const calculateStats = () => {
    const totalAssignments = assignments.length;
    const submittedAssignments = submissions.length;
    const gradedAssignments = submissions.filter(s => s.status === "graded").length;
    
    // Calculate total assigned students across all assignments
    const totalAssignedStudents = Object.values(assignedStudents).reduce((sum, studentIds) => sum + studentIds.length, 0);
    const pendingSubmissions = totalAssignedStudents - submittedAssignments;
    
    const averageScore = gradedAssignments > 0
      ? Math.round(submissions.filter(s => s.status === "graded").reduce((sum, s) => sum + (s.score || 0), 0) / gradedAssignments)
      : 0;

    // Calculate weekly submissions for the last 4 weeks
    const weeklyData = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = subDays(new Date(), i * 7);
      const weekEnd = subDays(weekStart, -7);
      const weekSubmissions = submissions.filter(s => {
        const submittedDate = new Date(s.submittedAt);
        return submittedDate >= weekEnd && submittedDate <= weekStart;
      }).length;
      
      weeklyData.push({
        week: `Week ${4 - i}`,
        submissions: weekSubmissions,
      });
    }

    setStats({
      totalAssignments,
      pendingSubmissions,
      submittedAssignments,
      gradedAssignments,
      averageScore,
      weeklySubmissions: weeklyData,
    });
  };

  const handleCreateAssignment = async () => {
    if (!title || !description || !deadline || selectedStudents.length === 0) {
      setError("Please fill in all required fields and select at least one student");
      return;
    }

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          deadline,
          link,
          studentIds: selectedStudents,
        }),
      });

      if (!res.ok) throw new Error("Failed to create assignment");

      setSuccess("Assignment created and assigned to students successfully!");
      setCreateDialogOpen(false);
      resetForm();
      fetchAssignments();
    } catch (err) {
      setError("Error creating assignment");
    }
  };

  const handleUpdateAssignment = async () => {
    if (!selectedAssignment || !title || !description || !deadline || editSelectedStudents.length === 0) {
      setError("Please fill in all required fields and select at least one student");
      return;
    }

    try {
      const token = (session?.user as any)?.accessToken;
      
      // Update assignment details
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${selectedAssignment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          deadline,
          link,
        }),
      });

      if (!res.ok) throw new Error("Failed to update assignment");

      // Update assigned students
      const currentAssigned = assignedStudents[selectedAssignment.id] || [];
      
      // Remove unselected students
      const toRemove = currentAssigned.filter(id => !editSelectedStudents.includes(id));
      for (const studentId of toRemove) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${selectedAssignment.id}/students/${studentId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      
      // Add newly selected students
      const toAdd = editSelectedStudents.filter(id => !currentAssigned.includes(id));
      if (toAdd.length > 0) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${selectedAssignment.id}/students`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ studentIds: toAdd }),
        });
      }

      setSuccess("Assignment and student assignments updated successfully!");
      setEditDialogOpen(false);
      resetForm();
      fetchAssignments();
      fetchAllAssignedStudents();
    } catch (err) {
      setError("Error updating assignment");
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${assignmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete assignment");

      setSuccess("Assignment deleted successfully!");
      fetchAssignments();
      fetchSubmissions();
    } catch (err) {
      setError("Error deleting assignment");
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !score) {
      setError("Please provide a score");
      return;
    }

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/submissions/${selectedSubmission.id}/grade`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          score: parseInt(score),
          feedback,
        }),
      });

      if (!res.ok) throw new Error("Failed to grade submission");

      setSuccess("Submission graded successfully!");
      setGradeDialogOpen(false);
      resetGradeForm();
      fetchSubmissions();
    } catch (err) {
      setError("Error grading submission");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDeadline("");
    setLink("");
    setSelectedStudents([]);
    setSelectedAssignment(null);
  };

  const resetGradeForm = () => {
    setScore("");
    setFeedback("");
    setSelectedSubmission(null);
  };

  const openEditDialog = async (assignment: AssignmentData) => {
    setSelectedAssignment(assignment);
    setTitle(assignment.title);
    setDescription(assignment.description);
    setDeadline(assignment.deadline);
    setLink(assignment.link || "");
    // Load currently assigned students
    const currentAssigned = assignedStudents[assignment.id] || [];
    setEditSelectedStudents(currentAssigned);
    setEditDialogOpen(true);
  };

  const openGradeDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setScore(submission.score?.toString() || "");
    setFeedback(submission.feedback);
    setGradeDialogOpen(true);
  };

  const openViewAssignedDialog = (assignment: AssignmentData) => {
    setSelectedAssignment(assignment);
    setViewAssignedDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "graded": return "success";
      case "submitted": return "info";
      default: return "default";
    }
  };

  const getDeadlineStatus = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    if (isPast(deadlineDate) && !isToday(deadlineDate)) return "error";
    if (isToday(deadlineDate)) return "warning";
    return "success";
  };

  const filteredAssignments = assignments.filter(assignment =>
    (assignment.title?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const filteredSubmissions = submissions.filter(submission =>
    (submission.studentName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (submission.assignmentId?.toLowerCase() || "").includes(searchQuery.toLowerCase())
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
              Assignments Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and grade student assignments
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchAssignments}>
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
              Create Assignment
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
              title="Total Assignments"
              value={stats.totalAssignments}
              subtitle="Created by you"
              icon={Assignment}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Pending Submissions"
              value={stats.pendingSubmissions}
              subtitle="Awaiting submission"
              icon={Pending}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Submitted"
              value={stats.submittedAssignments}
              subtitle="Student submissions"
              icon={CheckCircle}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Average Score"
              value={`${stats.averageScore}%`}
              subtitle="Across graded assignments"
              icon={Grade}
              color="success"
            />
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Score Distribution
                </Typography>
                <Box height={300}>
                  <BarChart
                    series={[
                      {
                        data: [
                          submissions.filter(s => s.status === "graded" && (s.score || 0) >= 90).length,
                          submissions.filter(s => s.status === "graded" && (s.score || 0) >= 80 && (s.score || 0) < 90).length,
                          submissions.filter(s => s.status === "graded" && (s.score || 0) >= 70 && (s.score || 0) < 80).length,
                          submissions.filter(s => s.status === "graded" && (s.score || 0) >= 60 && (s.score || 0) < 70).length,
                          submissions.filter(s => s.status === "graded" && (s.score || 0) < 60).length,
                        ],
                        color: "#e27719",
                      },
                    ]}
                    xAxis={[
                      {
                        data: ["90-100", "80-89", "70-79", "60-69", "<60"],
                        scaleType: "band",
                      },
                    ]}
                    height={300}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Submission Status
                </Typography>
                <Box height={300}>
                  <BarChart
                    series={[
                      {
                        data: [stats.submittedAssignments, stats.gradedAssignments],
                        color: "#e27719",
                      },
                    ]}
                    xAxis={[
                      {
                        data: ["Submitted", "Graded"],
                        scaleType: "band",
                      },
                    ]}
                    height={300}
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
              <Tab label="Assignments" />
              <Tab label="Submissions" />
            </Tabs>

            {/* Assignments Tab */}
            {activeTab === 0 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight={600}>
                    Assignment List
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Search assignments..."
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
                        <TableCell>Deadline</TableCell>
                        <TableCell>Submissions</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAssignments.map((assignment) => {
                        const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignment.id);
                        const gradedCount = assignmentSubmissions.filter(s => s.status === "graded").length;
                        const assignedCount = assignedStudents[assignment.id]?.length || 0;
                        
                        return (
                          <TableRow key={assignment.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {assignment.title}
                              </Typography>
                              {assignment.link && (
                                <Button
                                  size="small"
                                  startIcon={<LinkIcon />}
                                  href={assignment.link}
                                  target="_blank"
                                  sx={{ mt: 0.5 }}
                                >
                                  View Link
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={safeFormat(assignment.deadline, "MMM d, yyyy")}
                                size="small"
                                color={getDeadlineStatus(assignment.deadline) as any}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {assignmentSubmissions.length} / {assignedCount}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {gradedCount} graded
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {safeFormat(assignment.createdAt, "MMM d, yyyy")}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={1}>
                                <IconButton
                                  size="small"
                                  onClick={() => openViewAssignedDialog(assignment)}
                                  title="View Assigned Students"
                                >
                                  <Visibility />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => openEditDialog(assignment)}
                                  title="Edit"
                                >
                                  <Edit />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteAssignment(assignment.id)}
                                  title="Delete"
                                >
                                  <Delete />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {filteredAssignments.length === 0 && (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary" mb={2}>
                      No assignments found
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      Create First Assignment
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Submissions Tab */}
            {activeTab === 1 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight={600}>
                    Student Submissions
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Search submissions..."
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
                        <TableCell>Assignment</TableCell>
                        <TableCell>Submitted</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSubmissions.map((submission) => (
                        <TableRow key={submission.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {submission.studentName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {submission.studentEmail}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {assignments.find(a => a.id === submission.assignmentId)?.title || 'Unknown Assignment'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {safeFormat(submission.submittedAt, "MMM d, yyyy HH:mm")}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={submission.status}
                              size="small"
                              color={getStatusColor(submission.status) as any}
                            />
                          </TableCell>
                          <TableCell>
                            {submission.score !== null ? (
                              <Typography variant="body2" fontWeight={600}>
                                {submission.score}/100
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Not graded
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              {submission.fileUrl && (
                                <Button
                                  size="small"
                                  startIcon={<Description />}
                                  href={submission.fileUrl}
                                  target="_blank"
                                >
                                  File
                                </Button>
                              )}
                              {submission.githubLink && (
                                <Button
                                  size="small"
                                  startIcon={<GitHub />}
                                  href={submission.githubLink}
                                  target="_blank"
                                >
                                  GitHub
                                </Button>
                              )}
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Grade />}
                                onClick={() => openGradeDialog(submission)}
                              >
                                Grade
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {filteredSubmissions.length === 0 && (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary">
                      No submissions found
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Create Assignment Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create Assignment</DialogTitle>
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
                type="datetime-local"
                label="Deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="Link (Optional)"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Assign to Students</InputLabel>
                <Select
                  multiple
                  value={selectedStudents}
                  onChange={(e) => setSelectedStudents(e.target.value as string[])}
                  label="Assign to Students"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((studentId) => {
                        const student = students.find(s => s.id === studentId);
                        return (
                          <Chip 
                            key={studentId} 
                            label={`${student?.firstname} ${student?.lastname}`}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {students.map((student) => (
                    <MenuItem key={student.id} value={student.id}>
                      <Checkbox checked={selectedStudents.indexOf(student.id) > -1} />
                      <ListItemText primary={`${student.firstname} ${student.lastname}`} secondary={student.email} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                {selectedStudents.length} student(s) selected
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleCreateAssignment} disabled={selectedStudents.length === 0}>
              Create & Assign to {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Assignment Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Edit Assignment</DialogTitle>
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
                type="datetime-local"
                label="Deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="Link (Optional)"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Assign to Students</InputLabel>
                <Select
                  multiple
                  value={editSelectedStudents}
                  onChange={(e) => setEditSelectedStudents(e.target.value as string[])}
                  label="Assign to Students"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((studentId) => {
                        const student = students.find(s => s.id === studentId);
                        return (
                          <Chip 
                            key={studentId} 
                            label={`${student?.firstname} ${student?.lastname}`}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {students.map((student) => (
                    <MenuItem key={student.id} value={student.id}>
                      <Checkbox checked={editSelectedStudents.indexOf(student.id) > -1} />
                      <ListItemText primary={`${student.firstname} ${student.lastname}`} secondary={student.email} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                {editSelectedStudents.length} student(s) selected
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdateAssignment} disabled={editSelectedStudents.length === 0}>
              Update Assignment
            </Button>
          </DialogActions>
        </Dialog>

        {/* Grade Submission Dialog */}
        <Dialog open={gradeDialogOpen} onClose={() => setGradeDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Grade Submission</DialogTitle>
          <DialogContent>
            {selectedSubmission && (
              <Box mt={2}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  {selectedSubmission.studentName} - {assignments.find(a => a.id === selectedSubmission.assignmentId)?.title}
                </Typography>
                
                <Box mb={3}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Student Notes:
                  </Typography>
                  <Typography variant="body2">
                    {selectedSubmission.notes || "No notes provided"}
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  type="number"
                  label="Score (0-100)"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  inputProps={{ min: 0, max: 100 }}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback to the student..."
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGradeDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleGradeSubmission}>
              Submit Grade
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Assigned Students Dialog */}
        <Dialog open={viewAssignedDialogOpen} onClose={() => setViewAssignedDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Assigned Students - {selectedAssignment?.title}
          </DialogTitle>
          <DialogContent>
            <Box mt={2}>
              {selectedAssignment && assignedStudents[selectedAssignment.id]?.length > 0 ? (
                assignedStudents[selectedAssignment.id].map((studentId) => {
                  const student = students.find(s => s.id === studentId);
                  return (
                    <Box key={studentId} display="flex" alignItems="center" gap={2} mb={1}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {student?.firstname?.[0]}{student?.lastname?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {student?.firstname} {student?.lastname}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student?.email}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              ) : (
                <Typography color="text.secondary">No students assigned</Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewAssignedDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
