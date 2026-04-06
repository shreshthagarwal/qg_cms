"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Grid,
  Divider,
} from "@mui/material";
import {
  Warning,
  Timer,
  CheckCircle,
  Cancel,
  ArrowBack,
  Assessment,
  Flag,
} from "@mui/icons-material";
import { ThemeProvider } from "../../../../../components/theme";

interface AnswerDetail {
  questionId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  userAnswer: number;
  isCorrect: boolean;
}

interface SubmissionDetail {
  submission: {
    id: string;
    quizId: string;
    quizTitle: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    score: number | null;
    submittedAt: string;
    windowSwitches: number;
    cheatingFlagged: boolean;
    timeTaken: number;
  };
  answers: AnswerDetail[];
}

export default function StudentSubmissionDetailsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [submissionDetails, setSubmissionDetails] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (submissionId) {
      fetchSubmissionDetails();
    }
  }, [submissionId]);

  const fetchSubmissionDetails = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/submissions/${submissionId}/details`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch submission details");

      const data = await res.json();
      setSubmissionDetails(data);
    } catch (err) {
      setError("Error loading submission details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <ThemeProvider>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <LinearProgress sx={{ width: "50%" }} />
        </Box>
      </ThemeProvider>
    );
  }

  if (error || !submissionDetails) {
    return (
      <ThemeProvider>
        <Box p={4}>
          <Alert severity="error">{error || "Submission not found"}</Alert>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/student/evaluation')}
            sx={{ mt: 2 }}
          >
            Back
          </Button>
        </Box>
      </ThemeProvider>
    );
  }

  const { submission, answers } = submissionDetails;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalQuestions = answers.length;
  const scorePercentage = submission.score ?? 0;

  return (
    <ThemeProvider>
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight={700}>
            Quiz Submission Details
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => router.push('/student/evaluation')}
          >
            Back
          </Button>
        </Box>

        {/* Summary Card */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Assessment color="primary" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Quiz
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {submission.quizTitle}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Score
                </Typography>
                <Typography
                  variant="h3"
                  fontWeight={700}
                  color={scorePercentage >= 60 ? "success.main" : "error.main"}
                >
                  {scorePercentage}%
                </Typography>
                <Typography variant="body2">
                  {correctCount} / {totalQuestions} correct
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Submitted At
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {formatDate(submission.submittedAt)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Time Taken
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  <Timer fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                  {Math.round(submission.timeTaken / 60)} min
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Window Switches
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  <Flag fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                  {submission.windowSwitches}
                </Typography>
              </Grid>
            </Grid>

            {submission.cheatingFlagged && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Warning /> This submission was flagged for suspicious activity
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Answers Review */}
        <Typography variant="h5" fontWeight={600} mb={2}>
          Question Review
        </Typography>

        {answers.map((answer, index) => (
          <Card
            key={answer.questionId}
            sx={{
              mb: 2,
              border: 2,
              borderColor: answer.isCorrect ? "success.main" : "error.main",
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  Question {index + 1}
                </Typography>
                <Chip
                  icon={answer.isCorrect ? <CheckCircle /> : <Cancel />}
                  label={answer.isCorrect ? "Correct" : "Incorrect"}
                  color={answer.isCorrect ? "success" : "error"}
                  size="small"
                />
              </Box>

              <Typography variant="body1" fontWeight={500} mb={2}>
                {answer.question}
              </Typography>

              <Box>
                {answer.options.map((option, optIndex) => {
                  const isCorrect = optIndex === answer.correctAnswer;
                  const isUserAnswer = optIndex === answer.userAnswer;

                  return (
                    <Box
                      key={optIndex}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        borderRadius: 1,
                        bgcolor: isCorrect
                          ? "success.light"
                          : isUserAnswer && !isCorrect
                          ? "error.light"
                          : "grey.50",
                        border: 1,
                        borderColor: isCorrect
                          ? "success.main"
                          : isUserAnswer && !isCorrect
                          ? "error.main"
                          : "grey.200",
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={isCorrect || isUserAnswer ? 600 : 400}
                        color={
                          isCorrect
                            ? "success.dark"
                            : isUserAnswer && !isCorrect
                            ? "error.dark"
                            : "text.primary"
                        }
                      >
                        {String.fromCharCode(65 + optIndex)}. {option}
                        {isCorrect && " ✓ Correct Answer"}
                        {isUserAnswer && !isCorrect && " ✗ Your Answer"}
                        {isUserAnswer && isCorrect && " ✓ Your Answer"}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        ))}

        <Box display="flex" justifyContent="center" mt={4}>
          <Button variant="contained" size="large" onClick={() => router.push('/student/evaluation')}>
            Back to Results
          </Button>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
