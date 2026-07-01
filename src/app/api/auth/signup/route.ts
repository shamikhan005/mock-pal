import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, jobRole, experienceLevel } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const rows = await sql`
      INSERT INTO users (email, password_hash, name, job_role, experience_level)
      VALUES (${email}, ${passwordHash}, ${name}, ${jobRole || ""}, ${experienceLevel || "mid"})
      RETURNING id, email, name
    `;

    const user = rows[0];

    const token = await signToken({ userId: user.id, email: user.email, name: user.name });
    const cookieConfig = setSessionCookie(token);

    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig.options as Parameters<typeof response.cookies.set>[2]);

    return response;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
