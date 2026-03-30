// ─── OpenGravity — Groq Provider ────────────────────────────────
// Proveedor LLM principal usando la API de inferencia rápida de Groq.
// Usa fetch directo contra la API compatible con OpenAI para evitar
// problemas de tipado con versiones del SDK.

import { env, AGENT_CONFIG } from "../config.js";
import type {
  LLMProvider,
  LLMResponse,
  ChatMessage,
  ToolDefinition,
} from "./types.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export class GroqProvider implements LLMProvider {
  name = "Groq";

  async chat(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: AGENT_CONFIG.groqModel,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Groq API error (${response.status}): ${errorBody}`
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
      throw new Error("Groq no devolvió ninguna respuesta");
    }

    return {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls ?? [],
      finishReason: choice.finish_reason ?? "stop",
    };
  }
}
