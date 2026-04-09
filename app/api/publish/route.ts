import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPost, getProject, savePost, saveProject } from "@/lib/kv";
import { publishToWordPress } from "@/lib/wordpress";
import { getDriveFileContent } from "@/lib/drive";
import { processHeroImage } from "@/lib/image";
import { nextOverlay } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await req.json();
  if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 });

  const post = await getPost(postId);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const project = await getProject(post.projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const accessToken = session.accessToken;

  // Process hero image if Drive image is selected
  let featuredImageUrl = post.featuredImageUrl;
  if (post.featuredImageDriveId && accessToken) {
    try {
      const { color, index } = nextOverlay(project.lastOverlayIndex);
      const rawBuffer = await getDriveFileContent(accessToken, post.featuredImageDriveId);
      const processed = await processHeroImage(rawBuffer, color, post.title);

      // Upload processed image to a temporary URL (base64 data URI for simplicity)
      // In production, upload to Vercel Blob or S3
      const dataUri = `data:${processed.mimeType};base64,${processed.buffer.toString("base64")}`;
      featuredImageUrl = dataUri;

      // Update overlay index
      await saveProject(session.user.email, { ...project, lastOverlayIndex: index, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.error("Image processing failed:", err);
    }
  }

  try {
    const result = await publishToWordPress(
      { ...post, featuredImageUrl },
      project.wpUrl,
      project.wpUsername,
      project.wpAppPassword
    );

    const updatedPost = {
      ...post,
      status: "published" as const,
      wpPostId: result.wpPostId,
      publishedAt: new Date().toISOString(),
      featuredImageUrl,
      updatedAt: new Date().toISOString(),
    };
    await savePost(updatedPost);

    return NextResponse.json({ success: true, wpPostId: result.wpPostId, link: result.link });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";

    await savePost({
      ...post,
      status: "failed",
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
