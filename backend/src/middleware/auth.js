"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        console.log('Auth failed: No token provided');
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    try {
        const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback_secret';
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = decoded;
        console.log('Auth success:', decoded.id, decoded.role);
        next();
    }
    catch (error) {
        console.log('Auth failed: Invalid token -', error.message);
        res.status(400).json({ error: 'Invalid token.', details: error.message });
    }
};
exports.authenticate = authenticate;
const authorizeAdmin = (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    next();
};
exports.authorizeAdmin = authorizeAdmin;
