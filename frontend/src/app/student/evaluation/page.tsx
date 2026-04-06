"use client";

import { useEffect, useState, useRef } from "react";
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
  Avatar,
  LinearProgress,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Assessment,
  PlayArrow,
  Timer,
  CheckCircle,
  Warning,
  Schedule,
  Flag,
  Refresh,
  Visibility,
  Star,
  TrendingUp,
  TrendingDown,
  CameraAlt,
  Mic,
  Fullscreen,
  NavigateNext,
  NavigateBefore,
  Assignment,
} from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { ChartContainer } from "@mui/x-charts/ChartContainer";
import { ThemeProvider } from "../../../components/theme";
import { format, subDays, isPast, isToday } from "date-fns";

interface Quiz {
  id: string;
  title: string;
  description: string;
  duration: number;
  deadline: string;
  status: 'active' | 'completed';
}

interface AttemptedQuiz {
  id: string;
  quizId: string;
  quizTitle: string;
  score: number | null;
  submittedAt: string;
  windowSwitches: number;
  cheatingFlagged: boolean;
  timeTaken?: number;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export default function StudentEvaluationPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [activeQuizzes, setActiveQuizzes] = useState<Quiz[]>([]);
  const [attemptedQuizzes, setAttemptedQuizzes] = useState<AttemptedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Quiz modal states
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{[key: string]: number}>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [windowSwitchCount, setWindowSwitchCount] = useState(0);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    completedQuizzes: 0,
    averageScore: 0,
    pendingQuizzes: 0,
    weeklyPerformance: [] as any[],
    scoreDistribution: [] as any[],
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchActiveQuizzes();
    fetchAttemptedQuizzes();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [activeQuizzes, attemptedQuizzes]);

  useEffect(() => {
    if (quizStarted && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
    } else if (timeRemaining === 0 && quizStarted) {
      handleSubmitQuiz();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeRemaining, quizStarted]);

  const fetchActiveQuizzes = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch active quizzes");
      
      const data = await res.json();
      setActiveQuizzes(data);
    } catch (err) {
      setError("Error loading active quizzes");
      console.error(err);
    }
  };

  const fetchAttemptedQuizzes = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/attempted`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch attempted quizzes");
      
      const data = await res.json();
      setAttemptedQuizzes(data);
    } catch (err) {
      console.error("Error fetching attempted quizzes:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalQuizzes = activeQuizzes.length + attemptedQuizzes.length;
    const completedQuizzes = attemptedQuizzes.length;
    const pendingQuizzes = activeQuizzes.filter(q => !isPast(new Date(q.deadline))).length;
    const gradedQuizzes = attemptedQuizzes.filter(q => q.score !== null);
    const averageScore = gradedQuizzes.length > 0
      ? Math.round(gradedQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / gradedQuizzes.length)
      : 0;

    // Calculate weekly performance
    const weeklyData = [];
    const today = new Date();
    
    for (let i = 3; i >= 0; i--) {
      // Calculate week boundaries (week ends today and goes back 7 days at a time)
      const weekEnd = subDays(today, i * 7);
      const weekStart = subDays(weekEnd, 7);
      
      const weekQuizzes = attemptedQuizzes.filter(q => {
        const submittedDate = new Date(q.submittedAt);
        return submittedDate >= weekStart && submittedDate < weekEnd;
      });
      const weekScore = weekQuizzes.length > 0
        ? Math.round(weekQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / weekQuizzes.length)
        : 0;
      
      weeklyData.push({
        week: `Week ${4 - i}`,
        score: weekScore,
        quizCount: weekQuizzes.length,
      });
    }

    // Score distribution
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
      completedQuizzes,
      averageScore,
      pendingQuizzes,
      weeklyPerformance: weeklyData,
      scoreDistribution: scoreRanges,
    });
  };

  const handleStartQuiz = (quiz: Quiz) => {
    // Open quiz in new tab
    window.open(`/student/quiz?quizId=${quiz.id}`, '_blank');
  };

  const requestPermissions = async () => {
    try {
      // Camera permission
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraPermissionGranted(true);
      cameraStream.getTracks().forEach(track => track.stop());

      // Microphone permission
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionGranted(true);
      micStream.getTracks().forEach(track => track.stop());

      // Fullscreen
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error("Permission request failed:", err);
    }
  };

  const handleBeginQuiz = () => {
    setQuizStarted(true);
  };

  const handleAnswerChange = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (submitting) return;
    
    // Check if deadline has passed
    if (selectedQuiz && isPast(new Date(selectedQuiz.deadline))) {
      setError("Cannot submit quiz: Deadline has passed");
      return;
    }
    
    setSubmitting(true);

    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${selectedQuiz?.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers,
          timeTaken: selectedQuiz ? selectedQuiz.duration * 60 - timeRemaining : 0,
          windowSwitches: windowSwitchCount,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit quiz");

      setSuccess("Quiz submitted successfully!");
      setQuizDialogOpen(false);
      fetchActiveQuizzes();
      fetchAttemptedQuizzes();
    } catch (err) {
      setError("Error submitting quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
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
              Tests & Performance
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Take quizzes and track your performance
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => {
            fetchActiveQuizzes();
            fetchAttemptedQuizzes();
          }}>
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
              title="Total Quizzes"
              value={stats.totalQuizzes}
              subtitle="Available to you"
              icon={Assessment}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Completed"
              value={stats.completedQuizzes}
              subtitle="Attempted quizzes"
              icon={CheckCircle}
              color="success"
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
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Pending"
              value={stats.pendingQuizzes}
              subtitle="Available to take"
              icon={Schedule}
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
                  Weekly Performance
                </Typography>
                <Box height={300}>
                  {stats.weeklyPerformance.length > 0 ? (
                    <LineChart
                      series={[
                        {
                          data: stats.weeklyPerformance.map(w => w.score),
                          label: "Average Score (%)",
                          color: "#e27719",
                          area: true,
                          curve: "monotoneX",
                          valueFormatter: (value) => `${value}%`,
                        },
                      ]}
                      xAxis={[
                        {
                          data: stats.weeklyPerformance.map(w => w.week),
                          scaleType: "point",
                        },
                      ]}
                      yAxis={[
                        {
                          min: 0,
                          max: 100,
                          label: "Score (%)",
                        },
                      ]}
                      height={300}
                      margin={{ top: 10, right: 10, bottom: 40, left: 70 }}
                    />
                  ) : (
                    <Box display="flex" alignItems="center" justifyContent="center" height={300}>
                      <Typography variant="body2" color="text.secondary">
                        No quiz data available for past 4 weeks
                      </Typography>
                    </Box>
                  )}
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
                <Box height={300}>
                  <BarChart
                    series={[
                      {
                        data: stats.scoreDistribution.map(s => s.count),
                        color: "#e27719",
                      },
                    ]}
                    xAxis={[
                      {
                        data: stats.scoreDistribution.map(s => s.range),
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
              <Tab label={`Active Quizzes (${activeQuizzes.length})`} />
              <Tab label={`Attempted (${attemptedQuizzes.length})`} />
            </Tabs>

            {/* Active Quizzes Tab */}
            {activeTab === 0 && (
              <Grid container spacing={3}>
                {activeQuizzes.map((quiz) => (
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={quiz.id}>
                    <Card sx={{ height: "100%" }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Avatar sx={{ bgcolor: "primary.light" }}>
                            <Assessment />
                          </Avatar>
                          <Chip
                            label={format(new Date(quiz.deadline), "MMM d")}
                            size="small"
                            color={getDeadlineStatus(quiz.deadline) as any}
                          />
                        </Box>

                        <Typography variant="h6" fontWeight={600} mb={1}>
                          {quiz.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                          {quiz.description}
                        </Typography>

                        <Box display="flex" gap={1} mb={2}>
                          <Chip
                            label={`${quiz.duration} min`}
                            size="small"
                            variant="outlined"
                            icon={<Timer />}
                          />
                        </Box>

                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            Deadline: {format(new Date(quiz.deadline), "MMM d, yyyy")}
                          </Typography>
                          <Button
                            variant="contained"
                            startIcon={<PlayArrow />}
                            onClick={() => handleStartQuiz(quiz)}
                            disabled={isPast(new Date(quiz.deadline))}
                          >
                            {isPast(new Date(quiz.deadline)) ? "Expired" : "Start Quiz"}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

                {activeQuizzes.length === 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Box textAlign="center" py={4}>
                      <Typography color="text.secondary">
                        No active quizzes available
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Attempted Quizzes Tab */}
            {activeTab === 1 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Quiz</TableCell>
                      <TableCell>Submitted</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Time Taken</TableCell>
                      <TableCell>Flags</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attemptedQuizzes.map((attempt) => (
                      <TableRow key={attempt.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {attempt.quizTitle}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {format(new Date(attempt.submittedAt), "MMM d, yyyy HH:mm")}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {attempt.score !== null ? (
                            <Typography variant="body2" fontWeight={600}>
                              {attempt.score}/100
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Pending
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" display="flex" alignItems="center" gap={1}>
                            <Timer fontSize="small" />
                            {attempt.timeTaken ? `${Math.round(attempt.timeTaken / 60)} min` : "N/A"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            {attempt.cheatingFlagged && (
                              <Chip
                                icon={<Warning />}
                                label="Flagged"
                                size="small"
                                color="error"
                              />
                            )}
                            {attempt.windowSwitches > 0 && (
                              <Chip
                                icon={<Flag />}
                                label={`${attempt.windowSwitches} switches`}
                                size="small"
                                color="warning"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => window.open(`/student/evaluation/submission/${attempt.id}`, '_blank')}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {attemptedQuizzes.length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">
                  No quiz attempts yet
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Quiz Modal */}
        <Dialog open={quizDialogOpen} onClose={() => setQuizDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedQuiz?.title}
          </DialogTitle>
          <DialogContent>
            {!quizStarted ? (
              <Box mt={2}>
                <Typography variant="body1" mb={3}>
                  {selectedQuiz?.description}
                </Typography>

                <Box mb={3}>
                  <Typography variant="h6" mb={2}>Quiz Requirements:</Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CameraAlt color={cameraPermissionGranted ? "success" : "error"} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Camera Access"
                        secondary={cameraPermissionGranted ? "Granted" : "Required"}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Mic color={micPermissionGranted ? "success" : "error"} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Microphone Access"
                        secondary={micPermissionGranted ? "Granted" : "Required"}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Fullscreen color={isFullscreen ? "success" : "error"} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Fullscreen Mode"
                        secondary={isFullscreen ? "Active" : "Required"}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Timer />
                      </ListItemIcon>
                      <ListItemText
                        primary="Duration"
                        secondary={`${selectedQuiz?.duration} minutes`}
                      />
                    </ListItem>
                  </List>
                </Box>

                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Important:</strong> Switching tabs or windows during the quiz will be tracked and may affect your score.
                  </Typography>
                </Alert>

                <Box display="flex" justifyContent="center">
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<PlayArrow />}
                    onClick={handleBeginQuiz}
                    disabled={!cameraPermissionGranted || !micPermissionGranted || !isFullscreen}
                  >
                    Start Quiz
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box mt={2}>
                {/* Timer */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">
                    Question {currentQuestionIndex + 1} of {quizQuestions.length}
                  </Typography>
                  <Chip
                    label={formatTime(timeRemaining)}
                    color={timeRemaining < 300 ? "error" : "primary"}
                    icon={<Timer />}
                  />
                </Box>

                {/* Progress */}
                <LinearProgress
                  variant="determinate"
                  value={(currentQuestionIndex / quizQuestions.length) * 100}
                  sx={{ mb: 3 }}
                />

                {/* Question */}
                {quizQuestions[currentQuestionIndex] && (
                  <Box mb={3}>
                    <Typography variant="h6" fontWeight={600} mb={3}>
                      {quizQuestions[currentQuestionIndex].question}
                    </Typography>
                    <RadioGroup
                      value={answers[quizQuestions[currentQuestionIndex].id] || ""}
                      onChange={(e) => handleAnswerChange(
                        quizQuestions[currentQuestionIndex].id,
                        parseInt(e.target.value)
                      )}
                    >
                      {quizQuestions[currentQuestionIndex].options.map((option, index) => (
                        <FormControlLabel
                          key={index}
                          value={index.toString()}
                          control={<Radio />}
                          label={option}
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </RadioGroup>
                  </Box>
                )}

                {/* Navigation */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <IconButton
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    <NavigateBefore />
                  </IconButton>

                  <Typography variant="body2" color="text.secondary">
                    Window switches: {windowSwitchCount}
                  </Typography>

                  {currentQuestionIndex === quizQuestions.length - 1 ? (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleSubmitQuiz}
                      disabled={submitting}
                    >
                      {submitting ? "Submitting..." : "Submit Quiz"}
                    </Button>
                  ) : (
                    <IconButton onClick={handleNextQuestion}>
                      <NavigateNext />
                    </IconButton>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQuizDialogOpen(false)} disabled={quizStarted}>
              {quizStarted ? "Cannot exit during quiz" : "Cancel"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
