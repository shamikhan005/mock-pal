import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

function ScoreRing({ score, label, color }: { score: number | null; label: string; color: string }) {
  const value = score ?? 0;
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (value / 10) * circumference;

  const colorMap: Record<string, { stroke: string; text: string; bg: string }> = {
    green: { stroke: "#22c55e", text: "text-green-600", bg: "bg-green-50" },
    amber: { stroke: "#C5943A", text: "text-[#C5943A]", bg: "bg-[#FDF3E1]" },
    red: { stroke: "#ef4444", text: "text-red-500", bg: "bg-red-50" },
    zinc: { stroke: "#D1C9BD", text: "text-[#9CA3AF]", bg: "bg-[#F5EFE8]" },
  };

  const c = score !== null
    ? score >= 8 ? colorMap.green : score >= 6 ? colorMap.amber : colorMap.red
    : colorMap.zinc;

  return (
    <div className={`flex flex-col items-center p-4 rounded-2xl glass`}>
      <div className="score-ring mb-2">
        <svg width="72" height="72" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="#E8E0D6" strokeWidth="4" />
          {score !== null && (
            <circle
              cx="32" cy="32" r="28"
              fill="none"
              stroke={c.stroke}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
          )}
        </svg>
        <div className={`score-value ${c.text}`}>
          {score ?? "—"}
        </div>
      </div>
      <div className="text-xs text-[#9CA3AF] uppercase tracking-wider font-medium">{label}</div>
    </div>
  );
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authSession = await getSession();
  const { id } = await params;

  const rows = await sql`
    SELECT s.id, s.interview_type, s.status, s.started_at, s.ended_at,
           f.overall_score, f.communication_score, f.content_score,
           f.structure_score, f.summary, f.strengths, f.improvements,
           t.messages
    FROM sessions s
    LEFT JOIN feedback_reports f ON f.session_id = s.id
    LEFT JOIN transcripts t ON t.session_id = s.id
    WHERE s.id = ${id} AND s.user_id = ${authSession!.userId}
  `;

  if (rows.length === 0) redirect("/dashboard");

  const session = rows[0];

  const INTERVIEW_LABELS: Record<string, string> = {
    behavioral: "Behavioral",
    technical: "Technical",
    "system-design": "System Design",
    hr: "HR / Culture Fit",
  };

  const INTERVIEW_BADGE_COLORS: Record<string, string> = {
    behavioral: "bg-blue-50 text-blue-600 border-blue-200",
    technical: "bg-emerald-50 text-emerald-600 border-emerald-200",
    "system-design": "bg-violet-50 text-violet-600 border-violet-200",
    hr: "bg-amber-50 text-amber-600 border-amber-200",
  };

  const INTERVIEWER_NAMES: Record<string, string> = {
    behavioral: "Alex",
    technical: "Jordan",
    "system-design": "Sam",
    hr: "Morgan",
  };

  const messages: Array<{ role: string; content: string }> =
    session.messages || [];

  const hasFeedback = !!session.overall_score;
  const interviewerName = INTERVIEWER_NAMES[session.interview_type] || "AI";

  return (
    <div className="min-h-screen bg-[#FAF6F1]">
      <nav className="border-b border-[#E8E0D6] px-6 py-4 bg-white/70 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors text-sm">
            ← Dashboard
          </Link>
          <span className="text-[#D1C9BD]">/</span>
          <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
            INTERVIEW_BADGE_COLORS[session.interview_type] || "bg-[#F5EFE8] text-[#6B7280]"
          }`}>
            {INTERVIEW_LABELS[session.interview_type]}
          </span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-[#1A1A1A]">
              {INTERVIEW_LABELS[session.interview_type]} Interview
            </h1>
            <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
              session.status === "ended"
                ? "bg-[#F5EFE8] text-[#6B7280]"
                : session.status === "active"
                ? "bg-green-50 text-green-600 border border-green-200"
                : "bg-[#F5EFE8] text-[#9CA3AF]"
            }`}>
              {session.status}
            </span>
          </div>
          <p className="text-[#9CA3AF] text-sm">
            {new Date(session.started_at).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {!hasFeedback && session.status === "ended" && (
          <div className="glass rounded-2xl p-8 text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FDF3E1] mb-4">
              <svg className="animate-spin h-5 w-5 text-[#C5943A]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
            <p className="text-[#1A1A1A] font-medium">Generating your feedback report...</p>
            <p className="text-[#9CA3AF] text-sm mt-1">This usually takes 15-30 seconds. Refresh this page.</p>
          </div>
        )}

        {hasFeedback && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <ScoreRing score={session.overall_score} label="Overall" color="overall" />
              <ScoreRing score={session.communication_score} label="Communication" color="communication" />
              <ScoreRing score={session.content_score} label="Content" color="content" />
              <ScoreRing score={session.structure_score} label="Structure" color="structure" />
            </div>

            {session.summary && (
              <div className="glass rounded-2xl p-6 mb-4">
                <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">Summary</h2>
                <p className="text-[#1A1A1A] leading-relaxed">{session.summary}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {session.strengths && (
                <div className="rounded-2xl p-6 border border-green-200 bg-green-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <h2 className="text-sm font-medium text-green-700 uppercase tracking-wider">Strengths</h2>
                  </div>
                  <p className="text-[#1A1A1A] text-sm leading-relaxed">{session.strengths}</p>
                </div>
              )}
              {session.improvements && (
                <div className="rounded-2xl p-6 border border-amber-200 bg-amber-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </div>
                    <h2 className="text-sm font-medium text-amber-700 uppercase tracking-wider">Areas to improve</h2>
                  </div>
                  <p className="text-[#1A1A1A] text-sm leading-relaxed">{session.improvements}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="animate-fade-in">
            <h2 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider mb-5">
              Full transcript
            </h2>
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className="shrink-0 mt-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        msg.role === "assistant"
                          ? "bg-[#FDF3E1] text-[#C5943A] border border-[#E8E0D6]"
                          : "bg-[#F5EFE8] text-[#6B7280] border border-[#E8E0D6]"
                      }`}
                    >
                      {msg.role === "assistant" ? interviewerName[0] : "You"}
                    </div>
                  </div>
                  <div
                    className={`max-w-lg text-sm leading-relaxed px-4 py-3 rounded-2xl ${
                      msg.role === "assistant"
                        ? "bg-white text-[#1A1A1A] border border-[#E8E0D6] rounded-tl-md"
                        : "bg-[#FDF3E1] text-[#1A1A1A] border border-[#E8E0D6] rounded-tr-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 flex gap-3">
          <Link
            href="/setup"
            className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#333333] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:shadow-lg active:scale-[0.98]"
          >
            Practice again
          </Link>
          <Link
            href="/dashboard"
            className="text-[#6B7280] hover:text-[#1A1A1A] px-5 py-2.5 text-sm transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
