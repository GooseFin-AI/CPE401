import { z } from "zod";
import type { Message } from "../domain/types.js";
import type { AgentResult, Source, ToolCallSummary } from "../domain/types.js";
import {
  marketQuoteArguments,
  marketQuoteResultSchema,
  newsSearchArguments,
  newsSearchResultSchema,
  type MarketTool,
  type NewsTool,
} from "./tools.js";
import type { AiProvider, ProviderToolCall } from "./provider.js";
import { INVESTMENT_AGENT_SYSTEM_PROMPT } from "./system-prompt.js";

const toolDefinitions = [
  {
    type: "function",
    name: "get_market_quote",
    description: "Retrieve current market quote data for a stock symbol.",
    parameters: {
      type: "object",
      properties: { symbol: { type: "string", description: "Ticker symbol, for example NVDA" } },
      required: ["symbol"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "search_news",
    description: "Search recent financial news for a company, stock symbol, or market topic.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Company, ticker, or financial topic" } },
      required: ["query"],
      additionalProperties: false,
    },
    strict: true,
  },
] as const;

export interface InvestmentAgentInput {
  userId: string;
  conversationId: string;
  message: string;
  history: Message[];
}

interface ToolExecutionResult {
  result: unknown;
  status: "completed" | "failed";
  sources: Source[];
}

export class InvestmentAgent {
  public constructor(
    private readonly provider: AiProvider,
    private readonly marketTool: MarketTool,
    private readonly newsTool: NewsTool,
    private readonly logger: AgentLogger = console,
  ) {}

  public async run(input: InvestmentAgentInput): Promise<AgentResult> {
    const startedAt = Date.now();
    const toolCalls: ToolCallSummary[] = [];
    const sources: Source[] = [];
    let continuation: unknown[] = [];
    let responseText = "";

    this.logger.info({ conversationId: input.conversationId, userId: input.userId, model: this.provider.model }, "agent.start");

    for (let iteration = 0; iteration < 4; iteration += 1) {
      const response = await this.provider.generate({
        instructions: INVESTMENT_AGENT_SYSTEM_PROMPT,
        history: input.history,
        message: input.message,
        tools: toolDefinitions,
        continuation,
      });
      responseText = response.text;

      if (response.toolCalls.length === 0) {
        const answer = responseText || "I could not generate an answer for that request.";
        this.logger.info(
          { conversationId: input.conversationId, userId: input.userId, model: this.provider.model, durationMs: Date.now() - startedAt, toolsCalled: toolCalls.map((call) => call.name) },
          "agent.complete",
        );
        return { answer, sources, toolCalls };
      }

      continuation = [...continuation, ...response.rawOutputItems];
      for (const toolCall of response.toolCalls) {
        const toolStartedAt = Date.now();
        const execution = await this.executeTool(toolCall);
        const durationMs = Date.now() - toolStartedAt;
        toolCalls.push({
          name: toolCall.name,
          arguments: toolCall.arguments,
          status: execution.status,
          durationMs,
        });
        sources.push(...execution.sources);
        this.logger.info({ conversationId: input.conversationId, userId: input.userId, tool: toolCall.name, durationMs }, "agent.tool");
        if (execution.status === "failed") {
          this.logger.error?.({ conversationId: input.conversationId, userId: input.userId, tool: toolCall.name }, "agent.tool_error");
        }
        continuation.push({
          type: "function_call_output",
          call_id: toolCall.callId,
          output: JSON.stringify(execution.result),
        });
      }

      // The provider receives the accumulated Responses API output items on
      // the next iteration, without exposing SDK details to the Agent.
    }

    return {
      answer: responseText || "I could not complete the analysis.",
      sources,
      toolCalls,
    };
  }

  private async executeTool(toolCall: ProviderToolCall): Promise<ToolExecutionResult> {
    try {
      if (toolCall.name === "get_market_quote") {
        const args = marketQuoteArguments.parse(toolCall.arguments);
        const result = marketQuoteResultSchema.parse(await this.marketTool.getQuote(args.symbol));
        return { result, status: "completed", sources: result.sources };
      }

      if (toolCall.name === "search_news") {
        const args = newsSearchArguments.parse(toolCall.arguments);
        const result = newsSearchResultSchema.parse(await this.newsTool.searchNews(args.query));
        return { result, status: "completed", sources: result.sources };
      }

      return {
        result: { available: false, error: `Unknown tool: ${toolCall.name}` },
        status: "failed",
        sources: [],
      };
    } catch (error) {
      const message = error instanceof z.ZodError
        ? "Tool returned malformed data or arguments. Current data is unavailable."
        : "Tool execution failed. Current data is unavailable.";
      return {
        result: { available: false, error: message },
        status: "failed",
        sources: [],
      };
    }
  }
}

export interface AgentLogger {
  info(meta: unknown, message?: string): void;
  error?(meta: unknown, message?: string): void;
}
