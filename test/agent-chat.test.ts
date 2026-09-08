import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { InvestmentAgent } from "../src/agent/investment-agent.js";
import type { AiGenerateInput, AiGenerateResult, AiProvider } from "../src/agent/provider.js";
import { InMemoryConversationRepository } from "../src/repositories/conversation-repository.js";
import type { MarketTool, NewsTool } from "../src/agent/tools.js";

const openApps: Awaited<ReturnType<typeof buildApp>>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

describe("Agent Chat API", () => {
  it("creates and lists conversations for the current mock user", async () => {
    const app = await buildApp({ repository: new InMemoryConversationRepository(), logger: false, agent: fakeAgent() });
    openApps.push(app);

    const created = await app.inject({
      method: "POST",
      url: "/api/conversations",
      headers: { "x-dev-user-id": "user-a" },
      payload: { title: "NVDA research" },
    });
    expect(created.statusCode).toBe(201);

    const listed = await app.inject({ method: "GET", url: "/api/conversations", headers: { "x-dev-user-id": "user-a" } });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toHaveLength(1);
    expect(listed.json()[0].userId).toBe("user-a");
  });

  it("saves user and assistant messages and retrieves history", async () => {
    const agent = fakeAgent("The market data provider is unavailable, so I will not guess.");
    const app = await buildApp({ repository: new InMemoryConversationRepository(), logger: false, agent });
    openApps.push(app);

    const created = await app.inject({ method: "POST", url: "/api/conversations", headers: { "x-dev-user-id": "user-a" } });
    const id = created.json().id as string;
    const sent = await app.inject({
      method: "POST",
      url: `/api/conversations/${id}/messages`,
      headers: { "x-dev-user-id": "user-a" },
      payload: { message: "What is happening with NVDA today?" },
    });

    expect(sent.statusCode).toBe(201);
    expect(sent.json()).toMatchObject({ conversationId: id, answer: expect.stringContaining("unavailable") });

    const history = await app.inject({ method: "GET", url: `/api/conversations/${id}`, headers: { "x-dev-user-id": "user-a" } });
    expect(history.statusCode).toBe(200);
    expect(history.json().messages.map((message: { role: string }) => message.role)).toEqual(["user", "assistant"]);
  });

  it("prevents another user from accessing a conversation", async () => {
    const app = await buildApp({ repository: new InMemoryConversationRepository(), logger: false, agent: fakeAgent() });
    openApps.push(app);
    const created = await app.inject({ method: "POST", url: "/api/conversations", headers: { "x-dev-user-id": "user-a" } });
    const id = created.json().id as string;

    const response = await app.inject({ method: "GET", url: `/api/conversations/${id}`, headers: { "x-dev-user-id": "user-b" } });
    expect(response.statusCode).toBe(404);
  });

  it("rejects empty messages", async () => {
    const app = await buildApp({ repository: new InMemoryConversationRepository(), logger: false, agent: fakeAgent() });
    openApps.push(app);
    const created = await app.inject({ method: "POST", url: "/api/conversations", headers: { "x-dev-user-id": "user-a" } });
    const id = created.json().id as string;

    const response = await app.inject({
      method: "POST",
      url: `/api/conversations/${id}/messages`,
      headers: { "x-dev-user-id": "user-a" },
      payload: { message: "   " },
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("InvestmentAgent", () => {
  it("calls Market and News tools and returns structured tool metadata", async () => {
    const marketTool: MarketTool = {
      getQuote: vi.fn(async () => ({
        symbol: "NVDA",
        available: false,
        price: null,
        changePercent: null,
        currency: "USD",
        asOf: null,
        sources: [],
        message: "unavailable",
      })),
    };
    const newsTool: NewsTool = {
      searchNews: vi.fn(async () => ({ query: "NVDA", available: false, items: [], sources: [], message: "unavailable" })),
    };
    const provider = new QueueProvider([
      {
        text: "",
        toolCalls: [
          { callId: "market-1", name: "get_market_quote", arguments: { symbol: "NVDA" } },
          { callId: "news-1", name: "search_news", arguments: { query: "NVDA" } },
        ],
        rawOutputItems: [{ type: "function_call", name: "get_market_quote" }, { type: "function_call", name: "search_news" }],
      },
      { text: "Current market and news data are unavailable, so I will not guess.", toolCalls: [], rawOutputItems: [] },
    ]);
    const agent = new InvestmentAgent(provider, marketTool, newsTool);
    const result = await agent.run({ userId: "user-a", conversationId: "conversation-1", message: "What is happening with NVDA?", history: [] });

    expect(marketTool.getQuote).toHaveBeenCalledWith("NVDA");
    expect(newsTool.searchNews).toHaveBeenCalledWith("NVDA");
    expect(result.toolCalls.map((call) => call.name)).toEqual(["get_market_quote", "search_news"]);
    expect(result.answer).toContain("will not guess");
  });

  it("does not fabricate data when a tool fails", async () => {
    const provider = new QueueProvider([
      {
        text: "",
        toolCalls: [{ callId: "market-1", name: "get_market_quote", arguments: { symbol: "NVDA" } }],
        rawOutputItems: [{ type: "function_call", name: "get_market_quote" }],
      },
      { text: "The current market data is unavailable because the tool failed.", toolCalls: [], rawOutputItems: [] },
    ]);
    const failingMarket: MarketTool = { getQuote: vi.fn(async () => { throw new Error("provider down"); }) };
    const news: NewsTool = { searchNews: vi.fn(async (query) => ({ query, available: false, items: [], sources: [] })) };
    const agent = new InvestmentAgent(provider, failingMarket, news);
    const result = await agent.run({ userId: "user-a", conversationId: "conversation-1", message: "NVDA price?", history: [] });

    expect(result.answer).toContain("unavailable");
    expect(result.toolCalls[0]?.status).toBe("failed");
  });
});

function fakeAgent(answer = "Test answer") {
  return { run: vi.fn(async () => ({ answer, sources: [], toolCalls: [] })) };
}

class QueueProvider implements AiProvider {
  public readonly model = "test-model";
  private index = 0;

  public constructor(private readonly results: AiGenerateResult[]) {}

  public async generate(_input: AiGenerateInput): Promise<AiGenerateResult> {
    return this.results[Math.min(this.index++, this.results.length - 1)] as AiGenerateResult;
  }
}
