// ─── OpenGravity — Memory Types ──────────────────────────────────
// Defines the common interface for memory storage providers.

import type { ChatMessage } from "../llm/types.js";

export interface IMemory {
  /** Save a message to the conversation history */
  saveMessage(chatId: number, message: ChatMessage): Promise<void> | void;

  /** Load recent conversation history for a chat */
  loadHistory(chatId: number, limit?: number): Promise<ChatMessage[]> | ChatMessage[];

  /** Clear conversation history for a chat */
  clearHistory(chatId: number): Promise<number> | number;

  /** Store a key-value metadata pair */
  setMeta(key: string, value: string): Promise<void> | void;

  /** Retrieve a metadata value */
  getMeta(key: string): Promise<string | undefined> | string | undefined;

  /** Close the database connection gracefully */
  close(): Promise<void> | void;
}
