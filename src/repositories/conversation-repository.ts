import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type {
  Conversation,
  ConversationWithMessages,
  Message,
  MessageRole,
} from "../domain/types.js";

export interface ConversationRepository {
  create(userId: string, title: string): Conversation;
  listByUser(userId: string): Conversation[];
  findByIdForUser(id: string, userId: string): ConversationWithMessages | null;
  addMessage(conversationId: string, role: MessageRole, content: string): Message;
  deleteByIdForUser(id: string, userId: string): boolean;
}

type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
};

function mapConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export class SqliteConversationRepository implements ConversationRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public create(userId: string, title: string): Conversation {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: randomUUID(),
      userId,
      title,
      createdAt: now,
      updatedAt: now,
    };

    this.database
      .prepare(
        `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(conversation.id, conversation.userId, conversation.title, now, now);

    return conversation;
  }

  public listByUser(userId: string): Conversation[] {
    const rows = this.database
      .prepare(
        `SELECT id, user_id, title, created_at, updated_at
         FROM conversations
         WHERE user_id = ?
         ORDER BY updated_at DESC`,
      )
      .all(userId) as unknown as ConversationRow[];

    return rows.map(mapConversation);
  }

  public findByIdForUser(id: string, userId: string): ConversationWithMessages | null {
    const conversationRow = this.database
      .prepare(
        `SELECT id, user_id, title, created_at, updated_at
         FROM conversations
         WHERE id = ? AND user_id = ?`,
      )
      .get(id, userId) as unknown as ConversationRow | undefined;

    if (!conversationRow) {
      return null;
    }

    const messageRows = this.database
      .prepare(
        `SELECT id, conversation_id, role, content, created_at
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC`,
      )
      .all(id) as unknown as MessageRow[];

    return {
      ...mapConversation(conversationRow),
      messages: messageRows.map(mapMessage),
    };
  }

  public addMessage(conversationId: string, role: MessageRole, content: string): Message {
    const message: Message = {
      id: randomUUID(),
      conversationId,
      role,
      content,
      createdAt: new Date().toISOString(),
    };

    try {
      this.database.exec("BEGIN");
      this.database
        .prepare(
          `INSERT INTO messages (id, conversation_id, role, content, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(message.id, message.conversationId, message.role, message.content, message.createdAt);
      this.database
        .prepare("UPDATE conversations SET updated_at = ? WHERE id = ?")
        .run(message.createdAt, conversationId);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }

    return message;
  }

  public deleteByIdForUser(id: string, userId: string): boolean {
    const result = this.database
      .prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?")
      .run(id, userId);
    return result.changes > 0;
  }
}

export class InMemoryConversationRepository implements ConversationRepository {
  private readonly conversations = new Map<string, Conversation>();
  private readonly messages = new Map<string, Message[]>();

  public create(userId: string, title: string): Conversation {
    const now = new Date().toISOString();
    const conversation: Conversation = { id: randomUUID(), userId, title, createdAt: now, updatedAt: now };
    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
    return { ...conversation };
  }

  public listByUser(userId: string): Conversation[] {
    return [...this.conversations.values()]
      .filter((conversation) => conversation.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((conversation) => ({ ...conversation }));
  }

  public findByIdForUser(id: string, userId: string): ConversationWithMessages | null {
    const conversation = this.conversations.get(id);
    if (!conversation || conversation.userId !== userId) {
      return null;
    }
    return {
      ...conversation,
      messages: (this.messages.get(id) ?? []).map((message) => ({ ...message })),
    };
  }

  public addMessage(conversationId: string, role: MessageRole, content: string): Message {
    if (!this.conversations.has(conversationId)) {
      throw new Error("Conversation does not exist");
    }
    const message: Message = {
      id: randomUUID(),
      conversationId,
      role,
      content,
      createdAt: new Date().toISOString(),
    };
    this.messages.get(conversationId)?.push(message);
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.updatedAt = message.createdAt;
    }
    return { ...message };
  }

  public deleteByIdForUser(id: string, userId: string): boolean {
    const conversation = this.conversations.get(id);
    if (!conversation || conversation.userId !== userId) {
      return false;
    }
    this.conversations.delete(id);
    this.messages.delete(id);
    return true;
  }
}
