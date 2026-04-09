import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateBlogPost } from "@/lib/generate";
import { getProject, getGuidelines } from "@/lib/kv";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topic, projectId } = await req.json();

  if (!topic || !projectId) {
    return NextResponse.json({ error: "Missing topic or projectId" }, { status: 400 });
  }

  const project = await getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const guidelines = await getGuidelines(projectId);

  try {
    const result = await generateBlogPost(topic, project, guidelines);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
