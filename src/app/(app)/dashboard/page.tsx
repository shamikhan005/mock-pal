import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();

  const sessions = await sql`
    SELECT s.id, s.interview_type, s.status, s.started_at, s.ended_at,
           (SELECT overall_score FROM feedback_reports WHERE session_id = s.id LIMIT 1) as overall_score
    FROM sessions s
    WHERE s.user_id = ${session!.userId}
    ORDER BY s.started_at DESC
    LIMIT 20
  `;

  const trendData = await sql`
    SELECT s.started_at, s.interview_type,
           f.overall_score, f.communication_score, f.content_score, f.structure_score
    FROM sessions s
    CROSS JOIN LATERAL (
      SELECT overall_score, communication_score, content_score, structure_score
      FROM feedback_reports
      WHERE session_id = s.id
      LIMIT 1
    ) f
    WHERE s.user_id = ${session!.userId} AND s.status = 'ended' AND f.overall_score IS NOT NULL
    ORDER BY s.started_at ASC
    LIMIT 10
  `;

  const INTERVIEW_LABELS: Record<string, string> = {
    behavioral: "Behavioral",
    technical: "Technical",
    "system-design": "System Design",
    hr: "HR / Culture Fit",
  };

  const INTERVIEW_ICONS: Record<string, React.ReactNode> = {
    behavioral: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    technical: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    "system-design": (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    hr: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  };

  const completedSessions = sessions.filter((s) => s.status === "ended");
  const scores = completedSessions
    .map((s) => s.overall_score as number | null)
    .filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
  const bestScore = scores.length > 0 ? Math.max(...scores) : null;

  const sessionDates = new Set(
    completedSessions.map((s) =>
      new Date(s.started_at).toISOString().slice(0, 10)
    )
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (sessionDates.has(d.toISOString().slice(0, 10))) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  const chartWidth = 500;
  const chartHeight = 120;
  const chartPadding = 24;

  function buildLinePath(dataPoints: number[]): string {
    if (dataPoints.length < 2) return "";
    const stepX = (chartWidth - chartPadding * 2) / (dataPoints.length - 1);
    return dataPoints
      .map((val, i) => {
        const x = chartPadding + i * stepX;
        const y = chartHeight - chartPadding - ((val - 1) / 9) * (chartHeight - chartPadding * 2);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  const overallPath = buildLinePath(trendData.map((t) => t.overall_score as number));
  const commPath = buildLinePath(trendData.map((t) => t.communication_score as number));
  const contentPath = buildLinePath(trendData.map((t) => t.content_score as number));
  const structurePath = buildLinePath(trendData.map((t) => t.structure_score as number));

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
          <Link href="/dashboard" className="sidebar-nav-item active">
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
          <Link href="/profile" className="sidebar-nav-item">
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
            <span className="text-sm text-[#6B7280]">Hi, {session!.name}</span>
            <div className="w-9 h-9 rounded-full bg-[#C5943A] flex items-center justify-center text-white text-sm font-semibold">
              {session!.name?.[0]?.toUpperCase() || 'U'}
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

        <div className="px-8 pb-10">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Dashboard</h1>
            <p className="text-[#6B7280] mt-1">Track your interview practice and progress</p>
          </div>

          {sessions.length > 0 && (
            <div className="grid grid-cols-4 gap-5 mb-10 animate-fade-in">
              <div className="stat-card">
                <div className="stat-icon bg-[#FDF3E1]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#1A1A1A]">{completedSessions.length}</div>
                  <div className="text-sm font-medium text-[#1A1A1A]">Sessions</div>
                  <div className="text-xs text-[#9CA3AF]">Total interviews</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-[#FDF3E1]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#1A1A1A]">{avgScore ?? "—"}</div>
                  <div className="text-sm font-medium text-[#1A1A1A]">Avg Score</div>
                  <div className="text-xs text-[#9CA3AF]">Your average</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-[#FDF3E1]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C10.3431 2 9 3.34315 9 5V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V5C15 3.34315 13.6569 2 12 2Z"/>
                    <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10"/>
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#1A1A1A]">{bestScore ? `${bestScore}/10` : "—"}</div>
                  <div className="text-sm font-medium text-[#1A1A1A]">Best Score</div>
                  <div className="text-xs text-[#9CA3AF]">Your highest</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon bg-[#E8F5E9]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#1A1A1A]">{streak}</div>
                  <div className="text-sm font-medium text-[#1A1A1A]">Day Streak</div>
                  <div className="text-xs text-[#9CA3AF]">Keep practicing!</div>
                </div>
              </div>
            </div>
          )}

          {trendData.length >= 2 && (
            <div className="glass rounded-2xl p-6 mb-10 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#1A1A1A]">Score Trend</h2>
                  <p className="text-xs text-[#9CA3AF]">Your performance over the last {trendData.length} sessions</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded bg-[#C5943A]"></div>
                    <span className="text-[#6B7280]">Overall</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded bg-[#3b82f6]"></div>
                    <span className="text-[#6B7280]">Communication</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded bg-[#22c55e]"></div>
                    <span className="text-[#6B7280]">Content</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded bg-[#a855f7]"></div>
                    <span className="text-[#6B7280]">Structure</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[2, 4, 6, 8, 10].map((val) => {
                    const y = chartHeight - chartPadding - ((val - 1) / 9) * (chartHeight - chartPadding * 2);
                    return (
                      <g key={val}>
                        <line x1={chartPadding} y1={y} x2={chartWidth - chartPadding} y2={y} stroke="#E8E0D6" strokeWidth="0.5" strokeDasharray="4,4" />
                        <text x={chartPadding - 4} y={y + 3} textAnchor="end" fill="#9CA3AF" fontSize="8">{val}</text>
                      </g>
                    );
                  })}
                  {/* Score lines */}
                  {structurePath && <path d={structurePath} fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />}
                  {contentPath && <path d={contentPath} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />}
                  {commPath && <path d={commPath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />}
                  {overallPath && <path d={overallPath} fill="none" stroke="#C5943A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
                  {/* Data points for overall */}
                  {trendData.map((t, i) => {
                    const stepX = (chartWidth - chartPadding * 2) / (trendData.length - 1);
                    const x = chartPadding + i * stepX;
                    const y = chartHeight - chartPadding - (((t.overall_score as number) - 1) / 9) * (chartHeight - chartPadding * 2);
                    return <circle key={i} cx={x} cy={y} r="3" fill="#C5943A" stroke="white" strokeWidth="1.5" />;
                  })}
                </svg>
                <div className="flex justify-between px-6 mt-1">
                  {trendData.map((t, i) => (
                    <span key={i} className="text-[10px] text-[#9CA3AF]">
                      {new Date(t.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold text-[#1A1A1A]">Your interviews</h2>
              <p className="text-[#9CA3AF] text-sm mt-0.5">Practice makes permanent.</p>
            </div>
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#333333] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:shadow-lg active:scale-[0.98]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New interview
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-24 glass rounded-2xl animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FDF3E1] mb-5 animate-float">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C10.3431 2 9 3.34315 9 5V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V5C15 3.34315 13.6569 2 12 2Z"/>
                  <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10"/>
                  <path d="M12 19V22M12 22H9M12 22H15"/>
                </svg>
              </div>
              <p className="text-[#1A1A1A] font-medium mb-2">No interviews yet</p>
              <p className="text-[#9CA3AF] text-sm mb-6 max-w-xs mx-auto">
                Start your first mock interview session and get AI-powered feedback.
              </p>
              <Link
                href="/setup"
                className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#333333] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all hover:shadow-lg"
              >
                Start practicing
              </Link>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              {sessions.map((s, index: number) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="interview-row group animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "forwards" }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FDF3E1] flex items-center justify-center flex-shrink-0">
                      {INTERVIEW_ICONS[s.interview_type] || (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C5943A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[#1A1A1A]">
                        {INTERVIEW_LABELS[s.interview_type] || s.interview_type}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          s.status === "ended"
                            ? "text-[#9CA3AF] bg-[#F5EFE8]"
                            : s.status === "active"
                            ? "text-green-600 bg-green-50"
                            : "text-[#9CA3AF] bg-[#F5EFE8]"
                        }`}
                      >
                        {s.status === "active" && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
                        )}
                        {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {s.overall_score && (
                      <div className="text-sm font-bold text-[#C5943A]">
                        {s.overall_score}<span className="text-[#9CA3AF] font-normal">/10</span>
                      </div>
                    )}
                    <span className="text-xs text-[#9CA3AF] min-w-[120px] text-right">
                      {new Date(s.started_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <svg className="w-4 h-4 text-[#D1C9BD] group-hover:text-[#C5943A] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}