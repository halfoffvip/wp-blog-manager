import { Redis } from "@upstash/redis";
import type { Project, BlogPost, BlogIdea, ContentGuideline } from "./types";

const kv = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getProjects(userId: string): Promise<Project[]> {
  const ids = await kv.smembers<string[]>(`user:${userId}:projects`);
  if (!ids || ids.length === 0) return [];
  const projects = await Promise.all(ids.map((id) => kv.get<Project>(`project:${id}`)));
  return projects.filter(Boolean) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  return kv.get<Project>(`project:${id}`);
}

export async function saveProject(userId: string, project: Project): Promise<void> {
  await kv.set(`project:${project.id}`, project);
  await kv.sadd(`user:${userId}:projects`, project.id);
}

export async function deleteProject(userId: string, projectId: string): Promise<void> {
  await kv.del(`project:${projectId}`);
  await kv.srem(`user:${userId}:projects`, projectId);
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export async function getPosts(projectId: string): Promise<BlogPost[]> {
  const ids = await kv.smembers<string[]>(`project:${projectId}:posts`);
  if (!ids || ids.length === 0) return [];
  const posts = await Promise.all(ids.map((id) => kv.get<BlogPost>(`post:${id}`)));
  return (posts.filter(Boolean) as BlogPost[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getPost(id: string): Promise<BlogPost | null> {
  return kv.get<BlogPost>(`post:${id}`);
}

export async function savePost(post: BlogPost): Promise<void> {
  await kv.set(`post:${post.id}`, post);
  await kv.sadd(`project:${post.projectId}:posts`, post.id);
}

export async function deletePost(projectId: string, postId: string): Promise<void> {
  await kv.del(`post:${postId}`);
  await kv.srem(`project:${projectId}:posts`, postId);
}

// ─── Ideas ───────────────────────────────────────────────────────────────────

export async function getIdeas(projectId: string): Promise<BlogIdea[]> {
  const ids = await kv.smembers<string[]>(`project:${projectId}:ideas`);
  if (!ids || ids.length === 0) return [];
  const ideas = await Promise.all(ids.map((id) => kv.get<BlogIdea>(`idea:${id}`)));
  return (ideas.filter(Boolean) as BlogIdea[]).sort(
    (a, b) => (a.priority ?? 99) - (b.priority ?? 99)
  );
}

export async function getIdea(id: string): Promise<BlogIdea | null> {
  return kv.get<BlogIdea>(`idea:${id}`);
}

export async function saveIdea(idea: BlogIdea): Promise<void> {
  await kv.set(`idea:${idea.id}`, idea);
  await kv.sadd(`project:${idea.projectId}:ideas`, idea.id);
}

export async function deleteIdea(projectId: string, ideaId: string): Promise<void> {
  await kv.del(`idea:${ideaId}`);
  await kv.srem(`project:${projectId}:ideas`, ideaId);
}

// ─── Guidelines ──────────────────────────────────────────────────────────────

export async function getGuidelines(projectId: string): Promise<ContentGuideline | null> {
  return kv.get<ContentGuideline>(`guidelines:${projectId}`);
}

export async function saveGuidelines(guidelines: ContentGuideline): Promise<void> {
  await kv.set(`guidelines:${guidelines.projectId}`, guidelines);
}

// ─── Due posts (scheduled) ────────────────────────────────────────────────────

export async function getDuePosts(projectId: string): Promise<BlogPost[]> {
  const posts = await getPosts(projectId);
  const now = new Date();
  return posts.filter(
    (p) => p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) <= now
  );
}
