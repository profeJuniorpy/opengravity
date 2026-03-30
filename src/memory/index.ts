import { env } from "../config.js";
import { Memory as SQLiteMemory } from "./sqlite.js";
import { FirestoreMemory } from "./firestore.js";
import type { IMemory } from "./types.js";

/** Memory factory based on environment configuration */
export function createMemory(): IMemory {
  if (env.MEMORY_PROVIDER === "firestore") {
    return new FirestoreMemory();
  }
  return new SQLiteMemory();
}

export type { IMemory };