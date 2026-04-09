"use client";

import { useState } from "react";
import type { Project, BlogPost } from "@/lib/types";
import { ImagePicker } from "./ImagePicker";
import type { DriveFile } from "@/lib/drive";

interface Props {
  project: Project;
}

type Step = "topic" | "generating" | "review";

export function ComposeTab({ project }: Props) {
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState("");
  const [post, setPost] = useState<Partial<BlogPost> | null>(null);
  const [selectedImage, setSelectedImage] = useState<DriveFile | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ link: string } | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setError(null);
    setStep("generating");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, projectId: project.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      setPost({
        projectId: project.id,
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        focusKeyword: data.focusKeyword,
        ctaText: data.ctaText,
        ctaUrl: data.ctaUrl,
        ctaLabel: data.ctaLabel,
        category: project.defaultCategory,
        tags: project.defaultTags,
        status: "draft",
      });
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStep("topic");
    }
  }

  async function handleSave(status: "draft" | "scheduled") {
    if (!post) return;
    setSaving(true);
    setError(null);

    try {
      const body = {
        ...post,
        status,
        scheduledAt: status === "scheduled" ? scheduledAt : undefined,
        featuredImageDriveId: selectedImage?.id,
        featuredImageUrl: selectedImage?.webContentLink,
      };

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error ?? "Save failed");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishNow() {
    if (!post) return;
    setPublishing(true);
    setError(null);

    try {
      // First save as draft to get an ID
      const saveRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...post,
          status: "draft",
          featuredImageDriveId: selectedImage?.id,
          featuredImageUrl: selectedImage?.webContentLink,
        }),
      });
      const savedPost = await saveRes.json();
      if (!saveRes.ok) throw new Error(savedPost.error ?? "Save failed");

      // Then publish
      const pubRes = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: savedPost.id }),
      });
      const result = await pubRes.json();
      if (!pubRes.ok) throw new Error(result.error ?? "Publish failed");

      setPublishResult({ link: result.link });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  function handleReset() {
    setStep("topic");
    setTopic("");
    setPost(null);
    setSelectedImage(null);
    setScheduledAt("");
    setError(null);
    setSaved(false);
    setPublishResult(null);
  }

  if (publishResult) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Published!</h2>
        <p className="text-gray-500 mb-6">Your post is live on WordPress.</p>
        <a
          href={publishResult.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:underline text-sm font-medium block mb-8"
        >
          {publishResult.link}
        </a>
        <button
          onClick={handleReset}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-medium"
        >
          Write Another Post
        </button>
      </div>
    );
  }

  if (step === "topic") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Generate a Blog Post</h2>
          <p className="text-gray-500 text-sm mb-6">
            Enter a topic and Claude will create a full SEO-optimized post in two passes.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic or Title</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 'How to improve WordPress page speed in 2024' or 'Benefits of meditation for busy professionals'"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Post
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Generating your post…</h2>
        <p className="text-gray-500 text-sm">Pass 1: Creating outline and SEO metadata</p>
        <p className="text-gray-400 text-xs mt-1">Pass 2: Writing full content (may take 30-60s)</p>
      </div>
    );
  }

  // Review step
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main editor */}
      <div className="lg:col-span-2 space-y-6">
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
            Saved successfully.
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Title</label>
            <input
              className="w-full text-xl font-bold text-gray-900 border-0 outline-none focus:ring-0 p-0"
              value={post?.title ?? ""}
              onChange={(e) => setPost((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Excerpt</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={2}
              value={post?.excerpt ?? ""}
              onChange={(e) => setPost((p) => ({ ...p, excerpt: e.target.value }))}
            />
          </div>
        </div>

        {/* Content preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Content</label>
          <div
            className="prose max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: post?.content ?? "" }}
          />
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* SEO */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">SEO</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">SEO Title</label>
            <input
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={post?.seoTitle ?? ""}
              onChange={(e) => setPost((p) => ({ ...p, seoTitle: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Meta Description</label>
            <textarea
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={2}
              value={post?.seoDescription ?? ""}
              onChange={(e) => setPost((p) => ({ ...p, seoDescription: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Focus Keyword</label>
            <input
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={post?.focusKeyword ?? ""}
              onChange={(e) => setPost((p) => ({ ...p, focusKeyword: e.target.value }))}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Call to Action</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CTA Text</label>
            <input
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={post?.ctaText ?? ""}
              onChange={(e) => setPost((p) => ({ ...p, ctaText: e.target.value }))}
              placeholder="Ready to get started?"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CTA URL</label>
            <input
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={post?.ctaUrl ?? ""}
              onChange={(e) => setPost((p) => ({ ...p, ctaUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Button Label</label>
            <input
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={post?.ctaLabel ?? ""}
              onChange={(e) => setPost((p) => ({ ...p, ctaLabel: e.target.value }))}
              placeholder="Learn More"
            />
          </div>
        </div>

        {/* Featured Image */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Featured Image</h3>
          <ImagePicker
            folderId={project.driveFolderId}
            selectedId={selectedImage?.id}
            onSelect={(f) => setSelectedImage(f)}
          />
          <p className="text-xs text-gray-400">Image will have a color overlay applied automatically.</p>
        </div>

        {/* Publish actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Publish</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Schedule for</label>
            <input
              type="datetime-local"
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handlePublishNow}
              disabled={publishing}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {publishing ? "Publishing…" : "Publish Now"}
            </button>
            {scheduledAt && (
              <button
                onClick={() => handleSave("scheduled")}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Scheduling…" : "Schedule"}
              </button>
            )}
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Draft"}
            </button>
            <button
              onClick={handleReset}
              className="w-full text-gray-400 hover:text-gray-600 py-1 text-xs"
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
