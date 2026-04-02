"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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

export function VoiceControl() {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  // Call the AI chat API directly and handle the stream
  const executeVoiceCommand = useCallback(async (text: string) => {
    const apiKey = localStorage.getItem("claude-api-key");
    if (!apiKey) {
      setProcessing("No API key - set one in AI Chat first");
      setTimeout(() => setProcessing(null), 3000);
      return;
    }

    setProcessing(text);

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
        setProcessing(`Error: ${err.error || "Request failed"}`);
        setTimeout(() => setProcessing(null), 3000);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              case "tool_result":
                if (event.name === "navigate" && event.result?.success && event.result?.data?.url) {
                  setProcessing(null);
                  router.push(event.result.data.url);
                }
                break;
              case "usage":
                dispatchTokenUsage(event.usage);
                break;
              case "done":
                setProcessing(null);
                break;
              case "error":
                setProcessing(`Error: ${event.message}`);
                setTimeout(() => setProcessing(null), 3000);
                break;
            }
          } catch { /* skip malformed JSON */ }
        }
      }
    } catch {
      setProcessing("Connection error");
      setTimeout(() => setProcessing(null), 3000);
    }
  }, [router]);

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

    executeVoiceCommand(context + text);
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
        setProcessing(null);
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

      {/* Floating toast - visible over main content */}
      {processing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-md">
          <span className="flex gap-1 flex-shrink-0">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
          <span className="text-sm truncate">{processing.startsWith("Error:") || processing.startsWith("No API") || processing.startsWith("Connection") ? processing : <>&quot;{processing}&quot;</>}</span>
        </div>
      )}
    </>
  );
}
