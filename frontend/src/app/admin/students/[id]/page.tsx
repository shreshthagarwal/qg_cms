"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Avatar,
} from "@mui/material";
import {
  Edit,
  Save,
  Cancel,
  ArrowBack,
  Download,
  Delete,
  LockReset,
  Person,
  School,
  LocationOn,
  MenuBook,
  AttachMoney,
  Description,
} from "@mui/icons-material";
import { ThemeProvider } from "../../../../components/theme";
import { useTheme } from "@mui/material/styles";

interface Student {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string | null;
  student_profiles: {
    coursename: string;
    role: string;
    durationmonths: number;
    totalfees: number;
    paidfees: number;
    startdate: string;
    enddate: string;
    dob: string | null;
    emergencycontact: string | null;
    addressline1: string;
    addressline2: string;
    city: string;
    state: string;
    pincode: string;
    pannumber: string;
    pancardurl: string;
    aadhaarnumber: string;
    aadhaarcardurl: string;
    photourl: string;
    tenthpercentage: number;
    tenthmarksheeturl: string;
    twelfthpercentage: number;
    twelfthmarksheeturl: string;
    currentcollege: string;
    collegeaddress: string;
    collegecity: string;
    collegestate: string;
    cgpa: number;
    collegemarksheeturl: string;
    graduatingyear: number;
  };
}

