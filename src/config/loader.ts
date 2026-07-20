import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export type PlatformName = "telegram" | "web";

export interface BotConfig {
  bot_name: string;
  persona: string;
  rules: string[];
  knowledge: {
    enabled: boolean;
    folder: string;
    max_chars: number;
  };
  conversation: {
    history_limit: number;
    language: string;
  };
  platform: PlatformName;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`config.yaml field "${key}" must be a non-empty string`);
  }
  return value;
}

function requirePositiveInteger(data: Record<string, unknown>, key: string): number {
  const value = data[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`config.yaml field "${key}" must be a positive integer`);
  }
  return value;
}

function requireBoolean(data: Record<string, unknown>, key: string): boolean {
  const value = data[key];
  if (typeof value !== "boolean") {
    throw new Error(`config.yaml field "${key}" must be true or false`);
  }
  return value;
}

export function loadConfig(configPath = path.resolve(process.cwd(), "config.yaml")): BotConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing config file at ${configPath}`);
  }

  const parsed = yaml.load(fs.readFileSync(configPath, "utf8"));
  if (!isRecord(parsed)) {
    throw new Error("config.yaml must contain a YAML object");
  }

  const rules = parsed.rules;
  if (!Array.isArray(rules) || rules.some((rule) => typeof rule !== "string" || rule.trim() === "")) {
    throw new Error('config.yaml field "rules" must be a list of non-empty strings');
  }

  const knowledge = parsed.knowledge;
  if (!isRecord(knowledge)) {
    throw new Error('config.yaml field "knowledge" must be an object');
  }

  const conversation = parsed.conversation;
  if (!isRecord(conversation)) {
    throw new Error('config.yaml field "conversation" must be an object');
  }

  const platform = requireString(parsed, "platform");
  if (platform !== "telegram" && platform !== "web") {
    throw new Error('config.yaml field "platform" must be either "telegram" or "web"');
  }

  return {
    bot_name: requireString(parsed, "bot_name"),
    persona: requireString(parsed, "persona"),
    rules: rules.map((rule) => rule.trim()),
    knowledge: {
      enabled: requireBoolean(knowledge, "enabled"),
      folder: requireString(knowledge, "folder"),
      max_chars: requirePositiveInteger(knowledge, "max_chars")
    },
    conversation: {
      history_limit: requirePositiveInteger(conversation, "history_limit"),
      language: requireString(conversation, "language")
    },
    platform
  };
}
