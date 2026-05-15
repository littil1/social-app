import "server-only";

import OpenAI from "openai";

export type ModerationTargetType = "post" | "comment";

type AnalyzeReportedContentInput = {
  type: ModerationTargetType;
  id: number;
  text: string;
};

export type ReportedContentModerationResult = {
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
  summary: string;
  checkedAt: string;
  emergencyStatus: "blurred" | null;
};

const EXTREME_CATEGORY_THRESHOLDS: Record<string, number> = {
  "sexual/minors": 0.01,
  "self-harm/instructions": 0.95,
  "violence/graphic": 0.95,
  "illicit/violent": 0.95,
  "heuristic/private-data": 1,
};

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

export function getImportantModerationCategories(
  result: Pick<ReportedContentModerationResult, "categories" | "scores">
) {
  return Object.entries(result.scores)
    .filter(([category, score]) => result.categories[category] || score >= 0.5)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([category, score]) => ({
      category,
      score,
      flagged: !!result.categories[category],
    }));
}

export function mapModerationResultToStatus(
  result: Pick<ReportedContentModerationResult, "categories" | "scores">
) {
  // V1 emergency brake: only auto-blur for clear, high-confidence extreme
  // categories. Admins still make the final keep/blur/remove decision.
  for (const [category, threshold] of Object.entries(EXTREME_CATEGORY_THRESHOLDS)) {
    const score = result.scores[category] ?? 0;
    if (result.categories[category] && score >= threshold) {
      return "blurred" as const;
    }
  }

  return null;
}

function buildModerationSummary(result: {
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
}) {
  const important = getImportantModerationCategories(result);

  if (important.length === 0) {
    return result.flagged
      ? "OpenAI flagged the content, but no category score stood out."
      : "OpenAI did not flag the reported content.";
  }

  const categorySummary = important
    .map(({ category, score }) => `${category} ${(score * 100).toFixed(1)}%`)
    .join(", ");

  return `${result.flagged ? "Flagged" : "Not flagged"}: ${categorySummary}`;
}

function hasClearPrivateDataRisk(text: string) {
  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);
  const hasPhone =
    /(?:\+?\d[\s().-]*){9,}\d/.test(text) && text.replace(/\D/g, "").length >= 10;
  const hasSsnLike = /\b\d{3}-\d{2}-\d{4}\b/.test(text);
  const hasCreditCardLike = /\b(?:\d[ -]*?){13,19}\b/.test(text);

  return hasSsnLike || hasCreditCardLike || (hasEmail && hasPhone);
}

export async function analyzeReportedContent({
  type,
  id,
  text,
}: AnalyzeReportedContentInput): Promise<ReportedContentModerationResult | null> {
  const client = getOpenAIClient();
  const input = text.trim();

  if (!client || input.length === 0) {
    return null;
  }

  try {
    const response = await client.moderations.create({
      model: "omni-moderation-latest",
      input,
    });

    const moderation = response.results[0];

    if (!moderation) {
      return null;
    }

    const privateDataRisk = hasClearPrivateDataRisk(input);
    const result = {
      flagged: moderation.flagged,
      categories: {
        ...(moderation.categories as unknown as Record<string, boolean>),
        ...(privateDataRisk ? { "heuristic/private-data": true } : {}),
      },
      scores: {
        ...(moderation.category_scores as unknown as Record<string, number>),
        ...(privateDataRisk ? { "heuristic/private-data": 1 } : {}),
      },
    };

    return {
      ...result,
      summary: buildModerationSummary(result),
      checkedAt: new Date().toISOString(),
      emergencyStatus: mapModerationResultToStatus(result),
    };
  } catch (error) {
    console.error(`OpenAI moderation failed for ${type}:${id}`, error);
    return null;
  }
}