export default function StudentDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchStudent(params.id as string);
    }
  }, [params.id]);

  // Auto-reset password when dialog opens
  useEffect(() => {
    if (resetPasswordDialogOpen && !newPassword) {
      handleResetPassword();
    }
  }, [resetPasswordDialogOpen]);

  const fetchStudent = async (studentId: string) => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch student");
      
      const data = await res.json();
      const foundStudent = data.find((s: Student) => s.id === studentId);
      if (foundStudent) {
        setStudent(foundStudent);
        setEditForm({ ...foundStudent });
      } else {
        setError("Student not found");
      }
    } catch (err) {
      setError("Error loading student");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setEditForm({ ...student });
  };

  const handleSave = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      console.log("Updating student with ID:", student?.id);
      console.log("Update data:", editForm);
      
      // Create proper update payload - separate top-level and profile fields
      const updateData: any = {};
      
      // Add top-level fields
      if (editForm.firstname !== student?.firstname) updateData.firstname = editForm.firstname;
      if (editForm.lastname !== student?.lastname) updateData.lastname = editForm.lastname;
      if (editForm.email !== student?.email) updateData.email = editForm.email;
      if (editForm.phone !== student?.phone) updateData.phone = editForm.phone;
      
      // Add student_profiles fields if they changed
      const profileUpdates: any = {};
      if (editForm.student_profiles && student?.student_profiles) {
        // Define the keys we want to check
        const profileKeys: (keyof typeof student.student_profiles)[] = [
          'coursename', 'role', 'durationmonths', 'totalfees', 'paidfees', 
          'startdate', 'enddate', 'dob', 'emergencycontact', 'addressline1',
          'addressline2', 'city', 'state', 'pincode', 'pannumber', 'pancardurl',
          'aadhaarnumber', 'aadhaarcardurl', 'photourl', 'tenthpercentage',
          'tenthmarksheeturl', 'twelfthpercentage', 'twelfthmarksheeturl',
          'currentcollege', 'collegeaddress', 'collegecity', 'collegestate',
          'cgpa', 'collegemarksheeturl', 'graduatingyear'
        ];
        
        profileKeys.forEach(key => {
          if (editForm.student_profiles![key] !== student.student_profiles[key]) {
            profileUpdates[key] = editForm.student_profiles![key];
          }
        });
      }
      
      if (Object.keys(profileUpdates).length > 0) {
        updateData.student_profiles = {
          ...student?.student_profiles,
          ...profileUpdates
        };
      }
      
      console.log("Final update payload:", updateData);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students/${student?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        setStudent({ ...student!, ...editForm });
        setEditing(false);
        alert("Student updated successfully!");
      } else {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        alert(`Error updating student: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.error("Error updating student:", err);
      alert("Error updating student. Please try again.");
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditForm({ ...student });
  };

  const handleDelete = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students/${student?.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setDeleteDialogOpen(false);
        router.push("/admin/students");
      } else {
        alert("Error deleting student");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting student");
    }
  };

  const handleResetPassword = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students/${student?.id}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setNewPassword(data.password || "Password reset successful");
      } else {
        alert("Error resetting password");
      }
    } catch (err) {
      console.error(err);
      alert("Error resetting password");
    }
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInputChange = (field: string, value: any) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const handleProfileChange = (field: string, value: any) => {
    setEditForm({
      ...editForm,
      student_profiles: {
        ...editForm.student_profiles,
        [field]: value
      }
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !student) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || "Student not found"}</Alert>
        <Button component={Link} href="/admin/students" startIcon={<ArrowBack />} sx={{ mt: 2 }}>
          Back to Students
        </Button>
      </Box>
    );
  }

  const profile = student.student_profiles;
  const feeProgress = profile.totalfees > 0 ? (profile.paidfees / profile.totalfees) * 100 : 0;

  const cardBg = isDark ? "#1e293b" : "#ffffff";
  const textColor = isDark ? "#f1f5f9" : "#1e293b";
  const subtitleColor = isDark ? "#94a3b8" : "#64748b";

  const renderField = (label: string, value: any, field: string, isProfile = false) => {
    if (editing) {
      return (
        <Box mb={2}>
          <Typography variant="caption" color={subtitleColor} fontWeight={500}>
            {label}
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={isProfile ? editForm.student_profiles?.[field] || '' : editForm[field] || ''}
            onChange={(e) => isProfile ? handleProfileChange(field, e.target.value) : handleInputChange(field, e.target.value)}
            sx={{ mt: 0.5 }}
          />
        </Box>
      );
    }
    return (
      <Box mb={2}>
        <Typography variant="caption" color={subtitleColor} fontWeight={500}>
          {label}
        </Typography>
        <Typography variant="body1" color={textColor}>
          {value || "Not provided"}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: cardBg, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box display="flex" gap={2} alignItems="center">
            <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.main" }}>
              <Person sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold" color={textColor}>
                {student.firstname} {student.lastname}
              </Typography>
              <Typography variant="body1" color={subtitleColor}>
                {student.email}
              </Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <Chip label={profile.coursename} color="primary" size="small" />
                <Chip label={profile.role} variant="outlined" size="small" />
              </Stack>
            </Box>
          </Box>
          
          <Stack direction="row" spacing={1}>
            {editing ? (
              <>
                <Button variant="contained" color="success" startIcon={<Save />} onClick={handleSave}>
                  Save
                </Button>
                <Button variant="outlined" startIcon={<Cancel />} onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button variant="contained" startIcon={<Edit />} onClick={handleEdit}>
                  Edit
                </Button>
                <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => setDeleteDialogOpen(true)}>
                  Delete
                </Button>
                <Button variant="outlined" startIcon={<LockReset />} onClick={() => setResetPasswordDialogOpen(true)}>
                  Reset Password
                </Button>
                <Button component={Link} href="/admin/students" variant="outlined" startIcon={<ArrowBack />}>
                  Back
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: cardBg, height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Person color="primary" />
                <Typography variant="h6" fontWeight="bold" color={textColor}>
                  Personal Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {renderField("First Name", student.firstname, "firstname")}
              {renderField("Last Name", student.lastname, "lastname")}
              {renderField("Email", student.email, "email")}
              {renderField("Phone", student.phone, "phone")}
              {renderField("Date of Birth", profile.dob ? new Date(profile.dob).toLocaleDateString() : "Not provided", "dob", true)}
              {renderField("Emergency Contact", profile.emergencycontact, "emergencycontact", true)}
            </CardContent>
          </Card>
        </Grid>

        {/* Course Information */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: cardBg, height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <School color="primary" />
                <Typography variant="h6" fontWeight="bold" color={textColor}>
                  Course Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {renderField("Course Name", profile.coursename, "coursename", true)}
              {renderField("Role", profile.role, "role", true)}
              {renderField("Duration", `${profile.durationmonths} months`, "durationmonths", true)}
              {renderField("Start Date", new Date(profile.startdate).toLocaleDateString(), "startdate", true)}
              {renderField("End Date", profile.enddate ? new Date(profile.enddate).toLocaleDateString() : "Not set", "enddate", true)}
              
              <Box mt={3}>
                <Typography variant="caption" color={subtitleColor} fontWeight={500}>
                  Fees Status
                </Typography>
                <Typography variant="body1" color={textColor}>
                  ₹{profile.paidfees?.toLocaleString('en-IN')} of ₹{profile.totalfees?.toLocaleString('en-IN')}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={feeProgress} 
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color={subtitleColor}>
                  {feeProgress.toFixed(1)}% paid
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Documents */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: cardBg, height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Description color="primary" />
                <Typography variant="h6" fontWeight="bold" color={textColor}>
                  Documents
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Box mt={2}>
                <Typography variant="caption" color={subtitleColor} fontWeight={500}>
                  Available Documents
                </Typography>
                <Stack spacing={1} mt={1}>
                  {profile.photourl && (
                    <Button size="small" startIcon={<Download />} onClick={() => downloadFile(profile.photourl, "photo")}>
                      Download Photo
                    </Button>
                  )}
                  {profile.pancardurl && (
                    <Button size="small" startIcon={<Download />} onClick={() => downloadFile(profile.pancardurl, "pan_card")}>
                      Download PAN Card
                    </Button>
                  )}
                  {profile.aadhaarcardurl && (
                    <Button size="small" startIcon={<Download />} onClick={() => downloadFile(profile.aadhaarcardurl, "aadhaar_card")}>
                      Download Aadhaar Card
                    </Button>
                  )}
                  {profile.tenthmarksheeturl && (
                    <Button size="small" startIcon={<Download />} onClick={() => downloadFile(profile.tenthmarksheeturl, "10th_marksheet")}>
                      Download 10th Marksheet
                    </Button>
                  )}
                  {profile.twelfthmarksheeturl && (
                    <Button size="small" startIcon={<Download />} onClick={() => downloadFile(profile.twelfthmarksheeturl, "12th_marksheet")}>
                      Download 12th Marksheet
                    </Button>
                  )}
                  {profile.collegemarksheeturl && (
                    <Button size="small" startIcon={<Download />} onClick={() => downloadFile(profile.collegemarksheeturl, "college_marksheet")}>
                      Download College Marksheets
                    </Button>
                  )}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

      {/* Address */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ bgcolor: cardBg }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LocationOn color="primary" />
                <Typography variant="h6" fontWeight="bold" color={textColor}>
                  Address
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {renderField("Address Line 1", profile.addressline1, "addressline1", true)}
              {renderField("Address Line 2", profile.addressline2, "addressline2", true)}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  {renderField("City", profile.city, "city", true)}
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  {renderField("State", profile.state, "state", true)}
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  {renderField("Pincode", profile.pincode, "pincode", true)}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Educational Details */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ bgcolor: cardBg }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <MenuBook color="primary" />
                <Typography variant="h6" fontWeight="bold" color={textColor}>
                  Educational Details
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {renderField("10th Percentage", `${profile.tenthpercentage}%`, "tenthpercentage", true)}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {renderField("12th Percentage", `${profile.twelfthpercentage}%`, "twelfthpercentage", true)}
                </Grid>
              </Grid>
              {renderField("Current College", profile.currentcollege, "currentcollege", true)}
              {renderField("College Address", profile.collegeaddress, "collegeaddress", true)}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  {renderField("College City", profile.collegecity, "collegecity", true)}
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  {renderField("College State", profile.collegestate, "collegestate", true)}
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  {renderField("CGPA", profile.cgpa, "cgpa", true)}
                </Grid>
              </Grid>
              {renderField("Graduating Year", profile.graduatingyear, "graduatingyear", true)}
              {renderField("PAN Number", profile.pannumber, "pannumber", true)}
              {renderField("Aadhaar Number", profile.aadhaarnumber, "aadhaarnumber", true)}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{student.firstname} {student.lastname}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
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
                Password reset successful! Copy and share these credentials with {student.firstname}.
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
                  {student.email}
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => navigator.clipboard.writeText(student.email)}
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
  );
}
