"use client";

import { useState } from "react";

export default function StudentSettingsPage() {
  const [passwords, setPasswords] = useState({ oldPassword: "", newPassword: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/change-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer YOUR_STUDENT_TOKEN"
        },
        body: JSON.stringify(passwords)
      });
      if (res.ok) {
        alert("Password changed successfully!");
        setPasswords({ oldPassword: "", newPassword: "" });
      } else {
        alert("Error changing password. Ensure old password is correct.");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-4">Settings & Security</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-700">Change Password</h3>
        
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Current Password</label>
          <input 
            required type="password" 
            value={passwords.oldPassword} 
            onChange={e => setPasswords({...passwords, oldPassword: e.target.value})} 
            className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-indigo-500" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">New Password</label>
          <input 
            required type="password" 
            value={passwords.newPassword} 
            onChange={e => setPasswords({...passwords, newPassword: e.target.value})} 
            className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-indigo-500" 
          />
        </div>

        <button disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium p-3 rounded-lg shadow transition disabled:opacity-50">
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
