# Agent Chat API (Sprint 1)

The backend runs independently of the frontend and uses a development user by
default. Set `X-Dev-User-Id` to test multiple users. Replace only
`src/auth/current-user.ts` when real authentication is ready.

## Run

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The app also checks the parent `Senior-Project/.env.local`, so the existing
local key can be used without copying it into Git. Configure the requested
model with:

```text
AI_MODEL=gpt-5.6-luna
AI_REASONING_EFFORT=medium
```

## Manual API flow

```powershell
$base = "http://127.0.0.1:3000"
$headers = @{ "Content-Type" = "application/json"; "X-Dev-User-Id" = "dev-user-001" }

$conversation = Invoke-RestMethod -Method Post `
  -Uri "$base/api/conversations" -Headers $headers `
  -Body '{"title":"NVDA research"}'

$conversationId = $conversation.id

Invoke-RestMethod -Method Post `
  -Uri "$base/api/conversations/$conversationId/messages" -Headers $headers `
  -Body '{"message":"What is happening with NVDA today?"}'

Invoke-RestMethod -Method Get `
  -Uri "$base/api/conversations/$conversationId" -Headers $headers
```

Equivalent curl commands:

```bash
curl -X POST http://127.0.0.1:3000/api/conversations \
  -H 'Content-Type: application/json' \
  -H 'X-Dev-User-Id: dev-user-001' \
  -d '{"title":"NVDA research"}'

curl -X POST http://127.0.0.1:3000/api/conversations/<conversation-id>/messages \
  -H 'Content-Type: application/json' \
  -H 'X-Dev-User-Id: dev-user-001' \
  -d '{"message":"What is happening with NVDA today?"}'
```

## Current Sprint 1 adapters

- SQLite persistence is implemented with a repository abstraction.
- Authentication is a mock adapter using `X-Dev-User-Id` or `DEV_USER_ID`.
- Market and news providers are safe mock adapters and return unavailable
  rather than inventing current data.
- OpenAI Responses API is wired through `OpenAiProvider`; function calls are
  routed to the Market/News abstractions and returned as `toolCalls`.
