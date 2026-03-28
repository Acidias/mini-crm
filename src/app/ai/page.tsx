"use client";

import { useState, useRef, useEffect } from "react";

type ToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: { success: boolean; data?: unknown; error?: string };
};

type Message = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
};

const TOOL_LABELS: Record<string, string> = {
  persons_list: "Search Persons",
  persons_get: "Get Person",
  persons_create: "Create Person",
  persons_update: "Update Person",
  persons_delete: "Delete Person",
  persons_mark_contacted: "Mark Contacted",
  companies_list: "Search Companies",
  companies_get: "Get Company",
  companies_create: "Create Company",
  companies_update: "Update Company",
  companies_delete: "Delete Company",
  events_list: "Search Events",
  events_get: "Get Event",
  events_create: "Create Event",
  events_update: "Update Event",
  events_delete: "Delete Event",
  todos_list: "Search Todos",
  todos_get: "Get Todo",
  todos_create: "Create Todo",
  todos_update: "Update Todo",
  todos_toggle: "Toggle Todo",
  todos_delete: "Delete Todo",
  emails_list: "Search Emails",
  emails_get: "Get Email",
  emails_send: "Send Email",
  emails_save_draft: "Save Draft",
  activities_list: "List Activities",
  activities_create: "Log Activity",
  tags_list: "List Tags",
  tags_create: "Create Tag",
  tags_add_to_entity: "Add Tag",
  tags_remove_from_entity: "Remove Tag",
};

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [showKeyForm, setShowKeyForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("claude-api-key");
    if (stored) setApiKey(stored);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function saveKey() {
    const key = keyInput.trim();
    if (!key) return;
    localStorage.setItem("claude-api-key", key);
    setApiKey(key);
    setKeyInput("");
    setShowKeyForm(false);
  }

  function clearKey() {
    localStorage.removeItem("claude-api-key");
    setApiKey("");
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading || !apiKey) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Build conversation for API (simplified text-only)
    const conversation = newMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation, apiKey }),
      });

      if (!response.ok) {
        const err = await response.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.error || "Request failed"}` },
        ]);
        setIsLoading(false);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let toolCalls: ToolCall[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            switch (event.type) {
              case "text":
                assistantText += event.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    return [
                      ...updated.slice(0, -1),
                      { role: "assistant", content: assistantText, toolCalls: [...toolCalls] },
                    ];
                  } else {
                    return [
                      ...updated,
                      { role: "assistant", content: assistantText, toolCalls: [...toolCalls] },
                    ];
                  }
                });
                break;
              case "tool_call":
                toolCalls = [...toolCalls, { id: event.id, name: event.name, input: event.input }];
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    return [
                      ...updated.slice(0, -1),
                      { role: "assistant", content: assistantText, toolCalls: [...toolCalls] },
                    ];
                  } else {
                    return [
                      ...updated,
                      { role: "assistant", content: assistantText, toolCalls: [...toolCalls] },
                    ];
                  }
                });
                break;
              case "tool_result": {
                const tc = toolCalls.find((t) => t.id === event.id);
                if (tc) tc.result = event.result;
                toolCalls = [...toolCalls];
                setMessages((prev) => {
                  const updated = [...prev];
                  return [
                    ...updated.slice(0, -1),
                    { role: "assistant", content: assistantText, toolCalls: [...toolCalls] },
                  ];
                });
                break;
              }
              case "error":
                assistantText += `\n\nError: ${event.message}`;
                setMessages((prev) => {
                  const updated = [...prev];
                  return [
                    ...updated.slice(0, -1),
                    { role: "assistant", content: assistantText, toolCalls: [...toolCalls] },
                  ];
                });
                break;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Connection error: ${err instanceof Error ? err.message : "Unknown"}` },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // No API key - show setup
  if (!apiKey) {
    return (
      <div className="max-w-lg mx-auto mt-20">
        <div className="bg-card-bg rounded-xl border border-border p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">AI Assistant</h1>
          <p className="text-muted text-sm mb-6">
            Enter your Claude API key to start. It is stored only in your browser.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveKey()}
              placeholder="sk-ant-..."
              className="border border-border rounded-lg flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
            <button
              onClick={saveKey}
              className="bg-accent text-white px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <p className="text-muted text-xs">
            Powered by Claude - can manage all CRM data
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {showKeyForm ? (
            <div className="flex gap-1">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveKey()}
                placeholder="sk-ant-..."
                className="border border-border rounded px-2 py-1 text-xs w-40"
              />
              <button onClick={saveKey} className="text-accent text-xs hover:underline">Save</button>
              <button onClick={() => setShowKeyForm(false)} className="text-muted text-xs hover:underline">Cancel</button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowKeyForm(true)} className="text-muted text-xs hover:underline">Change Key</button>
              <button onClick={clearKey} className="text-muted text-xs hover:underline">Disconnect</button>
              <button
                onClick={() => setMessages([])}
                className="border border-border px-2 py-1 rounded text-xs text-muted hover:bg-gray-50"
              >
                Clear Chat
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-card-bg rounded-xl border border-border p-4 mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted text-sm py-20">
            <p className="font-medium mb-2">What can I help you with?</p>
            <div className="space-y-1 text-xs">
              <p>&quot;Show me all contacts at Acme Corp&quot;</p>
              <p>&quot;Create a new company called TechStart in the AI industry&quot;</p>
              <p>&quot;Add a todo to follow up with Sarah by Friday&quot;</p>
              <p>&quot;Send an email to john@acme.com about our meeting&quot;</p>
              <p>&quot;Who haven&apos;t I contacted in the last 2 weeks?&quot;</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-accent text-white"
                  : "bg-gray-100 text-foreground"
              }`}
            >
              {/* Tool calls */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {msg.toolCalls.map((tc) => (
                    <ToolCallCard key={tc.id} toolCall={tc} />
                  ))}
                </div>
              )}
              {/* Text content */}
              {msg.content && (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-4 py-3 text-sm text-muted">
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the AI assistant anything about your CRM..."
          rows={1}
          className="border border-border rounded-xl flex-1 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="bg-accent text-white px-6 py-3 rounded-xl text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const label = TOOL_LABELS[toolCall.name] || toolCall.name;
  const hasResult = !!toolCall.result;
  const isSuccess = toolCall.result?.success;

  return (
    <div className="bg-white rounded-lg border border-gray-200 text-xs overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${
          !hasResult ? "bg-amber-400 animate-pulse" : isSuccess ? "bg-green-500" : "bg-red-500"
        }`} />
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-400 ml-auto">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-gray-100 space-y-1.5">
          <div>
            <p className="text-gray-400 font-medium">Input:</p>
            <pre className="text-gray-600 whitespace-pre-wrap break-all">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.result && (
            <div>
              <p className="text-gray-400 font-medium">Result:</p>
              <pre className="text-gray-600 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
