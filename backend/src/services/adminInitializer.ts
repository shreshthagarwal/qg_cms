import getDb from '../database';
import bcrypt from 'bcryptjs';

export class AdminInitializer {
  static async initializeAdmin() {
    try {
      console.log('🔧 Initializing admin user...');
      
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminEmail || !adminPassword) {
        console.warn('⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not found in environment variables');
        console.warn('⚠️  Admin auto-creation skipped. Please set these environment variables.');
        return;
      }

      // Get database instance (this will initialize supabase)
      const db = getDb();
      const { supabase } = await import('../database.js');

      // Check if admin already exists
      const { data: existingAdmins, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('role', 'ADMIN')
        .limit(1);

      if (checkError) {
        if (checkError.message.includes('does not exist') || checkError.message.includes('column')) {
          console.log('⚠️ Database tables not ready. Please run this SQL once in Supabase:');
          console.log('');
          console.log('CREATE TABLE IF NOT EXISTS users (');
          console.log('  id TEXT PRIMARY KEY,');
          console.log('  email TEXT UNIQUE NOT NULL,');
          console.log('  password TEXT NOT NULL,');
          console.log('  role TEXT NOT NULL DEFAULT \'STUDENT\',');
          console.log('  firstName TEXT NOT NULL,');
          console.log('  lastName TEXT,');
          console.log('  phone TEXT,');
          console.log('  created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
          console.log(');');
          console.log('');
          console.log('Then restart the server.');
          return;
        }
        throw checkError;
      }

      if (existingAdmins && existingAdmins.length > 0) {
        console.log(`👤 Admin already exists: ${existingAdmins[0].email}`);
        return;
      }

      // Create new admin
      console.log(`👤 Creating admin: ${adminEmail}`);
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const { data: newAdmin, error } = await supabase
        .from('users')
        .insert({
          id: `admin-${Date.now()}`,
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
          firstname: 'System',
          lastname: 'Administrator',
          phone: '0000000000'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create admin:', error.message);
        return;
      }

      console.log('✅ Admin created successfully');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: [from environment variable]`);
      
    } catch (error) {
      console.error('❌ Admin initialization failed:', error);
    }
  }
}
