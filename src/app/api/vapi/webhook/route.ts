import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  getLiveSession,
  setLiveSession,
  updateLiveSession,
  deleteLiveSession,
} from "@/lib/session-store";
import { buildFeedbackPrompt, InterviewType } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message } = body;

  if (!message) return NextResponse.json({ ok: true });

  const { type } = message;

  console.log("[vapi webhook] event type:", type);

  switch (type) {
    case "status-update": {
      await handleStatusUpdate(message);
      break;
    }
    case "end-of-call-report": {
      await handleEndOfCallReport(message);
      break;
    }
    case "transcript": {
      await handleTranscript(message);
      break;
    }
    case "call-started": {
      await handleStatusUpdate({ ...message, status: "in-progress" });
      break;
    }
    case "call-ended": {
      await handleEndOfCallReport(message);
      break;
    }
    default:
      console.log("[vapi webhook] unhandled event:", type);
      break;
  }

  return NextResponse.json({ ok: true });
}

function extractSessionId(message: Record<string, unknown>): string | undefined {
  const call = message.call as Record<string, unknown> | undefined;
  const assistant = (call?.assistant ?? message.assistant) as Record<string, unknown> | undefined;
  const metadata = assistant?.metadata as Record<string, unknown> | undefined;
  return metadata?.sessionId as string | undefined;
}

function extractCallId(message: Record<string, unknown>): string | undefined {
  const call = message.call as Record<string, unknown> | undefined;
  return call?.id as string | undefined;
}

async function handleStatusUpdate(message: Record<string, unknown>) {
  const status = message.status as string | undefined;
  const vapiCallId = extractCallId(message);
  const sessionId = extractSessionId(message);

  console.log("[vapi] status-update:", { status, vapiCallId, sessionId });

  if (status === "in-progress" && vapiCallId && sessionId) {
    await sql`
      UPDATE sessions SET vapi_call_id = ${vapiCallId}, status = 'active'
      WHERE id = ${sessionId}
    `;

    const existing = getLiveSession(`pending_${sessionId}`);
    if (existing) {
      setLiveSession(vapiCallId, existing);
      deleteLiveSession(`pending_${sessionId}`);
    }

    console.log("[vapi] call started, linked session:", sessionId, "→", vapiCallId);
  } else if (status === "ended" && vapiCallId) {
    console.log("[vapi] call ended via status-update:", vapiCallId);
  }
}

async function handleEndOfCallReport(message: Record<string, unknown>) {
  const vapiCallId = extractCallId(message);
  const sessionId = extractSessionId(message);
  console.log("[vapi] end-of-call-report:", { vapiCallId, sessionId });

  const artifact = message.artifact as Record<string, unknown> | undefined;
  const rawMessages = (artifact?.messages ?? []) as Array<Record<string, unknown>>;

  const rawTranscript = (artifact?.transcript ?? message.transcript) as
    | Array<Record<string, unknown>>
    | string
    | undefined;

  let messages: Array<{ role: string; content: string }> = [];

  if (rawMessages.length > 0) {
    messages = rawMessages
      .filter((m) => m.role && (m.message || m.content || m.text))
      .map((m) => ({
        role: (m.role as string) === "bot" ? "assistant" : (m.role as string),
        content: ((m.message ?? m.content ?? m.text) as string),
      }));
  } else if (Array.isArray(rawTranscript)) {
    messages = rawTranscript
      .filter((t) => t.role && (t.text || t.content || t.message))
      .map((t) => ({
        role: (t.role as string) === "bot" ? "assistant" : (t.role as string),
        content: ((t.text ?? t.content ?? t.message) as string),
      }));
  }

  console.log("[vapi] extracted messages count:", messages.length);

  let dbSession;

  if (vapiCallId) {
    const rows = await sql`
      UPDATE sessions SET status = 'ended', ended_at = NOW()
      WHERE vapi_call_id = ${vapiCallId}
      RETURNING id, interview_type, user_id
    `;
    if (rows.length > 0) dbSession = rows[0];
  }

  if (!dbSession && sessionId) {
    const rows = await sql`
      UPDATE sessions SET status = 'ended', ended_at = NOW()
      WHERE id = ${sessionId}
      RETURNING id, interview_type, user_id
    `;
    if (rows.length > 0) dbSession = rows[0];
  }

  if (!dbSession) {
    console.warn("[vapi] No session found for call:", vapiCallId, "sessionId:", sessionId);
    return;
  }

  const { id: dbSessionId, interview_type, user_id } = dbSession;

  if (messages.length > 0) {
    await sql`
      INSERT INTO transcripts (session_id, messages)
      VALUES (${dbSessionId}, ${JSON.stringify(messages)})
      ON CONFLICT DO NOTHING
    `;
  }

  const users = await sql`SELECT name FROM users WHERE id = ${user_id}`;
  const candidateName = users[0]?.name || "candidate";

  if (messages.length > 2) {
    await generateFeedback(dbSessionId, interview_type as InterviewType, candidateName, messages);
  } else {
    await saveFallbackFeedback(dbSessionId, messages);
  }

  if (vapiCallId) deleteLiveSession(vapiCallId);

  console.log("[vapi] session completed:", dbSessionId);
}

