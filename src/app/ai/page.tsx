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
  updatedAt: string;
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
      setSessions((prev) => [{ id: session.id, title: session.title, updatedAt: session.updatedAt }, ...prev]);
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
        setSessions((prev) => [{ id: session.id, title: session.title, updatedAt: session.updatedAt }, ...prev]);
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

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation, apiKey }),
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
      let finalMessages = newMessages;

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
      const errorMsgs = [
        ...newMessages,
        { role: "assistant" as const, content: `Connection error: ${err instanceof Error ? err.message : "Unknown"}` },
      ];
      setMessages(errorMsgs);
      if (sessionId) saveMessages(sessionId, errorMsgs);
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
                  className="flex-1 text-left truncate text-xs"
                >
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
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-accent text-white"
                    : "bg-gray-100 text-foreground"
                }`}
              >
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {msg.toolCalls.map((tc) => (
                      <ToolCallCard key={tc.id} toolCall={tc} />
                    ))}
                  </div>
                )}
                {msg.content && (
                  <div className={msg.role === "user" ? "whitespace-pre-wrap" : "prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-accent prose-code:before:content-none prose-code:after:content-none"}>
                    {msg.role === "user" ? msg.content : <ReactMarkdown>{msg.content}</ReactMarkdown>}
                  </div>
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
