import { create } from "zustand";

export type Platform =
  | "Claude Code"
  | "Cursor"
  | "Lovable"
  | "Replit"
  | "Windsurf"
  | "Bolt";

export type ToolCategory =
  | "IDE"
  | "Deployment"
  | "Database"
  | "Frontend"
  | "Backend";

export type Phase =
  | "Requirements"
  | "Architecture"
  | "Tool Selection"
  | "Prompt Generation";

export type MessageKind = "text" | "tool" | "consensus";

export type ChatMessage = {
  id: string;
  author: "user" | "disha";
  kind: MessageKind;
  content: string;
  tool?: {
    name: string;
    description: string;
    paid: boolean;
    category: ToolCategory;
  };
  consensus?: {
    options: { model: string; recommendation: string }[];
    finalIndex: number;
    summary: string;
  };
  createdAt: number;
};

export type Prompt = {
  id: string;
  title: string;
  platform: Platform;
  body: string;
  createdAt: number;
};

export type Workspace = {
  id: string;
  name: string;
  activity: "active" | "idle" | "archived";
  techStack: string[];
  phase: Phase;
  confidence: number;
  messages: ChatMessage[];
  prompts: Prompt[];
  defaultModel: string;
};

export type Tool = {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  paid: boolean;
  url: string;
  pending?: boolean;
};

export type ApiProvider = "OpenAI" | "Anthropic" | "Google" | "OpenRouter";
export type ApiKeyStatus = "unset" | "valid" | "invalid";

type State = {
  user: { name: string; email: string; role: "admin" | "user"; provider: string };
  workspaces: Workspace[];
  activeWorkspaceId: string;
  tools: Tool[];
  apiKeys: Record<ApiProvider, { value: string; status: ApiKeyStatus }>;
  useAccountKeys: boolean;

  createWorkspace: (name?: string) => string;
  setActiveWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;
  setDefaultModel: (id: string, model: string) => void;
  sendMessage: (workspaceId: string, text: string) => void;
  addPrompt: (workspaceId: string, prompt: Omit<Prompt, "id" | "createdAt">) => void;
  saveApiKey: (provider: ApiProvider, value: string) => void;
  setUseAccountKeys: (v: boolean) => void;
  updateUserName: (name: string) => void;
};

// Deterministic ID sequence so SSR and client hydration match.
let _uidCounter = 0;
const uid = () => `id${(++_uidCounter).toString(36)}`;
// Fixed base for seed timestamps (so SSR/client match); real actions still use Date.now().
const BASE_TS = 1735689600000;

const seedTools: Tool[] = [
  { id: uid(), name: "Cursor", category: "IDE", description: "AI-first code editor with deep repo understanding.", paid: true, url: "#" },
  { id: uid(), name: "Claude Code", category: "IDE", description: "Terminal-native coding agent by Anthropic.", paid: true, url: "#" },
  { id: uid(), name: "Windsurf", category: "IDE", description: "Agentic IDE with cascading edits across the codebase.", paid: false, url: "#" },
  { id: uid(), name: "Vercel", category: "Deployment", description: "Zero-config deployment for frontend frameworks.", paid: false, url: "#" },
  { id: uid(), name: "Fly.io", category: "Deployment", description: "Run full-stack apps close to your users worldwide.", paid: true, url: "#" },
  { id: uid(), name: "Cloudflare Workers", category: "Deployment", description: "Serverless edge functions on 300+ POPs.", paid: false, url: "#" },
  { id: uid(), name: "Supabase", category: "Database", description: "Postgres, auth, storage, realtime in one platform.", paid: false, url: "#" },
  { id: uid(), name: "Neon", category: "Database", description: "Serverless Postgres with branching.", paid: false, url: "#" },
  { id: uid(), name: "PlanetScale", category: "Database", description: "MySQL with schema branching and horizontal scale.", paid: true, url: "#" },
  { id: uid(), name: "Next.js", category: "Frontend", description: "React framework with SSR, RSC, and file routing.", paid: false, url: "#" },
  { id: uid(), name: "TanStack Start", category: "Frontend", description: "Full-stack React with typed routing and server fns.", paid: false, url: "#" },
  { id: uid(), name: "Astro", category: "Frontend", description: "Content-focused framework with islands architecture.", paid: false, url: "#" },
  { id: uid(), name: "Hono", category: "Backend", description: "Ultrafast web framework for edges and Node.", paid: false, url: "#" },
  { id: uid(), name: "tRPC", category: "Backend", description: "End-to-end typesafe APIs without codegen.", paid: false, url: "#" },
  { id: uid(), name: "Inngest", category: "Backend", description: "Durable event-driven workflows and background jobs.", paid: true, url: "#" },
  { id: uid(), name: "Resend", category: "Backend", description: "Modern email API for developers.", paid: true, url: "#" },
  { id: uid(), name: "Convex", category: "Database", description: "Reactive database with typed queries and mutations.", paid: true, url: "#", pending: true },
  { id: uid(), name: "Zed", category: "IDE", description: "High-performance collaborative editor with AI.", paid: false, url: "#", pending: true },
];

