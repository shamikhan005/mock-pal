"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const EXPERIENCE_LEVELS = [
  { value: "junior", label: "Junior (0–2 years)" },
  { value: "mid", label: "Mid-level (2–5 years)" },
  { value: "senior", label: "Senior (5+ years)" },
  { value: "lead", label: "Lead / Staff (8+ years)" },
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    jobRole: "",
    experienceLevel: "mid",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#FAF6F1]">
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-center items-center px-16 relative overflow-hidden mesh-bg">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 800 800" fill="none">
            {Array.from({ length: 12 }, (_, i) => (
              <path
                key={i}
                d={`M0 ${200 + i * 50} Q200 ${150 + i * 50 + Math.sin(i) * 40} 400 ${200 + i * 50} T800 ${200 + i * 50}`}
                stroke="#C5943A"
                strokeWidth="1.5"
                fill="none"
              />
            ))}
          </svg>
        </div>

        <div className="relative z-10 text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FDF3E1] mb-6 animate-glow-pulse">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C10.3431 2 9 3.34315 9 5V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V5C15 3.34315 13.6569 2 12 2Z" stroke="#C5943A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10" stroke="#C5943A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 19V22M12 22H9M12 22H15" stroke="#C5943A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">MockPal</h2>
          <p className="text-[#9CA3AF] text-sm mb-10">Practice. Improve. Succeed.</p>

          <div className="space-y-5 text-left">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#FDF3E1] flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <span className="text-sm text-[#1A1A1A] font-medium">Realistic interview experience</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#FDF3E1] flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <span className="text-sm text-[#1A1A1A] font-medium">Instant AI feedback</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#FDF3E1] flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <span className="text-sm text-[#1A1A1A] font-medium">Track your progress</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Create your account</h1>
            <p className="text-[#9CA3AF] text-sm mt-1">
              Set up your profile so the AI can tailor the interview to you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#1A1A1A] font-medium mb-1.5">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                className="w-full bg-white border border-[#D1C9BD] rounded-xl px-4 py-2.5 text-[#1A1A1A] placeholder-[#9CA3AF] transition-all text-sm"
                placeholder="Alex Chen"
              />
            </div>
            <div>
              <label className="block text-sm text-[#1A1A1A] font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
                className="w-full bg-white border border-[#D1C9BD] rounded-xl px-4 py-2.5 text-[#1A1A1A] placeholder-[#9CA3AF] transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-[#1A1A1A] font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                minLength={8}
                className="w-full bg-white border border-[#D1C9BD] rounded-xl px-4 py-2.5 text-[#1A1A1A] placeholder-[#9CA3AF] transition-all text-sm"
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm text-[#1A1A1A] font-medium mb-1.5">
                Role you&apos;re practicing for
              </label>
              <input
                type="text"
                value={form.jobRole}
                onChange={(e) => update("jobRole", e.target.value)}
                className="w-full bg-white border border-[#D1C9BD] rounded-xl px-4 py-2.5 text-[#1A1A1A] placeholder-[#9CA3AF] transition-all text-sm"
                placeholder="e.g. Senior Software Engineer"
              />
            </div>
            <div>
              <label className="block text-sm text-[#1A1A1A] font-medium mb-1.5">Experience level</label>
              <select
                value={form.experienceLevel}
                onChange={(e) => update("experienceLevel", e.target.value)}
                className="w-full bg-white border border-[#D1C9BD] rounded-xl px-4 py-2.5 text-[#1A1A1A] transition-all text-sm appearance-none cursor-pointer"
              >
                {EXPERIENCE_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1A1A1A] hover:bg-[#333333] disabled:bg-[#D1C9BD] disabled:text-[#9CA3AF] text-white py-2.5 rounded-xl font-medium transition-all text-sm hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Creating account...
                </span>
              ) : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-[#9CA3AF] mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-[#1A1A1A] font-medium hover:text-[#C5943A] transition-colors underline decoration-[#D1C9BD] underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
