import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPosts, getPost, savePost, deletePost } from "@/lib/kv";
import { sanitizeContent } from "@/lib/generate";
import type { BlogPost } from "@/lib/types";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const postId = searchParams.get("id");

  if (postId) {
    const post = await getPost(postId);
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(post);
  }

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const posts = await getPosts(projectId);
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const now = new Date().toISOString();

  const post: BlogPost = {
    id: randomUUID(),
    projectId: body.projectId,
    title: body.title,
    slug: body.slug ?? "",
    content: sanitizeContent(body.content ?? ""),
    excerpt: body.excerpt ?? "",
    seoTitle: body.seoTitle ?? body.title,
    seoDescription: body.seoDescription ?? "",
    focusKeyword: body.focusKeyword ?? "",
    featuredImageUrl: body.featuredImageUrl,
    featuredImageDriveId: body.featuredImageDriveId,
    ctaText: body.ctaText,
    ctaUrl: body.ctaUrl,
    ctaLabel: body.ctaLabel,
    category: body.category,
    tags: body.tags ?? [],
    status: body.status ?? "draft",
    scheduledAt: body.scheduledAt,
    createdAt: now,
    updatedAt: now,
  };

  await savePost(post);
  return NextResponse.json(post, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as Partial<BlogPost> & { id: string };
  const existing = await getPost(body.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated: BlogPost = {
    ...existing,
    ...body,
    content: body.content ? sanitizeContent(body.content) : existing.content,
    updatedAt: new Date().toISOString(),
  };

  await savePost(updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const projectId = searchParams.get("projectId");
  if (!id || !projectId) {
    return NextResponse.json({ error: "Missing id or projectId" }, { status: 400 });
  }

  await deletePost(projectId, id);
  return NextResponse.json({ success: true });
}
