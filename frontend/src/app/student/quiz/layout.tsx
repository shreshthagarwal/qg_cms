"use client";

import { ReactNode } from "react";
import { Box } from "@mui/material";
import { ThemeProvider } from "../../../components/theme";

export default function QuizLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa" }}>
        {children}
      </Box>
    </ThemeProvider>
  );
}
