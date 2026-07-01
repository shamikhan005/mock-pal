import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const rows = await sql`
      SELECT id, email, name, password_hash FROM users WHERE email = ${email}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signToken({ userId: user.id, email: user.email, name: user.name });
    const cookieConfig = setSessionCookie(token);

    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig.options as Parameters<typeof response.cookies.set>[2]);

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
