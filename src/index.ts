import "dotenv/config";
import { ChatBot } from "./bot";
import { TelegramAdapter } from "./adapters/telegram";
import { WebAdapter, type PlatformAdapter } from "./adapters/web";
import { loadConfig } from "./config/loader";
import { KnowledgeLoader } from "./knowledge";

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    const knowledgeLoader = new KnowledgeLoader(config);
    await knowledgeLoader.load();
    knowledgeLoader.registerSighupReload();

    const chatBot = new ChatBot(config, knowledgeLoader);
    const platform = process.env.CHATBOT_PLATFORM ?? config.platform;
    const adapter: PlatformAdapter = platform === "telegram"
      ? new TelegramAdapter(config, chatBot)
      : new WebAdapter(config, chatBot);

    const shutdown = async (signal: NodeJS.Signals) => {
      console.info(`Received ${signal}. Shutting down...`);
      await adapter.stop();
      process.exit(0);
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));

    await adapter.start();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();
