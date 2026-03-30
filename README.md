# 🛸 OpenGravity

**Personal AI agent via Telegram — deployable by anyone.**

OpenGravity is a lightweight, secure, and modular AI agent that communicates through Telegram. It uses Groq's fast inference API (with OpenRouter as fallback) and stores conversation memory with SQLite (local) or Firestore (cloud).

---

## Features

- 🤖 **Telegram-native** — Long polling, no web server needed
- 🧠 **Groq LLM** — Llama 3.3 70B with automatic OpenRouter fallback
- 🔧 **Tool system** — Extensible tool registry (ships with `get_current_time`)
- 💾 **Persistent memory** — SQLite or Firestore
- 🔒 **Secure** — Optional Telegram user ID whitelist
- 📦 **Modular** — Clean TypeScript architecture, easy to extend

---

## One-Click Deploy to Glitch

[![Remix on Glitch](https://img.shields.io/badge/Glitch-Deploy-blue?style=for-the-badge)](https://glitch.com/edit/#!/import/github/anonymity-test/opengravity)

Or manually:
1. Go to [glitch.com](https://glitch.com)
2. Create new project → "Import from GitHub"
3. Paste: `https://github.com/YOUR_USERNAME/opengravity`

---

## Manual Setup (Local or Any Host)

### 1. Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Git](https://git-scm.com/)
- Telegram bot token from [@BotFather](https://t.me/BotFather)
- Groq API key from [console.groq.com](https://console.groq.com/)

### 2. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/opengravity.git
cd opengravity
npm install
```

### 3. Configure

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
GROQ_API_KEY=your-groq-api-key

# Optional - leave empty for open access to everyone
TELEGRAM_ALLOWED_USER_IDS=

# Optional - defaults shown
OPENROUTER_API_KEY=
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
MEMORY_PROVIDER=sqlite
DB_PATH=./data/memory.db
```

### 4. Run

```bash
npm run dev
```

Open Telegram, find your bot, and start chatting.

---

## Configuration Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Get from [@BotFather](https://t.me/BotFather) |
| `GROQ_API_KEY` | Yes | Get from [console.groq.com](https://console.groq.com/) |
| `TELEGRAM_ALLOWED_USER_IDS` | No | Comma-separated Telegram user IDs. Leave empty for open access. |
| `OPENROUTER_API_KEY` | No | Fallback LLM if Groq fails |
| `MEMORY_PROVIDER` | No | `sqlite` (default) or `firestore` |
| `DB_PATH` | No | Path for SQLite database (default: `./data/memory.db`) |

---

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | Show available commands/tools |
| `/clear` | Clear conversation history |
| `/status` | System status and uptime |

---

## Project Structure

```
src/
├── index.ts           # Entry point
├── config.ts          # Environment validation (Zod)
├── agent/
│   └── loop.ts        # Agent loop (think → act → observe)
├── bot/
│   └── telegram.ts    # Telegram bot (grammy, long polling)
├── llm/
│   ├── types.ts       # Shared LLM types
│   ├── groq.ts        # Groq provider (primary)
│   ├── openrouter.ts  # OpenRouter provider (fallback)
│   └── index.ts       # LLM manager with failover
├── memory/
│   ├── sqlite.ts      # SQLite persistent storage
│   ├── firestore.ts  # Firestore (Google Cloud)
│   └── index.ts      # Memory factory
└── tools/
    ├── registry.ts         # Tool registry
    └── get-current-time.ts # Built-in tool
```

---

## Adding New Tools

1. Create a new file in `src/tools/`:

```typescript
// src/tools/my-tool.ts
import type { Tool } from "./registry.js";

export const myTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "my_tool",
      description: "What this tool does",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  execute: async (args) => {
    // your logic here
    return JSON.stringify({ result: "done" });
  },
};
```

2. Register it in `src/tools/index.ts`:

```typescript
import { myTool } from "./my-tool.js";
toolRegistry.register(myTool);
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Bot | grammy |
| LLM | Groq API |
| Fallback | OpenRouter |
| Memory | better-sqlite3 / Firestore |
| Language | TypeScript (ESM) |
| Dev | tsx |
| Hosting | Glitch / Fly.io / any Node host |

---

## License

MIT — Use freely.