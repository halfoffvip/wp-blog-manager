import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGuidelines, saveGuidelines } from "@/lib/kv";
import type { ContentGuideline } from "@/lib/types";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const guidelines = await getGuidelines(projectId);
  return NextResponse.json(guidelines ?? null);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const guidelines: ContentGuideline = {
    id: body.id ?? randomUUID(),
    projectId: body.projectId,
    tone: body.tone,
    targetAudience: body.targetAudience,
    contentPillars: body.contentPillars,
    writingStyle: body.writingStyle,
    avoidTopics: body.avoidTopics,
    customInstructions: body.customInstructions,
    updatedAt: new Date().toISOString(),
  };

  await saveGuidelines(guidelines);
  return NextResponse.json(guidelines);
}
