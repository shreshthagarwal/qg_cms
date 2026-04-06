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
  Tooltip,
} from "@mui/material";
import {
  PersonAdd,
  Search,
  Phone,
  Email,
  School,
  TrendingUp,
  CheckCircle,
  Pending,
  Archive,
  Unarchive,
  Edit,
  Visibility,
  Refresh,
  CalendarMonth,
  LocationOn,
} from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { ThemeProvider } from "../../../components/theme";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isValid } from "date-fns";

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

interface Lead {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  status: string;
  created_at?: string;
  createdAt?: string;
  location?: string;
}

export default function LeadsPage() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [archivedLeads, setArchivedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);

  // Form states
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // Stats
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    contactedLeads: 0,
    enrolledLeads: 0,
    conversionRate: 0,
    monthlyLeads: [] as any[],
  });

  useEffect(() => {
    fetchLeads();
    fetchArchivedLeads();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [leads]);

  const fetchLeads = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch leads");
      
      const data = await res.json();
      console.log("Raw leads data:", data);
      
      // Sanitize data to ensure no null/undefined values
      const sanitizedData = data.map((lead: any) => ({
        ...lead,
        firstname: lead.firstname || "",
        lastname: lead.lastname || "",
        email: lead.email || "",
        phone: lead.phone || "",
        status: lead.status || "NEW",
        created_at: lead.created_at || lead.createdAt,
      }));
      console.log("Sanitized leads:", sanitizedData);
      setLeads(sanitizedData);
    } catch (err) {
      setError("Error loading leads");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedLeads = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/archived`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch archived leads");
      
      const data = await res.json();
      console.log("Raw archived leads:", data);
      
      // Sanitize data to ensure no null/undefined values
      const sanitizedData = data.map((lead: any) => ({
        ...lead,
        firstname: lead.firstname || "",
        lastname: lead.lastname || "",
        email: lead.email || "",
        phone: lead.phone || "",
        status: lead.status || "CONVERTED",
        created_at: lead.created_at || lead.createdAt,
      }));
      setArchivedLeads(sanitizedData);
    } catch (err) {
      console.error("Error fetching archived leads:", err);
    }
  };

  const calculateStats = () => {
    // Include both active and archived leads for accurate stats
    const allLeads = [...leads, ...archivedLeads];
    const totalLeads = allLeads.length;
    const newLeads = allLeads.filter(l => l.status === "NEW" || l.status === "new").length;
    const contactedLeads = allLeads.filter(l => l.status === "CONTACTED" || l.status === "contacted").length;
    const enrolledLeads = allLeads.filter(l => l.status === "CONVERTED" || l.status === "converted" || l.status === "enrolled").length;
    const conversionRate = totalLeads > 0 ? Math.round((enrolledLeads / totalLeads) * 100) : 0;

    // Calculate monthly leads for the last 6 months
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      monthDate.setDate(1);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthLeads = allLeads.filter(l => {
        const createdAt = l.created_at || l.createdAt;
        if (!createdAt) return false;
        const leadDate = new Date(createdAt);
        if (!isValid(leadDate)) return false;
        return leadDate >= monthStart && leadDate <= monthEnd;
      }).length;
      
      monthlyData.push({
        month: safeFormat(monthStart, "MMM"),
        leads: monthLeads,
      });
    }

    setStats({
      totalLeads,
      newLeads,
      contactedLeads,
      enrolledLeads,
      conversionRate,
      monthlyLeads: monthlyData,
    });
  };

  const handleArchive = async (leadId: string) => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${leadId}/archive`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to archive lead");

      setSuccess("Lead archived successfully!");
      fetchLeads();
      fetchArchivedLeads();
    } catch (err) {
      setError("Error archiving lead");
    }
  };

  const handleUnarchive = async (leadId: string) => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${leadId}/unarchive`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to unarchive lead");

      setSuccess("Lead unarchived successfully!");
      fetchLeads();
      fetchArchivedLeads();
    } catch (err) {
      setError("Error unarchiving lead");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedLead) return;

    try {
      const token = (session?.user as any)?.accessToken;
      let endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/leads/${selectedLead.id}/contacted`;
      
      if (newStatus === "CONVERTED") {
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/leads/${selectedLead.id}/convert`;
      } else if (newStatus === "UNSUCCESSFUL") {
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/leads/${selectedLead.id}/unsuccessful`;
      }
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstname: selectedLead.firstname,
          lastname: selectedLead.lastname,
          email: selectedLead.email,
          phone: selectedLead.phone,
        }),
      });

      if (!res.ok) throw new Error("Failed to update lead status");

      setSuccess("Lead status updated successfully!");
      setEditDialogOpen(false);
      fetchLeads();
      fetchArchivedLeads();
    } catch (err) {
      setError("Error updating lead status");
    }
  };

  const handleUpdate = async () => {
    if (!selectedLead) return;

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstname: editFirstName,
          lastname: editLastName,
          email: editEmail,
          phone: editPhone,
        }),
      });

      if (!res.ok) throw new Error("Failed to update lead");

      setSuccess("Lead details updated successfully!");
      setEditDialogOpen(false);
      fetchLeads();
      fetchArchivedLeads();
    } catch (err) {
      setError("Error updating lead");
    }
  };

  const openEnrollDialog = (lead: Lead) => {
    setSelectedLead(lead);
    // Store lead data in sessionStorage for the admission form
    sessionStorage.setItem('selectedLead', JSON.stringify({
      firstName: lead.firstname,
      lastName: lead.lastname,
      email: lead.email,
      phone: lead.phone
    }));
    // Navigate to admission form
    window.open('/admin/admissions/new?leadId=' + lead.id, '_blank');
  };

  const openNewAdmissionDialog = () => {
    // Clear any existing lead data
    sessionStorage.removeItem('selectedLead');
    // Navigate to admission form without leadId
    window.open('/admin/admissions/new', '_blank');
  };

  const openEditDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setEditFirstName(lead.firstname || "");
    setEditLastName(lead.lastname || "");
    setEditEmail(lead.email || "");
    setEditPhone(lead.phone || "");
    setEditStatus(lead.status || "NEW");
    setEditDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "new": return "info";
      case "contacted": return "warning";
      case "interested": return "primary";
      case "enrolled": return "success";
      case "converted": return "success";
      case "unsuccessful": return "error";
      case "archived": return "default";
      default: return "default";
    }
  };

  const filteredLeads = leads.filter(lead =>
    ((lead.firstname || "").toLowerCase() + " " + (lead.lastname || "").toLowerCase()).includes(searchQuery.toLowerCase()) ||
    (lead.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (lead.phone || "").includes(searchQuery)
  );

  const filteredArchivedLeads = archivedLeads.filter(lead =>
    ((lead.firstname || "").toLowerCase() + " " + (lead.lastname || "").toLowerCase()).includes(searchQuery.toLowerCase()) ||
    (lead.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (lead.phone || "").includes(searchQuery)
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
              Leads & Admissions
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage prospective students and track enrollment pipeline
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button variant="contained" color="success" startIcon={<PersonAdd />} onClick={openNewAdmissionDialog}>
              New Admission
            </Button>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchLeads}>
              Refresh
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
              title="Total Leads"
              value={stats.totalLeads}
              subtitle="All prospects"
              icon={PersonAdd}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="New Leads"
              value={stats.newLeads}
              subtitle="Not contacted yet"
              icon={Pending}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Enrolled"
              value={stats.enrolledLeads}
              subtitle="Converted to students"
              icon={CheckCircle}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Conversion Rate"
              value={`${stats.conversionRate}%`}
              subtitle="Lead to enrollment"
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
                  Monthly Lead Trends
                </Typography>
                <Box height={300}>
                  <LineChart
                    series={[
                      {
                        data: stats.monthlyLeads.map(m => m.leads),
                        label: "Leads",
                        color: "#e27719",
                        area: true,
                      },
                    ]}
                    xAxis={[
                      {
                        data: stats.monthlyLeads.map(m => m.month),
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
                  Lead Status Distribution
                </Typography>
                <Box height={300}>
                  <BarChart
                    series={[
                      {
                        data: [stats.newLeads, stats.contactedLeads, stats.enrolledLeads],
                        color: "#e27719",
                      },
                    ]}
                    xAxis={[
                      {
                        data: ["New", "Contacted", "Enrolled"],
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

        {/* Leads Table */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                <Tab label={`Active Leads (${leads.length})`} />
                <Tab label={`Archived (${archivedLeads.length})`} />
              </Tabs>
              <TextField
                size="small"
                placeholder="Search leads..."
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
                    <TableCell>Name</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(activeTab === 0 ? filteredLeads : filteredArchivedLeads).map((lead) => (
                    <TableRow key={lead.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {`${lead.firstname || ""} ${lead.lastname || ""}`.trim() || "N/A"}
                          </Typography>
                          {lead.location && (
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                              <LocationOn fontSize="inherit" />
                              {lead.location}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" display="flex" alignItems="center" gap={1}>
                            <Phone fontSize="small" color="action" />
                            {lead.phone || "N/A"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={1}>
                            <Email fontSize="inherit" />
                            {lead.email || "N/A"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={lead.status}
                          size="small"
                          color={getStatusColor(lead.status) as any}
                          sx={{ 
                            fontWeight: 600,
                            textTransform: "capitalize",
                            ...(lead.status?.toLowerCase() === "new" && { bgcolor: "#e3f2fd", color: "#1976d2" }),
                            ...(lead.status?.toLowerCase() === "contacted" && { bgcolor: "#fff3e0", color: "#f57c00" }),
                            ...(lead.status?.toLowerCase() === "enrolled" && { bgcolor: "#e8f5e9", color: "#388e3c" }),
                            ...(lead.status?.toLowerCase() === "converted" && { bgcolor: "#e8f5e9", color: "#388e3c" }),
                            ...(lead.status?.toLowerCase() === "unsuccessful" && { bgcolor: "#ffebee", color: "#d32f2f" }),
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {safeFormat(lead.created_at || lead.createdAt, "MMM d, yyyy")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {safeFormat(lead.created_at || lead.createdAt, "h:mm a")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Edit />}
                            onClick={() => openEditDialog(lead)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<PersonAdd />}
                            onClick={() => openEnrollDialog(lead)}
                          >
                            Enroll
                          </Button>
                          {activeTab === 0 ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<Archive />}
                              onClick={() => handleArchive(lead.id)}
                            >
                              Archive
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<Unarchive />}
                              onClick={() => handleUnarchive(lead.id)}
                            >
                              Unarchive
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {(activeTab === 0 ? filteredLeads : filteredArchivedLeads).length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">
                  No leads found
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Lead Details</DialogTitle>
          <DialogContent>
            {selectedLead && (
              <Box mt={2}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Name
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {`${selectedLead.firstname || ""} ${selectedLead.lastname || ""}`.trim() || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {selectedLead.email || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {selectedLead.phone || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={selectedLead.status}
                      size="small"
                      color={getStatusColor(selectedLead.status) as any}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {safeFormat(selectedLead?.created_at || selectedLead?.createdAt, "MMM d, yyyy")}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
            <Button
              variant="contained"
              onClick={() => {
                setViewDialogOpen(false);
                openEditDialog(selectedLead!);
              }}
            >
              Edit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Enroll Dialog */}
        <Dialog open={enrollDialogOpen} onClose={() => setEnrollDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Enroll Student</DialogTitle>
          <DialogContent>
            {selectedLead && (
              <Box mt={2}>
                <Box mb={3} p={2} bgcolor="primary.light" borderRadius={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Lead Information
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {`${selectedLead.firstname || ""} ${selectedLead.lastname || ""}`.trim() || "N/A"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedLead.email} | {selectedLead.phone}
                  </Typography>
                </Box>

                <Typography variant="h6" fontWeight={600} mb={2}>
                  Opening Enrollment Form...
                </Typography>
                
                <Box p={3} bgcolor="info.light" borderRadius={2}>
                  <Typography variant="body2" color="info.dark">
                    The comprehensive enrollment form will open in a new window. Please complete the student details there.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={() => window.open('/admin/admissions/new?leadId=' + selectedLead.id, '_blank')}
                    sx={{ mt: 2 }}
                  >
                    Open Enrollment Form
                  </Button>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEnrollDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogContent>
            <Box mt={2} display="flex" flexDirection="column" gap={2}>
              <TextField
                fullWidth
                label="First Name"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
              />
              <TextField
                fullWidth
                label="Last Name"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
              <TextField
                fullWidth
                label="Phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
              <Box display="flex" gap={1} mt={2}>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => handleStatusChange("CONTACTED")}
                  disabled={selectedLead?.status === "CONTACTED"}
                >
                  Mark as Contacted
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handleStatusChange("CONVERTED")}
                  disabled={selectedLead?.status === "CONVERTED"}
                >
                  Convert to Student
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleStatusChange("UNSUCCESSFUL")}
                  disabled={selectedLead?.status === "UNSUCCESSFUL"}
                >
                  Mark Unsuccessful
                </Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdate}>
              Update Details
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
