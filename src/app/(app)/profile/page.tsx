"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const EXPERIENCE_LEVELS = [
  { value: "junior", label: "Junior (0-2 years)" },
  { value: "mid", label: "Mid-Level (2-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "staff", label: "Staff+ (8+ years)" },
];

interface UserProfile {
  id: string;
  email: string;
  name: string;
  job_role: string;
  experience_level: string;
  created_at: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/auth/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data.user);
          setName(data.user.name || "");
          setJobRole(data.user.job_role || "");
          setExperienceLevel(data.user.experience_level || "mid");
        }
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, jobRole, experienceLevel }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update profile");
      }
    } catch {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#FAF6F1]">
        <aside className="sidebar">
          <div className="p-6 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FDF3E1] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C10.3431 2 9 3.34315 9 5V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V5C15 3.34315 13.6569 2 12 2Z" stroke="#C5943A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10" stroke="#C5943A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-semibold text-[#1A1A1A] text-[15px]">MockPal</span>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            <Link href="/dashboard" className="sidebar-nav-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Dashboard
            </Link>
            <Link href="/setup" className="sidebar-nav-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              New Interview
            </Link>
            <Link href="/profile" className="sidebar-nav-item active">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Profile
            </Link>
          </nav>
        </aside>
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-[#9CA3AF]">Loading profile...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FAF6F1]">
      <aside className="sidebar">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FDF3E1] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C10.3431 2 9 3.34315 9 5V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V5C15 3.34315 13.6569 2 12 2Z" stroke="#C5943A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10" stroke="#C5943A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-[#1A1A1A] text-[15px]">MockPal</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <Link href="/dashboard" className="sidebar-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Dashboard
          </Link>
          <Link href="/setup" className="sidebar-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            New Interview
          </Link>
          <Link href="/profile" className="sidebar-nav-item active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Profile
          </Link>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-end px-8 py-5">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#6B7280]">Hi, {profile?.name}</span>
            <div className="w-9 h-9 rounded-full bg-[#C5943A] flex items-center justify-center text-white text-sm font-semibold">
              {profile?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <form action="/api/auth/logout" method="POST" className="ml-2">
              <button type="submit" className="text-xs font-semibold text-[#6B7280] hover:text-[#1A1A1A] border border-[#E8E0D6] bg-white rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </form>
          </div>
        </div>

        <div className="px-8 pb-10 max-w-2xl">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Profile Settings</h1>
            <p className="text-[#6B7280] mt-1">Update your interview profile to get better-tailored questions</p>
          </div>

          <form onSubmit={handleSave} className="space-y-6 animate-fade-in">
            {/* Avatar & Email (read-only) */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[#C5943A] flex items-center justify-center text-white text-2xl font-bold">
                  {profile?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <div className="text-lg font-semibold text-[#1A1A1A]">{profile?.name}</div>
                  <div className="text-sm text-[#9CA3AF]">{profile?.email}</div>
                  <div className="text-xs text-[#D1C9BD] mt-1">
                    Member since {new Date(profile?.created_at || "").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </div>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="glass rounded-2xl p-6 space-y-5">
              <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Personal Information</h2>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E0D6] bg-white text-[#1A1A1A] text-sm focus:outline-none focus:ring-2 focus:ring-[#C5943A]/30 focus:border-[#C5943A] transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="jobRole" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Target Job Role
                </label>
                <input
                  id="jobRole"
                  type="text"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  placeholder="e.g., Software Engineer, Product Manager"
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E0D6] bg-white text-[#1A1A1A] text-sm placeholder:text-[#D1C9BD] focus:outline-none focus:ring-2 focus:ring-[#C5943A]/30 focus:border-[#C5943A] transition-all"
                />
              </div>

              <div>
                <label htmlFor="experienceLevel" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Experience Level
                </label>
                <select
                  id="experienceLevel"
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E0D6] bg-white text-[#1A1A1A] text-sm focus:outline-none focus:ring-2 focus:ring-[#C5943A]/30 focus:border-[#C5943A] transition-all appearance-none"
                >
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status messages */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-3 animate-fade-in">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Profile updated successfully!
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#1A1A1A] hover:bg-[#333333] text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
                    <path d="M4 12a8 8 0 018-8V0" fill="currentColor" className="opacity-75"/>
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
