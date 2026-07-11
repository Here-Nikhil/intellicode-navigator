import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/disha/app-shell";
import { useStore, type Phase } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatBubble, ConfidenceRing, TechBadge } from "@/components/disha/chat-pieces";
import { ArrowUp, Mic, Sparkles } from "lucide-react";
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
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit(value);
            }
          }}
          placeholder="Describe your project idea, stack preferences, or paste your requirements..."
          className="min-h-[100px] resize-none border-0 bg-transparent px-3 py-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <div className="flex items-center justify-between px-1 pt-2">
          <span className="text-[11px] text-muted-foreground">⌘ + Enter to send</span>
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [workspace.messages.length]);

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-w-0">
      {/* Chat 2/3 */}
      <div className="flex min-w-0 flex-1 flex-col lg:flex-[2]">
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {workspace.messages.map((m) => (
              <ChatBubble key={m.id} message={m} onGeneratePrompt={onGeneratePrompt} />
            ))}
          </div>
        </div>
        <div className="border-t border-border p-4 md:px-8">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-border bg-card p-2">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Disha about your architecture..."
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
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