function seedWorkspaceA(): Workspace {
  const now = BASE_TS;
  return {
    id: uid(),
    name: "SaaS Analytics Platform",
    activity: "active",
    techStack: ["TanStack Start", "Postgres", "Supabase", "Tailwind"],
    phase: "Architecture",
    confidence: 82,
    defaultModel: "claude-3.5-sonnet",
    messages: [
      { id: uid(), author: "user", kind: "text", content: "I'm building a multi-tenant SaaS dashboard for product analytics. Need auth, orgs, and time-series data.", createdAt: now - 600000 },
      { id: uid(), author: "disha", kind: "text", content: "Great — for multi-tenant SaaS with time-series analytics, I'd lead with Supabase for auth + Postgres, and add TimescaleDB extension for the analytics tables. Row-level security handles tenant isolation cleanly.", createdAt: now - 590000 },
      { id: uid(), author: "disha", kind: "tool", content: "Recommended tool for auth and data layer:", tool: { name: "Supabase", description: "Postgres + auth + RLS + realtime in one platform. Perfect for multi-tenant SaaS.", paid: false, category: "Database" }, createdAt: now - 580000 },
      { id: uid(), author: "user", kind: "text", content: "What about the deployment story?", createdAt: now - 500000 },
      { id: uid(), author: "disha", kind: "consensus", content: "I polled three models on the deployment choice:", consensus: {
        options: [
          { model: "GPT-4o", recommendation: "Vercel — fastest DX for Next-adjacent stacks." },
          { model: "Claude 3.5", recommendation: "Cloudflare Workers — global edge, cheap at scale." },
          { model: "Gemini 1.5", recommendation: "Fly.io — regional Postgres proximity." },
        ],
        finalIndex: 1,
        summary: "Cloudflare Workers wins on cost-at-scale and global latency, and TanStack Start deploys cleanly to it.",
      }, createdAt: now - 490000 },
    ],
    prompts: [
      { id: uid(), title: "Supabase multi-tenant schema", platform: "Claude Code", body: "Design a Supabase schema for a multi-tenant SaaS with organizations, memberships, and RLS policies isolating tenant data. Include tables for orgs, users, memberships (with role enum), and an events table partitioned by org_id. Add policies so every SELECT/INSERT/UPDATE is scoped via auth.uid() → membership → org_id...", createdAt: now - 400000 },
      { id: uid(), title: "TanStack Start + CF Workers deploy", platform: "Cursor", body: "Configure a TanStack Start app to deploy to Cloudflare Workers with edge-compatible bindings. Wire up wrangler.toml, set nodejs_compat, add a Hyperdrive binding for Postgres, and update the SSR entry so server functions read env from the Worker runtime instead of process.env at module scope...", createdAt: now - 300000 },
      { id: uid(), title: "Analytics dashboard shell UI", platform: "Lovable", body: "Build a responsive analytics dashboard shell with a collapsible sidebar, top KPI cards, a time-series chart (recharts), and a data table with sorting and pagination. Use shadcn/ui, dark mode only, and mock the data with a typed hook so the chart and table stay in sync...", createdAt: now - 200000 },
      { id: uid(), title: "Time-series ingestion worker", platform: "Bolt", body: "Scaffold a Cloudflare Worker that receives batched analytics events over POST /ingest, validates them with Zod, and writes to a Timescale hypertable via a pooled Postgres connection. Include HMAC signature verification, per-tenant rate limiting with Durable Objects, and a dead-letter queue for failed batches...", createdAt: now - 100000 },
    ],
  };
}

function seedWorkspaceB(): Workspace {
  const now = BASE_TS;
  return {
    id: uid(),
    name: "Fitness Tracker Mobile",
    activity: "idle",
    techStack: ["React Native", "Expo", "SQLite"],
    phase: "Requirements",
    confidence: 41,
    defaultModel: "gpt-4o",
    messages: [
      { id: uid(), author: "user", kind: "text", content: "Cross-platform fitness app, offline-first, syncs to cloud when online.", createdAt: now - 200000 },
      { id: uid(), author: "disha", kind: "text", content: "Offline-first is the right instinct. Let's nail down: (1) which workouts you'll track, (2) sync conflict strategy, (3) whether wearables integration is v1 or v2.", createdAt: now - 190000 },
    ],
    prompts: [],
  };
}

function seedWorkspaceC(): Workspace {
  return {
    id: uid(),
    name: "Internal Design Ops Tool",
    activity: "archived",
    techStack: ["Astro", "SQLite"],
    phase: "Prompt Generation",
    confidence: 96,
    defaultModel: "claude-3.5-sonnet",
    messages: [],
    prompts: [
      { id: uid(), title: "Astro content collections setup", platform: "Lovable", body: "Set up Astro content collections for a design system documentation site with MDX and typed frontmatter...", createdAt: BASE_TS - 1000000 },
    ],
  };
}

