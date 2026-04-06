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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Avatar,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  MenuBook,
  Assignment,
  Description,
  Link as LinkIcon,
  PlayArrow,
  CheckCircle,
  Schedule,
  Timeline,
  VideoLibrary,
  InsertDriveFile,
  Article,
  Refresh,
  OpenInNew,
  Edit,
  Update,
} from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { ThemeProvider } from "../../../components/theme";
import { format, subDays } from "date-fns";

interface Assignment {
  id: string;
  contentId: string;
  contentTitle: string;
  contentType: 'pdf' | 'text' | 'video' | 'link';
  content: string;
  status: 'assigned' | 'in_progress' | 'completed';
  notes: string;
  assignedAt: string;
  updatedAt: string;
  course: string;
  progress?: number;
}

interface TimelineEvent {
  status: string;
  timestamp: string;
  notes: string;
  updatedBy: string;
}

interface Timeline {
  assignmentId: string;
  contentTitle: string;
  contentType: string;
  currentStatus: string;
  assignedAt: string;
  events: TimelineEvent[];
}

export default function StudentLmsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [timeline, setTimeline] = useState<Timeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Status update modal
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [newStatus, setNewStatus] = useState<'in_progress' | 'completed'>('in_progress');
  const [statusNotes, setStatusNotes] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalAssignments: 0,
    completedAssignments: 0,
    inProgressAssignments: 0,
    averageProgress: 0,
    weeklyProgress: [] as any[],
  });

  useEffect(() => {
    fetchAssignments();
    fetchTimeline();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [assignments]);

  const fetchAssignments = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lms/student/assignments`, {
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

  const fetchTimeline = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lms/student/timeline`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch timeline");
      
      const data = await res.json();
      setTimeline(data);
    } catch (err) {
      console.error("Error fetching timeline:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === "completed").length;
    const inProgressAssignments = assignments.filter(a => a.status === "in_progress").length;
    const averageProgress = totalAssignments > 0
      ? Math.round(assignments.reduce((sum, a) => sum + (a.progress || 0), 0) / totalAssignments)
      : 0;

    // Calculate weekly progress for the last 4 weeks
    const weeklyData = [];
    const now = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() - 7);
      weekEnd.setHours(0, 0, 0, 0);
      
      const weekCompleted = assignments.filter(a => {
        if (!a.updatedAt) return false;
        const updatedDate = new Date(a.updatedAt);
        return updatedDate >= weekEnd && updatedDate < weekStart && a.status === "completed";
      }).length;
      
      weeklyData.push({
        week: `Week ${4 - i}`,
        completed: weekCompleted,
      });
    }

    setStats({
      totalAssignments,
      completedAssignments,
      inProgressAssignments,
      averageProgress,
      weeklyProgress: weeklyData,
    });
  };

  const handleUpdateStatus = async () => {
    if (!selectedAssignment) return;

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lms/assignments/${selectedAssignment.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      setSuccess("Status updated successfully!");
      setUpdateDialogOpen(false);
      resetStatusForm();
      fetchAssignments();
      fetchTimeline();
    } catch (err) {
      setError("Error updating status");
    }
  };

  const resetStatusForm = () => {
    setNewStatus("in_progress");
    setStatusNotes("");
    setSelectedAssignment(null);
  };

  const openUpdateDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setNewStatus(assignment.status === "assigned" ? "in_progress" : "completed");
    setStatusNotes("");
    setUpdateDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "in_progress": return "warning";
      default: return "info";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf": return <InsertDriveFile />;
      case "video": return <VideoLibrary />;
      case "link": return <LinkIcon />;
      default: return <Article />;
    }
  };

  const getFilteredAssignments = () => {
    switch (activeTab) {
      case 0: return assignments.filter(a => a.status === "assigned");
      case 1: return assignments.filter(a => a.status === "in_progress");
      case 2: return assignments.filter(a => a.status === "completed");
      default: return assignments;
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
              My Learning
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track your course progress and assignments
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
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Total Assignments"
              value={stats.totalAssignments}
              subtitle="Assigned to you"
              icon={Assignment}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="In Progress"
              value={stats.inProgressAssignments}
              subtitle="Currently working on"
              icon={Schedule}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              title="Completed"
              value={stats.completedAssignments}
              subtitle="Finished assignments"
              icon={CheckCircle}
              color="success"
            />
          </Grid>
        </Grid>

        {/* Progress Chart */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Weekly Completion Progress
            </Typography>
            <Box height={300}>
              {stats.weeklyProgress.length > 0 ? (
                <LineChart
                  series={[
                    {
                      data: stats.weeklyProgress.map(w => w.completed),
                      label: "Completed Assignments",
                      color: "#e27719",
                      area: true,
                    },
                  ]}
                  xAxis={[
                    {
                      data: stats.weeklyProgress.map(w => w.week),
                      scaleType: "point",
                    },
                  ]}
                  height={300}
                />
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <Typography color="text.secondary">
                    No data available for weekly progress
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardContent>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
              <Tab label={`Assigned (${assignments.filter(a => a.status === "assigned").length})`} />
              <Tab label={`In Progress (${assignments.filter(a => a.status === "in_progress").length})`} />
              <Tab label={`Completed (${assignments.filter(a => a.status === "completed").length})`} />
            </Tabs>

            {/* Assignments List */}
            <Grid container spacing={3}>
              {getFilteredAssignments().map((assignment) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={assignment.id}>
                  <Card sx={{ height: "100%" }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ bgcolor: "primary.light" }}>
                            {getTypeIcon(assignment.contentType)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {assignment.contentTitle}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {assignment.course}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={assignment.status}
                          size="small"
                          color={getStatusColor(assignment.status) as any}
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" mb={2}>
                        {assignment.notes || "No additional notes"}
                      </Typography>

                      {assignment.progress !== undefined && (
                        <Box mb={2}>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="caption" color="text.secondary">
                              Progress
                            </Typography>
                            <Typography variant="caption" fontWeight={600}>
                              {assignment.progress}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={assignment.progress}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: "#e5e7eb",
                              "& .MuiLinearProgress-bar": {
                                bgcolor: "#e27719",
                                borderRadius: 3,
                              },
                            }}
                          />
                        </Box>
                      )}

                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="caption" color="text.secondary">
                          Assigned: {format(new Date(assignment.assignedAt), "MMM d, yyyy")}
                        </Typography>
                        {assignment.updatedAt && (
                          <Typography variant="caption" color="text.secondary">
                            Updated: {format(new Date(assignment.updatedAt), "MMM d")}
                          </Typography>
                        )}
                      </Box>

                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<OpenInNew />}
                          href={assignment.content}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open
                        </Button>
                        {assignment.status !== "completed" && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Update />}
                            onClick={() => openUpdateDialog(assignment)}
                          >
                            {assignment.status === "assigned" ? "Start" : "Complete"}
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {getFilteredAssignments().length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary" mb={2}>
                  No assignments found in this category
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Learning Timeline */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={3}>
              Learning Timeline
            </Typography>
            <List>
              {timeline.map((item, index) => (
                <div key={item.assignmentId}>
                  <Box
                    sx={{
                      position: 'relative',
                      pl: 4,
                      mb: 3,
                      '&:before': {
                        content: '""',
                        position: 'absolute',
                        left: 12,
                        top: 24,
                        bottom: index === timeline.length - 1 ? 24 : -20,
                        width: 2,
                        bgcolor: 'primary.light',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 16,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      <Timeline sx={{ fontSize: 14, color: 'white' }} />
                    </Box>
                    <Card sx={{ ml: 2, bgcolor: 'grey.50' }}>
                      <CardContent sx={{ py: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {item.contentTitle}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.contentType}
                            </Typography>
                          </Box>
                          <Chip
                            label={item.currentStatus}
                            size="small"
                            color={getStatusColor(item.currentStatus) as any}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Assigned {format(new Date(item.assignedAt), "MMM d, yyyy")}
                        </Typography>
                        {item.events.length > 0 && (
                          <Box mt={2}>
                            {item.events.map((event, eventIndex) => (
                              <Box
                                key={eventIndex}
                                sx={{
                                  pl: 2,
                                  borderLeft: '2px solid #e5e7eb',
                                  ml: 1,
                                  mb: 1,
                                }}
                              >
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {format(new Date(event.timestamp), "MMM d, yyyy HH:mm")}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  <strong>{event.status}</strong> - {event.notes}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  by {event.updatedBy}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                </div>
              ))}
            </List>

            {timeline.length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">
                  No learning activity yet
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Status Update Dialog */}
        <Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Update Assignment Status</DialogTitle>
          <DialogContent>
            {selectedAssignment && (
              <Box mt={2}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  {selectedAssignment.contentTitle}
                </Typography>
                
                <Box mb={3}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Current Status:
                  </Typography>
                  <Chip
                    label={selectedAssignment.status}
                    size="small"
                    color={getStatusColor(selectedAssignment.status) as any}
                  />
                </Box>

                <TextField
                  select
                  fullWidth
                  label="New Status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  sx={{ mb: 2 }}
                  SelectProps={{ native: true }}
                >
                  {selectedAssignment.status === "assigned" && (
                    <option value="in_progress">In Progress</option>
                  )}
                  <option value="completed">Completed</option>
                </TextField>
                
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes (Optional)"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add any notes about your progress..."
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdateStatus}>
              Update Status
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
