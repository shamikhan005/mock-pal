"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INTERVIEW_TYPES = [
  {
    id: "behavioral",
    label: "Behavioral",
    description: "STAR method, communication, leadership & self-awareness",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    color: "from-[#FDF3E1] to-[#F5EFE8]",
    borderColor: "border-[#C5943A]/30",
    iconColor: "text-[#C5943A]",
  },
  {
    id: "technical",
    label: "Technical",
    description: "Data structures, algorithms, debugging & system thinking",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    color: "from-[#E8F5E9] to-[#F1F8E9]",
    borderColor: "border-emerald-400/30",
    iconColor: "text-emerald-600",
  },
  {
    id: "system-design",
    label: "System Design",
    description: "Architecture, scalability, trade-offs & distributed systems",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    color: "from-[#EDE7F6] to-[#F3E5F5]",
    borderColor: "border-violet-400/30",
    iconColor: "text-violet-600",
  },
  {
    id: "hr",
    label: "HR / Culture Fit",
    description: "Motivation, values, conflict resolution & career goals",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    color: "from-[#FFF3E0] to-[#FFF8E1]",
    borderColor: "border-amber-400/30",
    iconColor: "text-amber-600",
  },
];

export default function SetupPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    if (!selected) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewType: selected }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create session");
      }

      const { sessionId, assistantId, interviewerName } = await res.json();
      router.push(`/interview/${sessionId}?assistantId=${assistantId}&interviewer=${interviewerName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF6F1] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link href="/dashboard" className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors mb-4 inline-block">
              ← Back to dashboard
            </Link>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
              Choose your interview type
            </h1>
            <p className="text-[#6B7280]">
              Pick one and go deep. Your AI interviewer will adapt to your answers.
            </p>
          </div>
        </div>

        {/* Interview type cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {INTERVIEW_TYPES.map((type, i) => (
            <button
              key={type.id}
              onClick={() => setSelected(type.id)}
              className={`group relative p-5 rounded-2xl border text-left transition-all duration-300 animate-fade-in-up opacity-0 ${
                selected === type.id
                  ? `${type.borderColor} bg-gradient-to-br ${type.color} shadow-lg`
                  : "border-[#E8E0D6] hover:border-[#D1C9BD] bg-white hover:shadow-md"
              }`}
              style={{ animationDelay: `${i * 0.08}s`, animationFillMode: "forwards" }}
            >
              {/* Selection indicator */}
              <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                selected === type.id
                  ? "border-[#C5943A] bg-[#C5943A]"
                  : "border-[#D1C9BD]"
              }`}>
                {selected === type.id && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                selected === type.id
                  ? `${type.iconColor} bg-white/50`
                  : "text-[#9CA3AF] bg-[#F5EFE8] group-hover:text-[#6B7280]"
              }`}>
                {type.icon}
              </div>
              <div className="font-medium text-[#1A1A1A] mb-1">{type.label}</div>
              <div className="text-sm text-[#6B7280] leading-relaxed pr-4">{type.description}</div>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 animate-fade-in">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!selected || loading}
          className="w-full bg-[#1A1A1A] hover:bg-[#333333] disabled:bg-[#E8E0D6] disabled:text-[#9CA3AF] disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-medium transition-all hover:shadow-lg active:scale-[0.99]"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Preparing your interviewer...
            </span>
          ) : !selected ? "Select an interview type" : "Start interview →"}
        </button>
      </div>
    </div>
  );
}
