"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import AnnouncementComponent from "../../components/AnnouncementComponent";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  IconButton,
  Divider,
  Button,
  Chip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
import {
  Dashboard,
  MenuBook,
  Assignment,
  BarChart,
  CalendarMonth,
  Assessment,
  Logout,
  Menu as MenuIcon,
  Lock,
} from "@mui/icons-material";
import { ThemeProvider } from "../../components/theme";

const drawerWidth = 280;

const menuItems = [
  { path: "/student", label: "Dashboard", icon: Dashboard },
  { path: "/student/lms", label: "My Learning", icon: MenuBook },
  { path: "/student/assignments", label: "Assignments", icon: Assignment },
  { path: "/student/quantlive", label: "QuantLive Trading", icon: BarChart },
  { path: "/student/attendance", label: "Attendance", icon: CalendarMonth },
  { path: "/student/evaluation", label: "Tests & Performance", icon: Assessment },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);

  const isQuizPage = pathname === "/student/quiz" || pathname?.startsWith("/student/quiz");

  if (status === "loading") {
    return (
      <ThemeProvider>
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <Typography>Loading...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "STUDENT") {
    router.push("/");
    return null;
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      
      if (res.ok) {
        setChangePasswordOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordError("Password changed successfully!");
        setTimeout(() => setPasswordError(""), 3000);
      } else {
        const error = await res.json();
        setPasswordError(error.message || "Failed to change password");
      }
    } catch (error) {
      setPasswordError("An error occurred. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box>
      {/* Logo */}
      <Box
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <img 
          src="/qg_logo.jpg" 
          alt="QuantGlobal Logo" 
          style={{ height: '50px', width: 'auto', marginBottom: '8px' }}
        />
        <Typography variant="h6" fontWeight={700} color="#1f2937">
          Student Panel
        </Typography>
      </Box>

      {/* Navigation */}
      <List sx={{ px: 2, py: 2 }}>
        {menuItems.map((item) => {
          // For dashboard (/student), only match exact path
          // For other paths, match exact or subpaths
          const isActive = item.path === "/student" 
            ? pathname === "/student"
            : pathname === item.path || pathname.startsWith(`${item.path}/`);
          const Icon = item.icon;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.path}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  "&.Mui-selected": {
                    bgcolor: "rgba(226, 119, 25, 0.1)",
                    color: "primary.main",
                    "& .MuiListItemIcon-root": {
                      color: "primary.main",
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? "primary.main" : "text.secondary" }}>
                  <Icon />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "0.95rem",
                  }}
                />
                {item.path === "/student" && unreadAnnouncements > 0 && (
                  <Badge badgeContent={unreadAnnouncements} color="error" sx={{ ml: 1 }}>
                    <Box />
                  </Badge>
                )}
                {isActive && (
                  <Chip
                    size="small"
                    sx={{
                      bgcolor: "primary.main",
                      color: "white",
                      height: 6,
                      width: 6,
                      minWidth: 6,
                      borderRadius: "50%",
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ mx: 2 }} />

      {/* Change Password */}
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          startIcon={<Lock />}
          onClick={() => setChangePasswordOpen(true)}
          sx={{ justifyContent: "flex-start", py: 1.2 }}
        >
          Change Password
        </Button>
      </Box>

      {/* Logout */}
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<Logout />}
          onClick={handleLogout}
          sx={{ justifyContent: "flex-start", py: 1.2 }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  if (isQuizPage) {
    return (
      <ThemeProvider>
        <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa" }}>
          {children}
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Box sx={{ display: "flex", bgcolor: "#fafafa", minHeight: "100vh" }}>
        {/* App Bar */}
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
            bgcolor: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: "none" }, color: "text.primary" }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" color="text.primary" fontWeight={600} sx={{ flexGrow: 1 }}>
              {menuItems.find((item) => pathname === item.path)?.label || "Student Portal"}
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="body2" color="text.secondary">
                {session.user?.email}
              </Typography>
              <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
                {session.user?.email?.charAt(0).toUpperCase()}
              </Avatar>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Sidebar */}
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
          {/* Mobile Drawer */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: "block", sm: "none" },
              "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>

          {/* Desktop Drawer */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: "none", sm: "block" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
                borderRight: "1px solid #f0f0f0",
                bgcolor: "white",
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            mt: 8,
            overflow: "auto",
            height: "calc(100vh - 64px)",
          }}
        >
          {children}
        </Box>
      </Box>
      
      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Current Password"
              type="password"
              fullWidth
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              margin="normal"
            />
            <TextField
              label="New Password"
              type="password"
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
            />
            <TextField
              label="Confirm New Password"
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
            />
            {passwordError && (
              <Alert severity={passwordError.includes("successfully") ? "success" : "error"} sx={{ mt: 2 }}>
                {passwordError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)} disabled={passwordLoading}>
            Cancel
          </Button>
          <Button onClick={handleChangePassword} disabled={passwordLoading} variant="contained" color="primary">
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
