import type { CurrentUser } from "../auth/current-user.js";
import type { AgentResult } from "../domain/types.js";
import type { ConversationRepository } from "../repositories/conversation-repository.js";
import { AppError } from "../http/errors.js";
import type { InvestmentAgent } from "../agent/investment-agent.js";

export class ChatService {
  public constructor(
    private readonly repository: ConversationRepository,
    private readonly agent: Pick<InvestmentAgent, "run">,
  ) {}

  public createConversation(user: CurrentUser, title?: string) {
    return this.repository.create(user.id, title?.trim() || "New conversation");
  }

  public listConversations(user: CurrentUser) {
    return this.repository.listByUser(user.id);
  }

  public getConversation(user: CurrentUser, conversationId: string) {
    const conversation = this.repository.findByIdForUser(conversationId, user.id);
    if (!conversation) {
      throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    }
    return conversation;
  }

  public async sendMessage(user: CurrentUser, conversationId: string, message: string) {
    const conversation = this.repository.findByIdForUser(conversationId, user.id);
    if (!conversation) {
      throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    }

    const userMessage = this.repository.addMessage(conversationId, "user", message);
    let agentResult: AgentResult;
    try {
      agentResult = await this.agent.run({
        userId: user.id,
        conversationId,
        message,
        history: conversation.messages,
      });
    } catch (error) {
      // The user message remains persisted for auditability. The client gets a
      // safe provider error and can retry without losing the original input.
      throw error;
    }

    const assistantMessage = this.repository.addMessage(conversationId, "assistant", agentResult.answer);
    return {
      conversationId,
      messageId: assistantMessage.id,
      answer: agentResult.answer,
      sources: agentResult.sources,
      toolCalls: agentResult.toolCalls,
      userMessageId: userMessage.id,
    };
  }

  public deleteConversation(user: CurrentUser, conversationId: string): void {
    if (!this.repository.deleteByIdForUser(conversationId, user.id)) {
      throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    }
  }
}
