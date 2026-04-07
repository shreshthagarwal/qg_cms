"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Badge,
  Chip,
  Avatar,
  Paper,
  Collapse,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  Announcement as AnnouncementIcon,
  ExpandMore,
  ExpandLess,
  MarkEmailRead,
  Schedule,
  Person,
} from "@mui/icons-material";
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
  };
  announcement_reads: Array<{
    read_at: string | null;
  }>;
}

interface AnnouncementComponentProps {
  onUnreadCountChange?: (count: number) => void;
}

export default function AnnouncementComponent({ onUnreadCountChange }: AnnouncementComponentProps) {
  const { data: session } = useSession();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchAnnouncements();
    fetchUnreadCount();
  }, [session]);

  const fetchAnnouncements = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/announcements/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/announcements/student/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
        onUnreadCountChange?.(data.count);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const markAsRead = async (announcementId: string) => {
    try {
      const token = (session?.user as any)?.accessToken;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/announcements/${announcementId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state
      setAnnouncements(prev =>
        prev.map(announcement =>
          announcement.id === announcementId
            ? {
                ...announcement,
                announcement_reads: [{ read_at: new Date().toISOString() }]
              }
            : announcement
        )
      );

      // Update unread count
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      onUnreadCountChange?.(newCount);
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const toggleExpanded = (announcementId: string) => {
    setExpanded(prev =>
      prev.includes(announcementId)
        ? prev.filter(id => id !== announcementId)
        : [...prev, announcementId]
    );

    // Mark as read when expanded
    const announcement = announcements.find(a => a.id === announcementId);
    if (announcement && !announcement.announcement_reads[0]?.read_at) {
      markAsRead(announcementId);
    }
  };

  const isUnread = (announcement: Announcement) => {
    return !announcement.announcement_reads[0]?.read_at;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} py={2}>
            <AnnouncementIcon color="action" />
            <Typography variant="body2" color="text.secondary">
              No announcements
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <AnnouncementIcon color="primary" />
          </Badge>
          <Typography variant="h6" fontWeight={600}>
            Announcements
          </Typography>
        </Box>

        {/* Announcements List */}
        <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
          {announcements.map((announcement, index) => (
            <Box key={announcement.id}>
              <Paper
                sx={{
                  p: 2,
                  m: 1,
                  cursor: "pointer",
                  border: isUnread(announcement) ? "2px solid" : "1px solid",
                  borderColor: isUnread(announcement) ? "primary.main" : "divider",
                  backgroundColor: isUnread(announcement) ? "primary.50" : "background.paper",
                  "&:hover": {
                    backgroundColor: isUnread(announcement) ? "primary.100" : "grey.50",
                  },
                }}
                onClick={() => toggleExpanded(announcement.id)}
              >
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      {isUnread(announcement) && (
                        <Chip
                          label="New"
                          size="small"
                          color="primary"
                          sx={{ fontSize: "0.7rem", height: 20 }}
                        />
                      )}
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        color={isUnread(announcement) ? "primary.main" : "text.primary"}
                      >
                        {announcement.title}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: expanded.includes(announcement.id) ? "unset" : 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        mb: 1,
                      }}
                    >
                      {announcement.message}
                    </Typography>

                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 20, height: 20, fontSize: "0.7rem" }}>
                          {announcement.creator.first_name[0]}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary">
                          {announcement.creator.first_name} {announcement.creator.last_name}
                        </Typography>
                      </Box>

                      <Box display="flex" alignItems="center" gap={1}>
                        <Schedule sx={{ fontSize: 16, color: "text.secondary" }} />
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(announcement.created_at), "MMM dd")}
                        </Typography>
                        {expanded.includes(announcement.id) ? (
                          <ExpandLess sx={{ fontSize: 20 }} />
                        ) : (
                          <ExpandMore sx={{ fontSize: 20 }} />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {isUnread(announcement) && (
                    <Tooltip title="Mark as read">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(announcement.id);
                        }}
                        sx={{ ml: 1 }}
                      >
                        <MarkEmailRead sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                {/* Expanded Content */}
                <Collapse in={expanded.includes(announcement.id)}>
                  <Box mt={1} pt={1} borderTop="1px solid" borderColor="divider">
                    <Typography variant="body2" color="text.secondary">
                      {announcement.message}
                    </Typography>
                  </Box>
                </Collapse>
              </Paper>

              {index < announcements.length - 1 && <Divider />}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
