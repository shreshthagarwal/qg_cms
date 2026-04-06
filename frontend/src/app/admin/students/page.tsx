"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Tooltip,
  MenuItem,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Search,
  FilterList,
  Edit,
  Visibility,
  AttachMoney,
  School,
  TrendingUp,
  Person,
  Delete,
  LockReset,
  Warning,
  CheckCircle,
} from "@mui/icons-material";
import { BarChart } from "@mui/x-charts/BarChart";
import { ThemeProvider } from "../../../components/theme";

interface Student {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  course?: string;
  role?: string;
  batch?: string;
  total_fees: number;
  fees_paid: number;
  profile_image?: string;
  joined_date?: string;
  duration_months?: number;
  student_profiles?: {
    course_name?: string;
    batch?: string;
    total_fees?: number;
    fees_paid?: number;
    totalfees?: number;
    paidfees?: number;
    duration_months?: number;
    durationmonths?: number;
    start_date?: string;
    startdate?: string;
  };
}

export default function StudentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [editFormData, setEditFormData] = useState<Partial<Student>>({});

  // Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalRevenue: 0,
    pendingFees: 0,
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const filtered = students.filter(
      (s) =>
        s.firstname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.lastname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.course?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        
        // Process student data with student_profiles (handle both camelCase and snake_case)
        const processedData = data.map((s: any) => ({
          ...s,
          course: s.student_profiles?.course_name || s.student_profiles?.coursename || s.course || "Not Assigned",
          batch: s.student_profiles?.batch || s.batch || "-",
          total_fees: parseFloat(s.student_profiles?.total_fees || s.student_profiles?.totalfees || s.student_profiles?.totalFees || s.total_fees || 0),
          fees_paid: parseFloat(s.student_profiles?.paid_fees || s.student_profiles?.paidfees || s.student_profiles?.paidFees || s.fees_paid || 0),
          role: s.student_profiles?.role || s.role || "Student",
          joined_date: s.student_profiles?.start_date || s.student_profiles?.startdate || s.joined_date,
          duration_months: s.student_profiles?.duration_months || s.student_profiles?.durationmonths || 6,
        }));
        
        setStudents(processedData);
        setFilteredStudents(processedData);

        // Calculate stats
        const totalRevenue = processedData.reduce((sum: number, s: Student) => sum + (s.fees_paid || 0), 0);
        const pendingFees = processedData.reduce(
          (sum: number, s: Student) => sum + ((s.total_fees || 0) - (s.fees_paid || 0)),
          0
        );

        setStats({
          totalStudents: data.length,
          totalRevenue,
          pendingFees,
        });
      }
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateFees = async () => {
    if (!selectedStudent || !feeAmount) return;

    try {
      const token = (session?.user as any)?.accessToken;
      const newFeesPaid = parseFloat(feeAmount);
      
      console.log("Updating fees for student ID:", selectedStudent.id);
      console.log("New fees paid amount:", newFeesPaid);
      
      // Try updating the nested student_profiles field
      const updateData = {
        student_profiles: {
          ...selectedStudent.student_profiles,
          paidfees: newFeesPaid
        }
      };
      
      console.log("Update payload:", updateData);
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/students/${selectedStudent.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      if (res.ok) {
        setFeeDialogOpen(false);
        setFeeAmount("");
        setSelectedStudent(null);
        fetchStudents();
      } else {
        const errorText = await res.text();
        console.error("Error updating fees:", errorText);
        alert(`Error updating fees: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.error("Error updating fees:", err);
      alert("Error updating fees. Please try again.");
    }
  };

  const handleEditSave = async () => {
    if (!selectedStudent) return;

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/students/${selectedStudent.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editFormData),
        }
      );

      if (res.ok) {
        setEditDialogOpen(false);
        setSelectedStudent(null);
        fetchStudents();
      }
    } catch (err) {
      console.error("Error updating student:", err);
    }
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Helper function to check if student duration has ended
  const isStudentPast = (student: Student) => {
    const joinedDate = student.joined_date ? new Date(student.joined_date) : null;
    if (!joinedDate) return false;
    
    const durationMonths = student.duration_months || student.student_profiles?.duration_months || student.student_profiles?.durationmonths || 6;
    const endDate = new Date(joinedDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);
    
    return new Date() > endDate;
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/students/${selectedStudent.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setDeleteDialogOpen(false);
        setSelectedStudent(null);
        fetchStudents();
      }
    } catch (err) {
      console.error("Error deleting student:", err);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedStudent) return;

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/students/${selectedStudent.id}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // No body needed - backend generates password
        }
      );

      if (res.ok) {
        const data = await res.json();
        setNewPassword(data.password);
      } else {
        console.error("Password reset failed");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
    }
  };

  // Auto-reset password when dialog opens
  useEffect(() => {
    if (resetPasswordDialogOpen && selectedStudent && !newPassword) {
      handleResetPassword();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetPasswordDialogOpen, selectedStudent]);

  // Build student-wise fees data - separate by ID but show name + ID like dashboard
  const studentFees = students.map((student) => {
    const profile = student.student_profiles || {};
    const feesPaid = parseFloat(String(profile.paidfees || profile.fees_paid || student.fees_paid || 0));
    const totalFees = parseFloat(String(profile.totalfees || profile.total_fees || student.total_fees || 0));
    const firstName = student.firstname || '';
    const lastName = student.lastname || '';
    const fullName = `${firstName} ${lastName}`.trim() || `Student ${student.id}`;
    return {
      id: student.id, // Keep ID for internal reference
      name: fullName, // Show name in chart
      paid: feesPaid,
      pending: totalFees - feesPaid,
      total: totalFees,
    };
  }).filter((s) => s.total > 0); // Only show students with fee info

  const getFeeStatus = (student: Student) => {
    const pending = (student.total_fees || 0) - (student.fees_paid || 0);
    if (pending <= 0) return { label: "Paid", color: "success" };
    if (pending < student.total_fees * 0.3) return { label: "Partial", color: "warning" };
    return { label: "Pending", color: "error" };
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <Card sx={{ height: "100%", borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: `${color}.light`,
              color: `${color}.dark`,
            }}
          >
            <Icon />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#1f2937">
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
          <Typography>Loading...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Box>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h4" fontWeight={700} color="#1f2937">
            Students Master
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage students, courses, and fee payments
          </Typography>
        </Box>

        {/* Stats */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={School}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Revenue Collected"
              value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
              subtitle="Total fees paid"
              icon={AttachMoney}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Pending Fees"
              value={`₹${stats.pendingFees.toLocaleString('en-IN')}`}
              subtitle="Outstanding amount"
              icon={Warning}
              color="error"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Collection Rate"
              value={`${
                stats.totalRevenue + stats.pendingFees > 0
                  ? Math.round((stats.totalRevenue / (stats.totalRevenue + stats.pendingFees)) * 100)
                  : 0
              }%`}
              subtitle="Fees collected vs total"
              icon={TrendingUp}
              color="info"
            />
          </Grid>
        </Grid>

        {/* Charts - Fee Collection Only */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12 }}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Fee Collection Overview
                </Typography>
                {studentFees.length > 0 ? (
                <BarChart
                  series={[
                    { data: studentFees.slice(0, 10).map((s) => s.paid), label: "Paid", color: "#22c55e" },
                    { data: studentFees.slice(0, 10).map((s) => s.pending), label: "Pending", color: "#e27719" },
                  ]}
                  xAxis={[
                    {
                      data: studentFees.slice(0, 10).map((s) => `${s.name} (${s.id})`),
                      scaleType: "band",
                    },
                  ]}
                  height={320}
                />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={320}>
                  <Typography color="text.secondary">No fee data available</Typography>
                </Box>
              )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Students Table */}
        <Card>
          <CardContent>
            {/* Tabs and Search */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                <Tab label={`Active Students (${students.filter((s) => !isStudentPast(s)).length})`} />
                <Tab label={`Past Students (${students.filter((s) => isStudentPast(s)).length})`} />
              </Tabs>
              <Box display="flex" gap={2}>
                <TextField
                  size="small"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 250 }}
                />
                <Button variant="outlined" startIcon={<FilterList />}>
                  Filter
                </Button>
              </Box>
            </Box>

            {/* Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Total Fees</TableCell>
                    <TableCell>Paid</TableCell>
                    <TableCell>Pending</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const pendingAmount = (student.total_fees || 0) - (student.fees_paid || 0);

                    return (
                      <TableRow key={student.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {student.firstname} {student.lastname}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {student.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={student.course || "Not Assigned"}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={student.role || "Student"}
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>₹{(student.total_fees || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Typography color="success.main" fontWeight={600}>
                            ₹{(student.fees_paid || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography color={pendingAmount > 0 ? "error.main" : "success.main"} fontWeight={600}>
                            ₹{pendingAmount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="View Details">
                              <IconButton 
                                size="small"
                                onClick={() => router.push(`/admin/students/${student.id}`)}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Update Fees">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setFeeAmount(String(student.fees_paid || 0));
                                  setFeeDialogOpen(true);
                                }}
                              >
                                <AttachMoney />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Student">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reset Password">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setNewPassword("");
                                  setResetPasswordDialogOpen(true);
                                }}
                              >
                                <LockReset />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {filteredStudents.length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">No students found</Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Fee Update Dialog */}
        <Dialog open={feeDialogOpen} onClose={() => setFeeDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Update Fee Payment</DialogTitle>
          <DialogContent>
            {selectedStudent && (
              <Box mt={2}>
                <Box mb={3} p={2} bgcolor="primary.light" borderRadius={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Student
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedStudent.firstname} {selectedStudent.lastname}
                  </Typography>
                </Box>

                <Grid container spacing={2} mb={3}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Fees
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      ₹{(selectedStudent.total_fees || 0).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Currently Paid
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      ₹{(selectedStudent.fees_paid || 0).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  label="Update Fees Paid"
                  type="number"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  helperText={`Pending: ₹${((selectedStudent.total_fees || 0) - parseFloat(feeAmount || "0")).toLocaleString()}`}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFeeDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
            <Button variant="contained" onClick={updateFees} startIcon={<AttachMoney />}>
              Update Fees
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Student Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Edit Student Details</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={editFormData.firstname || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, firstname: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={editFormData.lastname || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, lastname: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  value={editFormData.email || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={editFormData.phone || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Course"
                  value={editFormData.course || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, course: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Batch"
                  value={editFormData.batch || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, batch: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Role"
                  value={editFormData.role || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Total Fees"
                  type="number"
                  value={editFormData.total_fees || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, total_fees: parseFloat(e.target.value) })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)} variant="outlined">Cancel</Button>
            <Button variant="contained" onClick={handleEditSave} startIcon={<CheckCircle />}>Save Changes</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Student Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Delete Student</DialogTitle>
          <DialogContent>
            {selectedStudent && (
              <Box mt={2}>
                <Typography variant="body1" gutterBottom>
                  Are you sure you want to delete <strong>{selectedStudent.firstname} {selectedStudent.lastname}</strong>?
                </Typography>
                <Typography variant="body2" color="error">
                  This action cannot be undone. The student and all associated data will be permanently removed.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">Cancel</Button>
            <Button variant="contained" onClick={handleDeleteStudent} color="error" startIcon={<Delete />}>Delete Student</Button>
          </DialogActions>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog 
          open={resetPasswordDialogOpen} 
          onClose={() => { setResetPasswordDialogOpen(false); setNewPassword(""); }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Password Reset</DialogTitle>
          <DialogContent>
            {newPassword ? (
              <Box>
                <Alert severity="success" sx={{ mb: 3 }}>
                  Password reset successful! Copy and share these credentials with {selectedStudent?.firstname}.
                </Alert>
                
                {/* Email */}
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Email
                </Typography>
                <Box 
                  sx={{ 
                    p: 2, 
                    mb: 2,
                    bgcolor: 'grey.100', 
                    borderRadius: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: 2
                  }}
                >
                  <Typography fontFamily="monospace" fontSize="1rem" fontWeight={600}>
                    {selectedStudent?.email}
                  </Typography>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => navigator.clipboard.writeText(selectedStudent?.email || "")}
                  >
                    Copy
                  </Button>
                </Box>

                {/* Password */}
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  New Password
                </Typography>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'grey.100', 
                    borderRadius: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: 2
                  }}
                >
                  <Typography fontFamily="monospace" fontSize="1rem" fontWeight={600}>
                    {newPassword}
                  </Typography>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => navigator.clipboard.writeText(newPassword)}
                  >
                    Copy
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box textAlign="center" py={2}>
                <CircularProgress size={32} sx={{ mb: 2 }} />
                <Typography>Generating new password...</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setResetPasswordDialogOpen(false); setNewPassword(""); }}>
              {newPassword ? "Done" : "Cancel"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
