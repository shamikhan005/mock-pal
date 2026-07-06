import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export { sql };

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      job_role TEXT NOT NULL DEFAULT '',
      experience_level TEXT NOT NULL DEFAULT 'mid',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      interview_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      vapi_call_id TEXT,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      ended_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transcripts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      messages JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS feedback_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      overall_score INTEGER,
      communication_score INTEGER,
      content_score INTEGER,
      structure_score INTEGER,
      summary TEXT,
      strengths TEXT,
      improvements TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Ensure unique constraints for safe ON CONFLICT clauses
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transcripts_session_id ON transcripts(session_id)
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_reports_session_id ON feedback_reports(session_id)
  `;
}
