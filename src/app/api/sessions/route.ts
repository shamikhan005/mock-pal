import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { createVapiAssistant } from "@/lib/vapi";
import { buildSystemPrompt, InterviewType } from "@/lib/prompts";
import { setLiveSession } from "@/lib/session-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`
    SELECT
      s.id, s.interview_type, s.status, s.started_at, s.ended_at,
      f.overall_score
    FROM sessions s
    LEFT JOIN feedback_reports f ON f.session_id = s.id
    WHERE s.user_id = ${session.userId}
    ORDER BY s.started_at DESC
  `;

  return NextResponse.json({ sessions: rows });
}

export async function POST(req: NextRequest) {
  const authSession = await getSession();
  if (!authSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { interviewType } = await req.json();

  if (!["behavioral", "technical", "system-design", "hr"].includes(interviewType)) {
    return NextResponse.json({ error: "Invalid interview type" }, { status: 400 });
  }

  const users = await sql`
    SELECT name, job_role, experience_level FROM users WHERE id = ${authSession.userId}
  `;
  const user = users[0];

  const systemPrompt = buildSystemPrompt({
    interviewType: interviewType as InterviewType,
    candidateName: user.name,
    jobRole: user.job_role || "software engineer",
    experienceLevel: user.experience_level || "mid",
  });

  const FIRST_MESSAGES: Record<string, string> = {
    behavioral: `Hi ${user.name}, I'm Alex and I'll be conducting your behavioral interview today. We'll spend about 20-30 minutes going through a few questions, focusing on how you handle real situations at work. There are no trick questions — I just want to hear how you think. Ready to get started?`,
    technical: `Hi ${user.name}, I'm Jordan. I'll be your technical interviewer today. Over the next 20-30 minutes, we'll explore some technical topics relevant to your role. I'm not looking for textbook answers — I want to understand how you think through problems. Let's dive in.`,
    "system-design": `Hi ${user.name}, I'm Sam, and I'll be walking through a system design discussion with you today. We'll spend about 20-30 minutes working through a design problem together. Think of this as collaborative — I want to see how you approach architecture decisions and trade-offs. Ready?`,
    hr: `Hi ${user.name}, I'm Morgan, and I'll be having a conversation with you today about your career, motivations, and how you work with others. This isn't a test — it's a chance for us to get to know each other. We'll spend about 20-30 minutes. Sound good?`,
  };

  const firstMessage = FIRST_MESSAGES[interviewType] || FIRST_MESSAGES.behavioral;

  const rows = await sql`
    INSERT INTO sessions (user_id, interview_type, status)
    VALUES (${authSession.userId}, ${interviewType}, 'pending')
    RETURNING id
  `;
  const sessionId = rows[0].id;

  const assistant = await createVapiAssistant({
    systemPrompt,
    firstMessage,
    candidateName: user.name,
    sessionId,
  });

  setLiveSession(`pending_${sessionId}`, {
    sessionId,
    userId: authSession.userId,
    interviewType,
    stage: "intro",
    questionsAsked: 0,
    topicsCovered: [],
    lastEvaluation: null,
    followupCount: 0,
  });

  const INTERVIEWER_NAMES: Record<string, string> = {
    behavioral: "Alex",
    technical: "Jordan",
    "system-design": "Sam",
    hr: "Morgan",
  };

  return NextResponse.json({
    sessionId,
    assistantId: assistant.id,
    interviewType,
    interviewerName: INTERVIEWER_NAMES[interviewType] || "Alex",
  });
}