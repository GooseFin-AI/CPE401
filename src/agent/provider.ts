import OpenAI from "openai";
import type { ReasoningEffort } from "../config.js";
import type { Message } from "../domain/types.js";

export interface ProviderToolCall {
  callId: string;
  name: string;
  arguments: unknown;
}

export interface AiGenerateInput {
  instructions: string;
  history: Message[];
  message: string;
  tools: readonly unknown[];
  continuation?: readonly unknown[];
}

export interface AiGenerateResult {
  text: string;
  toolCalls: ProviderToolCall[];
  rawOutputItems: unknown[];
}

export interface AiProvider {
  readonly model: string;
  generate(input: AiGenerateInput): Promise<AiGenerateResult>;
}

export class AiProviderError extends Error {
  public constructor(
    message: string,
    public readonly code: "AI_NOT_CONFIGURED" | "AI_RATE_LIMIT" | "AI_TIMEOUT" | "AI_PROVIDER_ERROR",
    public readonly statusCode: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AiProviderError";
  }
}

export interface OpenAiProviderOptions {
  apiKey: string | undefined;
  model: string;
  reasoningEffort: ReasoningEffort;
  timeoutMs: number;
}

export class OpenAiProvider implements AiProvider {
  public readonly model: string;
  private readonly client: OpenAI | null;
  private readonly reasoningEffort: ReasoningEffort;
  private readonly timeoutMs: number;

  public constructor(options: OpenAiProviderOptions) {
    this.model = options.model;
    this.reasoningEffort = options.reasoningEffort;
    this.timeoutMs = options.timeoutMs;
    this.client = options.apiKey
      ? new OpenAI({ apiKey: options.apiKey, maxRetries: 0, timeout: options.timeoutMs })
      : null;
  }

  public async generate(input: AiGenerateInput): Promise<AiGenerateResult> {
    if (!this.client) {
      throw new AiProviderError(
        "AI provider is not configured. Set OPENAI_API_KEY (or api_key for local development).",
        "AI_NOT_CONFIGURED",
        503,
      );
    }

    const inputItems = [
      ...input.history.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      })),
      { role: "user", content: input.message },
      ...(input.continuation ?? []),
    ];

    try {
      const response = await this.client.responses.create({
        model: this.model,
        instructions: input.instructions,
        input: inputItems as never,
        // The SDK type lags the currently documented model enum (`none` is
        // accepted by the API), so retain the explicit runtime value here.
        reasoning: { effort: this.reasoningEffort as never },
        tools: input.tools as never,
        tool_choice: "auto",
        max_output_tokens: 1200,
        store: false,
      });

      const outputItems = (response.output ?? []) as unknown as Array<Record<string, unknown>>;
      const toolCalls: ProviderToolCall[] = [];

      for (const item of outputItems) {
        if (item.type !== "function_call" || typeof item.name !== "string") {
          continue;
        }

        let parsedArguments: unknown = {};
        try {
          parsedArguments = typeof item.arguments === "string" ? JSON.parse(item.arguments) : item.arguments ?? {};
        } catch {
          parsedArguments = item.arguments;
        }

        toolCalls.push({
          callId: typeof item.call_id === "string" ? item.call_id : `${item.name}-${Date.now()}`,
          name: item.name,
          arguments: parsedArguments,
        });
      }

      return {
        text: response.output_text?.trim() ?? "",
        toolCalls,
        rawOutputItems: outputItems,
      };
    } catch (error) {
      throw this.toProviderError(error);
    }
  }

  private toProviderError(error: unknown): AiProviderError {
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : undefined;
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : "Unknown AI provider error";

    if (status === 429) {
      return new AiProviderError("AI provider rate limit reached.", "AI_RATE_LIMIT", 429, { cause: error });
    }
    if (name.toLowerCase().includes("timeout") || name.toLowerCase().includes("abort") || message.toLowerCase().includes("timeout")) {
      return new AiProviderError("AI provider request timed out.", "AI_TIMEOUT", 504, { cause: error });
    }
    return new AiProviderError("AI provider request failed.", "AI_PROVIDER_ERROR", 502, { cause: error });
  }
}
