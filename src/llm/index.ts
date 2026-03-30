// ─── OpenGravity — LLM Manager ──────────────────────────────────
// Manages primary/fallback LLM providers with automatic failover.

import { GroqProvider } from "./groq.js";
import { OpenRouterProvider } from "./openrouter.js";
import { env } from "../config.js";
import type {
  LLMProvider,
  LLMResponse,
  ChatMessage,
  ToolDefinition,
} from "./types.js";

export class LLMManager {
  private primary: LLMProvider;
  private fallback: LLMProvider | null = null;

  constructor() {
    this.primary = new GroqProvider();
    console.log(`🧠 Primary LLM: ${this.primary.name}`);

    if (env.OPENROUTER_API_KEY) {
      try {
        this.fallback = new OpenRouterProvider();
        console.log(`🧠 Fallback LLM: ${this.fallback.name}`);
      } catch {
        console.log("⚠️  OpenRouter fallback not configured, skipping");
      }
    }
  }

  async chat(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): Promise<LLMResponse> {
    try {
      return await this.primary.chat(messages, tools);
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `⚠️  ${this.primary.name} failed: ${errMsg}`
      );

      // Check if it's a rate limit or transient error
      if (this.fallback) {
        console.log(`🔄 Switching to fallback: ${this.fallback.name}`);
        try {
          return await this.fallback.chat(messages, tools);
        } catch (fallbackError) {
          const fbMsg =
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError);
          throw new Error(
            `Both LLM providers failed.\n  Primary (${this.primary.name}): ${errMsg}\n  Fallback (${this.fallback.name}): ${fbMsg}`
          );
        }
      }

      throw error;
    }
  }
}

export type { LLMProvider, LLMResponse, ChatMessage, ToolDefinition };
