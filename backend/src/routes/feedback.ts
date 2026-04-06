import { Router } from "express";
import getDb from "../database";
import { authenticate, authorizeAdmin } from "../middleware/auth";
import { AuthRequest } from "../middleware/auth";

const router = Router();

// Get all feedbacks (Admin only)
router.get("/", authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    
    const feedbacks = await db.getAllFeedbacks();
    res.json(feedbacks);
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new feedback (Students only)
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { feedback, studentName } = req.body;

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ error: "Feedback text is required" });
    }

    const db = getDb();
    // Get user info from authenticated token
    const studentId = req.user?.id;

    const result = await db.createFeedback({
      studentId,
      studentName,
      feedback: feedback.trim()
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating feedback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update feedback status (Admin only)
router.patch("/:id", authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['new', 'reviewed'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const db = getDb();

    const result = await db.updateFeedbackStatus(id, status);

    if (!result) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error updating feedback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete feedback (Admin only)
router.delete("/:id", authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const db = getDb();

    const success = await db.deleteFeedback(id);

    if (!success) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    res.json({ message: "Feedback deleted successfully" });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
