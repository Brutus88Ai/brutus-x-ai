import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";

export default function CreateProject({ onCreated }) {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return toast.error("Bitte Titel eingeben");
    setCreating(true);
    try {
      const ref = collection(db, "projects");
      const docRef = await addDoc(ref, { title: title.trim(), createdAt: serverTimestamp() });
      const project = { id: docRef.id, title: title.trim() };
      toast.success("Projekt erstellt");
      setTitle("");
      if (onCreated) onCreated(project);
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Erstellen");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mb-4 bg-gray-900 p-4 rounded">
      <label className="block text-sm text-gray-400 mb-2">Neues Projekt</label>
      <div className="flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Projekt Titel" className="flex-1 p-2 rounded bg-gray-800 text-white" />
        <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-indigo-600 rounded">{creating ? "Erstelle..." : "Erstellen"}</button>
      </div>
    </div>
  );
}
