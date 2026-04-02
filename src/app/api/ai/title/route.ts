import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authenticateRequest } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { message, apiKey } = await req.json();
  if (!apiKey || !message) {
    return NextResponse.json({ error: "API key and message required" }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 30,
      messages: [{ role: "user", content: message }],
      system: "Generate a very short chat title (3-5 words max) for this user message. Reply with ONLY the title, no quotes or punctuation at the end.",
    });

    const title = response.content[0].type === "text"
      ? response.content[0].text.trim().slice(0, 60)
      : "New Chat";

    return NextResponse.json({ title });
  } catch {
    // Fall back to truncated message if title generation fails
    const fallback = message.length > 50 ? message.slice(0, 50) + "..." : message;
    return NextResponse.json({ title: fallback });
  }
}
