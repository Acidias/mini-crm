"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { dispatchTokenUsage } from "@/lib/token-usage";

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
    SpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

type ToastState = {
  command: string;
  status: string;
} | null;

export function VoiceControl() {
  const router = useRouter();
  const pathname = usePathname();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const clearToast = useCallback((delay = 0) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    if (delay > 0) {
      toastTimeoutRef.current = setTimeout(() => setToast(null), delay);
    } else {
      setToast(null);
    }
  }, []);

  // Call the AI chat API directly and handle the stream
  const executeVoiceCommand = useCallback(async (text: string, displayText: string) => {
    const apiKey = localStorage.getItem("claude-api-key");
    if (!apiKey) {
      setToast({ command: displayText, status: "No API key - set one in AI Chat first" });
      clearToast(3000);
      return;
    }

    setToast({ command: displayText, status: "Thinking..." });

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          apiKey,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setToast({ command: displayText, status: `Error: ${err.error || "Request failed"}` });
        clearToast(4000);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let navigated = false;

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
              case "tool_call":
                setToast((prev) => prev ? { ...prev, status: `Using ${event.name}...` } : null);
                break;
              case "tool_result":
                if (event.name === "navigate" && event.result?.success && event.result?.data?.url) {
                  const url = event.result.data.url as string;
                  navigated = true;
                  if (url === pathname || url === pathname + window.location.search) {
                    // Same page - refresh to show changes
                    router.refresh();
                  } else {
                    router.push(url);
                  }
                }
                break;
              case "text":
                // Show first ~60 chars of AI response as status
                setToast((prev) => {
                  if (!prev) return null;
                  const current = prev.status.startsWith("Using ") || prev.status === "Thinking..."
                    ? event.content
                    : prev.status + event.content;
                  return { ...prev, status: current.slice(0, 80) + (current.length > 80 ? "..." : "") };
                });
                break;
              case "usage":
                dispatchTokenUsage(event.usage);
                break;
              case "done":
                if (navigated) {
                  clearToast(500);
                } else {
                  // No navigation - show the final status briefly then clear
                  setToast((prev) => prev ? { ...prev, status: prev.status || "Done" } : null);
                  clearToast(3000);
                }
                break;
              case "error":
                setToast({ command: displayText, status: `Error: ${event.message}` });
                clearToast(4000);
                break;
            }
          } catch { /* skip malformed JSON */ }
        }
      }
    } catch {
      setToast({ command: displayText, status: "Connection error" });
      clearToast(3000);
    }
  }, [router, pathname, clearToast]);

  const handleResult = useCallback((e: Event) => {
    const event = e as unknown as { results: SpeechRecognitionResultList; resultIndex: number };
    const result = event.results[event.results.length - 1];

    if (!result.isFinal) {
      setTranscript(result[0].transcript);
      return;
    }

    const text = result[0].transcript.trim();
    setTranscript("");

    if (!text) return;

    // Add page context so the AI knows what the user is looking at
    const path = window.location.pathname;
    let context = "";
    const match = path.match(/^\/(persons|companies|emails|events|todos)\/(\d+)/);
    if (match) context = `[Currently viewing ${match[1].slice(0, -1)} ID ${match[2]}] `;

    executeVoiceCommand(context + text, text);
  }, [executeVoiceCommand]);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    recognition.addEventListener("result", handleResult);

    recognition.addEventListener("end", () => {
      if (listeningRef.current) {
        try { recognition.start(); } catch { /* already started */ }
      }
    });

    recognition.addEventListener("error", (e: Event) => {
      const error = e as unknown as { error: string };
      if (error.error === "not-allowed") {
        setToast(null);
        setListening(false);
        listeningRef.current = false;
      }
    });

    recognitionRef.current = recognition;
    listeningRef.current = true;
    setListening(true);

    try { recognition.start(); } catch { /* already started */ }
  }, [handleResult]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    setTranscript("");
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* already stopped */ }
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* */ }
      }
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  if (!supported) return null;

  return (
    <>
      {/* Sidebar mic button */}
      <div className="px-4 py-3 border-t border-white/10">
        <button
          onClick={listening ? stopListening : startListening}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
            listening
              ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
              : "text-sidebar-text hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="relative flex items-center justify-center w-4 h-4">
            {listening && (
              <span className="absolute w-4 h-4 bg-red-500 rounded-full animate-ping opacity-40" />
            )}
            <span className={`relative text-base ${listening ? "text-red-400" : ""}`}>
              {listening ? "\u25CF" : "\u25CB"}
            </span>
          </span>
          {listening ? "Listening..." : "Voice Control"}
        </button>

        {transcript && (
          <p className="mt-1 px-3 text-[10px] text-sidebar-text/50 truncate italic">
            &quot;{transcript}&quot;
          </p>
        )}
      </div>

      {/* Floating toast - shows command + live AI status */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg max-w-lg min-w-[200px]">
          <div className="flex items-center gap-3">
            <span className="flex gap-1 flex-shrink-0">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span className="text-sm font-medium truncate">&quot;{toast.command}&quot;</span>
          </div>
          <p className="text-xs text-white/60 mt-1 truncate">{toast.status}</p>
        </div>
      )}
    </>
  );
}
