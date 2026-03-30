// ─── OpenGravity — Memory (SQLite) ──────────────────────────────
// Persistent conversation memory using better-sqlite3.
// Stores messages per chat with timestamps for context retrieval.

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../config.js";
import type { ChatMessage } from "../llm/types.js";
import type { IMemory } from "./types.js";

export class Memory implements IMemory {
  private db: Database.Database;

  constructor() {
    // Ensure the data directory exists
    const dir = dirname(env.DB_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(env.DB_PATH);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initialize();
    console.log(`💾 Memory initialized at ${env.DB_PATH}`);
  }

  /** Create tables if they don't exist */
  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id     INTEGER NOT NULL,
        role        TEXT NOT NULL,
        content     TEXT,
        tool_calls  TEXT,
        tool_call_id TEXT,
        name        TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_chat_id
        ON conversations(chat_id);

      CREATE INDEX IF NOT EXISTS idx_conversations_created_at
        ON conversations(created_at);

      CREATE TABLE IF NOT EXISTS metadata (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  /** Save a message to the conversation history */
  async saveMessage(chatId: number, message: ChatMessage): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO conversations (chat_id, role, content, tool_calls, tool_call_id, name)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      chatId,
      message.role,
      message.content,
      message.tool_calls ? JSON.stringify(message.tool_calls) : null,
      message.tool_call_id ?? null,
      message.name ?? null
    );
  }

  /** Load recent conversation history for a chat */
  async loadHistory(chatId: number, limit: number = 50): Promise<ChatMessage[]> {
    const stmt = this.db.prepare(`
      SELECT role, content, tool_calls, tool_call_id, name
      FROM conversations
      WHERE chat_id = ?
      ORDER BY id DESC
      LIMIT ?
    `);

    const rows = stmt.all(chatId, limit) as Array<{
      role: string;
      content: string | null;
      tool_calls: string | null;
      tool_call_id: string | null;
      name: string | null;
    }>;

    // Reverse to get chronological order
    return rows.reverse().map((row) => {
      const msg: ChatMessage = {
        role: row.role as ChatMessage["role"],
        content: row.content,
      };

      if (row.tool_calls) {
        msg.tool_calls = JSON.parse(row.tool_calls);
      }
      if (row.tool_call_id) {
        msg.tool_call_id = row.tool_call_id;
      }
      if (row.name) {
        msg.name = row.name;
      }

      return msg;
    });
  }

  /** Clear conversation history for a chat */
  async clearHistory(chatId: number): Promise<number> {
    const stmt = this.db.prepare(
      "DELETE FROM conversations WHERE chat_id = ?"
    );
    const result = stmt.run(chatId);
    return result.changes;
  }

  /** Store a key-value metadata pair */
  async setMeta(key: string, value: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO metadata (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
    `);
    stmt.run(key, value, value);
  }

  /** Retrieve a metadata value */
  async getMeta(key: string): Promise<string | undefined> {
    const stmt = this.db.prepare("SELECT value FROM metadata WHERE key = ?");
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value;
  }

  /** Close the database connection gracefully */
  async close(): Promise<void> {
    this.db.close();
    console.log("💾 Memory database closed");
  }
}
