import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { getSystemPrompt } from "@/lib/ai/system-prompt";
import { allTools } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/tool-executor";

const MAX_TOOL_CALLS = 40;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 });
  }

  const { messages, apiKey } = await req.json();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key required" }), { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: object) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      }

      try {
        // Build Anthropic messages from the simplified conversation
        const anthropicMessages: Anthropic.Messages.MessageParam[] = messages.map(
          (m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })
        );

        let toolCallCount = 0;

        // Agentic loop
        while (true) {
          const messageStream = anthropic.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: getSystemPrompt(),
            tools: allTools,
            messages: anthropicMessages,
          });

          // Stream text deltas to the client
          messageStream.on("text", (text) => {
            send({ type: "text", content: text });
          });

          // Wait for the complete message
          const finalMessage = await messageStream.finalMessage();

          // Check if there are tool use blocks
          const toolUseBlocks = finalMessage.content.filter(
            (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use"
          );

          if (finalMessage.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
            // No more tool calls - we're done
            send({ type: "done" });
            break;
          }

          // Safety: limit total tool calls
          toolCallCount += toolUseBlocks.length;
          if (toolCallCount > MAX_TOOL_CALLS) {
            send({ type: "text", content: "\n\n[Reached maximum tool call limit for this request]" });
            send({ type: "done" });
            break;
          }

          // Execute each tool call
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

            send({
              type: "tool_result",
              id: toolBlock.id,
              name: toolBlock.name,
              result,
            });

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: JSON.stringify(result),
              is_error: !result.success,
            });
          }

          // Append the assistant message (with tool use blocks) and tool results
          anthropicMessages.push({
            role: "assistant",
            content: finalMessage.content,
          });
          anthropicMessages.push({
            role: "user",
            content: toolResults,
          });

          // Loop back to let Claude process the tool results
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
      } finally {
        controller.close();
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
