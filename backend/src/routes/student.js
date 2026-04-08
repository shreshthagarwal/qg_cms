"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Convert a Lead to an Enrolled Student or Manual New Admission (Admin Only)
router.post('/', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, courseName, role, durationMonths, totalFees, paidFees, startDate, endDate, 
        // Personal Details
        dob, emergencyContact, addressLine1, addressLine2, city, state, pincode, panNumber, panCardUrl, aadhaarNumber, aadhaarCardUrl, photoUrl, 
        // Educational Details
        tenthPercentage, twelfthPercentage, tenthMarksheetUrl, twelfthMarksheetUrl, currentCollege, cgpa, collegeMarksheetUrl, graduatingYear, leadId } = req.body;
        // Convert empty strings to null for optional fields
        const cleanPhone = phone || null;
        const cleanEmergencyContact = emergencyContact || null;
        const db = (0, database_1.default)();
        // Optional: Mark lead as converted if it came from a lead
        if (leadId) {
            try {
                await db.updateLeadStatus(leadId, 'CONVERTED');
            }
            catch (error) {
                console.error('Lead not found or already converted:', error);
                // Continue with student creation even if lead doesn't exist
            }
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Calculate end date if not provided
        const calculatedEndDate = endDate || new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + durationMonths));
        // Create user first
        const newUser = await db.createUser({
            email,
            password: hashedPassword,
            firstname: firstName,
            lastname: lastName,
            phone: cleanPhone,
            role: 'STUDENT'
        });
        // Create student profile
        const studentProfile = await db.createStudentProfile({
            userid: newUser.id, // Use correct field name: userid (not user_id)
            coursename: courseName, // Use correct field name: coursename
            durationmonths: durationMonths, // Use correct field name: durationmonths
            totalfees: totalFees, // Use correct field name: totalfees
            paidfees: paidFees, // Use correct field name: paidfees
            startdate: new Date(startDate), // Use correct field name: startdate
            enddate: calculatedEndDate, // Use correct field name: enddate
            // Personal Details
            firstname: firstName, // Use correct field name: firstname
            lastname: lastName, // Use correct field name: lastname
            dob: dob ? new Date(dob) : null,
            phone: phone, // Added missing phone field
            emergencycontact: cleanEmergencyContact, // Use correct field name: emergencycontact
            addressline1: addressLine1, // Use correct field name: addressline1
            addressline2: addressLine2, // Use correct field name: addressline2
            city: city,
            state: state,
            pincode: pincode,
            pannumber: panNumber, // Use correct field name: pannumber
            aadhaarnumber: aadhaarNumber, // Use correct field name: aadhaarnumber
            pancardurl: panCardUrl, // Use correct field name: pancardurl
            aadhaarcardurl: aadhaarCardUrl, // Use correct field name: aadhaarcardurl
            photourl: photoUrl, // Use correct field name: photourl
            // Educational Details
            tenthpercentage: tenthPercentage, // Use correct field name: tenthpercentage
            twelfthpercentage: twelfthPercentage, // Use correct field name: twelfthpercentage
            tenthmarksheeturl: tenthMarksheetUrl, // Use correct field name: tenthmarksheeturl
            twelfthmarksheeturl: twelfthMarksheetUrl, // Use correct field name: twelfthmarksheeturl
            currentcollege: currentCollege, // Use correct field name: currentcollege
            cgpa,
            collegemarksheeturl: collegeMarksheetUrl, // Use correct field name: collegemarksheeturl
            graduatingyear: graduatingYear, // Use correct field name: graduatingyear
            // Course Details
            role: role || 'Student'
        });
        res.status(201).json({ message: 'Student created successfully', student: { ...newUser, studentProfile } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Get all students
router.get('/', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const db = (0, database_1.default)();
        const students = await db.findAllStudentsWithProfiles();
        res.json(students);
    }
    catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Student: Get current student's profile
router.get('/profile', auth_1.authenticate, async (req, res) => {
    try {
        const db = (0, database_1.default)();
        const studentId = req.user?.id;
        if (!studentId) {
            return res.status(401).json({ error: 'Student ID not found' });
        }
        const students = await db.findAllStudentsWithProfiles();
        const studentData = students.find(s => s.id === studentId);
        if (!studentData) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(studentData);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Update student by ID
router.patch('/:id', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = (0, database_1.default)();
        // Check if student exists
        const existingStudent = await db.findStudentById(id);
        if (!existingStudent) {
            return res.status(404).json({ error: 'Student not found' });
        }
        // Update user-level fields if provided
        const userUpdates = {};
        if (req.body.firstname !== undefined)
            userUpdates.firstname = req.body.firstname;
        if (req.body.lastname !== undefined)
            userUpdates.lastname = req.body.lastname;
        if (req.body.email !== undefined)
            userUpdates.email = req.body.email;
        if (req.body.phone !== undefined)
            userUpdates.phone = req.body.phone;
        if (Object.keys(userUpdates).length > 0) {
            await db.updateUser(id, userUpdates);
        }
        // Update student profile fields if provided
        if (req.body.student_profiles) {
            await db.updateStudentProfile(id, req.body.student_profiles);
        }
        // Return updated student data
        const updatedStudent = await db.findStudentById(id);
        res.json(updatedStudent);
    }
    catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Admin: Reset student password
router.post('/:id/reset-password', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = (0, database_1.default)();
        // Check if student exists
        const existingStudent = await db.findStudentById(id);
        if (!existingStudent) {
            return res.status(404).json({ error: 'Student not found' });
        }
        // Generate new random password
        const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        console.log('Resetting password for student:', id);
        console.log('New plain password:', newPassword);
        console.log('Hashed password length:', hashedPassword.length);
        // Update password
        const result = await db.updateUser(id, { password: hashedPassword });
        console.log('Update result:', result);
        // Verify the password was stored correctly by fetching the user again
        const updatedUser = await db.findStudentById(id);
        console.log('Stored password hash length:', updatedUser?.password?.length);
        res.json({ password: newPassword });
    }
    catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Student: Change Password
router.post('/change-password', auth_1.authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.id;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        const db = (0, database_1.default)();
        // Get current user to verify current password
        const currentUser = await db.findStudentById(userId);
        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Verify current password (compare with stored hash)
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, currentUser.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        // Hash new password
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 10);
        // Update password
        await db.updateUser(userId, { password: hashedNewPassword });
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Admin: Delete student
router.delete('/:id', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = (0, database_1.default)();
        // Check if student exists
        const existingStudent = await db.findStudentById(id);
        if (!existingStudent) {
            return res.status(404).json({ error: 'Student not found' });
        }
        // Delete student (this should cascade to delete profile)
        await db.deleteUser(id);
        res.json({ message: 'Student deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting student:', error);
        // Handle specific database constraint errors
        if (error.code === '42703') {
            // Foreign key constraint violation
            if (error.message?.includes('user_id')) {
                return res.status(400).json({
                    error: 'Database constraint error',
                    details: 'Student profile has incorrect field structure. Please run database migration script.',
                    suggestion: 'Run fix-student-profiles.sql migration script first'
                });
            }
            return res.status(400).json({
                error: 'Database constraint error',
                details: 'Cannot delete student due to existing dependencies',
                suggestion: 'Check for related records before deletion'
            });
        }
        // Generic error response
        res.status(500).json({
            error: 'Internal server error',
            details: error.message || 'Unknown error occurred',
            code: error.code
        });
    }
});
exports.default = router;
