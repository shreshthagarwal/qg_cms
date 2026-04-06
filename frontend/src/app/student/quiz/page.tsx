"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Grid,
} from "@mui/material";
import {
  Warning,
  Timer,
  Fullscreen,
  FullscreenExit,
  CameraAlt,
  Mic,
  MicOff,
  NavigateNext,
  NavigateBefore,
} from "@mui/icons-material";
import { ThemeProvider } from "../../../components/theme";
import { isPast } from "date-fns";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizData {
  id: string;
  title: string;
  description: string;
  duration: number;
  deadline: string;
  questions: Question[];
}

export default function QuizTakePage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const quizId = searchParams.get("quizId");
  
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: number}>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [windowSwitchCount, setWindowSwitchCount] = useState(0);
  const [cheatingFlagged, setCheatingFlagged] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [cameraPreviewActive, setCameraPreviewActive] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{question: Question; userAnswer: number; isCorrect: boolean}[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent copy/paste/selection
  useEffect(() => {
    if (!quizStarted) return;
    
    const preventCopy = (e: Event) => {
      e.preventDefault();
      return false;
    };
    
    const preventSelection = (e: Event) => {
      if (e.target instanceof HTMLElement) {
        e.preventDefault();
      }
    };
    
    document.addEventListener("copy", preventCopy);
    document.addEventListener("cut", preventCopy);
    document.addEventListener("paste", preventCopy);
    document.addEventListener("selectstart", preventSelection);
    document.addEventListener("contextmenu", preventCopy);
    document.addEventListener("dragstart", preventCopy);
    
    // Disable text selection via CSS
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    
    return () => {
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("cut", preventCopy);
      document.removeEventListener("paste", preventCopy);
      document.removeEventListener("selectstart", preventSelection);
      document.removeEventListener("contextmenu", preventCopy);
      document.removeEventListener("dragstart", preventCopy);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, [quizStarted]);

  // Window switch detection
  useEffect(() => {
    if (!quizStarted || quizSubmitted) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWindowSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount > 3) {
            setCheatingFlagged(true);
          }
          return newCount;
        });
      }
    };
    
    const handleBlur = () => {
      setWindowSwitchCount(prev => {
        const newCount = prev + 1;
        if (newCount > 3) {
          setCheatingFlagged(true);
        }
        return newCount;
      });
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [quizStarted, quizSubmitted]);

  // Fullscreen enforcement
  useEffect(() => {
    if (!quizStarted || quizSubmitted) return;
    
    const enforceFullscreen = () => {
      if (!document.fullscreenElement && !showFullscreenWarning) {
        setShowFullscreenWarning(true);
      }
    };
    
    fullscreenCheckRef.current = setInterval(enforceFullscreen, 1000);
    
    return () => {
      if (fullscreenCheckRef.current) {
        clearInterval(fullscreenCheckRef.current);
      }
    };
  }, [quizStarted, quizSubmitted, showFullscreenWarning]);

  // Timer
  useEffect(() => {
    if (!quizStarted || timeRemaining <= 0 || quizSubmitted) return;
    
    timerRef.current = setTimeout(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [quizStarted, timeRemaining, quizSubmitted]);

  const fetchQuiz = async () => {
    if (!quizId) {
      setLoading(false);
      setError("No quiz ID provided");
      return;
    }
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${quizId}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch quiz");
      
      const data = await res.json();
      setQuiz(data);
      setTimeRemaining(data.duration * 60);
    } catch (err) {
      setError("Error loading quiz");
    } finally {
      setLoading(false);
    }
  };

  // Fetch quiz on mount
  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  // Initialize camera preview on page load
  useEffect(() => {
    if (!quiz || cameraPreviewActive) return;
    
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setCameraStream(stream);
        setMicStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraPreviewActive(true);
      } catch (err) {
        console.error("Camera init error:", err);
      }
    };
    
    initCamera();
  }, [quiz, cameraPreviewActive]);

  // Keep video ref updated when stream changes
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, quizStarted]);

  const requestPermissions = async () => {
    try {
      // Reuse existing camera stream if available
      if (!cameraStream) {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(camStream);
        if (videoRef.current) {
          videoRef.current.srcObject = camStream;
        }
      }
      
      // Reuse existing mic stream if available
      if (!micStream) {
        const micStrm = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStream(micStrm);
      }
      
      // Fullscreen
      await document.documentElement.requestFullscreen();
      
      return true;
    } catch (err) {
      console.error("Permission error:", err);
      return false;
    }
  };

  const handleStartQuiz = async () => {
    const permissionsGranted = await requestPermissions();
    if (permissionsGranted) {
      setQuizStarted(true);
    }
  };

  const handleSubmitQuiz = async () => {
    if (quizSubmitted) return;
    
    setQuizSubmitted(true);
    
    // Calculate score
    let correctCount = 0;
    const resultsData = quiz?.questions.map((q, index) => {
      const userAnswer = answers[index];
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) correctCount++;
      return { question: q, userAnswer, isCorrect };
    }) || [];
    
    const finalScore = quiz?.questions.length ? Math.round((correctCount / quiz.questions.length) * 100) : 0;
    setScore(finalScore);
    setResults(resultsData);
    
    // Submit to server
    try {
      // Convert answers object to array to ensure proper indexing
      const answersArray = quiz?.questions?.map((_, index) => answers[index] ?? null) || [];
      
      const token = (session?.user as any)?.accessToken;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: answersArray,
          windowSwitches: windowSwitchCount,
          timeSpent: quiz?.duration ? (quiz.duration * 60) - timeRemaining : 0,
        }),
      });
    } catch (err) {
      console.error("Submit error:", err);
    }
    
    // Show results
    setShowResults(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFullscreenReturn = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setShowFullscreenWarning(false);
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
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

  if (error) {
    return (
      <ThemeProvider>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </ThemeProvider>
    );
  }

  if (showResults) {
    return (
      <ThemeProvider>
        <Box p={4} minHeight="100vh" bgcolor={score >= 60 ? "success.50" : "error.50"}>
          <Card elevation={3}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h4" fontWeight={700} mb={3} textAlign="center">
                Quiz Results
              </Typography>
              
              <Box 
                mb={3} 
                p={3} 
                bgcolor={score >= 60 ? "success.100" : "error.100"} 
                borderRadius={3}
                textAlign="center"
              >
                <Typography variant="h2" fontWeight={700} color={score >= 60 ? "success.main" : "error.main"}>
                  {Math.round((score / 100) * (quiz?.questions?.length || 1))} / {quiz?.questions?.length || 0}
                </Typography>
                <Typography variant="h4" color="text.secondary" mt={1}>
                  {score}% Correct
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                  {score >= 60 ? "Congratulations! You passed!" : "Keep practicing to improve your score."}
                </Typography>
              </Box>

              {cheatingFlagged && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Warning /> Suspicious activity detected during the quiz.
                </Alert>
              )}

              <Typography variant="h6" fontWeight={600} mb={2}>
                Question Review
              </Typography>

              {results.map((result, index) => (
                <Card 
                  key={result.question.id} 
                  sx={{ 
                    mb: 2, 
                    bgcolor: result.isCorrect ? "success.50" : "error.50",
                    border: 1,
                    borderColor: result.isCorrect ? "success.200" : "error.200"
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Question {index + 1}: {result.question.question}
                    </Typography>
                    <Box mt={1}>
                      {result.question.options.map((option, optIndex) => (
                        <Typography
                          key={optIndex}
                          variant="body2"
                          sx={{
                            p: 1.5,
                            bgcolor: optIndex === result.question.correctAnswer
                              ? "success.100"
                              : optIndex === result.userAnswer && !result.isCorrect
                              ? "error.100"
                              : "background.paper",
                            color: optIndex === result.question.correctAnswer
                              ? "success.dark"
                              : optIndex === result.userAnswer && !result.isCorrect
                              ? "error.dark"
                              : "text.primary",
                            borderRadius: 2,
                            mb: 1,
                            border: optIndex === result.question.correctAnswer
                              ? "1px solid success.main"
                              : optIndex === result.userAnswer && !result.isCorrect
                              ? "1px solid error.main"
                              : "1px solid divider",
                            fontWeight: optIndex === result.question.correctAnswer || (optIndex === result.userAnswer && !result.isCorrect) ? 600 : 400,
                          }}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option}
                          {optIndex === result.question.correctAnswer && " ✓ Correct"}
                          {optIndex === result.userAnswer && !result.isCorrect && " ✗ Your Answer"}
                        </Typography>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="contained"
                fullWidth
                onClick={() => window.close()}
                sx={{ mt: 2 }}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        {/* Fullscreen Warning Dialog */}
        <Dialog open={showFullscreenWarning} onClose={() => {}}>
          <DialogTitle>
            <Warning color="warning" /> Warning
          </DialogTitle>
          <DialogContent>
            <Typography>
              You have exited fullscreen mode. The quiz will be flagged for window switching if you don't return immediately.
            </Typography>
            <Typography variant="body2" color="error" mt={1}>
              Window switches detected: {windowSwitchCount}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleFullscreenReturn} variant="contained" color="primary">
              Return to Fullscreen
            </Button>
          </DialogActions>
        </Dialog>

        {/* Permission Preview */}
        {!quizStarted && (
          <Box p={4}>
            <Card>
              <CardContent>
                {/* Title */}
                <Typography variant="h3" fontWeight={700} mb={2}>
                  {quiz?.title}
                </Typography>

                {/* Description */}
                <Typography variant="body1" color="text.secondary" mb={3}>
                  {quiz?.description}
                </Typography>

                {/* Instructions */}
                <Alert severity="warning" variant="outlined" sx={{ mb: 4 }}>
                  <AlertTitle>Important Instructions</AlertTitle>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <Typography component="li" variant="body2">
                      Camera and microphone access required for monitoring
                    </Typography>
                    <Typography component="li" variant="body2">
                      Quiz must be taken in fullscreen mode
                    </Typography>
                    <Typography component="li" variant="body2">
                      Exiting fullscreen will flag your quiz
                    </Typography>
                    <Typography component="li" variant="body2">
                      Window switching is monitored and recorded
                    </Typography>
                  </Box>
                </Alert>

                {/* Camera (Left) + Mic & Stats (Right) */}
                <Grid container spacing={3} mb={4}>
                  {/* Left: Camera */}
                  <Grid size={{ xs: 12, md: 5 }}>
                    <Card elevation={2} sx={{ height: "100%" }}>
                      <CardContent sx={{ p: 3, height: "100%" }}>
                        <Typography variant="h6" fontWeight={600} mb={2}>
                          <CameraAlt sx={{ mr: 1, verticalAlign: "middle" }} />
                          Camera Preview
                        </Typography>
                        <Box
                          component="video"
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          sx={{ 
                            width: "80%", 
                            height: 280, 
                            borderRadius: 2, 
                            bgcolor: "black", 
                            objectFit: "cover",
                            mx: "auto",
                            display: "block"
                          }}
                        />
                        <Box display="flex" alignItems="center" gap={1} mt={1}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              bgcolor: cameraStream ? "success.main" : "error.main",
                            }}
                          />
                          <Typography variant="body2" color={cameraStream ? "success.main" : "error.main"}>
                            {cameraStream ? "Camera Active" : "Camera Not Connected"}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Right: Mic Status + Quiz Stats */}
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Box display="flex" flexDirection="column" gap={2} height="100%">
                      {/* Mic Status */}
                      <Card elevation={2}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="subtitle1" fontWeight={600} mb={1}>
                            <Mic sx={{ mr: 1, verticalAlign: "middle", fontSize: 20 }} />
                            Microphone Status
                          </Typography>
                          <Box 
                            display="flex" 
                            alignItems="center" 
                            gap={2} 
                            p={1.5} 
                            bgcolor={micStream ? "success.50" : "error.50"} 
                            borderRadius={2}
                            border={1}
                            borderColor={micStream ? "success.main" : "error.main"}
                          >
                            <Box 
                              display="flex" 
                              alignItems="center" 
                              justifyContent="center" 
                              width={40} 
                              height={40} 
                              bgcolor={micStream ? "success.main" : "error.main"} 
                              borderRadius="50%"
                            >
                              {micStream ? (
                                <Mic sx={{ fontSize: 24, color: "white" }} />
                              ) : (
                                <MicOff sx={{ fontSize: 24, color: "white" }} />
                              )}
                            </Box>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={600} color={micStream ? "success.main" : "error.main"}>
                                {micStream ? "Active" : "Not Connected"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {micStream ? "Microphone is connected" : "Please allow microphone access"}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>

                      {/* Quiz Stats */}
                      <Card elevation={2} sx={{ flex: 1 }}>
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="subtitle1" fontWeight={600} mb={1}>
                            Quiz Details
                          </Typography>
                          <Box display="flex" flexDirection="column" gap={1.5}>
                            <Box display="flex" alignItems="center" gap={2} p={1.5} bgcolor="primary.50" borderRadius={2}>
                              <Box 
                                display="flex" 
                                alignItems="center" 
                                justifyContent="center" 
                                width={40} 
                                height={40} 
                                bgcolor="primary.main" 
                                borderRadius="50%"
                              >
                                <Typography variant="h6" fontWeight={700} color="white">
                                  {quiz?.questions?.length || 0}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                                  Questions
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Total questions in this quiz
                                </Typography>
                              </Box>
                            </Box>
                            <Box display="flex" alignItems="center" gap={2} p={1.5} bgcolor="success.50" borderRadius={2}>
                              <Box 
                                display="flex" 
                                alignItems="center" 
                                justifyContent="center" 
                                width={40} 
                                height={40} 
                                bgcolor="success.main" 
                                borderRadius="50%"
                              >
                                <Typography variant="h6" fontWeight={700} color="white">
                                  {quiz?.duration}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="subtitle1" fontWeight={600} color="success.main">
                                  Minutes
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Time limit to complete quiz
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  </Grid>
                </Grid>

                {/* Start Button */}
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleStartQuiz}
                  disabled={!cameraStream || !micStream}
                  sx={{ 
                    py: 2,
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    borderRadius: 2,
                    boxShadow: 3
                  }}
                >
                  {(!cameraStream || !micStream || (quiz && isPast(new Date(quiz.deadline)))) ? "Please Allow Camera & Microphone" : `Start Quiz (${quiz?.duration} min)`}
                </Button>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Quiz Interface */}
        {quizStarted && quiz && (
          <Box p={3}>
            {/* Floating Camera Preview - Larger */}
            <Box
              sx={{
                position: "fixed",
                bottom: 24,
                right: 24,
                width: 240,
                height: 180,
                borderRadius: 2,
                overflow: "hidden",
                boxShadow: 4,
                zIndex: 1000,
                bgcolor: "black",
                border: "3px solid",
                borderColor: micStream ? "success.main" : "error.main",
              }}
            >
              <Box
                component="video"
                ref={videoRef}
                autoPlay
                playsInline
                muted
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: 4,
                  left: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  bgcolor: "rgba(0,0,0,0.6)",
                  px: 0.5,
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: micStream ? "success.main" : "error.main",
                  }}
                />
                <Typography variant="caption" sx={{ color: "white", fontSize: "10px" }}>
                  {micStream ? "Recording" : "No Mic"}
                </Typography>
              </Box>
            </Box>

            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h5" fontWeight={600}>
                {quiz.title}
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Chip
                  icon={<Timer />}
                  label={formatTime(timeRemaining)}
                  color={timeRemaining < 300 ? "error" : "default"}
                />
                {cheatingFlagged && (
                  <Chip icon={<Warning />} label="Flagged" color="error" />
                )}
              </Box>
            </Box>

            <LinearProgress
              variant="determinate"
              value={((currentQuestion + 1) / (quiz?.questions?.length || 1)) * 100}
              sx={{ mb: 3 }}
            />

            {/* Question */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Question {currentQuestion + 1} of {quiz?.questions?.length || 0}
                </Typography>
                <Typography
                  variant="body1"
                  mb={3}
                  sx={{
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    msUserSelect: "none",
                  }}
                >
                  {quiz?.questions?.[currentQuestion]?.question}
                </Typography>

                <RadioGroup
                  value={answers[currentQuestion] ?? ""}
                  onChange={(e) =>
                    setAnswers({
                      ...answers,
                      [currentQuestion]: parseInt(e.target.value),
                    })
                  }
                >
                  {quiz?.questions?.[currentQuestion]?.options?.map((option, index) => (
                    <FormControlLabel
                      key={index}
                      value={index}
                      control={<Radio />}
                      label={`${String.fromCharCode(65 + index)}. ${option}`}
                      sx={{
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: answers[currentQuestion] === index ? "action.selected" : "transparent",
                      }}
                    />
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Navigation */}
            <Box display="flex" justifyContent="space-between" mt={3}>
              <Button
                variant="outlined"
                startIcon={<NavigateBefore />}
                disabled={currentQuestion === 0}
                onClick={() => setCurrentQuestion(prev => prev - 1)}
              >
                Previous
              </Button>

              {currentQuestion === (quiz?.questions?.length || 1) - 1 ? (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSubmitQuiz}
                >
                  Submit Quiz
                </Button>
              ) : (
                <Button
                  variant="contained"
                  endIcon={<NavigateNext />}
                  onClick={() => setCurrentQuestion(prev => prev + 1)}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
