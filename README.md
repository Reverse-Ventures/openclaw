# RV OpenClaw Gateway

Marketing agent orchestration gateway for Reverse Ventures.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your keys
3. `npm start`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | No | Supabase project URL (retained for reference; no direct DB access from this service) |
| `SUPABASE_WEBHOOK_URL` | Yes | URL of the secure backend webhook that performs Supabase operations |
| `SUPABASE_WEBHOOK_SECRET` | Yes | Shared secret sent as `Authorization: Bearer <secret>` on every webhook call |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key used by the NOVA heartbeat analyser |
| `AI_PROVIDER` | No | `openai` (default) or `google` |
| `OPENAI_API_KEY` | No | OpenAI API key (required when `AI_PROVIDER=openai`) |
| `GOOGLE_AI_API_KEY` | No | Google AI key (required when `AI_PROVIDER=google`) |
| `PUBLER_API_KEY` | No | Publer social media API key |
| `LATE_API_KEY` | No | Late.ly API key |

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` is intentionally absent from this service.
> All privileged database operations are delegated to the webhook endpoint, which is the
> only place that should hold the service role key. See `src/webhookHelper.js` for details.

## Endpoints

- `GET /` — Health check + loaded agents
- `GET /health` — Simple health check
- `POST /agents/:name/invoke` — Invoke an agent

## Agents

18 specialized marketing agents, orchestrated by the CMO agent with hourly heartbeats.
