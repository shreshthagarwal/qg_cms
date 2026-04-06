"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importStar(require("../database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Endpoint for login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = (0, database_1.default)();
        const user = await db.findUser(email);
        if (!user) {
            console.log('Login failed: User not found for email:', email);
            return res.status(400).json({ error: 'Invalid email or password.' });
        }
        console.log('Login attempt for user:', user.id);
        console.log('Stored password hash length:', user.password?.length);
        console.log('Provided password length:', password?.length);
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        console.log('Password comparison result:', validPassword);
        if (!validPassword) {
            console.log('Login failed: Invalid password for user:', user.id);
            return res.status(400).json({ error: 'Invalid email or password.' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
        res.json({ token, role: user.role, userId: user.id });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Endpoint for seeding initial admin (useful for first-time deploy)
router.post('/seed-admin', async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;
        const db = (0, database_1.default)();
        // Check if admin already exists
        const { data: existingAdmins } = await database_1.supabase
            .from('users')
            .select('id')
            .eq('role', 'ADMIN')
            .limit(1);
        if (existingAdmins && existingAdmins.length > 0) {
            return res.status(400).json({ error: 'Admin already exists' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const admin = await db.createUser({
            email,
            password: hashedPassword,
            role: 'ADMIN',
            firstname: firstName || 'Admin',
            lastname: lastName || 'User',
            phone: phone || ''
        });
        res.status(201).json({ message: 'Admin created', id: admin.id });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Student/Admin Change Password
router.patch('/change-password', auth_1.authenticate, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const db = (0, database_1.default)();
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const user = await db.findUser(userId);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const validPassword = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!validPassword)
            return res.status(400).json({ error: 'Invalid old password' });
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await database_1.supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', userId);
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin Reset Student Password
router.patch('/reset-password', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const db = (0, database_1.default)();
        const { studentId, newPassword } = req.body;
        const { data: users } = await database_1.supabase
            .from('users')
            .select('*')
            .eq('id', studentId)
            .eq('role', 'STUDENT')
            .limit(1);
        const user = users?.[0];
        if (!user) {
            return res.status(404).json({ error: 'Student not found' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await database_1.supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', studentId);
        res.json({ message: 'Student password reset successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
