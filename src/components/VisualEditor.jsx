import React, { useState } from "react";

export default function VisualEditor({ script }) {
  const [scenes, setScenes] = useState(script.scenes || []);

  const updatePrompt = (idx, value) => {
    const copy = [...scenes];
    copy[idx] = { ...copy[idx], visualPrompt: value };
    setScenes(copy);
  };

  return (
    <div className="space-y-4">
      {scenes.map((s, i) => (
        <div key={s.id} className="bg-black/40 p-3 rounded">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">{s.type.toUpperCase()} - {s.id}</h4>
            <span className="text-xs text-gray-400">{s.duration}s</span>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400">Visual Prompt</label>
              <input value={s.visualPrompt} onChange={(e) => updatePrompt(i, e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white" />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs text-gray-400">Preview</label>
              <img src={`https://pollinations.ai/p/${encodeURIComponent(s.visualPrompt)}?width=720&height=1280&seed=1234&model=flux`} alt="preview" className="w-full rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
