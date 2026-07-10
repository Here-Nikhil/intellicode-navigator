# Disha — Frontend Build Plan

Building on the existing TanStack Start setup (React 19 + Vite + TanStack Router + shadcn/ui + Tailwind v4). Dark mode only, all in-memory mock data, zero backend.

## Design tokens

Update `src/styles.css` with the locked palette (applied to the `.dark`/`:root` token block, force `dark` class on `<html>`):

- `--background: #0B1020`
- `--card` / `--popover` / `--surface: #151B2E`
- `--primary: #6366F1` (indigo)
- `--accent: #06B6D4` (cyan — status/data only)
- `--disha: #8B5CF6` (violet — Disha message accent)
- `--foreground: #E6E9F2`
- `--muted-foreground: #94A3B8`
- `--border: rgba(230,233,242,0.08)`
- Radius `12px`, subtle borders, no harsh shadows

Fonts loaded via `<link>` in `__root.tsx` head (never `@import` a URL in styles.css): Space Grotesk (headings) + Inter (body). Wire families through `@theme` as `--font-display` / `--font-sans`.

## Routes (file-based, under `src/routes/`)

```text
__root.tsx                → shell: fonts, dark class, meta
_app.tsx                  → layout: sidebar + <Outlet />
_app.index.tsx            → Dashboard (workspace list + new workspace)
_app.workspace.$id.tsx    → Screen 1 (empty state) OR Screen 2 (chat) based on mock state
_app.tools.tsx            → Screen 3 Tool Registry
_app.prompts.tsx          → Screen 4 Prompt Library
_app.settings.tsx         → Screen 5 Settings
```

Each route sets its own `head()` with distinct title/description. Homepage placeholder is removed.

## Global mock state

Single Zustand store at `src/lib/mock-store.ts` (Zustand is lightweight, avoids prop-drilling, survives client navigation). Holds:

- `workspaces[]` — id, name, activityColor, techStack[], phase, confidence, messages[], prompts[]
- `activeWorkspaceId`
- `tools[]` — seeded ~18 mock tools across categories
- `apiKeys{}` — provider → { masked, status }
- `user` — name, email, avatar
- Actions: `createWorkspace`, `switchWorkspace`, `sendMessage` (echoes a mock Disha reply after 600ms), `generatePrompt`, `filterTools`, `saveApiKey` (toggles a fake valid/invalid dot)

## Shared components (`src/components/disha/`)

- `AppSidebar.tsx` — 260px, collapsible on `<md` via shadcn `Sheet`. Logo + node-graph SVG, "New Workspace" button, workspace list with activity dots, nav links (active state from `useRouterState`), user footer.
- `ChatMessage.tsx` — user vs Disha variants; Disha gets `border-l-2` in violet (`--disha`).
- `ToolRecommendationCard.tsx` — name, description, free/paid badge, "View Prompt" button.
- `ConsensusCard.tsx` — 3-column model comparison, highlighted final pick.
- `ConfidenceRing.tsx` — SVG circular progress.
- `ProjectContextPanel.tsx` — right rail for chat screen.
- `TechBadge.tsx`, `CategoryPill.tsx`, `StatusDot.tsx`.

## Screen-by-screen

**Screen 1 — Empty workspace / onboarding.** Centered "What are you building?" heading, large textarea, send button, three example chips. Clicking a chip fills the textarea; submitting seeds the workspace with an initial user message + mock Disha reply and transitions to the chat view (same route, conditional render on `workspace.messages.length`).

**Screen 2 — Chat interface.** 2/3 chat thread + 1/3 Project Context panel. Message input at bottom sends → optimistic user bubble → 600ms later a mock Disha reply (rotates through: plain message, tool recommendation card, consensus card, so all message types are visible). Context panel reads live from the active workspace.

**Screen 3 — Tool Registry.** Category filter pills (All / IDE / Deployment / Database / Frontend / Backend) filter the grid in-memory. Search input filters by name/description. Cards show name, category pill, description, free/paid indicator, external link icon, "Generate Prompt" button (adds a mock prompt to the active workspace + toast). "Pending Approval" tab visible when `user.role === "admin"` (mocked true) showing 2 pending tools.

**Screen 4 — Prompt Library.** Table/list of prompts for active workspace. Platform filter dropdown (Claude Code / Cursor / Lovable / Replit / Windsurf / Bolt). Row actions: Copy (writes to clipboard + toast), Download (triggers a `.txt` blob download), View (opens a shadcn `Dialog` with the full prompt).

**Screen 5 — Settings.** Three sections using shadcn `Tabs` or stacked cards:
1. API Keys — masked input per provider (OpenAI, Anthropic, Google, OpenRouter), Save button flips a green/red dot (mock validation: keys starting with `sk-` → green). Top toggle: account-level vs per-workspace.
2. Workspace — rename input, default model select, delete button with confirm dialog.
3. Profile — display name (editable), email (readonly), auth provider row.

## Interaction wiring summary

| Action | Result |
| --- | --- |
| Click "New Workspace" | Creates workspace, routes to `/workspace/$id`, shows empty state |
| Click example chip | Fills textarea |
| Submit onboarding prompt | Seeds messages, switches to chat view |
| Send chat message | Adds user bubble + delayed mock Disha reply (rotates types) |
| Switch workspace in sidebar | Updates active id + navigates |
| Filter/search tools | Reactive grid |
| Generate Prompt | Adds prompt to library + toast |
| Copy/Download/View prompt | Clipboard / blob download / dialog |
| Save API key | Updates status dot |
| Delete workspace | Confirm → removes from store, routes to dashboard |

## Deployment note

The app publishes free via Lovable's built-in Publish (`.lovable.app` URL), no config needed. Custom domain and Cloudflare/Netlify self-host are also available later.

## Out of scope (this pass)

- Real AI calls, real auth, real persistence (would need Lovable Cloud)
- Light mode
- Mobile-optimized chat layout beyond sidebar collapse
- Admin approval mutations beyond visual display
