import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const rows = await sql`
    SELECT s.*, f.overall_score, f.communication_score, f.content_score,
           f.structure_score, f.summary, f.strengths, f.improvements,
           t.messages
    FROM sessions s
    LEFT JOIN feedback_reports f ON f.session_id = s.id
    LEFT JOIN transcripts t ON t.session_id = s.id
    WHERE s.id = ${id} AND s.user_id = ${session.userId}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ session: rows[0] });
}
