import path from "node:path";
import { existsSync } from "node:fs";
import dotenv from "dotenv";

function loadEnvironment(): void {
  const paths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env.local"),
  ];

  for (const envPath of paths) {
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}

loadEnvironment();

const reasoningEfforts = ["none", "low", "medium", "high", "xhigh", "max"] as const;
export type ReasoningEffort = (typeof reasoningEfforts)[number];

function getReasoningEffort(value: string | undefined): ReasoningEffort {
  const effort = value ?? "medium";
  if ((reasoningEfforts as readonly string[]).includes(effort)) {
    return effort as ReasoningEffort;
  }
  throw new Error(`Invalid AI_REASONING_EFFORT: ${effort}`);
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "127.0.0.1",
  databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "./data/agent-chat.db"),
  devUserId: process.env.DEV_USER_ID ?? "dev-user-001",
  aiApiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY ?? process.env.api_key,
  aiModel: process.env.AI_MODEL ?? "gpt-5.6-luna",
  aiReasoningEffort: getReasoningEffort(process.env.AI_REASONING_EFFORT),
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 30_000),
};
