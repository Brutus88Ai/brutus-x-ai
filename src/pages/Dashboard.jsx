import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { generateViralScript, dispatchRenderJob, listProjects, getRenderStatus } from "../services/api";
import { useJobPolling } from "../hooks/useJobPolling";
import VisualEditor from "../components/VisualEditor";
import CreateProject from "../components/CreateProject";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [promptText, setPromptText] = useState("");
  const [script, setScript] = useState(null);
  const [renderId, setRenderId] = useState(null);
  const { status, data: renderData, error } = useJobPolling(renderId, 3000);

  useEffect(() => {
    // lightweight: attempt to list projects (listProjects is a CF wrapper)
    (async () => {
      try {
        // prefer callable function, but fallback to client-side query for developer convenience
        try {
          const res = await listProjects(null);
          setProjects(res || []);
        } catch (_) {
          // fallback: fetch all projects visible to the user
          const q = query(collection(db, "projects"));
          const snaps = await getDocs(q);
          const items = snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
          setProjects(items || []);
        }
      } catch (e) {
        // ignore; developer can populate projects via Firestore console
      }
    })();
  }, []);

  const handleGenerate = async () => {
    if (!selectedProject) return toast.error("Wähle zuerst ein Projekt");
    if (!promptText.trim()) return toast.error("Bitte Eingabetext");
    const t = toast.loading("Generiere Script...");
    try {
      const s = await generateViralScript(selectedProject.id, promptText);
      setScript(s);
      toast.success("Script erstellt", { id: t });
    } catch (err) {
      toast.error("Fehler bei Script-Generierung");
    }
  };

  const handleDispatch = async () => {
    if (!script) return toast.error("Kein Script ausgewählt");
    try {
      const res = await dispatchRenderJob(selectedProject.id, script.id);
      setRenderId(res.id);
      toast.success("Render job gestartet, warte auf Verarbeitung...");
    } catch (err) {
      toast.error("Dispatch fehlgeschlagen");
    }
  };

  const handleProjectCreated = (project) => {
    setProjects((p) => [project, ...p]);
    setSelectedProject(project);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Toaster position="top-center" />
      <h2 className="text-3xl font-bold mb-4">Dashboard</h2>

      <div className="mb-4">
        <label className="block text-sm text-gray-400">Projekt</label>
        <select className="w-full p-2 rounded" onChange={(e) => setSelectedProject(JSON.parse(e.target.value))}>
          <option value="">-- Projekt wählen --</option>
          {projects.map((p) => (
            <option key={p.id} value={JSON.stringify(p)}>{p.title}</option>
          ))}
        </select>
      </div>

      <CreateProject onCreated={handleProjectCreated} />

      <div className="mb-4">
        <label className="block text-sm text-gray-400">Prompt für Script</label>
        <input value={promptText} onChange={(e) => setPromptText(e.target.value)} className="w-full p-2 rounded bg-gray-900 text-white" />
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={handleGenerate} className="px-4 py-2 bg-blue-600 rounded">Script generieren</button>
        <button onClick={handleDispatch} className="px-4 py-2 bg-green-600 rounded">Render starten</button>
      </div>

      {script && (
        <div className="mb-6 bg-gray-900 p-4 rounded">
          <h3 className="text-xl font-semibold">Script: {script.title}</h3>
          <VisualEditor script={script} />
        </div>
      )}

      {renderId && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Render Status</h3>
          <p>Status: {status}</p>
          {renderData?.videoUrl && (
            <div className="mt-3">
              <video src={renderData.videoUrl} controls className="w-full rounded" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
