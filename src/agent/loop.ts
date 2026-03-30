// ─── OpenGravity — Agent Loop ───────────────────────────────────
// Core agent loop: LLM thinks → calls tools → repeats → responds.
// Features iteration limits and full conversation persistence.

import { AGENT_CONFIG } from "../config.js";
import { LLMManager } from "../llm/index.js";
import type { ChatMessage } from "../llm/types.js";
import type { IMemory } from "../memory/index.js";
import { toolRegistry } from "../tools/index.js";

export class AgentLoop {
  private llm: LLMManager;
  private memory: IMemory;

  constructor(llm: LLMManager, memory: IMemory) {
    this.llm = llm;
    this.memory = memory;
  }

  /**
   * Process a user message through the full agent loop.
   * Returns the final text response to send back to the user.
   */
  async process(chatId: number, userMessage: string): Promise<string> {
    // Save the user message
    const userMsg: ChatMessage = { role: "user", content: userMessage };
    await this.memory.saveMessage(chatId, userMsg);

    // Load conversation history
    const history = await this.memory.loadHistory(chatId);

    // Build messages array with system prompt
    const messages: ChatMessage[] = [
      { role: "system", content: AGENT_CONFIG.systemPrompt },
      ...history,
    ];

    // Get available tools
    const toolDefs = toolRegistry.getDefinitions();

    // Agent loop with iteration limit
    let iterations = 0;

    while (iterations < AGENT_CONFIG.maxIterations) {
      iterations++;
      console.log(`  🔄 Agent iteration ${iterations}/${AGENT_CONFIG.maxIterations}`);

      const response = await this.llm.chat(messages, toolDefs);

      // If the LLM wants to call tools
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Save the assistant message with tool calls
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: response.content,
          tool_calls: response.toolCalls,
        };
        messages.push(assistantMsg);
        await this.memory.saveMessage(chatId, assistantMsg);

        // Execute each tool call
        for (const toolCall of response.toolCalls) {
          const toolName = toolCall.function.name;
          console.log(`  🔧 Calling tool: ${toolName}`);

          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            console.warn(`  ⚠️  Failed to parse args for ${toolName}`);
          }

          const result = await toolRegistry.execute(toolName, args);
          console.log(`  ✅ Tool result: ${result.substring(0, 200)}`);

          // Save the tool result
          const toolMsg: ChatMessage = {
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
            name: toolName,
          };
          messages.push(toolMsg);
          await this.memory.saveMessage(chatId, toolMsg);
        }

        // Continue the loop — LLM needs to process tool results
        continue;
      }

      // No tool calls — we have a final response
      const finalContent =
        response.content ?? "I processed your request but have no response.";

      // Save the assistant's final response
      const finalMsg: ChatMessage = {
        role: "assistant",
        content: finalContent,
      };
      await this.memory.saveMessage(chatId, finalMsg);

      return finalContent;
    }

    // Hit iteration limit
    const limitMsg =
      "⚠️ I reached my thinking limit for this request. Please try again or simplify your question.";
    await this.memory.saveMessage(chatId, {
      role: "assistant",
      content: limitMsg,
    });
    return limitMsg;
  }
}
