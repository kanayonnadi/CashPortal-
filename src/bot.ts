import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import type { BotConfig } from "./config/loader";
import type { KnowledgeLoader } from "./knowledge";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export class ChatBot {
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(
    private readonly config: BotConfig,
    private readonly knowledgeLoader: KnowledgeLoader,
    apiKey = process.env.OPENAI_API_KEY
  ) {
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY in environment");
    }

    this.openai = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
  }

  buildSystemPrompt(): string {
    const rules = this.config.rules.map((rule, index) => `${index + 1}. ${rule}`).join("\n");
    const sections = [
      `[PERSONA]\n${this.config.persona}`,
      `[RULES]\n${rules}`
    ];

    const knowledge = this.knowledgeLoader.content.trim();
    if (this.config.knowledge.enabled && knowledge) {
      sections.push(
        `[KNOWLEDGE]\n` +
          "The following documents contain information you should use to answer questions accurately.\n" +
          "If the answer is in the documents, prefer that over general knowledge.\n\n" +
          knowledge
      );
    }

    return sections.join("\n\n");
  }

  async reply(history: ChatMessage[]): Promise<string> {
    const input: ResponseInput = history.map((message) => ({
      role: message.role,
      content: message.content
    }));

    return this.withRetries(async () => {
      const response = await this.openai.responses.create({
        model: this.model,
        instructions: this.buildSystemPrompt(),
        input,
        max_output_tokens: 1024
      });

      const text = response.output_text.trim();

      return text || "I'm sorry, I could not generate a response.";
    });
  }

  private async withRetries<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!this.isRateLimitError(error) || attempt === retries) {
          break;
        }

        const backoffMs = 500 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError;
  }

  private isRateLimitError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
      return false;
    }

    const maybeError = error as { status?: number; name?: string; message?: string };
    return maybeError.status === 429 ||
      maybeError.name === "RateLimitError" ||
      Boolean(maybeError.message?.toLowerCase().includes("rate limit"));
  }
}
