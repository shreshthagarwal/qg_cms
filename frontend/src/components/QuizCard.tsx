"use client";

import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
} from "@mui/material";
import {
  Quiz,
  Schedule,
  People,
  Assessment,
  ArrowForward,
  Visibility,
} from "@mui/icons-material";
import { format } from "date-fns";

interface QuizCardProps {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  questionCount?: number;
  createdAt?: string;
  totalAssigned?: number;
  totalAttempted?: number;
  status?: "active" | "inactive" | "completed";
  onViewDetails?: (id: string) => void;
  onViewLeaderboard?: (id: string) => void;
  showLeaderboardButton?: boolean;
  showViewDetails?: boolean;
  // Admin-specific props
  onEdit?: (id: string) => void;
  onAssign?: (id: string) => void;
  onDelete?: (id: string) => void;
  showAdminActions?: boolean;
}

export default function QuizCard({
  id,
  title,
  description,
  duration,
  questionCount,
  createdAt,
  totalAssigned,
  totalAttempted,
  status = "active",
  onViewDetails,
  onViewLeaderboard,
  showLeaderboardButton = true,
  showViewDetails = true,
  onEdit,
  onAssign,
  onDelete,
  showAdminActions = false,
}: QuizCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case "active":
        return "success";
      case "completed":
        return "info";
      default:
        return "default";
    }
  };

  const completionRate =
    totalAssigned && totalAttempted !== undefined
      ? Math.round((totalAttempted / totalAssigned) * 100)
      : 0;

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: 2,
        transition: "all 0.3s ease",
        cursor: "pointer",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          boxShadow: 4,
          transform: "translateY(-4px)",
        },
      }}
      onClick={() => onViewDetails?.(id)}
    >
      <CardContent sx={{ flex: 1, p: 3 }}>
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={2}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                p: 1.2,
                borderRadius: 2,
                bgcolor: "primary.light",
                color: "primary.main",
              }}
            >
              <Quiz />
            </Box>
            <Chip
              label={status}
              size="small"
              color={getStatusColor()}
              sx={{ textTransform: "capitalize" }}
            />
          </Box>
          {duration && (
            <Box display="flex" alignItems="center" gap={0.5} color="text.secondary">
              <Schedule sx={{ fontSize: 16 }} />
              <Typography variant="caption">{duration} min</Typography>
            </Box>
          )}
        </Box>

        {/* Title */}
        <Typography variant="h6" fontWeight={600} mb={1} noWrap>
          {title}
        </Typography>

        {/* Description */}
        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            mb={2}
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </Typography>
        )}

        {/* Stats */}
        <Box display="flex" gap={2} mb={2}>
          {questionCount !== undefined && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <Assessment sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {questionCount} questions
              </Typography>
            </Box>
          )}
          {totalAssigned !== undefined && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <People sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {totalAttempted || 0}/{totalAssigned} attempted
              </Typography>
            </Box>
          )}
        </Box>

        {/* Progress bar for completion rate */}
        {totalAssigned !== undefined && (
          <Box mb={2}>
            <Box
              sx={{
                width: "100%",
                height: 6,
                bgcolor: "grey.200",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  width: `${completionRate}%`,
                  height: "100%",
                  bgcolor: completionRate >= 80 ? "success.main" : completionRate >= 50 ? "warning.main" : "error.main",
                  borderRadius: 3,
                  transition: "width 0.3s ease",
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" mt={0.5}>
              {completionRate}% completion rate
            </Typography>
          </Box>
        )}

        {/* Date */}
        {createdAt && (
          <Typography variant="caption" color="text.secondary" display="block">
            Created {format(new Date(createdAt), "MMM d, yyyy")}
          </Typography>
        )}
      </CardContent>

      {/* Actions */}
      <Box
        sx={{
          p: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          gap: 1,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {showAdminActions ? (
          // Admin actions
          <>
            {onEdit && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Visibility />}
                onClick={() => onEdit(id)}
                sx={{ flex: 1 }}
              >
                Edit
              </Button>
            )}
            {onAssign && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<People />}
                onClick={() => onAssign(id)}
                sx={{ flex: 1 }}
              >
                Assign
              </Button>
            )}
            {onDelete && (
              <Button
                size="small"
                color="error"
                startIcon={<ArrowForward />}
                onClick={() => onDelete(id)}
                sx={{ flex: 1 }}
              >
                Delete
              </Button>
            )}
          </>
        ) : (
          // Default actions (view details + leaderboard)
          <>
            <Button
              size="small"
              startIcon={<Visibility />}
              onClick={() => onViewDetails?.(id)}
              sx={{ flex: 1 }}
            >
              View Details
            </Button>
            {showLeaderboardButton && onViewLeaderboard && (
              <Button
                size="small"
                variant="contained"
                startIcon={<Assessment />}
                onClick={() => onViewLeaderboard?.(id)}
                sx={{ flex: 1 }}
              >
                Leaderboard
              </Button>
            )}
          </>
        )}
      </Box>
    </Card>
  );
}
