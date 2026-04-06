"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const router = (0, express_1.Router)();
// Endpoint for external website to submit a lead
router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, message } = req.body;
        if (!firstName || !lastName || !email || !phone) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const db = (0, database_1.default)();
        const lead = await db.createLead({
            firstname: firstName,
            lastname: lastName,
            email,
            phone,
            message,
            status: 'NEW'
        });
        res.status(201).json({ message: 'Lead submitted successfully', lead });
    }
    catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin endpoint to view all leads
router.get('/', async (req, res) => {
    try {
        const db = (0, database_1.default)();
        const leads = await db.findAllLeads();
        res.json(leads);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin endpoint to mark lead as contacted
router.post('/:id/contacted', async (req, res) => {
    try {
        const { id } = req.params;
        const db = (0, database_1.default)();
        // Update lead status to CONTACTED
        const lead = await db.updateLeadStatus(id, 'CONTACTED');
        res.json({ message: 'Lead marked as contacted', lead });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin endpoint to convert lead to student
router.post('/:id/convert', async (req, res) => {
    try {
        const { id } = req.params;
        const db = (0, database_1.default)();
        // Update lead status to CONVERTED and move to archive
        const lead = await db.updateLeadStatus(id, 'CONVERTED');
        res.json({ message: 'Lead converted to student successfully', lead });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin endpoint to mark lead as unsuccessful
router.post('/:id/unsuccessful', async (req, res) => {
    try {
        const { id } = req.params;
        const db = (0, database_1.default)();
        // Update lead status to UNSUCCESSFUL and move to archive
        const lead = await db.updateLeadStatus(id, 'UNSUCCESSFUL');
        res.json({ message: 'Lead marked as unsuccessful', lead });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin endpoint to get archived leads
router.get('/archived', async (req, res) => {
    try {
        const db = (0, database_1.default)();
        const archivedLeads = await db.findArchivedLeads();
        res.json(archivedLeads);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
