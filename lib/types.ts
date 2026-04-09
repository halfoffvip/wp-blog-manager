export interface Project {
  id: string;
  name: string;
  wpUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  driveFolder?: string;
  driveFolderId?: string;
  defaultCategory?: string;
  defaultTags?: string[];
  lastOverlayIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export type PostStatus = "draft" | "scheduled" | "published" | "failed";

export interface BlogPost {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  content: string;         // sanitized HTML body
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  featuredImageUrl?: string;
  featuredImageDriveId?: string;
  ctaText?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  category?: string;
  tags?: string[];
  status: PostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  wpPostId?: number;
  generationPass?: 1 | 2;
  createdAt: string;
  updatedAt: string;
}

export type IdeaStatus = "idea" | "generating" | "generated" | "published" | "skipped";

export interface BlogIdea {
  id: string;
  projectId: string;
  title: string;
  notes?: string;
  status: IdeaStatus;
  generatedPostId?: string;
  priority?: number;       // 1 = highest
  createdAt: string;
  updatedAt: string;
}

export interface ContentGuideline {
  id: string;
  projectId: string;
  tone?: string;
  targetAudience?: string;
  contentPillars?: string[];
  writingStyle?: string;
  avoidTopics?: string[];
  customInstructions?: string;
  updatedAt: string;
}

export type OverlayColor = "purple" | "green" | "dark";

export const OVERLAY_COLORS: OverlayColor[] = ["purple", "green", "dark"];

export function nextOverlay(lastIndex: number | undefined): { color: OverlayColor; index: number } {
  const idx = ((lastIndex ?? -1) + 1) % OVERLAY_COLORS.length;
  return { color: OVERLAY_COLORS[idx], index: idx };
}
