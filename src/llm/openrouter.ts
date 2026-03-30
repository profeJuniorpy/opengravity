// ─── OpenGravity — OpenRouter Provider ──────────────────────────
// Proveedor LLM de respaldo usando la API de OpenRouter.
// Usa fetch directo para consistencia con el proveedor de Groq.

import { env } from "../config.js";
import type {
  LLMProvider,
  LLMResponse,
  ChatMessage,
  ToolDefinition,
} from "./types.js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterProvider implements LLMProvider {
  name = "OpenRouter";

  constructor() {
    if (!env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY no está configurada");
    }
  }

  async chat(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: env.OPENROUTER_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://github.com/opengravity",
        "X-Title": "OpenGravity",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenRouter API error (${response.status}): ${errorBody}`
      );
    }

    const data = (await response.json()) as {
      choices: Array<{
        message: {
          content: string | null;
          tool_calls?: LLMResponse["toolCalls"];
        };
        finish_reason: string;
      }>;
    };

    const choice = data.choices[0];
    if (!choice) {
      throw new Error("OpenRouter no devolvió ninguna respuesta");
    }

    return {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls ?? [],
      finishReason: choice.finish_reason ?? "stop",
    };
  }
}
