import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authenticateRequest } from "@/lib/api-auth";
import { getSettings } from "@/actions/settings";

export async function POST(req: NextRequest) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { apiKey, subject, body, instruction, to } = await req.json();
  if (!apiKey) return NextResponse.json({ error: "Claude API key required" }, { status: 400 });

  const s = await getSettings(["company_description", "ai_tone", "email_signature"]);

  const toneMap: Record<string, string> = {
    professional: "professional, formal, business-like",
    friendly: "warm, friendly, approachable",
    casual: "relaxed, casual, conversational",
    concise: "brief, direct, to the point",
    persuasive: "compelling, persuasive, sales-oriented",
  };
  const tone = toneMap[s.ai_tone] || toneMap.professional;

  const prompt = `You are rewriting an email draft. Return ONLY the rewritten email in this exact JSON format, nothing else:
{"subject": "...", "body": "..."}

${s.company_description ? `About the sender's company: ${s.company_description}\n` : ""}
Writing tone: ${tone}
${s.email_signature ? `Note: An email signature is appended automatically, do NOT include one.\n` : ""}
${to ? `Recipient: ${to}\n` : ""}

Current subject: ${subject || "(none)"}
Current body:
${body || "(empty)"}

Instruction: ${instruction}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ subject: result.subject, body: result.body });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
