import { useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { useNavigate, useParams } from "react-router-dom";
import { Mic, MicOff, PhoneOff, Loader2, Radio } from "lucide-react";
import { BackendUrl } from "./lib/config";
import { Button } from "@/components/ui/button";

const LIVE_MODEL = "gemini-3.1-flash-live-preview";

type Speaker = "idle" | "ai" | "user" | "connecting";

function VoiceVisualizer({ speaker }: { speaker: Speaker }) {
  const isAi = speaker === "ai";
  const isUser = speaker === "user";

  return (
    <div className="relative flex h-[460px] w-full items-center justify-center overflow-hidden rounded-[2rem] border border-stone-700/50 bg-stone-900/80 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.12),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(244,63,94,0.1),transparent_50%)]" />

      <div
        className={`absolute h-80 w-80 rounded-full blur-3xl transition-all duration-700 ${
          isAi ? "scale-125 bg-amber-500/30 animate-pulse" : isUser ? "scale-110 bg-rose-500/25 animate-pulse" : "scale-90 bg-stone-700/20"
        }`}
      />
      <div
        className={`absolute h-56 w-56 rounded-full blur-2xl transition-all duration-700 ${
          isAi ? "-translate-x-10 bg-orange-400/20 animate-[spin_10s_linear_infinite]" : isUser ? "translate-x-10 bg-rose-400/20 animate-[spin_8s_linear_infinite_reverse]" : ""
        }`}
      />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div
          className={`relative flex h-48 w-48 items-center justify-center rounded-full border transition-all duration-500 ${
            isAi
              ? "border-amber-400/50 bg-amber-500/10 shadow-[0_0_80px_rgba(251,191,36,0.35)]"
              : isUser
                ? "border-rose-400/50 bg-rose-500/10 shadow-[0_0_80px_rgba(244,63,94,0.3)]"
                : speaker === "connecting"
                  ? "border-stone-500/40 bg-stone-800/50"
                  : "border-stone-600/40 bg-stone-800/30"
          }`}
        >
          {(isAi || isUser) && (
            <span
              className={`absolute -inset-3 rounded-full border animate-ping ${
                isAi ? "border-amber-400/30" : "border-rose-400/30"
              }`}
            />
          )}

          {speaker === "connecting" ? (
            <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
          ) : isAi ? (
            <div className="flex items-end gap-1.5">
              {[14, 22, 30, 22, 14].map((h, i) => (
                <span
                  key={i}
                  className="w-2 rounded-full bg-amber-300 animate-[bounce_0.7s_ease-in-out_infinite]"
                  style={{ height: h, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          ) : isUser ? (
            <Mic className="h-12 w-12 text-rose-300 animate-pulse" />
          ) : (
            <Radio className="h-10 w-10 text-stone-500" />
          )}
        </div>

        <div className="text-center">
          <p className={`text-xl font-semibold ${isAi ? "text-amber-300" : isUser ? "text-rose-300" : speaker === "connecting" ? "text-amber-400" : "text-stone-400"}`}>
            {speaker === "connecting" && "Connecting..."}
            {speaker === "ai" && "AI Interviewer Speaking"}
            {speaker === "user" && "You are Speaking"}
            {speaker === "idle" && "Listening..."}
          </p>
          <p className="mt-2 text-sm text-stone-500">
            {isAi ? "Please wait until the AI finishes" : isUser ? "Answer clearly and completely" : "Voice-only interview session"}
          </p>
        </div>
      </div>
    </div>
  );
}

export const Interview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const sessionRef = useRef<{ close: () => void; sendRealtimeInput: (input: object) => void } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const micActiveRef = useRef(true);
  const aiSpeakingRef = useRef(false);
  const connectionIdRef = useRef(0);
  const endingRef = useRef(false);
  const speakerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<"ready" | "connecting" | "live" | "ending" | "error">("ready");
  const [speaker, setSpeaker] = useState<Speaker>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [micActive, setMicActive] = useState(true);

  function setActiveSpeaker(next: Speaker) {
    setSpeaker(next);
    if (speakerTimeoutRef.current) clearTimeout(speakerTimeoutRef.current);
    if (next === "ai" || next === "user") {
      speakerTimeoutRef.current = setTimeout(() => {
        if (!aiSpeakingRef.current) setSpeaker("idle");
      }, 2000);
    }
  }

  async function ensureAudioContext() {
    let audioContext = audioContextRef.current;
    if (!audioContext) {
      audioContext = new AudioContext({ sampleRate: 24000 });
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1;
      gainNode.connect(audioContext.destination);
      audioContextRef.current = audioContext;
      gainNodeRef.current = gainNode;
    }
    if (audioContext.state === "suspended") await audioContext.resume();
    return audioContext;
  }

  function stopAllAudio() {
    scheduledSourcesRef.current.forEach((source) => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    scheduledSourcesRef.current = [];
    const ctx = audioContextRef.current;
    nextPlayTimeRef.current = ctx ? ctx.currentTime : 0;
    aiSpeakingRef.current = false;
  }

  function playPCM16(audioData: string) {
    const audioContext = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    if (!audioContext || !gainNode) return;

    aiSpeakingRef.current = true;
    setActiveSpeaker("ai");

    const binary = atob(audioData);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pcm16 = new Int16Array(bytes.buffer);
    const audioBuffer = audioContext.createBuffer(1, pcm16.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i++) channelData[i] = pcm16[i] / 32768;

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode);

    const startTime = Math.max(audioContext.currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;

    scheduledSourcesRef.current.push(source);
    source.onended = () => {
      scheduledSourcesRef.current = scheduledSourcesRef.current.filter((s) => s !== source);
      if (scheduledSourcesRef.current.length === 0) {
        aiSpeakingRef.current = false;
        setSpeaker("idle");
      }
    };
  }

  async function saveConversation(message: string, type: "USER" | "ASSISTANT") {
    if (!id) return;
    await fetch(`${BackendUrl}/api/v1/conversation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interviewId: id, message, type }),
    });
  }

  async function startMicrophone(session: { sendRealtimeInput: (input: object) => void }) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    mediaStreamRef.current = stream;

    const micContext = new AudioContext({ sampleRate: 16000 });
    micContextRef.current = micContext;
    if (micContext.state === "suspended") await micContext.resume();

    const source = micContext.createMediaStreamSource(stream);
    const processor = micContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      if (!micActiveRef.current || aiSpeakingRef.current) return;

      const input = event.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(input.length);
      let hasSound = false;

      for (let i = 0; i < input.length; i++) {
        const sample = Math.max(-1, Math.min(1, input[i]));
        if (Math.abs(sample) > 0.04) hasSound = true;
        pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }

      if (hasSound) setActiveSpeaker("user");

      const bytes = new Uint8Array(pcm16.buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

      session.sendRealtimeInput({
        audio: { data: btoa(binary), mimeType: "audio/pcm;rate=16000" },
      });
    };

    const gain = micContext.createGain();
    gain.gain.value = 0;
    source.connect(processor);
    processor.connect(gain);
    gain.connect(micContext.destination);
  }

  function cleanupSession() {
    if (speakerTimeoutRef.current) clearTimeout(speakerTimeoutRef.current);
    stopAllAudio();
    sessionRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    processorRef.current?.disconnect();
    micContextRef.current?.close();
    audioContextRef.current?.close();
    sessionRef.current = null;
    mediaStreamRef.current = null;
    processorRef.current = null;
    micContextRef.current = null;
    audioContextRef.current = null;
    gainNodeRef.current = null;
  }

  async function endInterview() {
    if (!id || status === "ending") return;
    setStatus("ending");
    endingRef.current = true;
    connectionIdRef.current += 1;
    cleanupSession();

    try {
      await fetch(`${BackendUrl}/api/v1/interview/${id}/complete`, { method: "POST" });
      navigate(`/result/${id}`);
    } catch {
      setError("Failed to complete interview. Please try again.");
      setStatus("error");
    }
  }

  function toggleMic() {
    setMicActive((prev) => {
      micActiveRef.current = !prev;
      return !prev;
    });
  }

  useEffect(() => {
    if (status !== "live") return;
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => () => {
    connectionIdRef.current += 1;
    cleanupSession();
  }, []);

  async function startInterview() {
    if (!id || status === "connecting" || status === "live" || status === "ending") return;

    const connectionId = ++connectionIdRef.current;
    let sessionOpened = false;

    try {
      setStatus("connecting");
      setSpeaker("connecting");
      setError(null);
      stopAllAudio();
      await ensureAudioContext();

      const interviewResponse = await fetch(`${BackendUrl}/api/v1/interview/${id}`);
      if (!interviewResponse.ok) throw new Error("Failed to fetch interview");
      if (connectionId !== connectionIdRef.current) return;

      await fetch(`${BackendUrl}/api/v1/interview/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PROGRESS" }),
      });

      const interview = await interviewResponse.json();
      const tokenResponse = await fetch(`${BackendUrl}/api/v1/gemini-token`);
      if (!tokenResponse.ok) throw new Error("Failed to get Gemini token");
      if (connectionId !== connectionIdRef.current) return;

      const { token } = await tokenResponse.json();
      const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });

      const session = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: {
            parts: [{
              text: `You are a professional technical interviewer. Speak clearly, one question at a time.
Introduce yourself, ask candidate to introduce themselves, then ask technical questions based on GitHub profile.
GitHub context: ${JSON.stringify(interview.githubMetaData)}`,
            }],
          },
        },
        callbacks: {
          onopen: () => {
            if (connectionId !== connectionIdRef.current) return;
            sessionOpened = true;
            setStatus("live");
            setSpeaker("idle");
          },
          onmessage: async (message) => {
            if (connectionId !== connectionIdRef.current) return;
            const content = message.serverContent;

            if (content?.interrupted) stopAllAudio();

            if (content?.inputTranscription?.text) {
              setActiveSpeaker("user");
              await saveConversation(content.inputTranscription.text, "USER");
            }

            if (content?.outputTranscription?.text) {
              setActiveSpeaker("ai");
              await saveConversation(content.outputTranscription.text, "ASSISTANT");
            }

            if (content?.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.inlineData?.data) playPCM16(part.inlineData.data);
              }
            }
          },
          onerror: (err) => {
            if (connectionId !== connectionIdRef.current) return;
            console.error("Gemini error:", err);
            setError("Connection error. Please try again.");
            setStatus("error");
          },
          onclose: (event) => {
            if (connectionId !== connectionIdRef.current) return;
            if (sessionOpened && !endingRef.current) {
              setError(`Session ended. ${event?.reason || ""}`.trim());
              setStatus("error");
            }
          },
        },
      });

      if (connectionId !== connectionIdRef.current) {
        session.close();
        return;
      }

      sessionRef.current = session;
      session.sendRealtimeInput({
        text: "Begin the interview. Introduce yourself as an AI interviewer and ask the candidate to introduce themselves.",
      });
      await startMicrophone(session);
    } catch (err) {
      if (connectionId !== connectionIdRef.current) return;
      console.error("Gemini connection failed:", err);
      setError("Could not start interview. Allow microphone and try again.");
      setStatus("error");
      setSpeaker("idle");
    }
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.06),transparent_60%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-amber-500/80">Intervona</p>
            <h1 className="mt-1 text-2xl font-bold text-stone-100">Live Interview</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1 font-mono text-sm text-stone-300">
              {formatTime(elapsed)}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === "live" ? "bg-emerald-500/15 text-emerald-400" :
              status === "connecting" ? "bg-amber-500/15 text-amber-400" :
              status === "ready" ? "bg-stone-700/50 text-stone-400" :
              "bg-red-500/15 text-red-400"
            }`}>
              {status === "ready" && "Ready"}
              {status === "connecting" && "Connecting"}
              {status === "live" && "● Live"}
              {status === "ending" && "Evaluating"}
              {status === "error" && "Error"}
            </span>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        <VoiceVisualizer speaker={status === "connecting" ? "connecting" : status === "ready" ? "idle" : speaker} />

        <div className="flex flex-wrap justify-center gap-3">
          {(status === "ready" || status === "error") && (
            <Button
              className="bg-amber-500 text-stone-950 hover:bg-amber-400"
              onClick={() => { endingRef.current = false; setError(null); startInterview(); }}
            >
              <Mic className="h-4 w-4" />
              {status === "error" ? "Retry" : "Start Interview"}
            </Button>
          )}
          {status === "connecting" && (
            <Button disabled className="bg-amber-500/40 text-stone-950">
              <Loader2 className="h-4 w-4 animate-spin" /> Connecting...
            </Button>
          )}
          <Button
            variant="outline"
            className="border-stone-600 bg-stone-900 text-stone-200 hover:bg-stone-800"
            onClick={toggleMic}
            disabled={status !== "live"}
          >
            {micActive ? <><Mic className="h-4 w-4" /> Mute</> : <><MicOff className="h-4 w-4" /> Unmute</>}
          </Button>
          <Button
            variant="destructive"
            className="bg-rose-600 hover:bg-rose-500"
            onClick={endInterview}
            disabled={status === "ending" || status === "connecting"}
          >
            {status === "ending" ? <><Loader2 className="h-4 w-4 animate-spin" /> Evaluating</> : <><PhoneOff className="h-4 w-4" /> End</>}
          </Button>
        </div>
      </div>
    </div>
  );
};
