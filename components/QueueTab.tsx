"use client";

import { useState, useEffect } from "react";
import type { Project, BlogPost, BlogIdea } from "@/lib/types";

interface Props {
  project: Project;
}

type QueueView = "posts" | "ideas";

export function QueueTab({ project }: Props) {
  const [view, setView] = useState<QueueView>("posts");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [ideas, setIdeas] = useState<BlogIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIdea, setNewIdea] = useState("");
  const [addingIdea, setAddingIdea] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const [p, i] = await Promise.all([
      fetch(`/api/posts?projectId=${project.id}`).then((r) => r.json()),
      fetch(`/api/ideas?projectId=${project.id}`).then((r) => r.json()),
    ]);
    setPosts(Array.isArray(p) ? p : []);
    setIdeas(Array.isArray(i) ? i : []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [project.id]);

  async function handleAddIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!newIdea.trim()) return;
    setAddingIdea(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, title: newIdea.trim() }),
      });
      const idea = await res.json();
      setIdeas((prev) => [idea, ...prev]);
      setNewIdea("");
    } finally {
      setAddingIdea(false);
    }
  }

  async function handleDeleteIdea(id: string) {
    await fetch(`/api/ideas?id=${id}&projectId=${project.id}`, { method: "DELETE" });
    setIdeas((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSkipIdea(idea: BlogIdea) {
    const res = await fetch("/api/ideas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: idea.id, status: "skipped" }),
    });
    const updated = await res.json();
    setIdeas((prev) => prev.map((i) => (i.id === idea.id ? updated : i)));
  }

  async function handlePublishPost(postId: string) {
    setPublishingId(postId);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishingId(null);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/posts?id=${postId}&projectId=${project.id}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setView("posts")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            view === "posts" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Post Queue
        </button>
        <button
          onClick={() => setView("ideas")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            view === "ideas" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Idea Bank
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {view === "posts" && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">All Posts</h3>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No posts yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {posts.map((post) => (
                <div key={post.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                      {post.scheduledAt && (
                        <span className="text-xs text-blue-500">
                          → {new Date(post.scheduledAt).toLocaleString()}
                        </span>
                      )}
                      {post.wpPostId && (
                        <span className="text-xs text-green-500">WP #{post.wpPostId}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={post.status} />
                  <div className="flex items-center gap-2">
                    {(post.status === "draft" || post.status === "failed") && (
                      <button
                        onClick={() => handlePublishPost(post.id)}
                        disabled={publishingId === post.id}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-medium disabled:opacity-50"
                      >
                        {publishingId === post.id ? "Publishing…" : "Publish"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "ideas" && (
        <div className="space-y-4">
          {/* Add idea */}
          <form onSubmit={handleAddIdea} className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Idea</h3>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={newIdea}
                onChange={(e) => setNewIdea(e.target.value)}
                placeholder="e.g. 10 tips for better sleep hygiene"
                required
              />
              <button
                type="submit"
                disabled={addingIdea}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {addingIdea ? "Adding…" : "Add"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Ideas are auto-generated by the hourly cron in priority order.</p>
          </form>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Idea Bank</h3>
            </div>
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
              </div>
            ) : ideas.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No ideas yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {ideas.map((idea) => (
                  <div key={idea.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{idea.title}</p>
                      {idea.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{idea.notes}</p>
                      )}
                    </div>
                    <IdeaBadge status={idea.status} />
                    {idea.status === "idea" && (
                      <button
                        onClick={() => handleSkipIdea(idea)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Skip
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteIdea(idea.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: BlogPost["status"] }) {
  const map = {
    draft: "bg-yellow-50 text-yellow-700",
    scheduled: "bg-blue-50 text-blue-700",
    published: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${map[status]}`}>
      {status}
    </span>
  );
}

function IdeaBadge({ status }: { status: BlogIdea["status"] }) {
  const map = {
    idea: "bg-purple-50 text-purple-700",
    generating: "bg-blue-50 text-blue-700",
    generated: "bg-green-50 text-green-700",
    published: "bg-gray-100 text-gray-500",
    skipped: "bg-gray-100 text-gray-400",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${map[status]}`}>
      {status}
    </span>
  );
}
