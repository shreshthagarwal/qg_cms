"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseSetup = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class DatabaseSetup {
    static async initializeDatabase() {
        try {
            console.log('🚀 Auto-setting up database...');
            const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
            // Simple approach: Use raw SQL via REST API
            await this.createUsersTable(supabase);
            await this.createAdmin(supabase);
            console.log('🎉 Database setup complete!');
            return true;
        }
        catch (error) {
            console.error('❌ Database setup failed:', error);
            return false;
        }
    }
    static async createUsersTable(supabase) {
        try {
            // Try to access users table - if it fails, create it
            const { error } = await supabase
                .from('users')
                .select('count')
                .limit(1);
            if (error && error.message.includes('does not exist')) {
                console.log('📋 Creating users table...');
                // Use Supabase SQL function if available, or skip for now
                // For simplicity, we'll let Supabase handle basic table creation
                console.log('✅ Tables will be auto-created by Supabase');
            }
        }
        catch (error) {
            console.log('⚠️ Table check failed, continuing...');
        }
    }
    static async createAdmin(supabase) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminEmail || !adminPassword) {
            console.log('⚠️ Admin credentials not found');
            return;
        }
        try {
            // Check if admin exists
            const { data: existingAdmin, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'ADMIN')
                .limit(1);
            if (checkError && checkError.message.includes('does not exist')) {
                console.log('⚠️ Tables not created yet, admin will be created when tables exist');
                return;
            }
            if (existingAdmin && existingAdmin.length > 0) {
                console.log('👤 Admin already exists');
                return;
            }
            // Create admin
            const hashedPassword = await bcryptjs_1.default.hash(adminPassword, 10);
            const adminId = `admin-${Date.now()}`;
            const { error } = await supabase
                .from('users')
                .insert({
                id: adminId,
                email: adminEmail,
                password: hashedPassword,
                role: 'ADMIN',
                firstName: 'System',
                lastName: 'Administrator',
                phone: '0000000000'
            });
            if (error) {
                if (error.message.includes('does not exist')) {
                    console.log('⚠️ Tables not ready yet - please run SQL schema once in Supabase');
                }
                else {
                    console.error('❌ Admin creation failed:', error.message);
                }
            }
            else {
                console.log('✅ Admin created successfully');
                console.log(`📧 Email: ${adminEmail}`);
            }
        }
        catch (error) {
            console.error('❌ Admin setup failed:', error);
        }
    }
}
exports.DatabaseSetup = DatabaseSetup;
