"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Card,
  CardContent,
  CardActions,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  LinearProgress,
  Alert,
  TextField,
  InputAdornment,
  Rating,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Assignment,
  UploadFile,
  GitHub,
  Description,
  CalendarMonth,
  CheckCircle,
  Pending,
  Schedule,
  Grade,
  Link as LinkIcon,
  Refresh,
  Star,
  Warning,
} from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { ThemeProvider } from "../../../components/theme";
import { format, subDays, isPast, isToday } from "date-fns";

interface AssignmentData {
  id: string;
  title: string;
  description: string;
  deadline: string;
  link?: string;
  submitted: boolean;
  submissionId?: string;
  fileUrl?: string;
  githubLink?: string;
  score?: number;
  feedback?: string;
  status: 'assigned' | 'submitted' | 'graded';
  createdAt: string;
}

export default function StudentAssignmentsPage() {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Submit modal states
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentData | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [githubLink, setGithubLink] = useState('');
  const [notes, setNotes] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalAssignments: 0,
    submittedAssignments: 0,
    gradedAssignments: 0,
    averageScore: 0,
    pendingAssignments: 0,
    weeklySubmissions: [] as any[],
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [assignments]);

  const fetchAssignments = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch assignments");
      
      const data = await res.json();
      setAssignments(data);
    } catch (err) {
      setError("Error loading assignments");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalAssignments = assignments.length;
    const submittedAssignments = assignments.filter(a => a.submitted).length;
    const gradedAssignments = assignments.filter(a => a.status === "graded").length;
    const pendingAssignments = assignments.filter(a => !a.submitted).length;
    const averageScore = gradedAssignments > 0
      ? Math.round(assignments.filter(a => a.score !== undefined).reduce((sum, a) => sum + (a.score || 0), 0) / gradedAssignments)
      : 0;

    // Calculate weekly submissions
    const weeklyData = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = subDays(new Date(), i * 7);
      const weekEnd = subDays(weekStart, -7);
      const weekSubmitted = assignments.filter(a => {
        if (!a.submissionId) return false;
        // This would need a submittedAt field from the backend
        return true; // Placeholder - adjust based on actual data structure
      }).length;
      
      weeklyData.push({
        week: `Week ${4 - i}`,
        submissions: weekSubmitted,
      });
    }

    setStats({
      totalAssignments,
      submittedAssignments,
      gradedAssignments,
      averageScore,
      pendingAssignments,
      weeklySubmissions: weeklyData,
    });
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !fileUrl) {
      setError("Please provide a file URL");
      return;
    }

    // Check if deadline has passed
    const deadline = new Date(selectedAssignment.deadline);
    const now = new Date();
    
    if (isPast(deadline) && !isToday(deadline)) {
      setError("Cannot submit assignment: Deadline has passed");
      return;
    }

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${selectedAssignment.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentLink: fileUrl,
          githubLink,
          notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit assignment");

      setSuccess("Assignment submitted successfully!");
      setSubmitDialogOpen(false);
      resetSubmitForm();
      fetchAssignments();
    } catch (err) {
      setError("Error submitting assignment");
    }
  };

  const resetSubmitForm = () => {
    setFileUrl("");
    setGithubLink("");
    setNotes("");
    setSelectedAssignment(null);
  };

  const openSubmitDialog = (assignment: AssignmentData) => {
    setSelectedAssignment(assignment);
    setSubmitDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "graded": return "success";
      case "submitted": return "info";
      default: return "warning";
    }
  };

  const getDeadlineStatus = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    if (isPast(deadlineDate) && !isToday(deadlineDate)) return "error";
    if (isToday(deadlineDate)) return "warning";
    return "success";
  };

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
              My Assignments
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track and submit your assignments
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchAssignments}>
            Refresh
          </Button>
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
              subtitle="Assigned to you"
              icon={Assignment}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Pending"
              value={stats.pendingAssignments}
              subtitle="Not submitted yet"
              icon={Pending}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Submitted"
              value={stats.submittedAssignments}
              subtitle="Waiting for grading"
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
                  Weekly Submission Trends
                </Typography>
                <Box height={300}>
                  <LineChart
                    series={[
                      {
                        data: stats.weeklySubmissions.map(w => w.submissions),
                        label: "Submissions",
                        color: "#e27719",
                        area: true,
                      },
                    ]}
                    xAxis={[
                      {
                        data: stats.weeklySubmissions.map(w => w.week),
                        scaleType: "point",
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
                  Assignment Status Overview
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

        {/* Assignments Cards */}
        <Grid container spacing={3}>
          {assignments.map((assignment) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={assignment.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" fontWeight={600}>
                      {assignment.title}
                    </Typography>
                    <Chip
                      label={assignment.status}
                      size="small"
                      color={getStatusColor(assignment.status) as any}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {assignment.description}
                  </Typography>
                  
                  {assignment.link && (
                    <Box mb={2}>
                      <Button
                        size="small"
                        startIcon={<LinkIcon />}
                        href={assignment.link}
                        target="_blank"
                        sx={{ textTransform: 'none' }}
                      >
                        View Instructions
                      </Button>
                    </Box>
                  )}
                  
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CalendarMonth fontSize="small" color="action" />
                    <Chip
                      label={format(new Date(assignment.deadline), "MMM d, yyyy")}
                      size="small"
                      color={getDeadlineStatus(assignment.deadline) as any}
                    />
                  </Box>
                  
                  {assignment.score !== undefined && (
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <Grade fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight={600}>
                        Score: {assignment.score}/100
                      </Typography>
                    </Box>
                  )}
                  
                  {assignment.feedback && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Feedback:</strong> {assignment.feedback}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Box display="flex" gap={1} width="100%">
                    {assignment.submitted && assignment.fileUrl && (
                      <Button
                        size="small"
                        startIcon={<Description />}
                        href={assignment.fileUrl}
                        target="_blank"
                      >
                        View File
                      </Button>
                    )}
                    {assignment.githubLink && (
                      <Button
                        size="small"
                        startIcon={<GitHub />}
                        href={assignment.githubLink}
                        target="_blank"
                      >
                        GitHub
                      </Button>
                    )}
                    {!assignment.submitted && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<UploadFile />}
                        onClick={() => openSubmitDialog(assignment)}
                        fullWidth
                      >
                        Submit
                      </Button>
                    )}
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {assignments.length === 0 && (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">
                  No assignments assigned yet
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Submit Assignment Dialog */}
        <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Submit Assignment</DialogTitle>
          <DialogContent>
            {selectedAssignment && (
              <Box mt={2}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  {selectedAssignment.title}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" mb={3}>
                  {selectedAssignment.description}
                </Typography>

                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    fullWidth
                    label="File URL"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Description />
                        </InputAdornment>
                      ),
                    }}
                  />
                  
                  <TextField
                    fullWidth
                    label="GitHub Link (Optional)"
                    value={githubLink}
                    onChange={(e) => setGithubLink(e.target.value)}
                    placeholder="https://github.com/..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <GitHub />
                        </InputAdornment>
                      ),
                    }}
                  />
                  
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Notes (Optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about your submission..."
                  />
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleSubmitAssignment}
              disabled={!selectedAssignment || (isPast(new Date(selectedAssignment.deadline)) && !isToday(new Date(selectedAssignment.deadline)))}
              sx={{
                bgcolor: !selectedAssignment || (isPast(new Date(selectedAssignment.deadline)) && !isToday(new Date(selectedAssignment.deadline))) ? 'grey.500' : 'primary.main',
                '&:hover': {
                  bgcolor: !selectedAssignment || (isPast(new Date(selectedAssignment.deadline)) && !isToday(new Date(selectedAssignment.deadline))) ? 'grey.600' : 'primary.dark',
                }
              }}
            >
              {!selectedAssignment || (isPast(new Date(selectedAssignment.deadline)) && !isToday(new Date(selectedAssignment.deadline))) ? "Deadline Passed" : "Submit Assignment"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
