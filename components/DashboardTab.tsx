"use client";

import { useState, useEffect } from "react";
import type { Project, BlogPost, BlogIdea } from "@/lib/types";

interface Props {
  project: Project;
}

export function DashboardTab({ project }: Props) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [ideas, setIdeas] = useState<BlogIdea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/posts?projectId=${project.id}`).then((r) => r.json()),
      fetch(`/api/ideas?projectId=${project.id}`).then((r) => r.json()),
    ]).then(([postsData, ideasData]) => {
      setPosts(Array.isArray(postsData) ? postsData : []);
      setIdeas(Array.isArray(ideasData) ? ideasData : []);
      setLoading(false);
    });
  }, [project.id]);

  const published = posts.filter((p) => p.status === "published");
  const scheduled = posts.filter((p) => p.status === "scheduled");
  const drafts = posts.filter((p) => p.status === "draft");
  const pendingIdeas = ideas.filter((i) => i.status === "idea");

  const stats = [
    { label: "Published", value: published.length, color: "bg-green-50 text-green-700" },
    { label: "Scheduled", value: scheduled.length, color: "bg-blue-50 text-blue-700" },
    { label: "Drafts", value: drafts.length, color: "bg-yellow-50 text-yellow-700" },
    { label: "Ideas", value: pendingIdeas.length, color: "bg-purple-50 text-purple-700" },
  ];

  const recentPosts = posts.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${s.color} mb-3`}>
              {s.label}
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? <span className="animate-pulse text-gray-300">—</span> : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Posts */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Recent Posts</h3>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
          </div>
        ) : recentPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No posts yet. Head to Compose to create your first post.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentPosts.map((post) => (
              <div key={post.id} className="px-6 py-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(post.createdAt).toLocaleDateString()}
                    {post.scheduledAt && ` · Scheduled ${new Date(post.scheduledAt).toLocaleString()}`}
                  </p>
                </div>
                <StatusBadge status={post.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Idea Bank Preview */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Idea Bank</h3>
          <span className="text-xs text-gray-400">{pendingIdeas.length} pending</span>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
          </div>
        ) : ideas.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No ideas yet. Add some in the Queue tab.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {ideas.slice(0, 5).map((idea) => (
              <div key={idea.id} className="px-6 py-3 flex items-center justify-between">
                <p className="text-sm text-gray-700 truncate flex-1">{idea.title}</p>
                <IdeaBadge status={idea.status} />
              </div>
            ))}
          </div>
        )}
      </div>
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
    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ml-3 ${map[status]}`}>
      {status}
    </span>
  );
}
