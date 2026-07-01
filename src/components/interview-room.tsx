"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { useRouter } from "next/navigation";

type CallStatus = "idle" | "connecting" | "active" | "ended" | "error";

interface Message {
  role: "assistant" | "user";
  text: string;
  timestamp: Date;
}

export default function InterviewRoom({
  sessionId,
  assistantId,
  interviewerName = "Alex",
}: {
  sessionId: string;
  assistantId: string;
  interviewerName?: string;
}) {
  const router = useRouter();
  const vapiRef = useRef<InstanceType<typeof Vapi> | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isEndingRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (status === "active") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const endSessionOnServer = useCallback(async () => {
    try {
      await fetch(`/api/sessions/${sessionId}/end`, { method: "POST" });
    } catch (err) {
      console.error("Failed to end session on server:", err);
    }
  }, [sessionId]);

  const startCall = useCallback(async () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }

    setStatus("connecting");
    setError("");
    isEndingRef.current = false;

    const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);
    vapiRef.current = vapi;

    vapi.on("call-start", async () => {
      setStatus("active");
    });

    vapi.on("call-end", () => {
      setStatus("ended");
    });

    vapi.on("speech-start", () => setIsSpeaking(true));
    vapi.on("speech-end", () => setIsSpeaking(false));

    vapi.on("volume-level", (level: number) => {
      setVolumeLevel(level);
    });

    vapi.on("message", (msg: { type: string; role?: string; transcript?: string; transcriptType?: string }) => {
      if (msg.type === "transcript" && msg.role && msg.transcript && msg.transcriptType === "final") {
        setMessages((prev) => [
          ...prev,
          {
            role: msg.role as "assistant" | "user",
            text: msg.transcript!,
            timestamp: new Date(),
          },
        ]);
      }
    });

    vapi.on("error", (err: unknown) => {
      console.error("Vapi error:", err);
      const errObj = err as { error?: { error?: { type?: string; msg?: string } }; message?: string };
      const errType = errObj?.error?.error?.type;
      const errMsg = errObj?.error?.error?.msg || errObj?.message || "";
      if (errType === "ejected" || errMsg.includes("Meeting has ended")) {
        setStatus("ended");
        return;
      }
      setError(typeof errMsg === "string" ? errMsg : "Connection error");
      setStatus("error");
    });

    try {
      await vapi.start(assistantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start call");
      setStatus("error");
    }
  }, [assistantId]);

  const endCall = useCallback(async () => {
    if (isEndingRef.current) return; 
    isEndingRef.current = true;

    setIsSpeaking(false);

    try {
      vapiRef.current?.stop();
    } catch (err) {
      console.error("Error stopping Vapi call:", err);
    }
    vapiRef.current = null;

    setStatus("ended");

    setTimeout(() => {
      endSessionOnServer();
    }, 2000);
  }, [endSessionOnServer]);

  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    startCall();
    return () => {
      vapiRef.current?.stop();
      vapiRef.current = null;
    };
  }, []); 

  useEffect(() => {
    if (status !== "ended") return;

    let attempts = 0;
    const maxAttempts = 20; // ~60 seconds max wait

    const pollForFeedback = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          const s = data.session;
          if ((s.status === "ended" && s.overall_score) || attempts >= maxAttempts) {
            router.push(`/sessions/${sessionId}`);
            return;
          }
        }
      } catch {
      }

      if (attempts < maxAttempts) {
        setTimeout(pollForFeedback, 3000);
      } else {
        router.push(`/sessions/${sessionId}`);
      }
    };

    const timeout = setTimeout(pollForFeedback, 3000);
    return () => clearTimeout(timeout);
  }, [status, sessionId, router]);

  const numBars = 24;
  const waveformBars = Array.from({ length: numBars }, (_, i) => {
    if (!isSpeaking && status !== "connecting") return 0.08;
    const time = Date.now() / 200;
    const wave = Math.sin((i / numBars) * Math.PI * 4 + time) * 0.5 + 0.5;
    const intensity = status === "connecting" ? 0.15 : volumeLevel;
    return Math.max(0.08, wave * intensity);
  });

  return (
    <div className="min-h-screen bg-[#FAF6F1] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#E8E0D6] px-6 py-4 flex items-center justify-between bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              status === "active"
                ? "bg-green-500 shadow-lg shadow-green-400/30"
                : status === "connecting"
                ? "bg-amber-400 animate-pulse"
                : status === "ended"
                ? "bg-[#9CA3AF]"
                : "bg-red-400"
            }`}
          />
          <span className="text-sm text-[#1A1A1A] font-medium">
            {status === "connecting"
              ? "Connecting..."
              : status === "active"
              ? `Live — ${formatDuration(duration)}`
              : status === "ended"
              ? "Interview ended"
              : status === "error"
              ? "Connection error"
              : "Starting..."}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {status === "active" && (
            <button
              onClick={endCall}
              className="inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
              End interview
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between py-12 px-6">
        <div className="flex flex-col items-center gap-8 flex-1 justify-center">
          <div className="relative w-48 h-48 flex items-center justify-center animate-scale-in">
            {isSpeaking && (
              <>
                <div className="absolute inset-0 rounded-full bg-[#C5943A]/5 animate-pulse-ring" />
                <div className="absolute -inset-4 rounded-full bg-[#C5943A]/3 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
              </>
            )}

            {/* Waveform ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {waveformBars.map((intensity, i) => {
                  const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
                  const innerRadius = 60;
                  const barLength = 15 + intensity * 25;
                  const x1 = 100 + Math.cos(angle) * innerRadius;
                  const y1 = 100 + Math.sin(angle) * innerRadius;
                  const x2 = 100 + Math.cos(angle) * (innerRadius + barLength);
                  const y2 = 100 + Math.sin(angle) * (innerRadius + barLength);
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isSpeaking ? "#C5943A" : "#D1C9BD"}
                      strokeWidth="3"
                      strokeLinecap="round"
                      style={{
                        transition: "all 0.1s ease",
                        opacity: isSpeaking ? 0.6 + intensity * 0.4 : 0.3,
                      }}
                    />
                  );
                })}
              </svg>
            </div>

            <div
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                isSpeaking
                  ? "bg-[#FDF3E1] border-2 border-[#C5943A]/40 shadow-lg shadow-[#C5943A]/10"
                  : status === "connecting"
                  ? "bg-white border-2 border-[#E8E0D6]"
                  : "bg-white border-2 border-[#E8E0D6]"
              }`}
            >
              {status === "connecting" ? (
                <svg className="animate-spin h-8 w-8 text-[#C5943A]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className={`transition-colors ${isSpeaking ? "text-[#C5943A]" : "text-[#9CA3AF]"}`}>
                  <path d="M12 2C10.3431 2 9 3.34315 9 5V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V5C15 3.34315 13.6569 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 19V22M12 22H9M12 22H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>

          <div className="text-center">
            <p className="text-[#1A1A1A] font-medium text-lg">
              {status === "connecting"
                ? "Starting your session..."
                : status === "active"
                ? isSpeaking
                  ? `${interviewerName} is speaking...`
                  : "Your turn to speak"
                : status === "ended"
                ? "Generating your feedback report..."
                : ""}
            </p>
            {status === "active" && !isSpeaking && (
              <p className="text-[#9CA3AF] text-sm mt-2 animate-fade-in">
                Speak naturally. The AI is listening.
              </p>
            )}
            {status === "ended" && (
              <p className="text-[#9CA3AF] text-sm mt-2 animate-fade-in">
                Please wait while we analyze your interview...
              </p>
            )}
          </div>

          {error && (
            <div className="glass rounded-2xl px-6 py-5 text-center max-w-sm border-red-200 animate-fade-in">
              <p className="text-red-500 text-sm mb-3">{error}</p>
              <button
                onClick={startCall}
                className="text-sm text-[#C5943A] hover:text-[#B8860B] transition-colors font-medium"
              >
                Try again →
              </button>
            </div>
          )}

          {status === "ended" && (
            <div className="glass rounded-2xl px-8 py-7 text-center max-w-sm animate-scale-in">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
                <svg className="animate-spin h-5 w-5 text-[#C5943A]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
              <p className="text-[#1A1A1A] font-medium mb-1">Interview complete</p>
              <p className="text-[#9CA3AF] text-sm">
                Generating your feedback report...
              </p>
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div className="w-full max-w-2xl mt-10">
            <p className="text-xs text-[#9CA3AF] uppercase tracking-widest mb-4 font-medium">
              Live transcript
            </p>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 animate-fade-in ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className="shrink-0 mt-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                        msg.role === "assistant"
                          ? "bg-[#FDF3E1] text-[#C5943A] border border-[#E8E0D6]"
                          : "bg-[#F5EFE8] text-[#6B7280] border border-[#E8E0D6]"
                      }`}
                    >
                      {msg.role === "assistant" ? interviewerName[0] : "You"}
                    </div>
                  </div>
                  <div
                    className={`text-sm leading-relaxed px-4 py-2.5 rounded-2xl max-w-[80%] ${
                      msg.role === "assistant"
                        ? "bg-white text-[#1A1A1A] border border-[#E8E0D6] rounded-tl-md"
                        : "bg-[#FDF3E1] text-[#1A1A1A] border border-[#E8E0D6] rounded-tr-md"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
