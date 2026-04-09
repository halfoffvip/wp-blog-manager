"use client";

import { useState, useEffect } from "react";
import type { Project, ContentGuideline } from "@/lib/types";

interface Props {
  project: Project;
  onUpdate: (project: Project) => void;
}

export function SettingsTab({ project, onUpdate }: Props) {
  const [projectForm, setProjectForm] = useState({
    name: project.name,
    wpUrl: project.wpUrl,
    wpUsername: project.wpUsername,
    wpAppPassword: project.wpAppPassword,
    driveFolderId: project.driveFolderId ?? "",
    defaultCategory: project.defaultCategory ?? "",
    defaultTags: (project.defaultTags ?? []).join(", "),
  });
  const [guidelines, setGuidelines] = useState<ContentGuideline | null>(null);
  const [guidelineForm, setGuidelineForm] = useState({
    tone: "",
    targetAudience: "",
    contentPillars: "",
    writingStyle: "",
    avoidTopics: "",
    customInstructions: "",
  });
  const [savingProject, setSavingProject] = useState(false);
  const [savingGuidelines, setSavingGuidelines] = useState(false);
  const [projectSaved, setProjectSaved] = useState(false);
  const [guidelinesSaved, setGuidelinesSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/guidelines?projectId=${project.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setGuidelines(data);
          setGuidelineForm({
            tone: data.tone ?? "",
            targetAudience: data.targetAudience ?? "",
            contentPillars: (data.contentPillars ?? []).join(", "),
            writingStyle: data.writingStyle ?? "",
            avoidTopics: (data.avoidTopics ?? []).join(", "),
            customInstructions: data.customInstructions ?? "",
          });
        }
      });
  }, [project.id]);

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault();
    setSavingProject(true);
    setError(null);
    try {
      const updated: Project = {
        ...project,
        name: projectForm.name,
        wpUrl: projectForm.wpUrl,
        wpUsername: projectForm.wpUsername,
        wpAppPassword: projectForm.wpAppPassword,
        driveFolderId: projectForm.driveFolderId || undefined,
        defaultCategory: projectForm.defaultCategory || undefined,
        defaultTags: projectForm.defaultTags
          ? projectForm.defaultTags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        updatedAt: new Date().toISOString(),
      };
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      onUpdate(data);
      setProjectSaved(true);
      setTimeout(() => setProjectSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingProject(false);
    }
  }

  async function handleSaveGuidelines(e: React.FormEvent) {
    e.preventDefault();
    setSavingGuidelines(true);
    setError(null);
    try {
      const payload = {
        id: guidelines?.id,
        projectId: project.id,
        tone: guidelineForm.tone || undefined,
        targetAudience: guidelineForm.targetAudience || undefined,
        contentPillars: guidelineForm.contentPillars
          ? guidelineForm.contentPillars.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        writingStyle: guidelineForm.writingStyle || undefined,
        avoidTopics: guidelineForm.avoidTopics
          ? guidelineForm.avoidTopics.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        customInstructions: guidelineForm.customInstructions || undefined,
      };
      const res = await fetch("/api/guidelines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setGuidelines(data);
      setGuidelinesSaved(true);
      setTimeout(() => setGuidelinesSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingGuidelines(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Project Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-gray-900">Project Settings</h2>
          {projectSaved && (
            <span className="text-xs text-green-600 font-medium">Saved!</span>
          )}
        </div>
        <form onSubmit={handleSaveProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WordPress URL</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={projectForm.wpUrl}
              onChange={(e) => setProjectForm({ ...projectForm, wpUrl: e.target.value })}
              type="url"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WP Username</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={projectForm.wpUsername}
                onChange={(e) => setProjectForm({ ...projectForm, wpUsername: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">App Password</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={projectForm.wpAppPassword}
                onChange={(e) => setProjectForm({ ...projectForm, wpAppPassword: e.target.value })}
                type="password"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Drive Folder ID
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={projectForm.driveFolderId}
              onChange={(e) => setProjectForm({ ...projectForm, driveFolderId: e.target.value })}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            />
            <p className="text-xs text-gray-400 mt-1">The ID is the last part of your Drive folder URL.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Category</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={projectForm.defaultCategory}
                onChange={(e) => setProjectForm({ ...projectForm, defaultCategory: e.target.value })}
                placeholder="Blog"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Tags</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={projectForm.defaultTags}
                onChange={(e) => setProjectForm({ ...projectForm, defaultTags: e.target.value })}
                placeholder="seo, blog, tips"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingProject}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {savingProject ? "Saving…" : "Save Project"}
          </button>
        </form>
      </div>

      {/* Brand Guidelines */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Brand Guidelines</h2>
            <p className="text-xs text-gray-400 mt-0.5">These are injected into every generation prompt.</p>
          </div>
          {guidelinesSaved && (
            <span className="text-xs text-green-600 font-medium">Saved!</span>
          )}
        </div>
        <form onSubmit={handleSaveGuidelines} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={guidelineForm.tone}
                onChange={(e) => setGuidelineForm({ ...guidelineForm, tone: e.target.value })}
                placeholder="professional, friendly, authoritative"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={guidelineForm.targetAudience}
                onChange={(e) => setGuidelineForm({ ...guidelineForm, targetAudience: e.target.value })}
                placeholder="small business owners, developers, …"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content Pillars</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={guidelineForm.contentPillars}
              onChange={(e) => setGuidelineForm({ ...guidelineForm, contentPillars: e.target.value })}
              placeholder="SEO, content marketing, WordPress"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Writing Style</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={guidelineForm.writingStyle}
              onChange={(e) => setGuidelineForm({ ...guidelineForm, writingStyle: e.target.value })}
              placeholder="conversational, data-driven, how-to focused"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topics to Avoid</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={guidelineForm.avoidTopics}
              onChange={(e) => setGuidelineForm({ ...guidelineForm, avoidTopics: e.target.value })}
              placeholder="politics, competitors, controversial topics"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Instructions</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={3}
              value={guidelineForm.customInstructions}
              onChange={(e) => setGuidelineForm({ ...guidelineForm, customInstructions: e.target.value })}
              placeholder="Always end with a summary. Use UK spelling. Include at least one statistic per section."
            />
          </div>
          <button
            type="submit"
            disabled={savingGuidelines}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {savingGuidelines ? "Saving…" : "Save Guidelines"}
          </button>
        </form>
      </div>
    </div>
  );
}
