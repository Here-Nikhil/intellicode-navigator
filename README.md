# Disha — AI Architecture Planning Assistant

Disha is a conversational AI assistant that helps developers plan software architecture, make tech stack decisions, and generate tool-specific prompts. Ask it "Should I use Vercel or Fly.io?" and it'll query multiple AI models in parallel, score their responses, and give you a reasoned recommendation.

**Live Demo:** [dish-a.vercel.app](https://dish-a.vercel.app)

---

## What it does

- Chat with an AI that understands software architecture decisions
- Get consensus answers for trade-off questions (X vs Y) — powered by up to 3 AI models running in parallel
- Generate platform-specific prompts for tools like Bolt, Lovable, Cursor, Vercel, Supabase, and more
- Manage multiple project workspaces, each with their own conversation history and AI model preference
- Bring your own API keys (Groq, OpenAI, Anthropic, Google) — stored encrypted, never exposed

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | TypeScript, React, Vite, TanStack Start, shadcn/ui |
| Backend | Python, FastAPI, Uvicorn |
| Database | Neon PostgreSQL |
| Auth | Clerk (JWT + webhooks) |
| AI Providers | Groq, OpenAI, Anthropic, Google |
| Deployment | Vercel (frontend), Railway (backend) |

---

## Prerequisites

- Python 3.11+
- A [Neon](https://neon.tech) PostgreSQL database
- At least one AI provider API key (Groq, OpenAI, Anthropic, or Google) — via `.env` or the Settings UI

---

## Quick Start

### 1. Clone and set up the backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL URL |
| `MASTER_ENCRYPTION_KEY` | Yes | Secret for AES-256-GCM encryption of stored API keys |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key for JWT verification |
| `CLERK_WEBHOOK_SECRET` | Yes | Clerk webhook signing secret |
| `GROQ_ADMIN_KEY` | No | Server-side Groq key for admin operations |

Generate an encryption key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Run the backend

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API available at `http://localhost:8000` · Docs at `http://localhost:8000/docs`

### 4. Run the frontend

```bash
bun install
bun dev
```

Frontend runs on `http://localhost:3000`. Set `VITE_API_URL=http://localhost:8000` in the frontend `.env` for local development.

---

## API Overview

### Workspaces

| Method | Path | Description |
|---|---|---|
| `POST` | `/workspaces` | Create a workspace |
| `GET` | `/workspaces` | List workspaces |
| `PATCH` | `/workspaces/{id}` | Rename or update default model |
| `DELETE` | `/workspaces/{id}` | Delete a workspace |
| `POST` | `/workspaces/{id}/messages` | Send a message, get Disha's response |
| `GET` | `/workspaces/{id}/messages` | Get conversation history |
| `GET` | `/workspaces/{id}/stream?message=...` | SSE stream for real-time AI responses |

### Tools & Prompts

| Method | Path | Description |
|---|---|---|
| `GET` | `/tools` | List tool registry |
| `POST` | `/tools/submit` | Submit a tool for admin review |
| `POST` | `/tools/{id}/generate-prompt` | Generate a platform-specific prompt |
| `GET` | `/prompts?workspace_id=...` | List generated prompts |
| `DELETE` | `/prompts/{id}` | Delete a prompt |

### Settings

| Method | Path | Description |
|---|---|---|
| `POST` | `/settings/api-keys` | Save an encrypted API key |
| `GET` | `/settings/api-keys` | List providers with masked keys |

### Admin

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/tools/pending` | List tools pending approval |
| `POST` | `/admin/tools/{id}/approve` | Approve a pending tool |
| `DELETE` | `/admin/tools/{id}/reject` | Reject and delete a pending tool |
| `GET` | `/admin/users` | List all users |
| `POST` | `/admin/users/{id}/suspend` | Suspend a user |
| `DELETE` | `/admin/users/{id}` | Delete a user |

Admin access requires Clerk metadata `{"role": "admin"}` and DB `role = 'admin'`.

---

## Architecture

### Orchestration Layer

Every incoming message is classified before touching an LLM:

1. **Pure greeting** — answered locally, no API call made
2. **Navigation query** — sidebar/settings questions answered locally
3. **Prompt request** — routed directly to prompt generation
4. **Trade-off / ambiguous decision** — triggers the consensus engine
5. **Architecture / general** — routed to the user's configured model with the full Disha system prompt

Mixed messages ("hi, I want to build a SaaS") are always routed to the LLM — the greeting is never used as the sole intent signal.

### Consensus Engine

For "X vs Y" questions, Disha queries up to 3 configured AI providers simultaneously, scores each response, clusters similar recommendations, and returns:
- Per-model recommendation with confidence score
- A winning recommendation with summarized rationale

### Conversation Summarization

After every 20 messages, conversation history is compressed into a structured project summary (overview, requirements, tech stack, decisions, open questions) stored in the `projects` and `conversations` tables.

### API Key Encryption

User API keys are encrypted with AES-256-GCM before storage and decrypted only at request time. The master key never leaves the server environment.

### Quick Reply Options

Disha returns structured `options` in its JSON response when genuinely presenting a choice. These render as quick-reply buttons on the frontend — they are never scraped from bullet points.

---

## SSE Streaming

```javascript
const source = new EventSource(
  `http://localhost:8000/workspaces/${workspaceId}/stream?message=${encodeURIComponent("Should I use Vercel or Fly.io?")}`
);

source.addEventListener("token", (e) => {
  const { token } = JSON.parse(e.data);
  process.stdout.write(token);
});

source.addEventListener("consensus", (e) => {
  console.log("consensus", JSON.parse(e.data));
});

source.addEventListener("done", (e) => {
  console.log("done", JSON.parse(e.data));
  source.close();
});
```

---

## Database Schema

8 tables: `users`, `workspaces`, `conversations`, `messages`, `projects`, `api_keys`, `tool_registry`, `generated_prompts`

The `messages` table includes a `quick_reply_options` JSONB column for structured follow-up choices.

---

## Deployment

- **Frontend:** Vercel
- **Backend:** Railway (set env vars via Railway dashboard)
- **Database:** Neon PostgreSQL (shared between local and production — run migrations carefully)

Production backend:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Development Notes

- The tool registry is seeded on startup with 14 tools: Cursor, Claude Code, Windsurf, Bolt, Lovable, Replit, Vercel, Fly.io, Cloudflare Workers, Supabase, Neon, PlanetScale, GitHub Copilot, and Emergence AI
- Disha's personality is controlled by `backend/prompts/system_prompt.txt` — editable without redeployment
- Never commit `.env` to version control
