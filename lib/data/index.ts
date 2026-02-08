import type { DataProvider } from "@/lib/data/provider";
import { mockProvider } from "@/lib/data/mock";

export function getDataProvider(): DataProvider {
  const provider = process.env.DATA_PROVIDER ?? "mock";
  if (provider === "mock") return mockProvider;
  return mockProvider;
}

