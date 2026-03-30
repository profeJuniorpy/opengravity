// ─── OpenGravity — Telegram Bot ─────────────────────────────────
// Handles all Telegram interactions with security (whitelist) and commands.

import { Bot, type Context } from "grammy";
import { env } from "../config.js";
import { AgentLoop } from "../agent/index.js";
import type { IMemory } from "../memory/index.js";

export class TelegramBot {
  private bot: Bot;
  private agent: AgentLoop;
  private memory: IMemory;
  private allowedUserIds: Set<number>;
  private processingChats = new Set<number>();

  constructor(agent: AgentLoop, memory: IMemory) {
    this.bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    this.agent = agent;
    this.memory = memory;
    this.allowedUserIds = new Set(env.TELEGRAM_ALLOWED_USER_IDS);

    this.setupMiddleware();
    this.setupCommands();
    this.setupMessageHandler();
  }

  /** Security middleware — whitelist check (only if user IDs are configured) */
  private setupMiddleware(): void {
    this.bot.use(async (ctx, next) => {
      const userId = ctx.from?.id;

      // Only check whitelist if it's configured (non-empty)
      if (this.allowedUserIds.size > 0 && (!userId || !this.allowedUserIds.has(userId))) {
        console.warn(
          `🚫 Unauthorized access attempt from user ID: ${userId ?? "unknown"}`
        );
        await ctx.reply(
          "⛔ Access denied. You are not authorized to use this bot."
        );
        return;
      }

      await next();
    });
  }

  /** Register bot commands */
  private setupCommands(): void {
    // /start — Welcome message
    this.bot.command("start", async (ctx) => {
      await ctx.reply(
        "🚀 *OpenGravity* is online\\!\n\n" +
          "I'm your personal AI assistant\\. Send me any message and I'll help you out\\.\n\n" +
          "*Commands:*\n" +
          "/clear — Clear conversation history\n" +
          "/status — Check system status\n" +
          "/help — Show this help message",
        { parse_mode: "MarkdownV2" }
      );
    });

    // /help — Help message
    this.bot.command("help", async (ctx) => {
      await ctx.reply(
        "🛸 *OpenGravity Help*\n\n" +
          "Just send me a message and I'll respond using AI\\.\n\n" +
          "*Available commands:*\n" +
          "• /clear — Erase conversation memory\n" +
          "• /status — System status check\n" +
          "• /help — This help message\n\n" +
          "*Available tools:*\n" +
          "• `get_current_time` — I can tell you the current time",
        { parse_mode: "MarkdownV2" }
      );
    });

    // /clear — Clear conversation history
    this.bot.command("clear", async (ctx) => {
      const chatId = ctx.chat.id;
      const deleted = await this.memory.clearHistory(chatId);
      await ctx.reply(
        `🧹 Conversation cleared! (${deleted} messages removed)`
      );
    });

    // /status — System status
    this.bot.command("status", async (ctx) => {
      const chatId = ctx.chat.id;
      const history = await this.memory.loadHistory(chatId);
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);

      const memoryType = env.MEMORY_PROVIDER === "firestore" ? "Firebase Firestore" : "SQLite";

      await ctx.reply(
        `📊 *OpenGravity Status*\n\n` +
          `⏱ Uptime: ${hours}h ${minutes}m\n` +
          `💬 Messages in memory: ${history.length}\n` +
          `🧠 LLM: Groq \\(Llama 3\\.3 70B\\)\n` +
          `💾 Memory: ${memoryType} \\(persistent\\)\n` +
          `✅ Status: Operational`,
        { parse_mode: "MarkdownV2" }
      );
    });
  }

  /** Handle regular text messages through the agent loop */
  private setupMessageHandler(): void {
    this.bot.on("message:text", async (ctx) => {
      const chatId = ctx.chat.id;
      const userMessage = ctx.message.text;
      const userName = ctx.from.first_name ?? "User";

      // Prevent concurrent processing for the same chat
      if (this.processingChats.has(chatId)) {
        await ctx.reply(
          "⏳ I'm still thinking about your previous message. Please wait..."
        );
        return;
      }

      this.processingChats.add(chatId);

      try {
        console.log(`\n📩 [${userName}] ${userMessage}`);

        // Show typing indicator
        await ctx.api.sendChatAction(chatId, "typing");

        // Keep typing indicator alive during processing
        const typingInterval = setInterval(async () => {
          try {
            await ctx.api.sendChatAction(chatId, "typing");
          } catch {
            // Ignore typing indicator errors
          }
        }, 4000);

        // Process through agent loop
        const response = await this.agent.process(chatId, userMessage);

        clearInterval(typingInterval);

        // Send response (handle long messages by splitting)
        await this.sendLongMessage(ctx, response);

        console.log(`📤 [OpenGravity] ${response.substring(0, 200)}${response.length > 200 ? "..." : ""}`);
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : String(error);
        console.error(`❌ Error processing message: ${errMsg}`);

        // Send error as plain text to avoid MarkdownV2 parsing issues
        try {
          await ctx.reply(`❌ Sorry, I encountered an error.\n\nError: ${errMsg}`, {
            parse_mode: undefined,
          });
        } catch {
          // Fallback if even plain text fails
          await ctx.reply("❌ Sorry, I encountered an error. Please try again.");
        }
      } finally {
        this.processingChats.delete(chatId);
      }
    });
  }

  /** Split long messages for Telegram's 4096 character limit */
  private async sendLongMessage(ctx: Context, text: string): Promise<void> {
    const MAX_LENGTH = 4000; // Leave some margin

    if (text.length <= MAX_LENGTH) {
      await ctx.reply(text);
      return;
    }

    // Split by paragraphs first, then by character limit
    const chunks: string[] = [];
    let current = "";

    for (const line of text.split("\n")) {
      if (current.length + line.length + 1 > MAX_LENGTH) {
        if (current) chunks.push(current);
        current = line;
      } else {
        current += (current ? "\n" : "") + line;
      }
    }
    if (current) chunks.push(current);

    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  }

  /** Start the bot with long polling */
  async start(): Promise<void> {
    // Set bot commands for the menu
    await this.bot.api.setMyCommands([
      { command: "start", description: "Start OpenGravity" },
      { command: "help", description: "Show help" },
      { command: "clear", description: "Clear conversation history" },
      { command: "status", description: "System status" },
    ]);

    // Start long polling
    this.bot.start({
      onStart: (botInfo) => {
        console.log(`\n🚀 OpenGravity is live!`);
        console.log(`   Bot: @${botInfo.username}`);
        console.log(
          `   Allowed users: ${this.allowedUserIds.size > 0 ? Array.from(this.allowedUserIds).join(", ") : "ALL (open access)"}`
        );
        console.log(`   Mode: Long Polling\n`);
      },
    });
  }

  /** Stop the bot gracefully */
  stop(): void {
    this.bot.stop();
  }
}