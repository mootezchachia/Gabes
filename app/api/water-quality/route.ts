import { NextRequest, NextResponse } from "next/server";

const ML_API = process.env.ML_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${ML_API}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return NextResponse.json({ error: "ML API error" }, { status: 502 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "ML API unreachable" }, { status: 503 });
  }
}

export async function GET() {
  try {
    const res = await fetch(`${ML_API}/health`);
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "ML API unreachable" }, { status: 503 });
  }
}
