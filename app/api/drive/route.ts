import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listDriveImages } from "@/lib/drive";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "No Drive access token" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId") ?? undefined;

  try {
    const files = await listDriveImages(accessToken, folderId);
    return NextResponse.json(files);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Drive error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
