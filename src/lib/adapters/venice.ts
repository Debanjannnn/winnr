import { EventType, type DebateResult, type DomainEvent, type Evidence, type MarketCandidate } from "../domain/types";

export interface VeniceAdapter {
  runDebate(input: {
    market: MarketCandidate;
    evidence: Evidence;
  }): Promise<DebateResult>;
  summarizeAudit(input: { events: DomainEvent[] }): Promise<string>;
}

interface EventPayloadRecord {
  amountUsd?: number;
  asset?: string;
  status?: string;
}

function payloadRecord(event: DomainEvent | undefined): EventPayloadRecord | null {
  if (!event || typeof event.payload !== "object" || event.payload === null) {
    return null;
  }
  return event.payload as EventPayloadRecord;
}

interface VeniceMessage {
  role: "system" | "user";
  content: string;
}

interface VeniceChatChoice {
  message?: {
    content?: string;
  };
}

interface VeniceChatResponse {
  choices?: VeniceChatChoice[];
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for live Venice integration`);
  }
  return value;
}

function optionalNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number`);
  }
  return parsed;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed);
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Venice response did not contain a JSON object");
  }
  return JSON.parse(match[0]);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function clampConfidence(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function debateFromJson(value: unknown): DebateResult {
  if (!value || typeof value !== "object") {
    throw new Error("Venice debate JSON must be an object");
  }
  const record = value as Record<string, unknown>;
  const bull = (record.bull ?? {}) as Record<string, unknown>;
  const bear = (record.bear ?? {}) as Record<string, unknown>;
  const consensus = (record.consensus ?? {}) as Record<string, unknown>;
  return {
    bull: {
      confidence: clampConfidence(bull.confidence, 0.5),
      thesis: typeof bull.thesis === "string" ? bull.thesis : "Bull thesis unavailable.",
      reasons: asStringArray(bull.reasons)
    },
    bear: {
      confidence: clampConfidence(bear.confidence, 0.5),
      thesis: typeof bear.thesis === "string" ? bear.thesis : "Bear thesis unavailable.",
      reasons: asStringArray(bear.reasons)
    },
    consensus: {
      modelProbability: clampConfidence(consensus.modelProbability, 0.5),
      disagreement: clampConfidence(consensus.disagreement, 0.5),
      summary:
        typeof consensus.summary === "string"
          ? consensus.summary
          : "Consensus summary unavailable."
    }
  };
}

async function postVeniceChat({
  messages,
  temperature
}: {
  messages: VeniceMessage[];
  temperature: number;
}): Promise<string> {
  const apiKey = requiredEnv("VENICE_API_KEY");
  const baseUrl = process.env.VENICE_API_BASE_URL ?? "https://api.venice.ai/api/v1";
  const model = process.env.VENICE_MODEL ?? "zai-org-glm-5-1";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature,
      messages,
      venice_parameters: {
        enable_web_search: process.env.VENICE_ENABLE_WEB_SEARCH ?? "off"
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Venice chat failed with ${response.status}: ${body}`);
  }

  const json = (await response.json()) as VeniceChatResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Venice chat response did not include message content");
  }
  return content;
}

export class LiveVeniceAdapter implements VeniceAdapter {
  async runDebate({
    market,
    evidence
  }: {
    market: MarketCandidate;
    evidence: Evidence;
  }): Promise<DebateResult> {
    const content = await postVeniceChat({
      temperature: optionalNumberEnv("VENICE_TEMPERATURE", 0.2),
      messages: [
        {
          role: "system",
          content:
            "You are a prediction-market research committee. Return only valid JSON. Do not promise profit. Be skeptical and quantify uncertainty."
        },
        {
          role: "user",
          content: JSON.stringify({
            task:
              "Run an independent bull/bear debate and consensus for this prediction-market opportunity.",
            requiredShape: {
              bull: {
                confidence: "number between 0 and 1",
                thesis: "string",
                reasons: ["string"]
              },
              bear: {
                confidence: "number between 0 and 1",
                thesis: "string",
                reasons: ["string"]
              },
              consensus: {
                modelProbability: "number between 0 and 1",
                disagreement: "number between 0 and 1",
                summary: "string"
              }
            },
            market,
            evidence
          })
        }
      ]
    });
    return debateFromJson(extractJsonObject(content));
  }

  async summarizeAudit({ events }: { events: DomainEvent[] }): Promise<string> {
    const payment = payloadRecord(events.find((event) => event.type === EventType.X402_PAYMENT_COMPLETED));
    const risk = payloadRecord(events.find((event) => event.type === EventType.RISK_DECISION_ISSUED));
    const execution = payloadRecord(events.find((event) => event.type === EventType.EXECUTION_CONFIRMED));
    const content = await postVeniceChat({
      temperature: optionalNumberEnv("VENICE_AUDIT_TEMPERATURE", 0.1),
      messages: [
        {
          role: "system",
          content:
            "You write concise audit summaries for autonomous onchain agent workflows. Mention permissions, x402 evidence, A2A handoffs, risk, and relayer status when present."
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Summarize this workflow in 4-6 sentences. Do not use markdown.",
            highlights: { payment, risk, execution },
            events
          })
        }
      ]
    });
    return content.trim();
  }
}

export function createVeniceAdapter(): VeniceAdapter {
  return new LiveVeniceAdapter();
}
