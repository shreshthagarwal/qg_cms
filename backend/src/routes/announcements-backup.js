"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_js_1 = require("@supabase/supabase-js");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Initialize Supabase client lazily
function getSupabaseClient() {
    return (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}
// Create new announcement
router.post('/', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { title, message, targetAudience, targetStudentIds } = req.body;
        const adminId = req.user?.id;
        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }
        if (!targetAudience || !['all', 'specific'].includes(targetAudience)) {
            return res.status(400).json({ error: 'Target audience must be "all" or "specific"' });
        }
        if (targetAudience === 'specific' && (!targetStudentIds || targetStudentIds.length === 0)) {
            return res.status(400).json({ error: 'Target student IDs are required when targeting specific students' });
        }
        // Create announcement
        const { data, error } = await getSupabaseClient()
            .from('announcements')
            .insert({
            title,
            message,
            target_audience: targetAudience,
            target_student_ids: targetStudentIds || null,
            created_by: adminId,
            created_at: new Date().toISOString(),
        })
            .select()
            .single();
        if (error) {
            console.error('Error creating announcement:', error);
            return res.status(500).json({ error: 'Failed to create announcement' });
        }
        // Mark as unread for all target students
        if (targetAudience === 'all') {
            // Get all student IDs
            const { data: students } = await getSupabaseClient()
                .from('users')
                .select('id')
                .eq('role', 'STUDENT');
            if (students) {
                const unreadRecords = students.map(student => ({
                    announcement_id: data.id,
                    student_id: student.id,
                    read_at: null,
                }));
                await getSupabaseClient()
                    .from('announcement_reads')
                    .insert(unreadRecords);
            }
        }
        else {
            // Mark as unread for specific students
            const unreadRecords = targetStudentIds.map((studentId) => ({
                announcement_id: data.id,
                student_id: studentId,
                read_at: null,
            }));
            await supabase
                .from('announcement_reads')
                .insert(unreadRecords);
        }
        res.json(data);
    }
    catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Get all announcements (admin)
router.get('/', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { data, error } = await getSupabaseClient()
            .from('announcements')
            .select(`
        *,
        creator:users!announcements_created_by_fkey (
          first_name,
          last_name,
          email
        )
      `)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching announcements:', error);
            return res.status(500).json({ error: 'Failed to fetch announcements' });
        }
        res.json(data || []);
    }
    catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Get announcements for student
router.get('/student', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.user?.id;
        // Get announcements for this student (all announcements or specific to this student)
        const { data, error } = await getSupabaseClient()
            .from('announcements')
            .select(`
        *,
        creator:users!announcements_created_by_fkey (
          first_name,
          last_name
        ),
        announcement_reads!inner (
          read_at
        )
      `)
            .or(`target_audience.eq.all,target_student_ids.cs.{${studentId}}`)
            .eq('announcement_reads.student_id', studentId)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching student announcements:', error);
            return res.status(500).json({ error: 'Failed to fetch announcements' });
        }
        res.json(data || []);
    }
    catch (error) {
        console.error('Error fetching student announcements:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Mark announcement as read
router.post('/:id/read', auth_1.authenticate, async (req, res) => {
    try {
        const announcementId = req.params.id;
        const studentId = req.user?.id;
        // Mark as read
        const { error } = await supabase
            .from('announcement_reads')
            .update({ read_at: new Date().toISOString() })
            .eq('announcement_id', announcementId)
            .eq('student_id', studentId);
        if (error) {
            console.error('Error marking announcement as read:', error);
            return res.status(500).json({ error: 'Failed to mark announcement as read' });
        }
        res.json({ message: 'Announcement marked as read' });
    }
    catch (error) {
        console.error('Error marking announcement as read:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Get unread count for student
router.get('/student/unread-count', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.user?.id;
        // Count unread announcements
        const { data, error } = await getSupabaseClient()
            .from('announcement_reads')
            .select('id', { count: 'exact' })
            .eq('student_id', studentId)
            .is('read_at', null);
        if (error) {
            console.error('Error fetching unread count:', error);
            return res.status(500).json({ error: 'Failed to fetch unread count' });
        }
        res.json({ count: data?.length || 0 });
    }
    catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Delete announcement (admin)
router.delete('/:id', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const announcementId = req.params.id;
        // Delete announcement (cascade will delete announcement_reads)
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', announcementId);
        if (error) {
            console.error('Error deleting announcement:', error);
            return res.status(500).json({ error: 'Failed to delete announcement' });
        }
        res.json({ message: 'Announcement deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.default = router;
