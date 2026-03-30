// ─── OpenGravity — Entry Point ──────────────────────────────────
// Bootstraps all modules and starts the agent.

import { LLMManager } from "./llm/index.js";
import { createMemory } from "./memory/index.js";
import { AgentLoop } from "./agent/index.js";
import { TelegramBot } from "./bot/index.js";
import http from "node:http";

// Import tools to trigger registration
import "./tools/index.js";

// Health check server for Fly.io
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const healthServer = http
  .createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  })
  .listen(PORT, () => {
    console.log(`Health server listening on port ${PORT}`);
  });

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════╗");
  console.log("║        🛸 OpenGravity v0.1.0         ║");
  console.log("║    Personal AI Agent via Telegram     ║");
  console.log("╚══════════════════════════════════════╝\n");

  // Initialize modules
  const memory = createMemory();
  const llm = new LLMManager();
  const agent = new AgentLoop(llm, memory);
  const bot = new TelegramBot(agent, memory);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n🛑 Shutting down OpenGravity...");
    bot.stop();
    await memory.close();
    console.log("👋 Goodbye!\n");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("uncaughtException", (error) => {
    console.error("💥 Uncaught exception:", error);
    shutdown();
  });
  process.on("unhandledRejection", (reason) => {
    console.error("💥 Unhandled rejection:", reason);
  });

  // Launch!
  await bot.start();
}

main().catch((error) => {
  console.error("💥 Fatal error starting OpenGravity:", error);
  process.exit(1);
});