async function handleTranscript(message: Record<string, unknown>) {
  const vapiCallId = extractCallId(message);
  if (!vapiCallId) return;

  const liveSession = getLiveSession(vapiCallId);
  if (!liveSession) return;

  const role = message.role as string;

  if (role === "assistant") {
    const transcript = message.transcript as string;
    if (transcript?.includes("?")) {
      updateLiveSession(vapiCallId, {
        questionsAsked: liveSession.questionsAsked + 1,
      });
    }
  }
}

async function generateFeedback(
  sessionId: string,
  interviewType: InterviewType,
  candidateName: string,
  messages: Array<{ role: string; content: string }>
) {
  try {
    const prompt = buildFeedbackPrompt(interviewType, candidateName, messages);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.warn("[feedback] LLM call failed, using fallback scoring");
      await saveFallbackFeedback(sessionId, messages);
      return;
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const feedback = JSON.parse(content);

    await sql`
      INSERT INTO feedback_reports (
        session_id, overall_score, communication_score, content_score,
        structure_score, summary, strengths, improvements
      ) VALUES (
        ${sessionId}, ${feedback.overall_score}, ${feedback.communication_score},
        ${feedback.content_score}, ${feedback.structure_score},
        ${feedback.summary}, ${feedback.strengths}, ${feedback.improvements}
      )
    `;
  } catch (err) {
    console.error("[feedback] Error generating feedback:", err);
    await saveFallbackFeedback(sessionId, messages);
  }
}

async function saveFallbackFeedback(
  sessionId: string,
  messages: Array<{ role: string; content: string }>
) {
  const candidateTurns = messages.filter((m) => m.role === "user");
  const candidateCount = candidateTurns.length;
  const totalWords = candidateTurns.reduce((s, m) => s + m.content.split(/\s+/).length, 0);
  const avgWords = candidateCount > 0 ? totalWords / candidateCount : 0;

  const commScore = Math.min(10, Math.max(4, Math.round(avgWords / 15)));
  const contentScore = Math.min(10, Math.max(4, Math.round(candidateCount * 1.2)));
  const structureScore = Math.min(10, Math.max(5, commScore - 1 + (candidateCount > 3 ? 2 : 0)));
  const overallScore = Math.min(10, Math.max(4, Math.round((commScore + contentScore + structureScore) / 3)));

  const summary = candidateCount >= 4
    ? `The candidate completed a ${candidateCount}-turn interview session. Responses averaged ${Math.round(avgWords)} words per answer, showing ${avgWords > 30 ? 'detailed' : 'concise'} communication. Full AI-powered analysis was not available for this session.`
    : `The interview was brief with ${candidateCount} response${candidateCount !== 1 ? 's' : ''}. Consider practicing with longer sessions for more comprehensive feedback.`;

  const strengths = candidateCount >= 3
    ? `Completed the interview with ${candidateCount} substantive responses. ${avgWords > 25 ? 'Provided detailed answers that covered key points.' : 'Gave focused, concise answers.'} Engaged with the interviewer throughout the session.`
    : "Took initiative to start a practice interview session. Continue practicing to build confidence and develop stronger responses.";

  const improvements = avgWords < 20
    ? "Work on providing more detailed responses. Use the STAR method (Situation, Task, Action, Result) to structure behavioral answers. Aim for 60-90 second responses that include specific examples."
    : "Continue practicing to refine your answers. Focus on adding quantifiable outcomes and specific examples. Practice varying your response structure to keep the interviewer engaged.";

  await sql`
    INSERT INTO feedback_reports (
      session_id, overall_score, communication_score, content_score,
      structure_score, summary, strengths, improvements
    ) VALUES (
      ${sessionId}, ${overallScore}, ${commScore}, ${contentScore},
      ${structureScore}, ${summary}, ${strengths}, ${improvements}
    )
    ON CONFLICT DO NOTHING
  `;
}