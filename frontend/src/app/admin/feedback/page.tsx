"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Paper,
  Button,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
} from "@mui/material";
import {
  Delete,
  Person,
  Schedule,
  Star,
  TrendingUp,
} from "@mui/icons-material";
import { ThemeProvider } from "../../../components/theme";
import { format, isValid, subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

interface Feedback {
  id: string;
  studentName: string;
  feedback: string;
  createdAt?: string;
  created_at?: string;
  status: 'new' | 'reviewed';
}

export default function FeedbackPage() {
  const { data: session } = useSession();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFeedbacks: 0,
    newFeedbacks: 0,
    reviewedFeedbacks: 0,
    weeklyFeedbacks: 0,
  });

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
        
        // Calculate stats
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
        
        setStats({
          totalFeedbacks: data.length,
          newFeedbacks: data.filter((f: any) => f.status === 'new').length,
          reviewedFeedbacks: data.filter((f: any) => f.status === 'reviewed').length,
          weeklyFeedbacks: data.filter((f: any) => {
            // Handle both createdAt and created_at field names
            const createdDate = new Date(f.createdAt || f.created_at);
            return isValid(createdDate) && isWithinInterval(createdDate, { start: weekStart, end: weekEnd });
          }).length,
        });
      }
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsReviewed = async (feedbackId: string) => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'reviewed' }),
      });

      if (res.ok) {
        setFeedbacks(prev => 
          prev.map(f => f.id === feedbackId ? { ...f, status: 'reviewed' } : f)
        );
      }
    } catch (err) {
      console.error("Error marking feedback as reviewed:", err);
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
      }
    } catch (err) {
      console.error("Error deleting feedback:", err);
    }
  };

  if (loading) {
    return (
      <ThemeProvider>
        <Box sx={{ width: "100%", mt: 4, p: 3 }}>
          <LinearProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Box sx={{ p: 3, bgcolor: "#fafafa", minHeight: "100vh" }}>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h4" fontWeight={700} color="#1f2937">
            Student Feedback
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and review student feedback
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: "primary.light" }}>
                    <TrendingUp />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.totalFeedbacks}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Feedbacks
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: "success.light" }}>
                    <Star />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.newFeedbacks}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      New Feedbacks
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: "info.light" }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.reviewedFeedbacks}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Reviewed
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: "warning.light" }}>
                    <Schedule />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.weeklyFeedbacks}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This Week
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Feedback List */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={3}>
                  All Feedbacks
                </Typography>
                
                {feedbacks.length > 0 ? (
                  <Grid container spacing={2}>
                    {feedbacks.map((feedback) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={feedback.id}>
                        <Card 
                          sx={{ 
                            height: '100%',
                            border: feedback.status === 'new' ? '2px solid #e27719' : '1px solid #e5e7eb',
                            '&:hover': { boxShadow: 2 },
                          }}
                        >
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ bgcolor: "primary.light", width: 32, height: 32 }}>
                                  <Person fontSize="small" />
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle2" fontWeight={600}>
                                    {feedback.studentName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {feedback.createdAt && isValid(new Date(feedback.createdAt)) 
                                      ? format(new Date(feedback.createdAt), 'MMM d, yyyy HH:mm')
                                      : feedback.created_at && isValid(new Date(feedback.created_at))
                                      ? format(new Date(feedback.created_at), 'MMM d, yyyy HH:mm')
                                      : 'Invalid date'
                                    }
                                  </Typography>
                                </Box>
                              </Box>
                              <Chip 
                                size="small" 
                                label={feedback.status}
                                color={feedback.status === 'new' ? 'warning' : 'default'}
                              />
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" mb={2}>
                              {feedback.feedback}
                            </Typography>
                            
                            <Box display="flex" justifyContent="flex-end" gap={1}>
                              {feedback.status === 'new' && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => markAsReviewed(feedback.id)}
                                >
                                  Mark Reviewed
                                </Button>
                              )}
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={() => deleteFeedback(feedback.id)}
                                  sx={{ color: 'error.main' }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Alert severity="info">
                    No feedback received yet. Students can submit feedback through their dashboard.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
}
