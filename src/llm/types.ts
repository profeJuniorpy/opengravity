// ─── OpenGravity — LLM Types ────────────────────────────────────
// Shared types for all LLM providers.

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: string;
}

export interface LLMProvider {
  /** Human-readable name of the provider */
  name: string;

  /** Send a chat completion request */
  chat(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): Promise<LLMResponse>;
}
