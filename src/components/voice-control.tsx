"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { dispatchAICommand, NAVIGATE_EVENT } from "@/lib/voice-commands";

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
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  // Listen for AI-triggered navigation events - clear processing when page changes
  useEffect(() => {
    function handleNavigate(e: Event) {
      const url = (e as CustomEvent<string>).detail;
      if (url) {
        setProcessing(null);
        if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
        router.push(url);
      }
    }
    window.addEventListener(NAVIGATE_EVENT, handleNavigate);
    return () => window.removeEventListener(NAVIGATE_EVENT, handleNavigate);
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
    const personMatch = path.match(/^\/persons\/(\d+)/);
    const companyMatch = path.match(/^\/companies\/(\d+)/);
    if (personMatch) context = `[Currently viewing person ID ${personMatch[1]}] `;
    else if (companyMatch) context = `[Currently viewing company ID ${companyMatch[1]}] `;

    setProcessing(text);
    // Auto-clear after 15s in case the AI finishes without navigating
    if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
    processingTimeoutRef.current = setTimeout(() => setProcessing(null), 15000);

    dispatchAICommand(context + text);
  }, []);

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
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-md animate-in fade-in slide-in-from-top-2">
          <span className="flex gap-1 flex-shrink-0">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
          <span className="text-sm truncate">&quot;{processing}&quot;</span>
        </div>
      )}
    </>
  );
}
