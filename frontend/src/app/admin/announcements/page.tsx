"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  Send,
  Delete,
  Schedule,
  MarkEmailRead,
  Announcement as AnnouncementIcon,
} from "@mui/icons-material";
import { ThemeProvider } from "../../../components/theme";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  message: string;
  target_audience: "all" | "specific";
  target_student_ids: string[] | null;
  created_at: string;
  created_by: string;
  creator: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function AnnouncementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
      router.push("/");
      return;
    }

    fetchData();
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      const token = (session?.user as any)?.accessToken;

      // Fetch announcements
      const announcementsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const announcementsData = announcementsRes.ok ? await announcementsRes.json() : [];

      setAnnouncements(announcementsData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const token = (session?.user as any)?.accessToken;
      const payload = {
        title,
        message,
        targetAudience: "all",
        targetStudentIds: null,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/announcements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess("Announcement sent successfully!");
        setTitle("");
        setMessage("");
        fetchData();
      } else {
        const error = await res.json();
        setError(error.error || "Failed to send announcement");
      }
    } catch (err) {
      console.error("Error sending announcement:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/announcements/${selectedAnnouncement.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSuccess("Announcement deleted successfully!");
        setDeleteDialogOpen(false);
        setSelectedAnnouncement(null);
        fetchData();
      } else {
        setError("Failed to delete announcement");
      }
    } catch (err) {
      console.error("Error deleting announcement:", err);
      setError("An error occurred. Please try again.");
    }
  };

  if (status === "loading" || loading) {
    return (
      <ThemeProvider>
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={600} mb={4}>
          <AnnouncementIcon sx={{ mr: 2, verticalAlign: "middle" }} />
          Announcements
        </Typography>

        <Grid container spacing={4}>
          {/* Create Announcement */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={3}>
                  Create New Announcement
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    multiline
                    rows={4}
                    sx={{ mb: 2 }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    startIcon={<Send />}
                    disabled={submitting || !title || !message}
                    sx={{ py: 1.5 }}
                  >
                    {submitting ? "Sending..." : "Send Announcement"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Past Announcements */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={3}>
                  Past Announcements
                </Typography>

                {announcements.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                    No announcements sent yet
                  </Typography>
                ) : (
                  <Box sx={{ maxHeight: 600, overflowY: "auto" }}>
                    {announcements.map((announcement) => (
                      <Paper key={announcement.id} sx={{ p: 2, mb: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                          <Typography variant="h6" fontWeight={600}>
                            {announcement.title}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>

                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {announcement.message}
                        </Typography>

                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Schedule sx={{ fontSize: 16, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(announcement.created_at), "MMM dd, yyyy HH:mm")}
                            </Typography>
                          </Box>
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                          By {announcement.creator.first_name} {announcement.creator.last_name}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Announcement</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the announcement "{selectedAnnouncement?.title}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
}