const wsA = seedWorkspaceA();
const wsB = seedWorkspaceB();
const wsC = seedWorkspaceC();

function mockDishaReply(userText: string, replyIndex: number): ChatMessage {
  const kind: MessageKind = ["text", "tool", "consensus"][replyIndex % 3] as MessageKind;
  const now = BASE_TS;
  if (kind === "tool") {
    return {
      id: uid(),
      author: "disha",
      kind: "tool",
      content: "Based on that, here's a tool worth considering:",
      tool: { name: "Neon", description: "Serverless Postgres with instant branching — great for preview environments.", paid: false, category: "Database" },
      createdAt: now,
    };
  }
  if (kind === "consensus") {
    return {
      id: uid(),
      author: "disha",
      kind: "consensus",
      content: "I checked this against multiple models:",
      consensus: {
        options: [
          { model: "GPT-4o", recommendation: "Use REST + polling for simplicity." },
          { model: "Claude 3.5", recommendation: "Use tRPC subscriptions over WebSockets." },
          { model: "Gemini 1.5", recommendation: "Use Server-Sent Events for one-way updates." },
        ],
        finalIndex: 1,
        summary: "tRPC subscriptions match your typed stack and scale to your requirements.",
      },
      createdAt: now,
    };
  }
  return {
    id: uid(),
    author: "disha",
    kind: "text",
    content: `Good question. Given "${userText.slice(0, 60)}${userText.length > 60 ? "…" : ""}", I'd start by defining the data boundaries and access patterns before locking in specific tools. Want me to draft an initial architecture doc?`,
    createdAt: now,
  };
}

export const useStore = create<State>((set, get) => ({
  user: { name: "Aarav Sharma", email: "aarav@disha.dev", role: "admin", provider: "GitHub" },
  workspaces: [wsA, wsB, wsC],
  activeWorkspaceId: wsA.id,
  tools: seedTools,
  apiKeys: {
    OpenAI: { value: "", status: "unset" },
    Anthropic: { value: "", status: "unset" },
    Google: { value: "", status: "unset" },
    OpenRouter: { value: "", status: "unset" },
  },
  useAccountKeys: true,

  createWorkspace: (name) => {
    const id = uid();
    const ws: Workspace = {
      id,
      name: name || "Untitled workspace",
      activity: "active",
      techStack: [],
      phase: "Requirements",
      confidence: 0,
      messages: [],
      prompts: [],
      defaultModel: "claude-3.5-sonnet",
    };
    set((s) => ({ workspaces: [ws, ...s.workspaces], activeWorkspaceId: id }));
    return id;
  },

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

  renameWorkspace: (id, name) =>
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name } : w)),
    })),

  deleteWorkspace: (id) =>
    set((s) => {
      const remaining = s.workspaces.filter((w) => w.id !== id);
      return {
        workspaces: remaining,
        activeWorkspaceId:
          s.activeWorkspaceId === id ? remaining[0]?.id ?? "" : s.activeWorkspaceId,
      };
    }),

  setDefaultModel: (id, model) =>
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, defaultModel: model } : w)),
    })),

  sendMessage: (workspaceId, text) => {
    const ws = get().workspaces.find((w) => w.id === workspaceId);
    if (!ws) return;
    const userMsg: ChatMessage = {
      id: uid(),
      author: "user",
      kind: "text",
      content: text,
      createdAt: Date.now(),
    };
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              messages: [...w.messages, userMsg],
              confidence: Math.min(100, w.confidence + 6),
              phase: w.messages.length < 2 ? "Architecture" : w.phase,
            }
          : w,
      ),
    }));
    setTimeout(() => {
      const reply = mockDishaReply(text, ws.messages.length + 1);
      set((s) => ({
        workspaces: s.workspaces.map((w) =>
          w.id === workspaceId ? { ...w, messages: [...w.messages, reply] } : w,
        ),
      }));
    }, 700);
  },

  addPrompt: (workspaceId, prompt) => {
    const full: Prompt = { ...prompt, id: uid(), createdAt: Date.now() };
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === workspaceId ? { ...w, prompts: [full, ...w.prompts] } : w,
      ),
    }));
  },

  saveApiKey: (provider, value) => {
    const status: ApiKeyStatus =
      value.length === 0 ? "unset" : value.startsWith("sk-") || value.length > 20 ? "valid" : "invalid";
    set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: { value, status } } }));
  },

  setUseAccountKeys: (v) => set({ useAccountKeys: v }),

  updateUserName: (name) => set((s) => ({ user: { ...s.user, name } })),
}));

export function useActiveWorkspace() {
  return useStore((s) => s.workspaces.find((w) => w.id === s.activeWorkspaceId));
}
