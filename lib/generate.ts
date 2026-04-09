import Anthropic from "@anthropic-ai/sdk";
import sanitizeHtml from "sanitize-html";
import type { Project, BlogPost, ContentGuideline } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-6";
const MAX_RETRIES = 3;

// ─── HTML Sanitization ───────────────────────────────────────────────────────

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "h1", "h2", "h3", "h4", "h5", "h6",
      "img", "figure", "figcaption",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "width", "height", "class"],
      a: ["href", "title", "target", "rel"],
      "*": ["class", "id"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Strip all event handlers
    allowedSchemesByTag: {},
    disallowedTagsMode: "discard",
  });
}

// ─── Pass 1: Outline + SEO metadata ─────────────────────────────────────────

interface OutlineResult {
  outline: string[];
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  slug: string;
  excerpt: string;
}

async function generateOutline(
  topic: string,
  project: Project,
  guidelines: ContentGuideline | null
): Promise<OutlineResult> {
  const guidelinesText = guidelines
    ? `
Tone: ${guidelines.tone ?? "professional"}
Target audience: ${guidelines.targetAudience ?? "general readers"}
Content pillars: ${guidelines.contentPillars?.join(", ") ?? "not specified"}
Writing style: ${guidelines.writingStyle ?? "informative"}
Avoid topics: ${guidelines.avoidTopics?.join(", ") ?? "none"}
Custom instructions: ${guidelines.customInstructions ?? "none"}
`
    : "";

  const prompt = `You are an expert SEO content strategist. Create a detailed blog post outline.

Blog: ${project.name} (${project.wpUrl})
Topic: ${topic}
${guidelinesText}

Return a JSON object with exactly this structure:
{
  "outline": ["Section 1 heading", "Section 2 heading", ...],
  "seoTitle": "SEO-optimized title (50-60 chars)",
  "seoDescription": "Meta description (150-160 chars)",
  "focusKeyword": "primary keyword phrase",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence excerpt for the post"
}

Return ONLY the JSON, no markdown, no explanation.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Pass 1: No JSON found in response");

  const parsed = JSON.parse(jsonMatch[0]) as OutlineResult;
  if (!parsed.outline || !Array.isArray(parsed.outline)) {
    throw new Error("Pass 1: Invalid outline structure");
  }
  return parsed;
}

// ─── Pass 2: Full HTML body with retries ─────────────────────────────────────

async function generateBody(
  topic: string,
  outline: OutlineResult,
  project: Project,
  guidelines: ContentGuideline | null,
  previousErrors: string[] = []
): Promise<{ content: string; ctaText: string; ctaUrl: string; ctaLabel: string }> {
  const guidelinesText = guidelines
    ? `Tone: ${guidelines.tone ?? "professional"}. Target audience: ${guidelines.targetAudience ?? "general readers"}. Style: ${guidelines.writingStyle ?? "informative"}. ${guidelines.customInstructions ?? ""}`
    : "";

  const errorFeedback =
    previousErrors.length > 0
      ? `\n\nPREVIOUS ATTEMPT ERRORS (fix these):\n${previousErrors.join("\n")}`
      : "";

  const prompt = `You are an expert blog writer. Write a complete, high-quality blog post in HTML.

Blog: ${project.name}
Topic: ${topic}
SEO Title: ${outline.seoTitle}
Focus Keyword: ${outline.focusKeyword}
Outline sections: ${outline.outline.join(", ")}
${guidelinesText}
${errorFeedback}

Rules:
- Write complete HTML (use h2/h3 for sections, p, ul, ol, blockquote, etc.)
- Include the focus keyword naturally 3-5 times
- Minimum 800 words
- Do NOT include <html>, <head>, <body> tags — just the content HTML
- Do NOT include a CTA section — output that separately
- End the JSON with a ctaText, ctaUrl, ctaLabel

Return a JSON object:
{
  "content": "<h2>Introduction</h2><p>...</p>...",
  "ctaText": "Ready to get started?",
  "ctaUrl": "${project.wpUrl}",
  "ctaLabel": "Learn More"
}

Return ONLY the JSON, no markdown fences.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Pass 2: No JSON found in response");

  const parsed = JSON.parse(jsonMatch[0]) as {
    content: string;
    ctaText: string;
    ctaUrl: string;
    ctaLabel: string;
  };

  // Validate
  const errors: string[] = [];
  if (!parsed.content || parsed.content.length < 500) {
    errors.push("Content is too short (minimum 500 chars)");
  }
  if (!parsed.content.includes("<h")) {
    errors.push("Content must include HTML heading tags");
  }
  if (!parsed.content.toLowerCase().includes(outline.focusKeyword.toLowerCase())) {
    errors.push(`Content must include focus keyword: "${outline.focusKeyword}"`);
  }

  if (errors.length > 0) {
    throw new ValidationError(errors, parsed);
  }

  return parsed;
}

class ValidationError extends Error {
  constructor(
    public readonly errors: string[],
    public readonly partial: { content: string; ctaText: string; ctaUrl: string; ctaLabel: string }
  ) {
    super(errors.join("; "));
  }
}

// ─── Main two-pass generation ────────────────────────────────────────────────

export interface GenerationResult {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  ctaText: string;
  ctaUrl: string;
  ctaLabel: string;
}

export async function generateBlogPost(
  topic: string,
  project: Project,
  guidelines: ContentGuideline | null
): Promise<GenerationResult> {
  // Pass 1: Outline
  const outline = await generateOutline(topic, project, guidelines);

  // Pass 2: Body with retries
  let attempt = 0;
  let previousErrors: string[] = [];
  let lastResult: { content: string; ctaText: string; ctaUrl: string; ctaLabel: string } | null = null;

  while (attempt < MAX_RETRIES) {
    try {
      lastResult = await generateBody(topic, outline, project, guidelines, previousErrors);
      break;
    } catch (err) {
      if (err instanceof ValidationError) {
        previousErrors = err.errors;
        lastResult = err.partial;
        attempt++;
        if (attempt >= MAX_RETRIES) break;
      } else {
        throw err;
      }
    }
  }

  if (!lastResult) throw new Error("Generation failed after retries");

  return {
    title: outline.seoTitle,
    slug: outline.slug,
    content: sanitizeContent(lastResult.content),
    excerpt: outline.excerpt,
    seoTitle: outline.seoTitle,
    seoDescription: outline.seoDescription,
    focusKeyword: outline.focusKeyword,
    ctaText: lastResult.ctaText,
    ctaUrl: lastResult.ctaUrl,
    ctaLabel: lastResult.ctaLabel,
  };
}
