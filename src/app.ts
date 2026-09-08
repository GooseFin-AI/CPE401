import Fastify, { type FastifyInstance } from "fastify";
import { config } from "./config.js";
import { getCurrentUser } from "./auth/current-user.js";
import { createDatabase } from "./db/sqlite.js";
import type { AgentResult } from "./domain/types.js";
import { InvestmentAgent } from "./agent/investment-agent.js";
import { OpenAiProvider } from "./agent/provider.js";
import { MockMarketTool, MockNewsTool } from "./agent/tools.js";
import { AppError } from "./http/errors.js";
import { ChatService } from "./services/chat-service.js";
import { SqliteConversationRepository, type ConversationRepository } from "./repositories/conversation-repository.js";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";

export interface AppDependencies {
  repository?: ConversationRepository;
  agent?: { run(input: { userId: string; conversationId: string; message: string; history: import("./domain/types.js").Message[] }): Promise<AgentResult> };
  logger?: boolean;
}

const createConversationBody = z.object({ title: z.string().trim().max(120).optional() }).optional();
const sendMessageBody = z.object({ message: z.string().trim().min(1, "message must not be empty").max(4_000) });
const params = z.object({ id: z.string().min(1) });

export async function buildApp(dependencies: AppDependencies = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: dependencies.logger ?? true });
  let ownedDatabase: DatabaseSync | undefined;

  const repository = dependencies.repository ?? (() => {
    ownedDatabase = createDatabase(config.databasePath);
    return new SqliteConversationRepository(ownedDatabase);
  })();

  const agent = dependencies.agent ?? new InvestmentAgent(
    new OpenAiProvider({
      apiKey: config.aiApiKey,
      model: config.aiModel,
      reasoningEffort: config.aiReasoningEffort,
      timeoutMs: config.aiTimeoutMs,
    }),
    new MockMarketTool(),
    new MockNewsTool(),
    app.log,
  );
  const chatService = new ChatService(repository, agent);

  app.get("/health", async () => ({ status: "ok" }));

  app.post("/api/conversations", async (request, reply) => {
    const parsed = createConversationBody.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError(400, "INVALID_REQUEST", parsed.error.issues[0]?.message ?? "Invalid request body.");
    }
    const conversation = chatService.createConversation(getCurrentUser(request), parsed.data?.title);
    return reply.code(201).send(conversation);
  });

  app.get("/api/conversations", async (request) => {
    return chatService.listConversations(getCurrentUser(request));
  });

  app.get("/api/conversations/:id", async (request) => {
    const parsed = params.safeParse(request.params);
    if (!parsed.success) {
      throw new AppError(400, "INVALID_REQUEST", "Invalid conversation id.");
    }
    return chatService.getConversation(getCurrentUser(request), parsed.data.id);
  });

  app.post("/api/conversations/:id/messages", async (request, reply) => {
    const parsedParams = params.safeParse(request.params);
    const parsedBody = sendMessageBody.safeParse(request.body);
    if (!parsedParams.success || !parsedBody.success) {
      throw new AppError(400, "INVALID_REQUEST", parsedBody.error?.issues[0]?.message ?? "Invalid request.");
    }
    const result = await chatService.sendMessage(getCurrentUser(request), parsedParams.data.id, parsedBody.data.message);
    return reply.code(201).send(result);
  });

  app.delete("/api/conversations/:id", async (request, reply) => {
    const parsed = params.safeParse(request.params);
    if (!parsed.success) {
      throw new AppError(400, "INVALID_REQUEST", "Invalid conversation id.");
    }
    chatService.deleteConversation(getCurrentUser(request), parsed.data.id);
    return reply.code(204).send();
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
    }

    const providerError = error as { code?: string; statusCode?: number };
    if (providerError.code?.startsWith("AI_") && providerError.statusCode) {
      request.log.error({ err: error }, "chat.ai_error");
      return reply.code(providerError.statusCode).send({
        error: { code: providerError.code, message: error instanceof Error ? error.message : "AI provider request failed." },
      });
    }

    request.log.error({ err: error }, "chat.unexpected_error");
    return reply.code(500).send({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected server error." } });
  });

  app.addHook("onClose", async () => {
    ownedDatabase?.close();
  });

  return app;
}
