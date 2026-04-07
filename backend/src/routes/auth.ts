import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import getDb, { supabase } from '../database';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

// Endpoint for login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDb();

    const user = await db.findUser(email);
    if (!user) {
      console.log('Login failed: User not found for email:', email);
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    console.log('Login attempt for user:', user.id);
    console.log('Stored password hash length:', user.password?.length);
    console.log('Provided password length:', password?.length);

    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', validPassword);
    
    if (!validPassword) {
      console.log('Login failed: Invalid password for user:', user.id);
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    res.json({ token, role: user.role, userId: user.id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint for seeding initial admin (useful for first-time deploy)
router.post('/seed-admin', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    
    const db = getDb();
    
    // Check if admin already exists
    const { data: existingAdmins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'ADMIN')
      .limit(1);
    
    if (existingAdmins && existingAdmins.length > 0) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await db.createUser({
      email,
      password: hashedPassword,
      role: 'ADMIN',
      firstname: firstName || 'Admin',
      lastname: lastName || 'User',
      phone: phone || ''
    });

    res.status(201).json({ message: 'Admin created', id: admin.id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Student/Admin Change Password
router.patch('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const db = getDb();
    const userId = (req as any).user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.findUser(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid old password' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', userId);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Reset Student Password
router.patch('/reset-password', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { studentId, newPassword } = req.body;

    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('id', studentId)
      .eq('role', 'STUDENT')
      .limit(1);

    const user = users?.[0];
    if (!user) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', studentId);

    res.json({ message: 'Student password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
