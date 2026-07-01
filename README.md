# mockpal

## ⚡ Quickstart (Local Setup in 5 Commands)

```bash
# 1. Install dependencies
bun install

# 2. Configure environment variables
cp .env.local.example .env.local

# 3. Initialize the Neon PostgreSQL Database (triggers API route)
curl -X POST http://localhost:3000/api/init

# 4. Start the development server
bun dev

# 5. Connect your local server to Vapi using ngrok tunnel (in a separate terminal)
ngrok http 3000
```
> **Note:** Once you run ngrok, copy your public forwarding URL (e.g., `https://your-subdomain.ngrok-free.dev`) and set it as `NEXT_PUBLIC_APP_URL` in your `.env.local` so Vapi webhooks route to your backend.

---

## 🛠️ Environment Variables

Copy `.env.local.example` to `.env.local` and configure the following variables:

```ini
# Database (Neon PostgreSQL connection string)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# JWT Auth Secret
JWT_SECRET="generate-a-random-32-character-secret"

# Vapi Keys
VAPI_API_KEY="your-vapi-private-api-key"
NEXT_PUBLIC_VAPI_PUBLIC_KEY="your-vapi-public-key"
VAPI_WEBHOOK_SECRET="your-vapi-webhook-signing-secret"

# App Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # Set to your ngrok forwarding address during local testing

```

---

## 🏗️ Architecture & Core Loop



### 🧠 State Machine Conversation Engine
The platform implements a **5-Stage State Machine** (`intro` → `question` → `followup` → `probe` → `close`) managed directly via server-side session stores and custom prompts:
- **Intro**: Establishes context and greets the candidate.
- **Question**: Selects random contextual topics tailored to role/experience.
- **Followup**: Evaluates the candidate's answer structure. Re-routes if responses lack STAR structure or results.
- **Probe**: Pushes back on vague, short, or generic responses.
- **Close**: Wraps up the conversation and triggers automated scoring.