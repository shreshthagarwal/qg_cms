"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
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
} from "@mui/material";
import {
  Dashboard,
  People,
  School,
  CalendarMonth,
  MenuBook,
  Assignment,
  BarChart,
  Assessment,
  Logout,
  Menu as MenuIcon,
  ChevronLeft,
  Feedback,
  NotificationImportant,
} from "@mui/icons-material";
import { ThemeProvider } from "../../components/theme";

const drawerWidth = 280;

const menuItems = [
  { path: "/admin", label: "Dashboard", icon: Dashboard },
  { path: "/admin/leads", label: "Leads & Admissions", icon: People },
  { path: "/admin/students", label: "Students Master", icon: School },
  { path: "/admin/attendance", label: "Attendance", icon: CalendarMonth },
  { path: "/admin/lms", label: "LMS Management", icon: MenuBook },
  { path: "/admin/assignments", label: "Assignments", icon: Assignment },
  { path: "/admin/trading", label: "QuantLive Trading", icon: BarChart },
  { path: "/admin/evaluation", label: "Evaluations", icon: Assessment },
  { path: "/admin/feedback", label: "Student Feedback", icon: Feedback },
  { path: "/admin/announcements", label: "Announcements", icon: NotificationImportant },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (status === "loading") {
    return (
      <ThemeProvider>
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <Typography>Loading...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
    router.push("/");
    return null;
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
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
          Admin Panel
        </Typography>
      </Box>

      {/* Navigation */}
      <List sx={{ px: 2, py: 2 }}>
        {menuItems.map((item) => {
          // For dashboard (/admin), only match exact path
          // For other paths, match exact or subpaths
          const isActive = item.path === "/admin" 
            ? pathname === "/admin"
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
              {menuItems.find((item) => pathname === item.path)?.label || "Admin Panel"}
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
    </ThemeProvider>
  );
}
