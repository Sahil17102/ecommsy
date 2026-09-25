import { NextRequest, NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
export const runtime = "nodejs";
const limits = new Map<string, { count: number; until: number }>();
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return NextResponse.json(
      { message: "Please submit from this website." },
      { status: 403 },
    );
  if (Number(req.headers.get("content-length") || 0) > 16000)
    return NextResponse.json(
      { message: "Your message is too long." },
      { status: 413 },
    );
  const key = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const now = Date.now();
  for (const [ip, limit] of limits) if (limit.until < now) limits.delete(ip);
  const count = limits.get(key) || { count: 0, until: now + 600000 };
  if (count.count >= 5)
    return NextResponse.json(
      { message: "Please wait before sending another enquiry." },
      { status: 429 },
    );
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }
  const fields = ["name", "email", "company", "topic", "message"];
  if (!body || fields.some((k) => typeof body[k] !== "string"))
    return NextResponse.json(
      { message: "Complete all required fields." },
      { status: 400 },
    );
  const data = Object.fromEntries(
    fields.map((k) => [k, String(body[k]).trim()]),
  );
  if (
    data.name.length < 2 ||
    data.name.length > 150 ||
    !/^\S+@\S+\.\S+$/.test(data.email) ||
    data.email.length > 254 ||
    data.company.length > 200 ||
    data.topic.length > 100 ||
    data.message.length < 10 ||
    data.message.length > 5000
  )
    return NextResponse.json(
      {
        message:
          "Check your details. Please write a message between 10 and 5,000 characters.",
      },
      { status: 400 },
    );
  const id = randomUUID();
  try {
    const dir = process.env.ENQUIRY_DATA_DIR || join(process.cwd(), ".data");
    await mkdir(dir, { recursive: true });
    await appendFile(
      join(dir, "enquiries.ndjson"),
      JSON.stringify({ id, createdAt: new Date().toISOString(), ...data }) +
        "\n",
      { mode: 0o600 },
    );
    limits.set(key, { ...count, count: count.count + 1 });
    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "We could not save your enquiry. Please try again later." },
      { status: 503 },
    );
  }
}
