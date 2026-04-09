import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProjects, saveProject, deleteProject } from "@/lib/kv";
import type { Project } from "@/lib/types";
import { randomUUID } from "crypto";

async function getSession() {
  return getServerSession(authOptions);
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const projects = await getProjects(session.user.email);
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const now = new Date().toISOString();

  const project: Project = {
    id: randomUUID(),
    name: body.name,
    wpUrl: body.wpUrl,
    wpUsername: body.wpUsername,
    wpAppPassword: body.wpAppPassword,
    driveFolder: body.driveFolder,
    driveFolderId: body.driveFolderId,
    defaultCategory: body.defaultCategory,
    defaultTags: body.defaultTags ?? [],
    lastOverlayIndex: undefined,
    createdAt: now,
    updatedAt: now,
  };

  await saveProject(session.user.email, project);
  return NextResponse.json(project, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as Project;
  body.updatedAt = new Date().toISOString();
  await saveProject(session.user.email, body);
  return NextResponse.json(body);
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await deleteProject(session.user.email, id);
  return NextResponse.json({ success: true });
}
