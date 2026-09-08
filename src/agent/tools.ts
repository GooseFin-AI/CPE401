import { z } from "zod";
import type { Source } from "../domain/types.js";

export interface MarketQuoteResult {
  symbol: string;
  available: boolean;
  price: number | null;
  changePercent: number | null;
  currency: string;
  asOf: string | null;
  sources: Source[];
  message?: string;
}

export interface NewsItem {
  title: string;
  url: string;
  publisher: string;
  publishedAt: string | null;
  summary?: string;
}

export interface NewsSearchResult {
  query: string;
  available: boolean;
  items: NewsItem[];
  sources: Source[];
  message?: string;
}

export interface MarketTool {
  getQuote(symbol: string): Promise<MarketQuoteResult>;
}

export interface NewsTool {
  searchNews(query: string): Promise<NewsSearchResult>;
}

export const marketQuoteArguments = z.object({
  symbol: z.string().trim().min(1).max(12),
});

export const newsSearchArguments = z.object({
  query: z.string().trim().min(1).max(200),
});

export const marketQuoteResultSchema = z.object({
  symbol: z.string(),
  available: z.boolean(),
  price: z.number().nullable(),
  changePercent: z.number().nullable(),
  currency: z.string(),
  asOf: z.string().nullable(),
  sources: z.array(z.object({ title: z.string(), url: z.string(), publishedAt: z.string().optional() })),
  message: z.string().optional(),
});

export const newsSearchResultSchema = z.object({
  query: z.string(),
  available: z.boolean(),
  items: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      publisher: z.string(),
      publishedAt: z.string().nullable(),
      summary: z.string().optional(),
    }),
  ),
  sources: z.array(z.object({ title: z.string(), url: z.string(), publishedAt: z.string().optional() })),
  message: z.string().optional(),
});

/** Development adapter until a real Market API is selected by the team. */
export class MockMarketTool implements MarketTool {
  public async getQuote(symbol: string): Promise<MarketQuoteResult> {
    return {
      symbol: symbol.toUpperCase(),
      available: false,
      price: null,
      changePercent: null,
      currency: "USD",
      asOf: null,
      sources: [],
      message: "Market data provider is not configured yet; current quote is unavailable.",
    };
  }
}

/** Development adapter until a real News API is selected by the team. */
export class MockNewsTool implements NewsTool {
  public async searchNews(query: string): Promise<NewsSearchResult> {
    return {
      query,
      available: false,
      items: [],
      sources: [],
      message: "News provider is not configured yet; recent news is unavailable.",
    };
  }
}
