import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getDuePosts, savePost, getProject, getIdeas, saveIdea, getGuidelines } from "@/lib/kv";
import { generateBlogPost } from "@/lib/generate";
import { publishToWordPress } from "@/lib/wordpress";
import type { BlogPost } from "@/lib/types";
import { randomUUID } from "crypto";

const kv = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Vercel cron calls this every hour
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return fast — do async work after response
  const responsePromise = NextResponse.json({ ok: true, triggered: new Date().toISOString() });

  // Fire and forget async processing
  processAsync().catch(console.error);

  return responsePromise;
}

async function processAsync() {
  // Get all project IDs from KV
  const projectKeys = await kv.keys("project:*:posts");
  const projectIds = projectKeys
    .map((k) => k.match(/project:(.+):posts/)?.[1])
    .filter(Boolean) as string[];

  for (const projectId of projectIds) {
    const project = await getProject(projectId);
    if (!project) continue;

    // 1. Publish due scheduled posts
    const duePosts = await getDuePosts(projectId);
    for (const post of duePosts) {
      try {
        const result = await publishToWordPress(
          post,
          project.wpUrl,
          project.wpUsername,
          project.wpAppPassword
        );
        await savePost({
          ...post,
          status: "published",
          wpPostId: result.wpPostId,
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`Failed to publish post ${post.id}:`, err);
        await savePost({
          ...post,
          status: "failed",
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // 2. Generate from idea bank (pick highest-priority "idea" status item)
    const ideas = await getIdeas(projectId);
    const nextIdea = ideas.find((i) => i.status === "idea");
    if (!nextIdea) continue;

    const guidelines = await getGuidelines(projectId);

    // Mark as generating
    await saveIdea({ ...nextIdea, status: "generating", updatedAt: new Date().toISOString() });

    try {
      const generated = await generateBlogPost(nextIdea.title, project, guidelines);
      const now = new Date().toISOString();

      const newPost: BlogPost = {
        id: randomUUID(),
        projectId,
        title: generated.title,
        slug: generated.slug,
        content: generated.content,
        excerpt: generated.excerpt,
        seoTitle: generated.seoTitle,
        seoDescription: generated.seoDescription,
        focusKeyword: generated.focusKeyword,
        ctaText: generated.ctaText,
        ctaUrl: generated.ctaUrl,
        ctaLabel: generated.ctaLabel,
        category: project.defaultCategory,
        tags: project.defaultTags,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };

      await savePost(newPost);
      await saveIdea({
        ...nextIdea,
        status: "generated",
        generatedPostId: newPost.id,
        updatedAt: now,
      });
    } catch (err) {
      console.error(`Failed to generate from idea ${nextIdea.id}:`, err);
      await saveIdea({
        ...nextIdea,
        status: "idea", // reset so it retries
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
