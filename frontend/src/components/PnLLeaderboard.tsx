"use client";

import { Box, Typography, Select, MenuItem, FormControl, Avatar } from "@mui/material";
import { TrendingUp, TrendingDown } from "@mui/icons-material";

interface Student {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
}

interface TradingReport {
  id: string;
  reportDate: string;
  dailyPnL: number;
  instrument: string;
  strategyName: string;
  strategyDescription: string;
  resultsDocLink: string;
  status: "pending" | "reviewed" | "approved" | "rejected";
  adminNotes?: string;
  createdAt: string;
}

interface PnLLeaderboardProps {
  reports: TradingReport[];
  students: Student[];
  period?: "daily" | "weekly" | "monthly";
  onPeriodChange?: (period: "daily" | "weekly" | "monthly") => void;
}

export default function PnLLeaderboard({ 
  reports, 
  students, 
  period = "weekly", 
  onPeriodChange 
}: PnLLeaderboardProps) {
  // Create a map of students for easy lookup
  const studentMap = new Map(students.map(s => [s.id, s]));
  const uniqueStudents = Array.from(studentMap.entries());

  const getLeaderboardData = () => {
    // For student view, we only have their own reports
    // So we'll show their performance in different periods
    const now = new Date();
    
    const filteredReportsByPeriod = reports.filter(report => {
      const reportDate = new Date(report.reportDate);
      
      if (period === "daily") {
        return reportDate.toDateString() === now.toDateString();
      } else if (period === "weekly") {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return reportDate >= weekStart;
      } else if (period === "monthly") {
        return reportDate.getMonth() === now.getMonth() && 
               reportDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
    
    // For now, just show the current student's performance
    // In a real implementation, we'd fetch all students' reports
    if (students.length > 0) {
      const totalPnL = filteredReportsByPeriod.reduce((sum, r) => sum + r.dailyPnL, 0);
      const currentStudent = students[0]; // Assuming first student is the current one
      
      // Only show if there are reports for this period
      if (filteredReportsByPeriod.length > 0) {
        return [{
          id: currentStudent.id,
          student: currentStudent,
          totalPnL,
          reportCount: filteredReportsByPeriod.length
        }];
      }
    }
    
    return [];
  };

  const leaderboardData = getLeaderboardData();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={600} mb={1}>
          P&L Leaderboard
        </Typography>
        {onPeriodChange && (
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={period}
              onChange={(e) => onPeriodChange(e.target.value as "daily" | "weekly" | "monthly")}
              size="small"
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>
      
      <Box>
        {leaderboardData.length === 0 ? (
          <Box display="flex" alignItems="center" justifyContent="center" py={4}>
            <Typography color="text.secondary">
              No trading data available for {period} period
            </Typography>
          </Box>
        ) : (
          leaderboardData.map(({ student, totalPnL, reportCount }, index) => {
            const isTop3 = index < 3;
            const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
            
            return (
              <Box 
                key={student.email} 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center" 
                mb={2}
                p={isTop3 ? 1.5 : 1}
                sx={{
                  backgroundColor: isTop3 ? 'grey.50' : 'transparent',
                  borderRadius: 2,
                  border: isTop3 ? `2px solid ${medalColors[index]}` : '1px solid',
                  borderColor: isTop3 ? medalColors[index] : 'divider'
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  {isTop3 && (
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: medalColors[index],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 14
                      }}
                    >
                      {index + 1}
                    </Box>
                  )}
                  {!isTop3 && (
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>
                      #{index + 1}
                    </Typography>
                  )}
                  <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                    {student.firstname[0]}{student.lastname[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={isTop3 ? 600 : 400}>
                      {student.firstname} {student.lastname}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {reportCount} {reportCount === 1 ? 'trade' : 'trades'}
                    </Typography>
                  </Box>
                </Box>
                <Box textAlign="right">
                  <Typography variant="body2" fontWeight={600} color={totalPnL >= 0 ? "success.main" : "error.main"}>
                    {totalPnL >= 0 ? "+" : ""}₹{totalPnL.toLocaleString()}
                  </Typography>
                  <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                    {totalPnL >= 0 ? (
                      <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
                    ) : (
                      <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {totalPnL >= 0 ? 'Profit' : 'Loss'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
