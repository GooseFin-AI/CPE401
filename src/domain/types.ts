export type MessageRole = "user" | "assistant" | "tool";

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface Source {
  title: string;
  url: string;
  publishedAt?: string;
}

export interface ToolCallSummary {
  name: string;
  arguments: unknown;
  status: "completed" | "failed";
  durationMs: number;
}

export interface AgentResult {
  answer: string;
  sources: Source[];
  toolCalls: ToolCallSummary[];
}
