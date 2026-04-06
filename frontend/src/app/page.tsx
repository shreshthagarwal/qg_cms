"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
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
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  School,
  Business,
} from "@mui/icons-material";
import { ThemeProvider } from "../components/theme";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const callbackUrl = searchParams?.get("callbackUrl") || "/";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STUDENT">("STUDENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    
    if (session) {
      if (session.user?.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/student");
      }
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      role,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password, or incorrect role selected.");
    } else if (result?.ok) {
      if (role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/student");
      }
      router.refresh();
    }
  };

  if (status === "loading") {
    return (
      <ThemeProvider>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress color="primary" />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', py: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            {/* Left side - Logo and basic info */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Box sx={{ mb: 4, display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                  <Box 
                    component="img"
                    src="/qg_logo.jpg"
                    alt="QuantGlobal Logo"
                    sx={{ 
                      width: 150, 
                      height: 'auto',
                      maxWidth: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </Box>
                <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom color="text.primary">
                  QuantGlobal
                </Typography>
              </Box>
            </Grid>

            {/* Right side - Login form */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ maxWidth: 450, mx: 'auto', border: '1px solid', borderColor: 'grey.200' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h4" component="h2" fontWeight="600" textAlign="center" gutterBottom color="text.primary">
                    Sign In
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
                    Select your role and enter your credentials
                  </Typography>

                  {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {error}
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit}>
                    {/* Role Selection */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" fontWeight="500" sx={{ mb: 2, color: 'text.primary' }}>
                        Select Role
                      </Typography>
                      <ToggleButtonGroup
                        value={role}
                        exclusive
                        onChange={(_, newRole) => newRole && setRole(newRole as "ADMIN" | "STUDENT")}
                        fullWidth
                        sx={{ mb: 2 }}
                      >
                        <ToggleButton value="ADMIN" sx={{ flex: 1, py: 1.5, borderColor: 'grey.300' }}>
                          <Business sx={{ mr: 1, fontSize: 20 }} />
                          Admin
                        </ToggleButton>
                        <ToggleButton value="STUDENT" sx={{ flex: 1, py: 1.5, borderColor: 'grey.300' }}>
                          <School sx={{ mr: 1, fontSize: 20 }} />
                          Student
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    {/* Email */}
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      sx={{ mb: 2 }}
                    />

                    {/* Password */}
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      sx={{ mb: 3 }}
                    />

                    {/* Submit button */}
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={loading}
                      sx={{ py: 1.8, fontSize: '1rem' }}
                    >
                      {loading ? (
                        <Box display="flex" alignItems="center" gap={1}>
                          <CircularProgress size={20} color="inherit" />
                          Signing in...
                        </Box>
                      ) : (
                        `Sign in as ${role}`
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
