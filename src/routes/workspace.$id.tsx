import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/disha/app-shell";
import { useStore, type Phase } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatBubble, ConfidenceRing, TechBadge } from "@/components/disha/chat-pieces";
import { ArrowUp, Mic, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Workspace — Disha` },
      { name: "description", content: `Architecture planning session ${params.id} in Disha.` },
    ],
  }),
  component: WorkspaceRoute,
  notFoundComponent: () => (
    <AppShell><div className="p-8 text-muted-foreground">Workspace not found.</div></AppShell>
  ),
});

const examplePrompts = [
  "E-commerce platform with React and Node",
  "Mobile app for fitness tracking",
  "SaaS dashboard with multi-tenancy",
];

const phases: Phase[] = ["Requirements", "Architecture", "Tool Selection", "Prompt Generation"];

function WorkspaceRoute() {
  const { id } = Route.useParams();
  const workspace = useStore((s) => s.workspaces.find((w) => w.id === id));
  const setActive = useStore((s) => s.setActiveWorkspace);
  const sendMessage = useStore((s) => s.sendMessage);
  const addPrompt = useStore((s) => s.addPrompt);
  const navigate = useNavigate();

  useEffect(() => {
    if (workspace) setActive(workspace.id);
  }, [workspace, setActive]);

  if (!workspace) {
    return (
      <AppShell>
        <div className="p-8">
          <p className="text-muted-foreground">Workspace not found.</p>
          <Button className="mt-3" onClick={() => navigate({ to: "/" })}>Back to dashboard</Button>
        </div>
      </AppShell>
    );
  }

  const isEmpty = workspace.messages.length === 0;

  return (
    <AppShell
      header={
        <div className="flex items-center gap-2">
          <h1 className="truncate font-display text-base font-semibold">{workspace.name}</h1>
          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {workspace.phase}
          </span>
        </div>
      }
    >
      {isEmpty ? (
        <EmptyState workspaceId={workspace.id} />
      ) : (
        <ChatView
          workspaceId={workspace.id}
          onSend={(t) => sendMessage(workspace.id, t)}
          onGeneratePrompt={(toolName) => {
            addPrompt(workspace.id, {
              title: `${toolName} integration prompt`,
              platform: "Claude Code",
              body: `You are helping integrate ${toolName} into an existing codebase. Start by reading the current architecture, then propose the minimal changes needed to add ${toolName}. Include file diffs, migration steps, and rollback notes.`,
            });
            toast.success(`Prompt added to library for ${toolName}`);
          }}
        />
      )}
    </AppShell>
  );
}

function EmptyState({ workspaceId }: { workspaceId: string }) {
  const [value, setValue] = useState("");
  const sendMessage = useStore((s) => s.sendMessage);
  const renameWorkspace = useStore((s) => s.renameWorkspace);

  const handleSubmit = (text: string) => {
    if (!text.trim()) return;
    renameWorkspace(workspaceId, text.slice(0, 48));
    sendMessage(workspaceId, text.trim());
    setValue("");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-2xl flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
        <Sparkles className="size-6" />
      </div>
      <h1 className="text-center font-display text-4xl font-bold tracking-tight md:text-5xl">
        What are you building?
      </h1>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Describe your idea and Disha will help you map out the architecture, tools, and prompts.
      </p>

      <div className="mt-8 w-full rounded-2xl border border-border bg-card p-3 shadow-[0_0_0_1px_rgba(99,102,241,0.08)]">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(value);
            }
          }}
          placeholder="Describe your project idea, stack preferences, or paste your requirements..."
          className="min-h-[100px] resize-none border-0 bg-transparent px-3 py-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <div className="flex items-center justify-between px-1 pt-2">
          <span className="text-[11px] text-muted-foreground">Enter to send · Shift+Enter for new line</span>
          <Button size="sm" onClick={() => handleSubmit(value)} disabled={!value.trim()}>
            Send <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {examplePrompts.map((p) => (
          <button
            key={p}
            onClick={() => setValue(p)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatView({
  workspaceId,
  onSend,
  onGeneratePrompt,
}: {
  workspaceId: string;
  onSend: (t: string) => void;
  onGeneratePrompt: (toolName: string) => void;
}) {
  const workspace = useStore((s) => s.workspaces.find((w) => w.id === workspaceId))!;
  const [value, setValue] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(16).fill(0.05));
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const groqKey = useStore((s) => s.apiKeys.Groq.value);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [workspace.messages.length, thinking]);

  // Clear thinking when a Disha message arrives.
  const lastMsg = workspace.messages[workspace.messages.length - 1];
  useEffect(() => {
    if (thinking && lastMsg?.author === "disha") setThinking(false);
  }, [lastMsg?.id, thinking]);

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
    setThinking(true);
  };

  const stopVisualizer = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLevels(Array(16).fill(0.05));
  };

  const startVisualizer = (stream: MediaStream) => {
    const AC: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      const a = analyserRef.current;
      if (!a) return;
      a.getByteFrequencyData(data);
      const bars = 16;
      const step = Math.floor(data.length / bars);
      const next: number[] = [];
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j];
        next.push(Math.min(1, sum / step / 180 + 0.05));
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const transcribeWithGroq = async (blob: Blob) => {
    if (!groqKey) {
      toast.error("Add your Groq API key in Settings to enable voice input.");
      return;
    }
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("file", blob, "recording.webm");
      form.append("model", "whisper-large-v3-turbo");
      const resp = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}` },
        body: form,
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      const text = (data.text || "").trim();
      if (text) setValue((prev) => (prev ? `${prev} ${text}` : text));
      else toast.message("No speech detected.");
    } catch (err: any) {
      toast.error("Transcription failed. Check your Groq API key.");
    } finally {
      setTranscribing(false);
    }
  };

  const toggleMic = async () => {
    if (typeof window === "undefined") return;
    if (listening) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Microphone recording isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stopVisualizer();
        setListening(false);
        if (blob.size > 0) await transcribeWithGroq(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      startVisualizer(stream);
      setListening(true);
    } catch {
      toast.error("Microphone permission denied.");
      stopVisualizer();
    }
  };

  useEffect(() => () => stopVisualizer(), []);


  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-w-0">
      {/* Chat 2/3 */}
      <div className="flex min-w-0 flex-1 flex-col lg:flex-[2]">
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {workspace.messages.map((m) => (
              <ChatBubble key={m.id} message={m} onGeneratePrompt={onGeneratePrompt} />
            ))}
            {thinking && <ThinkingIndicator />}
          </div>
        </div>
        <div className="border-t border-border p-4 md:px-8">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-border bg-card p-2">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Ask Disha about your architecture... (Shift+Enter for new line)"
              className="min-h-[40px] max-h-40 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              size="icon"
              variant={listening ? "default" : "ghost"}
              onClick={toggleMic}
              className={cn(listening && "animate-pulse bg-disha text-white hover:bg-disha/90")}
              aria-label={listening ? "Stop recording" : "Start voice input"}
              title={listening ? "Stop recording" : "Voice input"}
            >
              <Mic className="size-4" />
            </Button>
            <Button size="icon" onClick={handleSend} disabled={!value.trim()}>
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Context panel 1/3 */}
      <aside className="hidden w-[340px] shrink-0 flex-col overflow-y-auto border-l border-border bg-background/50 p-6 lg:flex">
        <div className="mb-6">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Project
          </div>
          <div className="font-display text-lg font-semibold">{workspace.name}</div>
        </div>

        <div className="mb-6">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Tech Stack
          </div>
          <div className="flex flex-wrap gap-1.5">
            {workspace.techStack.length > 0 ? (
              workspace.techStack.map((t) => <TechBadge key={t} label={t} />)
            ) : (
              <span className="text-xs text-muted-foreground">Not yet defined</span>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Current Phase
          </div>
          <div className="flex flex-wrap gap-1.5">
            {phases.map((p) => {
              const active = p === workspace.phase;
              return (
                <span
                  key={p}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] font-medium",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {p}
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-2 rounded-xl border border-border bg-card p-5">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Confidence Score
          </div>
          <div className="flex justify-center">
            <ConfidenceRing value={workspace.confidence} />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Increases as Disha learns about your requirements.
          </p>
        </div>
      </aside>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-disha/15 text-disha ring-1 ring-disha/30 animate-pulse">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0 flex-1 border-l-2 border-disha/70 pl-4">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-disha">Disha</div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex gap-1">
            <span className="size-1.5 rounded-full bg-disha animate-bounce [animation-delay:-0.3s]" />
            <span className="size-1.5 rounded-full bg-disha animate-bounce [animation-delay:-0.15s]" />
            <span className="size-1.5 rounded-full bg-disha animate-bounce" />
          </span>
          <span>Disha is thinking...</span>
        </div>
      </div>
    </div>
  );
}
