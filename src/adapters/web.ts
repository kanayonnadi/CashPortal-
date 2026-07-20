import express, { type Express } from "express";
import path from "node:path";
import type { ChatBot, ChatMessage } from "../bot";
import type { BotConfig } from "../config/loader";

export interface PlatformAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class WebAdapter implements PlatformAdapter {
  private readonly app: Express;
  private readonly histories = new Map<string, ChatMessage[]>();
  private server?: ReturnType<Express["listen"]>;

  constructor(
    private readonly config: BotConfig,
    private readonly chatBot: ChatBot,
    private readonly port = Number(process.env.PORT ?? 3000)
  ) {
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.static(path.resolve(process.cwd(), "public")));

    this.app.post("/message", async (req, res) => {
      const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
      const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

      if (!sessionId || !message) {
        res.status(400).json({ error: "sessionId and message are required" });
        return;
      }

      const previousHistory = this.histories.get(sessionId) ?? [];
      const userMessage: ChatMessage = { role: "user", content: message };
      const history = this.trimHistory([...previousHistory, userMessage]);
      this.histories.set(sessionId, history);

      try {
        const reply = await this.chatBot.reply(history);
        const assistantMessage: ChatMessage = { role: "assistant", content: reply };
        this.histories.set(sessionId, this.trimHistory([...history, assistantMessage]));
        res.json({ reply });
      } catch (error) {
        console.error("Failed to generate web response:", error);
        res.status(503).json({
          error: "I'm having trouble right now, please try again in a moment"
        });
      }
    });

    this.app.post("/reset", (req, res) => {
      const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
      if (sessionId) {
        this.histories.delete(sessionId);
      }
      res.json({ ok: true });
    });
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.info(`Web demo listening on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server?.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private trimHistory(history: ChatMessage[]): ChatMessage[] {
    const maxMessages = Math.max(1, this.config.conversation.history_limit * 2);
    return history.slice(-maxMessages);
  }
}
