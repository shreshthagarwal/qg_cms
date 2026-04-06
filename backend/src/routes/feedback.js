"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all feedbacks (Admin only)
router.get("/", auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const db = (0, database_1.default)();
        const feedbacks = await db.getAllFeedbacks();
        res.json(feedbacks);
    }
    catch (error) {
        console.error("Error fetching feedbacks:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Create new feedback (Students only)
router.post("/", auth_1.authenticate, async (req, res) => {
    try {
        const { feedback, studentName } = req.body;
        if (!feedback || !feedback.trim()) {
            return res.status(400).json({ error: "Feedback text is required" });
        }
        const db = (0, database_1.default)();
        // Get user info from authenticated token
        const studentId = req.user?.id;
        const result = await db.createFeedback({
            studentId,
            studentName,
            feedback: feedback.trim()
        });
        res.status(201).json(result);
    }
    catch (error) {
        console.error("Error creating feedback:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Update feedback status (Admin only)
router.patch("/:id", auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !['new', 'reviewed'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }
        const db = (0, database_1.default)();
        const result = await db.updateFeedbackStatus(id, status);
        if (!result) {
            return res.status(404).json({ error: "Feedback not found" });
        }
        res.json(result);
    }
    catch (error) {
        console.error("Error updating feedback:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Delete feedback (Admin only)
router.delete("/:id", auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = (0, database_1.default)();
        const success = await db.deleteFeedback(id);
        if (!success) {
            return res.status(404).json({ error: "Feedback not found" });
        }
        res.json({ message: "Feedback deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting feedback:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
