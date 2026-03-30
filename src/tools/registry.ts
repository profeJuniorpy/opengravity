// ─── OpenGravity — Tool Registry ────────────────────────────────
// Central registry for all agent tools.
// Adding a new tool = create file + register here.

import type { ToolDefinition } from "../llm/types.js";
import { getCurrentTime } from "./get-current-time.js";

export interface Tool {
  definition: ToolDefinition;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

class ToolRegistry {
  private tools = new Map<string, Tool>();

  /** Register a new tool */
  register(tool: Tool): void {
    const name = tool.definition.function.name;
    if (this.tools.has(name)) {
      throw new Error(`Tool "${name}" is already registered`);
    }
    this.tools.set(name, tool);
    console.log(`🔧 Tool registered: ${name}`);
  }

  /** Get a tool by name */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /** Get all tool definitions for the LLM */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  /** Execute a tool by name with arguments */
  async execute(name: string, args: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return JSON.stringify({ error: `Unknown tool: ${name}` });
    }

    try {
      return await tool.execute(args);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Tool "${name}" failed: ${msg}`);
      return JSON.stringify({ error: `Tool execution failed: ${msg}` });
    }
  }

  /** List all registered tool names */
  list(): string[] {
    return Array.from(this.tools.keys());
  }
}

// ─── Singleton registry ─────────────────────────────────────────
export const toolRegistry = new ToolRegistry();

// ─── Register all tools ─────────────────────────────────────────
// Add new tools here as you create them:
toolRegistry.register(getCurrentTime);
