import fs from "node:fs/promises";
import path from "node:path";
import pdf from "pdf-parse";
import type { BotConfig } from "../config/loader";

export interface KnowledgeDocument {
  name: string;
  content: string;
}

const SUPPORTED_EXTENSIONS = new Set([".txt", ".md", ".pdf"]);

export class KnowledgeLoader {
  private combinedKnowledge = "";

  constructor(private readonly config: BotConfig) {}

  get content(): string {
    return this.combinedKnowledge;
  }

  async load(): Promise<string> {
    if (!this.config.knowledge.enabled) {
      this.combinedKnowledge = "";
      return this.combinedKnowledge;
    }

    const folderPath = path.resolve(process.cwd(), this.config.knowledge.folder);
    let entries: string[];

    try {
      entries = await fs.readdir(folderPath);
    } catch (error) {
      console.warn(`Knowledge folder could not be read at ${folderPath}:`, error);
      this.combinedKnowledge = "";
      return this.combinedKnowledge;
    }

    const documents: KnowledgeDocument[] = [];

    for (const entry of entries.sort()) {
      if (entry.toLowerCase() === "readme.md") {
        continue;
      }

      const extension = path.extname(entry).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(extension)) {
        continue;
      }

      const filePath = path.join(folderPath, entry);
      try {
        const content = extension === ".pdf"
          ? await this.readPdf(filePath)
          : await fs.readFile(filePath, "utf8");

        const trimmed = content.trim();
        if (trimmed) {
          documents.push({ name: entry, content: trimmed });
        }
      } catch (error) {
        console.warn(`Skipping knowledge document "${entry}" because it failed to parse:`, error);
      }
    }

    const combined = documents
      .map((document) => `--- Document: ${document.name} ---\n${document.content}`)
      .join("\n\n");

    this.combinedKnowledge = this.trimKnowledge(combined, this.config.knowledge.max_chars);
    return this.combinedKnowledge;
  }

  registerSighupReload(): void {
    process.on("SIGHUP", () => {
      void this.load()
        .then(() => console.info("Knowledge documents reloaded."))
        .catch((error) => console.error("Knowledge reload failed:", error));
    });
  }

  private async readPdf(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const result = await pdf(buffer);
    return result.text;
  }

  private trimKnowledge(content: string, maxChars: number): string {
    if (content.length <= maxChars) {
      return content;
    }

    return `${content.slice(0, maxChars)}\n\n[Knowledge truncated to ${maxChars} characters]`;
  }
}
