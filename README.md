# RV OpenClaw Gateway

Marketing agent orchestration gateway for Reverse Ventures.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your keys
3. `npm start`

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `AI_PROVIDER` | `openai` or `google` |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) |
| `GOOGLE_AI_API_KEY` | Google AI key (if using Google) |
| `PUBLER_API_KEY` | Publer social media API key |
| `LATE_API_KEY` | Late.ly API key |

## Endpoints

- `GET /` — Health check + loaded agents
- `GET /health` — Simple health check
- `POST /agents/:name/invoke` — Invoke an agent

## Agents

18 specialized marketing agents, orchestrated by the CMO agent with hourly heartbeats.
