import { NextRequest, NextResponse } from "next/server";
import { getSession, signToken, setSessionCookie } from "@/lib/auth";
import { sql } from "@/lib/db";

/** GET: Fetch current user profile */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`
    SELECT id, email, name, job_role, experience_level, created_at
    FROM users WHERE id = ${session.userId}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: rows[0] });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, jobRole, experienceLevel } = await req.json();

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const rows = await sql`
    UPDATE users
    SET name = ${name.trim()},
        job_role = ${jobRole || ""},
        experience_level = ${experienceLevel || "mid"}
    WHERE id = ${session.userId}
    RETURNING id, email, name, job_role, experience_level
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const user = rows[0];

  const token = await signToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
  const cookieConfig = setSessionCookie(token);

  const response = NextResponse.json({ user });
  response.cookies.set(
    cookieConfig.name,
    cookieConfig.value,
    cookieConfig.options as Parameters<typeof response.cookies.set>[2]
  );

  return response;
}
