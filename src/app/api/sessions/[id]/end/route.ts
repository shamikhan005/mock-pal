import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getVapiCall } from "@/lib/vapi";
import { buildFeedbackPrompt, InterviewType } from "@/lib/prompts";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const rows = await sql`
    SELECT s.id, s.status, s.interview_type, s.vapi_call_id, s.user_id,
           f.overall_score
    FROM sessions s
    LEFT JOIN feedback_reports f ON f.session_id = s.id
    WHERE s.id = ${id} AND s.user_id = ${session.userId}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const dbSession = rows[0];

  if (dbSession.status === "ended" && dbSession.overall_score) {
    return NextResponse.json({ ok: true, status: "ended", feedbackExists: true });
  }

  await sql`
    UPDATE sessions
    SET status = 'ended', ended_at = NOW()
    WHERE id = ${dbSession.id}
  `;

  let messages: Array<{ role: string; content: string }> = [];
  if (dbSession.vapi_call_id) {
    try {
      const vapiCall = await getVapiCall(dbSession.vapi_call_id);
      if (vapiCall && vapiCall.artifact) {
        const rawMessages = (vapiCall.artifact.messages ?? []) as Array<Record<string, unknown>>;
        if (rawMessages.length > 0) {
          messages = rawMessages
            .filter((m: any) => m.role && (m.message || m.content || m.text))
            .map((m: any) => ({
              role: (m.role as string) === "bot" ? "assistant" : (m.role as string),
              content: ((m.message ?? m.content ?? m.text) as string),
            }));
        } else if (Array.isArray(vapiCall.artifact.transcript)) {
          messages = (vapiCall.artifact.transcript as Array<any>)
            .filter((t: any) => t.role && (t.text || t.content || t.message))
            .map((t: any) => ({
              role: (t.role as string) === "bot" ? "assistant" : (t.role as string),
              content: ((t.text ?? t.content ?? t.message) as string),
            }));
        }
      }
    } catch (err) {
      console.error("[end-session-route] Error fetching Vapi call:", err);
    }
  }

  if (messages.length === 0) {
    const transRows = await sql`
      SELECT messages FROM transcripts WHERE session_id = ${dbSession.id}
    `;
    if (transRows.length > 0 && transRows[0].messages) {
      messages = transRows[0].messages;
    }
  }

  if (messages.length > 0) {
    const existingTranscript = await sql`
      SELECT id FROM transcripts WHERE session_id = ${dbSession.id}
    `;
    if (existingTranscript.length === 0) {
      await sql`
        INSERT INTO transcripts (session_id, messages)
        VALUES (${dbSession.id}, ${JSON.stringify(messages)})
      `;
    } else {
      await sql`
        UPDATE transcripts
        SET messages = ${JSON.stringify(messages)}
        WHERE session_id = ${dbSession.id}
      `;
    }
  }

  if (!dbSession.overall_score) {
    const users = await sql`SELECT name FROM users WHERE id = ${dbSession.user_id}`;
    const candidateName = users[0]?.name || "candidate";

    if (messages.length > 2) {
      try {
        const prompt = buildFeedbackPrompt(dbSession.interview_type as InterviewType, candidateName, messages);
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

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0].message.content;
          const feedback = JSON.parse(content);

          const existingFeedback = await sql`
            SELECT id FROM feedback_reports WHERE session_id = ${dbSession.id}
          `;
          if (existingFeedback.length === 0) {
            await sql`
              INSERT INTO feedback_reports (
                session_id, overall_score, communication_score, content_score,
                structure_score, summary, strengths, improvements
              ) VALUES (
                ${dbSession.id}, ${feedback.overall_score}, ${feedback.communication_score},
                ${feedback.content_score}, ${feedback.structure_score},
                ${feedback.summary}, ${feedback.strengths}, ${feedback.improvements}
              )
            `;
          }
        } else {
          await saveFallbackFeedback(dbSession.id, messages);
        }
      } catch (err) {
        console.error("[end-session-route] Feedback generation error:", err);
        await saveFallbackFeedback(dbSession.id, messages);
      }
    } else {
      await saveFallbackFeedback(dbSession.id, messages);
    }
  }

  return NextResponse.json({ ok: true, status: "ended" });
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
    ? `The candidate completed a ${candidateCount}-turn interview session. Responses averaged ${Math.round(avgWords)} words per answer, showing ${avgWords > 30 ? 'detailed' : 'concise'} communication.`
    : `The interview was brief with ${candidateCount} response${candidateCount !== 1 ? 's' : ''}.`;

  const strengths = candidateCount >= 3
    ? `Completed the interview with ${candidateCount} substantive responses.`
    : "Started a practice interview session.";

  const improvements = avgWords < 20
    ? "Work on providing more detailed responses. Use the STAR method to structure answers."
    : "Continue practicing to refine your answers.";

  const existingFeedback = await sql`
    SELECT id FROM feedback_reports WHERE session_id = ${sessionId}
  `;
  if (existingFeedback.length === 0) {
    await sql`
      INSERT INTO feedback_reports (
        session_id, overall_score, communication_score, content_score,
        structure_score, summary, strengths, improvements
      ) VALUES (
        ${sessionId}, ${overallScore}, ${commScore}, ${contentScore},
        ${structureScore}, ${summary}, ${strengths}, ${improvements}
      )
    `;
  }
}
