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
  Checkbox,
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  MenuBook,
  Assignment,
  Description,
  Link as LinkIcon,
  Add,
  Edit,
  Delete,
  Search,
  UploadFile,
  Visibility,
  Timeline,
  Person,
  Schedule,
  CheckCircle,
  Pending,
  Refresh,
  InsertDriveFile,
  VideoLibrary,
  Article,
  TrendingUp,
} from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { ThemeProvider } from "../../../components/theme";
import { format, subDays, isValid } from "date-fns";

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

interface Content {
  id: string;
  title: string;
  type: 'pdf' | 'text' | 'video' | 'link';
  content: string;
  created_by?: string;
  createdBy?: string;
  created_at?: string;
  createdAt?: string;
  order: number;
}

interface Student {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
}

interface Assignment {
  id: string;
  contentTitle: string;
  contentType: string;
  studentName: string;
  studentEmail: string;
  status: string;
  assignedAt: string;
  completedAt?: string;
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

export default function AdminLmsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [content, setContent] = useState<Content[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);

  // Form states
  const [contentTitle, setContentTitle] = useState("");
  const [contentType, setContentType] = useState<"pdf" | "text" | "video" | "link">("text");
  const [contentData, setContentData] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const [timelineStudent, setTimelineStudent] = useState<string>("");
  const [studentTimelineData, setStudentTimelineData] = useState<any>(null);

  // Stats
  const [stats, setStats] = useState({
    totalContent: 0,
    totalAssignments: 0,
    completedAssignments: 0,
    pendingAssignments: 0,
    completionRate: 0,
    weeklyProgress: [] as any[],
  });

