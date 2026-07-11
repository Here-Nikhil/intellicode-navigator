# Disha Backend

FastAPI backend for [Disha](https://github.com/Here-Nikhil/intellicode-navigator) — an AI architecture planning assistant. Handles workspaces, conversational AI orchestration, multi-model consensus, encrypted API key storage, tool registry, and prompt generation.

## Prerequisites

- Python 3.11+
- A [Neon](https://neon.tech) PostgreSQL database
- At least one AI provider API key (OpenAI, Anthropic, or Google) — via `.env` or the Settings UI

## Quick start

### 1. Create a virtual environment

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL URL (`postgresql://...`) |
| `MASTER_ENCRYPTION_KEY` | Yes | Secret for AES-256-GCM encryption of stored API keys |
| `OPENAI_API_KEY` | No | Server-side fallback OpenAI key |
| `ANTHROPIC_API_KEY` | No | Server-side fallback Anthropic key |
| `GOOGLE_API_KEY` | No | Server-side fallback Google key |

Generate a strong encryption key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4. Run the server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API is available at `http://localhost:8000`. Interactive docs: `http://localhost:8000/docs`.

Tables are created automatically on startup, and the tool registry is seeded with Cursor, Claude Code, Windsurf, Bolt, Lovable, Replit, Vercel, Fly.io, Cloudflare Workers, Supabase, Neon, PlanetScale, GitHub Copilot, and Emergence AI.

## Connect the frontend

The frontend (TanStack Start on `localhost:3000`) expects this API at `http://localhost:8000`. CORS is enabled for `http://localhost:3000`.

## API overview

### Workspaces

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/workspaces` | Create a workspace |
| `GET` | `/workspaces` | List workspaces |
| `POST` | `/workspaces/{id}/messages` | Send a message and receive Disha's response |
| `GET` | `/workspaces/{id}/messages` | Get conversation history |
| `GET` | `/workspaces/{id}/stream?message=...` | SSE stream for AI responses |

### Tools & prompts

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tools` | List tool registry |
| `POST` | `/tools/{id}/generate-prompt` | Generate a platform-specific prompt |
| `GET` | `/prompts?workspace_id=...` | List generated prompts |

### Settings

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/settings/api-keys` | Save an encrypted API key |
| `GET` | `/settings/api-keys` | List providers with masked keys |

## Architecture

### Orchestration layer

When a message arrives, Disha classifies intent:

1. **Greeting / navigation** — handled locally without calling an AI provider
2. **Architecture reasoning** — routed to the user's configured model (OpenAI, Anthropic, or Google)
3. **Ambiguous engineering decisions** — triggers the consensus engine (up to 3 models in parallel)

### Consensus engine

For trade-off questions ("X vs Y", "which should I use"), Disha queries up to three configured providers simultaneously, scores each response, clusters similar recommendations, and returns:

- Per-model recommendation and confidence score
- A winning recommendation with summary rationale

### Conversation summarization

After every 20 messages, conversation history is compressed into a structured project summary stored in the `projects` and `conversations` tables (overview, requirements, tech stack, decisions, open questions).

### API key encryption

User API keys are encrypted with **AES-256-GCM** before storage. Keys are decrypted only at request time when calling provider APIs. The master key never leaves the server environment.

## SSE streaming example

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

## Database schema

Tables: `users`, `workspaces`, `conversations`, `messages`, `projects`, `api_keys`, `tool_registry`, `generated_prompts`.

## Development notes

- A default dev user is created on startup (`dev@disha.local`) since auth is not wired yet.
- Provider keys in `.env` act as fallbacks; per-user keys from Settings take precedence.
- Health check: `GET /health`

## Production

For production, run with multiple workers behind a reverse proxy:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Set `MASTER_ENCRYPTION_KEY` and `DATABASE_URL` via your hosting provider's secrets manager. Never commit `.env` to version control.
