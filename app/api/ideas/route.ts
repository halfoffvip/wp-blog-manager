import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getIdeas, getIdea, saveIdea, deleteIdea } from "@/lib/kv";
import type { BlogIdea } from "@/lib/types";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const ideas = await getIdeas(projectId);
  return NextResponse.json(ideas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const now = new Date().toISOString();

  const idea: BlogIdea = {
    id: randomUUID(),
    projectId: body.projectId,
    title: body.title,
    notes: body.notes,
    status: "idea",
    priority: body.priority ?? 99,
    createdAt: now,
    updatedAt: now,
  };

  await saveIdea(idea);
  return NextResponse.json(idea, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as Partial<BlogIdea> & { id: string };
  const existing = await getIdea(body.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated: BlogIdea = {
    ...existing,
    ...body,
    updatedAt: new Date().toISOString(),
  };

  await saveIdea(updated);
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

  await deleteIdea(projectId, id);
  return NextResponse.json({ success: true });
}
