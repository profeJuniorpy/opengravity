// ─── OpenGravity — Configuration ────────────────────────────────
// Validates and exports all environment variables with type safety.

import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  TELEGRAM_ALLOWED_USER_IDS: z
    .string()
    .transform((val) => {
      if (!val || val.trim() === "") return [];
      return val
        .split(",")
        .map((id) => id.replace(/[^\d]/g, ""))
        .filter(Boolean)
        .map(Number);
    }),

  // LLM — Groq
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),

  // LLM — OpenRouter (optional fallback)
  OPENROUTER_API_KEY: z.string().optional().default(""),
  OPENROUTER_MODEL: z
    .string()
    .optional()
    .default("meta-llama/llama-3.3-70b-instruct:free"),

  // Database
  DB_PATH: z.string().optional().default("./data/memory.db"),
  MEMORY_PROVIDER: z.enum(["sqlite", "firestore"]).optional().default("sqlite"),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment configuration:");
    for (const issue of result.error.issues) {
      console.error(`   → ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

export const env = loadConfig();

// ─── Agent Settings ─────────────────────────────────────────────
export const AGENT_CONFIG = {
  /** Maximum number of tool-call iterations per message */
  maxIterations: 10,

  /** Model to use with Groq */
  groqModel: "llama-3.3-70b-versatile",

  /** System prompt for the agent */
  systemPrompt: `You are OpenGravity, a helpful, concise and friendly personal AI assistant.
You communicate via Telegram. You can use tools when needed.
Always respond in the same language the user writes to you.
Be direct and useful. If you don't know something, say so honestly.
Current date/time will be available via the get_current_time tool.`,
} as const;