// ─── OpenGravity — Memory (Firestore) ─────────────────────────────
// Persistent conversation memory using Firebase Firestore.

import admin from "firebase-admin";
import { env } from "../config.js";
import type { ChatMessage } from "../llm/types.js";
import type { IMemory } from "./types.js";

export class FirestoreMemory implements IMemory {
  private db: admin.firestore.Firestore;

  constructor() {
    // If credentials are provided via env, they should be used.
    // admin.initializeApp() will use GOOGLE_APPLICATION_CREDENTIALS if set.
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    this.db = admin.firestore();
    console.log("🔥 Firestore Memory initialized");
  }

  /** Save a message to the conversation history */
  async saveMessage(chatId: number, message: ChatMessage): Promise<void> {
    const chatRef = this.db.collection("chats").doc(chatId.toString());
    const messagesRef = chatRef.collection("messages");

    await messagesRef.add({
      ...message,
      tool_calls: message.tool_calls ? JSON.stringify(message.tool_calls) : null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /** Load recent conversation history for a chat */
  async loadHistory(chatId: number, limit: number = 50): Promise<ChatMessage[]> {
    const messagesRef = this.db
      .collection("chats")
      .doc(chatId.toString())
      .collection("messages");

    const snapshot = await messagesRef
      .orderBy("created_at", "desc")
      .limit(limit)
      .get();

    const messages: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const msg: ChatMessage = {
        role: data.role,
        content: data.content,
      };

      if (data.tool_calls) {
        msg.tool_calls = JSON.parse(data.tool_calls);
      }
      if (data.tool_call_id) {
        msg.tool_call_id = data.tool_call_id;
      }
      if (data.name) {
        msg.name = data.name;
      }

      messages.push(msg);
    });

    return messages.reverse();
  }

  /** Clear conversation history for a chat */
  async clearHistory(chatId: number): Promise<number> {
    const messagesRef = this.db
      .collection("chats")
      .doc(chatId.toString())
      .collection("messages");

    const snapshot = await messagesRef.get();
    let deletedCount = 0;
    
    // Batch delete
    const batch = this.db.batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();
    return deletedCount;
  }

  /** Store a key-value metadata pair */
  async setMeta(key: string, value: string): Promise<void> {
    await this.db.collection("metadata").doc(key).set({
      value,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /** Retrieve a metadata value */
  async getMeta(key: string): Promise<string | undefined> {
    const doc = await this.db.collection("metadata").doc(key).get();
    return doc.exists ? doc.data()?.value : undefined;
  }

  /** Close the database connection gracefully */
  async close(): Promise<void> {
    // Firestore doesn't require explicit closing like SQLite, 
    // but we can release any resources if needed.
    console.log("🔥 Firestore Memory connection released");
  }
}
