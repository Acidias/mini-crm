"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { matchNavigationCommand, dispatchAICommand } from "@/lib/voice-commands";

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
  const [feedback, setFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 2500);
  }, []);

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

    const route = matchNavigationCommand(text);
    if (route) {
      showFeedback(`Navigating: ${text}`);
      router.push(route);
    } else {
      showFeedback(`AI: ${text}`);
      dispatchAICommand(text);
      router.push("/ai");
    }
  }, [router, showFeedback]);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    recognition.addEventListener("result", handleResult);

    recognition.addEventListener("end", () => {
      // Auto-restart if still supposed to be listening (handles ~60s timeout)
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started or error - ignore
        }
      }
    });

    recognition.addEventListener("error", (e: Event) => {
      const error = e as unknown as { error: string };
      if (error.error === "not-allowed") {
        showFeedback("Mic permission denied");
        setListening(false);
        listeningRef.current = false;
      }
      // "no-speech" and "aborted" are normal during continuous listening
    });

    recognitionRef.current = recognition;
    listeningRef.current = true;
    setListening(true);

    try {
      recognition.start();
    } catch {
      // Already started
    }
  }, [handleResult, showFeedback]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    setTranscript("");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      recognitionRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      listeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* */ }
      }
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  if (!supported) return null;

  return (
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

      {feedback && (
        <p className="mt-1 px-3 text-[10px] text-green-400/80 truncate">
          {feedback}
        </p>
      )}
    </div>
  );
}
