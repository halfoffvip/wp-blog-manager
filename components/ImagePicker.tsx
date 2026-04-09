"use client";

import { useState, useEffect } from "react";
import type { DriveFile } from "@/lib/drive";

interface Props {
  folderId?: string;
  selectedId?: string;
  onSelect: (file: DriveFile | null) => void;
}

export function ImagePicker({ folderId, selectedId, onSelect }: Props) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    const params = folderId ? `?folderId=${folderId}` : "";
    fetch(`/api/drive${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setFiles(Array.isArray(data) ? data : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, folderId]);

  const selected = files.find((f) => f.id === selectedId);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {selected?.thumbnailLink ? (
          <img
            src={selected.thumbnailLink}
            alt={selected.name}
            className="w-20 h-14 object-cover rounded-lg border border-gray-200"
          />
        ) : (
          <div className="w-20 h-14 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-700 font-medium">
            {selected ? selected.name : "No image selected"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              {selected ? "Change" : "Pick from Drive"}
            </button>
            {selected && (
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Pick from Google Drive</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-500 text-sm">{error}</div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No images found in Drive.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => { onSelect(file); setOpen(false); }}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                        file.id === selectedId
                          ? "border-purple-500"
                          : "border-transparent hover:border-purple-300"
                      }`}
                    >
                      {file.thumbnailLink ? (
                        <img
                          src={file.thumbnailLink}
                          alt={file.name}
                          className="w-full h-28 object-cover"
                        />
                      ) : (
                        <div className="w-full h-28 bg-gray-100 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {file.name}
                      </div>
                      {file.id === selectedId && (
                        <div className="absolute top-2 right-2 bg-purple-600 rounded-full p-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
