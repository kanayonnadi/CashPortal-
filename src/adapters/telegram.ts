import TelegramBot from "node-telegram-bot-api";
import type { ChatBot, ChatMessage } from "../bot";
import type { BotConfig } from "../config/loader";
import type { PlatformAdapter } from "./web";

export class TelegramAdapter implements PlatformAdapter {
  private bot?: TelegramBot;
  private readonly histories = new Map<number, ChatMessage[]>();
  private readonly token: string;

  constructor(
    private readonly config: BotConfig,
    private readonly chatBot: ChatBot,
    token = process.env.TELEGRAM_BOT_TOKEN
  ) {
    if (!token) {
      throw new Error("Missing TELEGRAM_BOT_TOKEN in environment");
    }
    this.token = token;
  }

  async start(): Promise<void> {
    this.bot = new TelegramBot(this.token, { polling: true });

    this.bot.onText(/^\/start$/, async (message) => {
      await this.safeSendMessage(
        message.chat.id,
        `Hello! I'm ${this.config.bot_name}. Send me a message whenever you're ready.`
      );
    });

    this.bot.onText(/^\/reset$/, async (message) => {
      this.histories.delete(message.chat.id);
      await this.safeSendMessage(message.chat.id, "Your conversation history has been reset.");
    });

    this.bot.on("message", (message) => {
      if (!message.text || message.text.startsWith("/")) {
        return;
      }
      void this.handleMessage(message);
    });

    this.bot.on("polling_error", (error) => {
      console.error("Telegram polling error:", error);
    });

    try {
      await this.bot.getMe();
      console.info("Telegram adapter started.");
    } catch (error) {
      await this.stop();
      throw new Error(`Telegram token appears to be invalid or unreachable: ${String(error)}`);
    }
  }

  async stop(): Promise<void> {
    if (!this.bot) {
      return;
    }

    await this.bot.stopPolling();
    this.bot = undefined;
  }

  private async handleMessage(message: TelegramBot.Message): Promise<void> {
    if (!this.bot || !message.text) {
      return;
    }

    const chatId = message.chat.id;
    const previousHistory = this.histories.get(chatId) ?? [];
    const userMessage: ChatMessage = {
      role: "user",
      content: this.formatUserMessage(message)
    };
    const history = this.trimHistory([...previousHistory, userMessage]);
    this.histories.set(chatId, history);

    const typingInterval = this.startTyping(chatId);

    try {
      const response = await this.chatBot.reply(history);
      clearInterval(typingInterval);

      const assistantMessage: ChatMessage = { role: "assistant", content: response };
      this.histories.set(chatId, this.trimHistory([...history, assistantMessage]));
      await this.safeSendLongMessage(chatId, response);
    } catch (error) {
      clearInterval(typingInterval);
      console.error("Failed to generate Telegram response:", error);
      await this.safeSendMessage(chatId, "I'm having trouble right now, please try again in a moment");
    }
  }

  private formatUserMessage(message: TelegramBot.Message): string {
    const firstName = message.from?.first_name;
    return firstName ? `User first name: ${firstName}\nMessage: ${message.text}` : message.text ?? "";
  }

  private trimHistory(history: ChatMessage[]): ChatMessage[] {
    const maxMessages = Math.max(1, this.config.conversation.history_limit * 2);
    return history.slice(-maxMessages);
  }

  private startTyping(chatId: number): NodeJS.Timeout {
    void this.bot?.sendChatAction(chatId, "typing").catch((error) => {
      console.warn("Failed to send Telegram typing indicator:", error);
    });

    return setInterval(() => {
      void this.bot?.sendChatAction(chatId, "typing").catch((error) => {
        console.warn("Failed to send Telegram typing indicator:", error);
      });
    }, 4000);
  }

  private async safeSendLongMessage(chatId: number, text: string): Promise<void> {
    const maxTelegramLength = 4096;
    for (let start = 0; start < text.length; start += maxTelegramLength) {
      await this.safeSendMessage(chatId, text.slice(start, start + maxTelegramLength));
    }
  }

  private async safeSendMessage(chatId: number, text: string): Promise<void> {
    try {
      await this.bot?.sendMessage(chatId, text);
    } catch (error) {
      console.error("Telegram sendMessage failed:", error);
    }
  }
}
