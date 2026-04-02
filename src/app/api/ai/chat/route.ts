import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@/db";
import { chatSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSystemPrompt } from "@/lib/ai/system-prompt";
import { allTools } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/tool-executor";

const MAX_TOOL_CALLS = 40;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: { id: string; name: string; input: unknown; result?: unknown }[];
};

async function saveSession(sessionId: number, messages: ChatMessage[], status: string = "working") {
  try {
    await db
      .update(chatSessions)
      .set({ messages, status, updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));
  } catch {
    // Non-critical
  }
}

async function markIdle(sessionId: number) {
  try {
    await db.update(chatSessions).set({ status: "idle", updatedAt: new Date() }).where(eq(chatSessions.id, sessionId));
  } catch { /* non-critical */ }
}

export async function POST(req: NextRequest) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) {
    return new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 });
  }

  const { messages, apiKey, sessionId } = await req.json();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key required" }), { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let clientDisconnected = false;

      function send(obj: object) {
        if (clientDisconnected) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          clientDisconnected = true;
        }
      }

      // Mark session as working
      if (sessionId) {
        await db.update(chatSessions).set({ status: "working" }).where(eq(chatSessions.id, sessionId));
      }

      try {
        const anthropicMessages: Anthropic.Messages.MessageParam[] = messages.map(
          (m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })
        );

        let toolCallCount = 0;
        let loopIteration = 0;
        let assistantText = "";
        let allToolCalls: ChatMessage["toolCalls"] = [];

        const fullMessages: ChatMessage[] = messages.map(
          (m: { role: string; content: string }) => ({ role: m.role, content: m.content })
        );

        // System prompt with cache control
        const systemPromptText = await getSystemPrompt();
        const systemPrompt: Anthropic.Messages.TextBlockParam = {
          type: "text",
          text: systemPromptText,
          cache_control: { type: "ephemeral" },
        };

        const cachedTools = allTools.map((tool, i) =>
          i === allTools.length - 1
            ? { ...tool, cache_control: { type: "ephemeral" as const } }
            : tool
        );

        // Agentic loop
        while (true) {
          loopIteration++;

          // Add separator between rounds so text doesn't run together
          if (loopIteration > 1 && assistantText.length > 0) {
            assistantText += "\n\n";
            send({ type: "text", content: "\n\n" });
          }

          const messageStream = anthropic.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: [systemPrompt],
            tools: cachedTools,
            messages: anthropicMessages,
          });

          messageStream.on("text", (text) => {
            assistantText += text;
            send({ type: "text", content: text });
          });

          const finalMessage = await messageStream.finalMessage();

          // Send token usage after each API call for live tracking
          send({
            type: "usage",
            usage: {
              input_tokens: finalMessage.usage.input_tokens,
              output_tokens: finalMessage.usage.output_tokens,
              cache_creation_input_tokens: finalMessage.usage.cache_creation_input_tokens ?? 0,
              cache_read_input_tokens: finalMessage.usage.cache_read_input_tokens ?? 0,
            },
          });

          const toolUseBlocks = finalMessage.content.filter(
            (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use"
          );

          if (finalMessage.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
            send({ type: "done" });
            break;
          }

          toolCallCount += toolUseBlocks.length;

          // Send progress update
          send({
            type: "progress",
            completed: toolCallCount,
            max: MAX_TOOL_CALLS,
          });

          if (toolCallCount > MAX_TOOL_CALLS) {
            assistantText += "\n\n[Reached maximum tool call limit]";
            send({ type: "text", content: "\n\n[Reached maximum tool call limit]" });
            send({ type: "done" });
            break;
          }

          const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

          for (const toolBlock of toolUseBlocks) {
            send({
              type: "tool_call",
              id: toolBlock.id,
              name: toolBlock.name,
              input: toolBlock.input,
            });

            const result = await executeTool(
              toolBlock.name,
              toolBlock.input as Record<string, unknown>
            );

            allToolCalls = [...(allToolCalls || []), {
              id: toolBlock.id,
              name: toolBlock.name,
              input: toolBlock.input,
              result,
            }];

            send({
              type: "tool_result",
              id: toolBlock.id,
              name: toolBlock.name,
              result,
            });

            const resultJson = JSON.stringify(result);
            const truncatedResult = resultJson.length > 4000
              ? resultJson.slice(0, 4000) + '..."}'
              : resultJson;

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: truncatedResult,
              is_error: !result.success,
            });
          }

          // Save progress after each tool round
          if (sessionId) {
            const progressMessages: ChatMessage[] = [
              ...fullMessages,
              { role: "assistant", content: assistantText, toolCalls: allToolCalls },
            ];
            saveSession(sessionId, progressMessages, "working");
          }

          anthropicMessages.push({
            role: "assistant",
            content: finalMessage.content,
          });
          anthropicMessages.push({
            role: "user",
            content: toolResults,
          });
        }

        // Final save as idle
        if (sessionId) {
          const finalSave: ChatMessage[] = [
            ...fullMessages,
            { role: "assistant", content: assistantText, toolCalls: allToolCalls },
          ];
          await saveSession(sessionId, finalSave, "idle");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message.includes("authentication") || message.includes("invalid x-api-key") || message.includes("Invalid API Key")) {
          send({ type: "error", message: "Invalid API key. Please check your Claude API key." });
        } else if (message.includes("rate_limit") || message.includes("429")) {
          send({ type: "error", message: "Rate limited. Please wait a moment and try again." });
        } else {
          send({ type: "error", message });
        }
        // Mark idle on error too
        if (sessionId) await markIdle(sessionId);
      } finally {
        // Always mark idle in finally as a safety net
        if (sessionId) await markIdle(sessionId);
        if (!clientDisconnected) {
          try { controller.close(); } catch { /* already closed */ }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