  useEffect(() => {
    fetchContent();
    fetchStudents();
    fetchAssignments();
    fetchTimelines();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [assignments, content]);

  const fetchContent = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lms/content`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch content");
      
      const data = await res.json();
      setContent(data);
    } catch (err) {
      setError("Error loading content");
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

  const fetchAssignments = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lms/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch assignments");
      
      const data = await res.json();
      setAssignments(data);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelines = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lms/timelines`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch timelines");
      
      const data = await res.json();
      setTimelines(data);
    } catch (err) {
      console.error("Error fetching timelines:", err);
    }
  };

  const calculateStats = () => {
    const totalContent = content.length;
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === "completed").length;
    const pendingAssignments = assignments.filter(a => a.status === "pending").length;
    const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

    // Calculate weekly content created for the last 4 weeks
    const weeklyData = [];
    for (let i = 3; i >= 0; i--) {
      const weekEnd = subDays(new Date(), i * 7);
      const weekStart = subDays(weekEnd, 7);
      const weekContent = content.filter(c => {
        if (!c.createdAt && !c.created_at) return false;
        const createdDate = new Date(c.createdAt || c.created_at!);
        return createdDate >= weekStart && createdDate < weekEnd;
      }).length;
      
      weeklyData.push({
        week: `Week ${4 - i}`,
        content: weekContent,
      });
    }

    setStats({
      totalContent,
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      completionRate,
      weeklyProgress: weeklyData,
    });
  };

  const handleCreateContent = async () => {
    if (!contentTitle || !contentData) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lms/content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: contentTitle,
          type: contentType,
          content: contentData,
        }),
      });

      if (!res.ok) throw new Error("Failed to create content");

      setSuccess("Content created successfully!");
      setContentDialogOpen(false);
      resetContentForm();
      fetchContent();
    } catch (err) {
      setError("Error creating content");
    }
  };

  const handleUpdateContent = async () => {
    if (!editingContent || !contentTitle || !contentData) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lms/content/${editingContent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: contentTitle,
          type: contentType,
          content: contentData,
        }),
      });

      if (!res.ok) throw new Error("Failed to update content");

      setSuccess("Content updated successfully!");
      setContentDialogOpen(false);
      resetContentForm();
      fetchContent();
    } catch (err) {
      setError("Error updating content");
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return;

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lms/content/${contentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete content");

      setSuccess("Content deleted successfully!");
      fetchContent();
    } catch (err) {
      setError("Error deleting content");
    }
  };

  const handleAssignContent = async () => {
    if (selectedStudents.length === 0 || !selectedContent) {
      setError("Please select at least one student and content");
      return;
    }

    try {
      const token = (session?.user as any)?.accessToken;
      
      // Assign to multiple students
      for (const studentId of selectedStudents) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lms/assign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            contentId: selectedContent,
            studentIds: [studentId], // Backend expects array
          }),
        });

        if (!res.ok) {
          console.error(`Failed to assign to student ${studentId}`);
        }
      }

      setSuccess(`Content assigned to ${selectedStudents.length} student(s) successfully!`);
      setAssignmentDialogOpen(false);
      setSelectedStudents([]);
      fetchAssignments();
    } catch (err) {
      setError("Error assigning content");
    }
  };

  const resetContentForm = () => {
    setContentTitle("");
    setContentType("text");
    setContentData("");
    setEditingContent(null);
  };

  const openEditContentDialog = (contentItem: Content) => {
    setEditingContent(contentItem);
    setContentTitle(contentItem.title);
    setContentType(contentItem.type);
    setContentData(contentItem.content || "");
    setContentDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "pending": return "warning";
      case "in_progress": return "info";
      default: return "default";
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

  const filteredContent = content.filter(item =>
    (item.title?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const filteredAssignments = assignments.filter(assignment =>
    (assignment.contentTitle?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (assignment.studentName?.toLowerCase() || "").includes(searchQuery.toLowerCase())
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
              LMS Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage course content and student assignments
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchContent}>
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetContentForm();
                setContentDialogOpen(true);
              }}
            >
              Add Content
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
              title="Total Content"
              value={stats.totalContent}
              subtitle="Learning materials"
              icon={MenuBook}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Content Assigned"
              value={stats.totalAssignments}
              subtitle="To students"
              icon={Assignment}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="In Progress"
              value={assignments.filter(a => a.status === "in_progress").length}
              subtitle="Being worked on"
              icon={Schedule}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Completion Rate"
              value={`${stats.completionRate}%`}
              subtitle="Overall progress"
              icon={TrendingUp}
              color="warning"
            />
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Content Created Over Time
                </Typography>
                <Box height={300}>
                  <LineChart
                    series={[
                      {
                        data: stats.weeklyProgress.map(w => w.content),
                        label: "Content Created",
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
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Content Types Distribution
                </Typography>
                <Box height={300}>
                  <BarChart
                    series={[
                      {
                        data: [
                          content.filter(c => c.type === 'pdf').length,
                          content.filter(c => c.type === 'video').length,
                          content.filter(c => c.type === 'text').length,
                          content.filter(c => c.type === 'link').length
                        ],
                        color: "#e27719",
                      },
                    ]}
                    xAxis={[
                      {
                        data: ["PDF", "Video", "Text", "Link"],
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
              <Tab label="Content" />
              <Tab label="Assignments" />
              <Tab label="Timeline" />
            </Tabs>

            {/* Content Tab */}
            {activeTab === 0 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight={600}>
                    Course Content
                  </Typography>
                  <Box display="flex" gap={2}>
                    <TextField
                      size="small"
                      placeholder="Search content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                      }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<Assignment />}
                      onClick={() => setAssignmentDialogOpen(true)}
                    >
                      Assign to Student
                    </Button>
                  </Box>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredContent.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getTypeIcon(item.type)}
                              label={item.type}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {safeFormat(item.createdAt || item.created_at, "MMM d, yyyy")}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <IconButton
                                size="small"
                                onClick={() => openEditContentDialog(item)}
                                title="Edit"
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteContent(item.id)}
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

                {filteredContent.length === 0 && (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary" mb={2}>
                      No content found
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setContentDialogOpen(true)}
                    >
                      Create First Content
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Assignments Tab */}
            {activeTab === 1 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight={600}>
                    Student Assignments
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
                        <TableCell>Student</TableCell>
                        <TableCell>Content</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Assigned</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAssignments.map((assignment) => (
                        <TableRow key={assignment.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {assignment.studentName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {assignment.studentEmail}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {assignment.contentTitle}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={assignment.contentType}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={assignment.status}
                              size="small"
                              color={getStatusColor(assignment.status) as any}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {safeFormat(assignment.assignedAt, "MMM d, yyyy")}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {filteredAssignments.length === 0 && (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary">
                      No assignments found
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Timeline Tab */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" fontWeight={600} mb={3}>
                  Student Assignment Timeline
                </Typography>
                
                {/* Student Selector */}
                <FormControl fullWidth sx={{ mb: 4 }}>
                  <InputLabel>Select Student</InputLabel>
                  <Select
                    value={timelineStudent}
                    onChange={(e) => {
                      const studentId = e.target.value;
                      setTimelineStudent(studentId);
                      // Find student timeline data
                      const studentTimeline = timelines.find((t: any) => t.studentId === studentId);
                      setStudentTimelineData(studentTimeline || null);
                    }}
                    label="Select Student"
                  >
                    <MenuItem value="">
                      <em>Select a student to view timeline</em>
                    </MenuItem>
                    {timelines.map((timeline: any) => (
                      <MenuItem key={timeline.studentId} value={timeline.studentId}>
                        {timeline.studentName} ({timeline.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {studentTimelineData && (
                  <>
                    {/* Student Stats */}
                    <Grid container spacing={2} mb={4}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="h4" fontWeight={700} color="primary.main">
                              {studentTimelineData.timeline?.length || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Total Assignments
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="h4" fontWeight={700} color="success.main">
                              {studentTimelineData.timeline?.filter((t: any) => t.currentStatus === 'completed').length || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Completed
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="h4" fontWeight={700} color="warning.main">
                              {studentTimelineData.timeline?.filter((t: any) => t.currentStatus === 'pending').length || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Pending
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Graphical Timeline */}
                    <Typography variant="subtitle1" fontWeight={600} mb={2}>
                      Assignment Progress Timeline
                    </Typography>
                    <Card sx={{ mb: 3 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {studentTimelineData.timeline?.map((item: any, index: number) => {
                            // Get event dates for this assignment
                            const assignedEvent = item.events?.find((e: any) => e.status === 'assigned' || e.status === 'created');
                            const inProgressEvent = item.events?.find((e: any) => e.status === 'in_progress');
                            const completedEvent = item.events?.find((e: any) => e.status === 'completed');
                            
                            return (
                              <Box key={item.assignmentId} sx={{ 
                                p: 2, 
                                border: '1px solid', 
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.paper'
                              }}>
                                {/* Assignment Title */}
                                <Typography variant="subtitle2" fontWeight={600} mb={2}>
                                  {item.contentTitle}
                                </Typography>
                                
                                {/* Progress Bar Visualization */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                  {/* Assigned Stage */}
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Box sx={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      bgcolor: 'primary.main',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontSize: '12px'
                                    }}>
                                      1
                                    </Box>
                                    <Typography variant="caption" sx={{ mt: 0.5, fontSize: '10px' }}>
                                      Assigned
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                      {safeFormat(item.assignedAt || assignedEvent?.timestamp, "MMM d")}
                                    </Typography>
                                  </Box>
                                  
                                  {/* Connector Line */}
                                  <Box sx={{ 
                                    flex: 1, 
                                    height: 3, 
                                    bgcolor: inProgressEvent || completedEvent ? 'primary.main' : 'grey.300',
                                    mx: 1
                                  }} />
                                  
                                  {/* In Progress Stage */}
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Box sx={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      bgcolor: inProgressEvent || completedEvent ? 'info.main' : 'grey.300',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontSize: '12px'
                                    }}>
                                      2
                                    </Box>
                                    <Typography variant="caption" sx={{ mt: 0.5, fontSize: '10px' }}>
                                      In Progress
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                      {inProgressEvent ? safeFormat(inProgressEvent.timestamp, "MMM d") : "-"}
                                    </Typography>
                                  </Box>
                                  
                                  {/* Connector Line */}
                                  <Box sx={{ 
                                    flex: 1, 
                                    height: 3, 
                                    bgcolor: completedEvent ? 'success.main' : 'grey.300',
                                    mx: 1
                                  }} />
                                  
                                  {/* Completed Stage */}
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Box sx={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      bgcolor: completedEvent ? 'success.main' : 'grey.300',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontSize: '12px'
                                    }}>
                                      3
                                    </Box>
                                    <Typography variant="caption" sx={{ mt: 0.5, fontSize: '10px' }}>
                                      Completed
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                      {completedEvent ? safeFormat(completedEvent.timestamp, "MMM d") : "-"}
                                    </Typography>
                                  </Box>
                                </Box>
                                
                                {/* Status Badge */}
                                <Box display="flex" gap={1} alignItems="center">
                                  <Chip
                                    label={item.contentType}
                                    size="small"
                                    variant="outlined"
                                  />
                                  <Chip
                                    label={item.currentStatus}
                                    size="small"
                                    color={getStatusColor(item.currentStatus) as any}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    Duration: {item.events && item.events.length > 1 
                                      ? `${Math.ceil((new Date(item.events[item.events.length-1].timestamp).getTime() - new Date(item.events[0].timestamp).getTime()) / (1000 * 60 * 60 * 24))} days`
                                      : "Just started"}
                                  </Typography>
                                </Box>
                                
                                {/* Event History */}
                                {item.events && item.events.length > 0 && (
                                  <Box mt={2} pt={2} borderTop={1} borderColor="divider">
                                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                                      Event History:
                                    </Typography>
                                    {item.events.map((event: any, idx: number) => (
                                      <Typography key={idx} variant="caption" display="block" color="text.secondary" sx={{ ml: 1 }}>
                                        • {safeFormat(event.timestamp, "MMM d, yyyy HH:mm")}: {event.status}
                                        {event.notes && ` - ${event.notes}`}
                                      </Typography>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      </CardContent>
                    </Card>
                  </>
                )}

                {!studentTimelineData && timelineStudent && (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary">
                      No timeline data available for this student
                    </Typography>
                  </Box>
                )}

                {!timelineStudent && (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary">
                      Select a student to view their assignment timeline and progress
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Content Dialog */}
        <Dialog open={contentDialogOpen} onClose={() => setContentDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{editingContent ? "Edit Content" : "Create Content"}</DialogTitle>
          <DialogContent>
            <Box mt={2} display="flex" flexDirection="column" gap={2}>
              <TextField
                fullWidth
                label="Title"
                value={contentTitle}
                onChange={(e) => setContentTitle(e.target.value)}
              />
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as any)}
                  label="Type"
                >
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="video">Video</MenuItem>
                  <MenuItem value="link">Link</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                multiline
                rows={4}
                label={contentType === "link" ? "URL" : "Content"}
                value={contentData}
                onChange={(e) => setContentData(e.target.value)}
                placeholder={contentType === "link" ? "https://..." : "Enter content..."}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setContentDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={editingContent ? handleUpdateContent : handleCreateContent}>
              {editingContent ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assignment Dialog */}
        <Dialog open={assignmentDialogOpen} onClose={() => setAssignmentDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Assign Content to Students</DialogTitle>
          <DialogContent>
            <Box mt={2} display="flex" flexDirection="column" gap={2}>
              <FormControl fullWidth>
                <InputLabel>Students</InputLabel>
                <Select
                  multiple
                  value={selectedStudents}
                  onChange={(e) => setSelectedStudents(e.target.value as string[])}
                  label="Students"
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
              <Typography variant="caption" color="text.secondary">
                {selectedStudents.length} student(s) selected
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Content</InputLabel>
                <Select
                  value={selectedContent}
                  onChange={(e) => setSelectedContent(e.target.value)}
                  label="Content"
                >
                  {content.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignmentDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAssignContent} disabled={selectedStudents.length === 0 || !selectedContent}>
              Assign to {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
