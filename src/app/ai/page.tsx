"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

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

type Session = {
  id: number;
  title: string;
  status: string;
  updatedAt: string;
};

const TOOL_LABELS: Record<string, string> = {
  web_fetch: "Fetch Web Page",
  web_search: "Web Search",
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load API key
  useEffect(() => {
    const stored = localStorage.getItem("claude-api-key");
    if (stored) setApiKey(stored);
  }, []);

  // Load sessions
  useEffect(() => {
    if (apiKey) loadSessions();
  }, [apiKey]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Check session status on visibility change + poll while working
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && activeSessionId) {
        checkSessionStatus(activeSessionId);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeSessionId]);

  async function checkSessionStatus(id: number) {
    const res = await fetch(`/api/ai/sessions?get=${id}`);
    if (!res.ok) return;
    const data = await res.json();

    if (data.messages && Array.isArray(data.messages)) {
      setMessages(data.messages);
    }

    // Update session status in sidebar
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, status: data.status } : s));

    if (data.status === "working") {
      setIsLoading(true);
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => pollSession(id), 3000);
      }
    } else {
      setIsLoading(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }

  async function pollSession(id: number) {
    const res = await fetch(`/api/ai/sessions?get=${id}`);
    if (!res.ok) return;
    const data = await res.json();

    if (data.messages && Array.isArray(data.messages)) {
      setMessages(data.messages);
    }

    if (data.status !== "working") {
      setIsLoading(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }

  async function loadSessions() {
    const res = await fetch("/api/ai/sessions");
    if (res.ok) {
      const data = await res.json();
      setSessions(data);
    }
  }

  async function loadSession(id: number) {
    const res = await fetch("/api/ai/sessions");
    if (!res.ok) return;
    // We store messages in the DB, need to fetch full session
    const allSessions = await res.json();
    // Get full session with messages
    const fullRes = await fetch(`/api/ai/sessions?id=${id}`);
    // Fallback: load from the PATCH response or store locally
    // For now, we'll use the sessions API to get the full data
    setActiveSessionId(id);
  }

  const saveMessages = useCallback(async (sessionId: number, msgs: Message[]) => {
    // Debounce saves
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await fetch("/api/ai/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, messages: msgs }),
      });
    }, 500);
  }, []);

  async function createSession() {
    const res = await fetch("/api/ai/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const session = await res.json();
      setSessions((prev) => [{ id: session.id, title: session.title, status: session.status || "idle", updatedAt: session.updatedAt }, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
      inputRef.current?.focus();
    }
  }

  async function selectSession(id: number) {
    // Save current session first
    if (activeSessionId && messages.length > 0) {
      await fetch("/api/ai/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeSessionId, messages }),
      });
    }

    setActiveSessionId(id);
    // Load messages for selected session
    const res = await fetch("/api/ai/sessions");
    if (res.ok) {
      const allSessions = await res.json();
      // Need to get full session data - update the API
    }
    // For now, fetch via a different approach - get session by filtering
    const fullRes = await fetch(`/api/ai/sessions`);
    if (fullRes.ok) {
      const data = await fullRes.json();
      setSessions(data);
    }

    // Load messages from a dedicated endpoint
    const msgRes = await fetch(`/api/ai/sessions?get=${id}`);
    if (msgRes.ok) {
      const sessionData = await msgRes.json();
      if (sessionData.messages) {
        setMessages(sessionData.messages);
      } else {
        setMessages([]);
      }
    }
  }

  async function deleteSession(id: number) {
    if (!confirm("Delete this chat session?")) return;
    await fetch("/api/ai/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
  }

  async function renameSession(id: number, title: string) {
    await fetch("/api/ai/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    setEditingTitle(null);
  }

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

    // Auto-create session if none active
    let sessionId = activeSessionId;
    if (!sessionId) {
      const res = await fetch("/api/ai/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const session = await res.json();
        sessionId = session.id;
        setActiveSessionId(session.id);
        setSessions((prev) => [{ id: session.id, title: session.title, status: session.status || "idle", updatedAt: session.updatedAt }, ...prev]);
      }
    }

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const conversation = newMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let finalMessages = newMessages;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation, apiKey, sessionId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        const errorMsgs = [...newMessages, { role: "assistant" as const, content: `Error: ${err.error || "Request failed"}` }];
        setMessages(errorMsgs);
        if (sessionId) saveMessages(sessionId, errorMsgs);
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
                finalMessages = [
                  ...newMessages,
                  { role: "assistant" as const, content: assistantText, toolCalls: [...toolCalls] },
                ];
                setMessages(finalMessages);
                break;
              case "tool_call":
                toolCalls = [...toolCalls, { id: event.id, name: event.name, input: event.input }];
                finalMessages = [
                  ...newMessages,
                  { role: "assistant" as const, content: assistantText, toolCalls: [...toolCalls] },
                ];
                setMessages(finalMessages);
                break;
              case "tool_result": {
                const tc = toolCalls.find((t) => t.id === event.id);
                if (tc) tc.result = event.result;
                toolCalls = [...toolCalls];
                finalMessages = [
                  ...newMessages,
                  { role: "assistant" as const, content: assistantText, toolCalls: [...toolCalls] },
                ];
                setMessages(finalMessages);
                break;
              }
              case "error":
                assistantText += `\n\nError: ${event.message}`;
                finalMessages = [
                  ...newMessages,
                  { role: "assistant" as const, content: assistantText, toolCalls: [...toolCalls] },
                ];
                setMessages(finalMessages);
                break;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Save to DB after stream completes
      if (sessionId) {
        saveMessages(sessionId, finalMessages);
        // Auto-title from first user message
        const currentSession = sessions.find((s) => s.id === sessionId);
        if (currentSession?.title === "New Chat" && text.length > 0) {
          const title = text.length > 50 ? text.slice(0, 50) + "..." : text;
          renameSession(sessionId, title);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User clicked Stop - server will finish and set status=idle
        // Check if server is still working
        if (sessionId) {
          checkSessionStatus(sessionId);
          return; // Don't set isLoading=false yet, let checkSessionStatus handle it
        }
      } else {
        // Stream disconnected (tab switch, network error)
        // Server may still be working - check status instead of assuming stopped
        if (sessionId) {
          checkSessionStatus(sessionId);
          return;
        }
        const errorMsgs = [
          ...newMessages,
          { role: "assistant" as const, content: `Connection error: ${err instanceof Error ? err.message : "Unknown"}` },
        ];
        setMessages(errorMsgs);
      }
    } finally {
      abortControllerRef.current = null;
      // Only set idle if we didn't defer to checkSessionStatus
      if (!activeSessionId) {
        setIsLoading(false);
      }
      inputRef.current?.focus();
    }
  }

  function stopGeneration() {
    abortControllerRef.current?.abort();
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
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Session sidebar */}
      <div className="w-56 flex-shrink-0 flex flex-col">
        <button
          onClick={createSession}
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors mb-3 w-full"
        >
          + New Chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-1 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                activeSessionId === s.id
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-gray-100"
              }`}
            >
              {editingTitle === s.id ? (
                <input
                  autoFocus
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={() => renameSession(s.id, titleInput)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") renameSession(s.id, titleInput);
                    if (e.key === "Escape") setEditingTitle(null);
                  }}
                  className="flex-1 bg-transparent border-b border-accent outline-none text-xs"
                />
              ) : (
                <button
                  onClick={() => selectSession(s.id)}
                  className="flex-1 text-left truncate text-xs flex items-center gap-1.5"
                >
                  {s.status === "working" && (
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
                  )}
                  {s.title}
                </button>
              )}
              <div className="hidden group-hover:flex gap-1 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTitle(s.id);
                    setTitleInput(s.title);
                  }}
                  className="text-muted hover:text-foreground text-[10px]"
                  title="Rename"
                >
                  &#9998;
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.id);
                  }}
                  className="text-muted hover:text-danger text-[10px]"
                  title="Delete"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-muted text-xs px-3 py-4 text-center">No chat sessions yet</p>
          )}
        </div>
        <div className="pt-3 border-t border-border mt-2 space-y-1">
          {showKeyForm ? (
            <div className="flex gap-1">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveKey()}
                placeholder="sk-ant-..."
                className="border border-border rounded px-2 py-1 text-xs flex-1"
              />
              <button onClick={saveKey} className="text-accent text-xs">OK</button>
            </div>
          ) : (
            <div className="flex gap-2 text-xs">
              <button onClick={() => setShowKeyForm(true)} className="text-muted hover:underline">Change Key</button>
              <button onClick={clearKey} className="text-muted hover:underline">Disconnect</button>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
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
              {msg.role === "user" ? (
                <div className="max-w-[80%] rounded-xl px-4 py-3 text-sm bg-accent text-white whitespace-pre-wrap">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[90%] space-y-3">
                  {/* Tool calls - compact grouped bar */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <ToolCallsGroup toolCalls={msg.toolCalls} />
                  )}
                  {/* Text content */}
                  {msg.content && (
                    <div className="bg-gray-100 rounded-xl px-5 py-4 text-sm prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mt-4 prose-headings:mb-2 prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-accent prose-code:before:content-none prose-code:after:content-none prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-table:border-collapse">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                {!abortControllerRef.current
                  ? "AI is working in the background..."
                  : "AI is thinking..."
                }
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
          {isLoading ? (
            <button
              onClick={stopGeneration}
              className="bg-danger text-white px-6 py-3 rounded-xl text-sm hover:bg-red-600 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="bg-accent text-white px-6 py-3 rounded-xl text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Grouped tool calls: compact collapsible section ───

function ToolCallsGroup({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [expanded, setExpanded] = useState(false);

  // Collect all entity cards from all tool calls
  const allEntities: Entity[] = [];
  const errors: string[] = [];
  const steps: { label: string; success: boolean | null }[] = [];

  for (const tc of toolCalls) {
    const label = TOOL_LABELS[tc.name] || tc.name;
    const hasResult = !!tc.result;
    const isSuccess = tc.result?.success;
    steps.push({ label, success: hasResult ? (isSuccess ?? false) : null });

    if (hasResult && isSuccess) {
      allEntities.push(...extractEntities(tc.name, tc.result!.data));
    }
    if (hasResult && !isSuccess && tc.result?.error) {
      errors.push(`${label}: ${tc.result.error}`);
    }
  }

  const doneCount = steps.filter((s) => s.success !== null).length;
  const failCount = steps.filter((s) => s.success === false).length;
  const pendingCount = steps.filter((s) => s.success === null).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 text-xs overflow-hidden">
      {/* Compact header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex gap-0.5">
          {steps.map((s, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${
              s.success === null ? "bg-amber-400 animate-pulse" : s.success ? "bg-green-400" : "bg-red-400"
            }`} />
          ))}
        </div>
        <span className="text-gray-500">
          {pendingCount > 0
            ? `Running ${steps[steps.length - 1]?.label}...`
            : `${doneCount} tool call${doneCount !== 1 ? "s" : ""}${failCount > 0 ? ` (${failCount} failed)` : ""}`
          }
        </span>
        <span className="text-gray-300 ml-auto">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>

      {/* Entity cards - always visible when there are CRM entities */}
      {allEntities.filter((e) => e.type !== "activity").length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {allEntities.filter((e) => e.type !== "activity").map((entity, i) => (
            <EntityCard key={i} entity={entity} />
          ))}
        </div>
      )}

      {/* Expanded: show each step */}
      {expanded && (
        <div className="border-t border-gray-100">
          {toolCalls.map((tc) => (
            <ToolCallDetail key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolCallDetail({ toolCall }: { toolCall: ToolCall }) {
  const [showRaw, setShowRaw] = useState(false);
  const label = TOOL_LABELS[toolCall.name] || toolCall.name;
  const hasResult = !!toolCall.result;
  const isSuccess = toolCall.result?.success;

  return (
    <div className="border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          !hasResult ? "bg-amber-400 animate-pulse" : isSuccess ? "bg-green-400" : "bg-red-400"
        }`} />
        <span className="text-gray-600 truncate">{label}</span>
        {hasResult && !isSuccess && toolCall.result?.error && (
          <span className="text-red-500 truncate ml-1">- {toolCall.result.error}</span>
        )}
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-gray-300 ml-auto hover:text-gray-500 flex-shrink-0"
        >
          {showRaw ? "\u25B2" : "\u25BC"}
        </button>
      </div>
      {showRaw && (
        <div className="px-3 py-1.5 bg-gray-50 space-y-1">
          <pre className="text-gray-500 whitespace-pre-wrap break-all text-[10px]">
            {JSON.stringify(toolCall.input, null, 2)}
          </pre>
          {toolCall.result && (
            <pre className="text-gray-500 whitespace-pre-wrap break-all text-[10px] max-h-32 overflow-y-auto">
              {JSON.stringify(toolCall.result.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Entity types and extraction ───

type Entity = {
  type: "person" | "company" | "event" | "todo" | "email" | "activity" | "tag";
  id: number;
  label: string;
  subtitle?: string;
  href: string;
};

function extractEntities(toolName: string, data: unknown): Entity[] {
  if (!data) return [];

  if (toolName === "web_fetch") {
    const d = data as Record<string, unknown>;
    if (d.url) return [{ type: "activity", id: 0, label: String(d.url).replace(/^https?:\/\//, "").slice(0, 50), subtitle: `${d.length || 0} chars`, href: d.url as string }];
  }

  if (toolName === "web_search") {
    const d = data as Record<string, unknown>;
    const results = d.results as { title: string; url: string }[] | undefined;
    if (results?.length) return results.slice(0, 5).map((r) => ({ type: "activity" as const, id: 0, label: r.title.slice(0, 50), href: r.url }));
  }

  if (toolName.endsWith("_get")) {
    const d = data as Record<string, unknown>;
    if (toolName === "persons_get" && d.person) return [personEntity(d.person as Record<string, unknown>)];
    if (toolName === "companies_get" && d.company) return [companyEntity(d.company as Record<string, unknown>)];
    if (toolName === "events_get" && d.event) return [eventEntity(d.event as Record<string, unknown>)];
    if (toolName === "todos_get" && d.todo) return [todoEntity(d.todo as Record<string, unknown>)];
    if (toolName === "emails_get" && d.email) return [emailEntity(d.email as Record<string, unknown>)];
  }

  if (toolName.endsWith("_create") || toolName.endsWith("_update") || toolName === "persons_mark_contacted" || toolName === "todos_toggle") {
    const d = data as Record<string, unknown>;
    if (d.id && typeof d.id === "number") {
      if (toolName.startsWith("persons")) return [personEntity(d)];
      if (toolName.startsWith("companies")) return [companyEntity(d)];
      if (toolName.startsWith("events")) return [eventEntity(d)];
      if (toolName.startsWith("todos")) return [todoEntity(d)];
      if (toolName.startsWith("emails")) return [emailEntity(d)];
    }
  }

  if (toolName.endsWith("_list")) {
    const items = Array.isArray(data) ? data : [];
    const mapper: Record<string, (d: Record<string, unknown>) => Entity> = {
      persons_list: personEntity, companies_list: companyEntity, events_list: eventEntity,
      todos_list: todoEntity, emails_list: emailEntity, tags_list: tagEntity,
    };
    const fn = mapper[toolName];
    if (fn) return items.slice(0, 10).map((d) => fn(d));
  }

  if (toolName === "emails_send" || toolName === "emails_save_draft") {
    const d = data as Record<string, unknown>;
    if (d.id) return [emailEntity(d)];
  }

  return [];
}

function personEntity(d: Record<string, unknown>): Entity {
  const parts = [d.position, d.companyName].filter(Boolean);
  return { type: "person", id: d.id as number, label: d.name as string, subtitle: parts.length > 0 ? parts.join(" at ") : (d.email as string) || undefined, href: `/persons/${d.id}` };
}
function companyEntity(d: Record<string, unknown>): Entity {
  return { type: "company", id: d.id as number, label: d.name as string, subtitle: (d.industry as string) || undefined, href: `/companies/${d.id}` };
}
function eventEntity(d: Record<string, unknown>): Entity {
  return { type: "event", id: d.id as number, label: d.name as string, subtitle: [d.date, d.location].filter(Boolean).join(" - ") || undefined, href: `/events/${d.id}/edit` };
}
function todoEntity(d: Record<string, unknown>): Entity {
  return { type: "todo", id: d.id as number, label: d.title as string, subtitle: d.dueDate ? `Due ${d.dueDate}` : d.done ? "Done" : "Pending", href: `/todos/${d.id}/edit` };
}
function emailEntity(d: Record<string, unknown>): Entity {
  const addr = d.direction === "inbound" ? d.fromAddress : d.toAddress;
  return { type: "email", id: d.id as number, label: (d.subject as string) || "(No subject)", subtitle: addr ? String(addr) : undefined, href: d.status === "draft" ? `/emails/compose?draft=${d.id}` : `/emails/${d.id}` };
}
function tagEntity(d: Record<string, unknown>): Entity {
  return { type: "tag", id: d.id as number, label: d.name as string, href: "#" };
}

const TYPE_STYLES: Record<string, { bg: string; icon: string }> = {
  person: { bg: "bg-blue-50 border-blue-200 hover:bg-blue-100", icon: "\u25CF" },
  company: { bg: "bg-purple-50 border-purple-200 hover:bg-purple-100", icon: "\u25C6" },
  event: { bg: "bg-amber-50 border-amber-200 hover:bg-amber-100", icon: "\u2605" },
  todo: { bg: "bg-green-50 border-green-200 hover:bg-green-100", icon: "\u2611" },
  email: { bg: "bg-cyan-50 border-cyan-200 hover:bg-cyan-100", icon: "\u2709" },
  tag: { bg: "bg-gray-50 border-gray-200", icon: "\u25CF" },
  activity: { bg: "bg-gray-50 border-gray-200 hover:bg-gray-100", icon: "\u25CB" },
};

function EntityCard({ entity }: { entity: Entity }) {
  const style = TYPE_STYLES[entity.type] || TYPE_STYLES.activity;

  if (entity.type === "tag") {
    return (
      <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border bg-gray-50 border-gray-200 text-gray-600">
        {entity.label}
      </span>
    );
  }

  return (
    <a
      href={entity.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-colors ${style.bg}`}
    >
      <span>{style.icon}</span>
      <span className="font-medium text-gray-800 truncate max-w-[180px]">{entity.label}</span>
      {entity.subtitle && (
        <span className="text-gray-400 truncate max-w-[120px] hidden sm:inline">{entity.subtitle}</span>
      )}
    </a>
  );
}
