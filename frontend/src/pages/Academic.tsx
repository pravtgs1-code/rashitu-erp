import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Academic() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");

  function loadClasses() { api.get("/academic/classes").then((r) => setClasses(r.data)); }
  useEffect(loadClasses, []);
  useEffect(() => {
    if (selectedClass) {
      api.get(`/academic/sections?classId=${selectedClass}`).then((r) => setSections(r.data));
      api.get(`/academic/subjects?classId=${selectedClass}`).then((r) => setSubjects(r.data));
    }
  }, [selectedClass]);

  async function addClass(name: string, order: number) {
    await api.post("/academic/classes", { name, order });
    loadClasses();
  }
  async function addSection(name: string) {
    await api.post("/academic/sections", { classId: selectedClass, name });
    api.get(`/academic/sections?classId=${selectedClass}`).then((r) => setSections(r.data));
  }
  async function addSubject(name: string) {
    await api.post("/academic/subjects", { classId: selectedClass, name });
    api.get(`/academic/subjects?classId=${selectedClass}`).then((r) => setSubjects(r.data));
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div>
        <h2 className="font-semibold text-slate-900 mb-3">Classes</h2>
        <QuickAddForm placeholder="e.g. Class 10" onAdd={(v) => addClass(v, classes.length)} />
        <ul className="mt-3 space-y-1">
          {classes.map((c) => (
            <li key={c.id}>
              <button onClick={() => setSelectedClass(c.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm border ${selectedClass === c.id ? "bg-slate-900 text-white" : "bg-white"}`}>
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="font-semibold text-slate-900 mb-3">Sections {selectedClass ? "" : "(select a class)"}</h2>
        {selectedClass && <QuickAddForm placeholder="e.g. A" onAdd={addSection} />}
        <ul className="mt-3 space-y-1 text-sm">{sections.map((s) => <li key={s.id} className="px-3 py-2 rounded-lg border bg-white">{s.name}</li>)}</ul>
      </div>
      <div>
        <h2 className="font-semibold text-slate-900 mb-3">Subjects {selectedClass ? "" : "(select a class)"}</h2>
        {selectedClass && <QuickAddForm placeholder="e.g. Mathematics" onAdd={addSubject} />}
        <ul className="mt-3 space-y-1 text-sm">{subjects.map((s) => <li key={s.id} className="px-3 py-2 rounded-lg border bg-white">{s.name}</li>)}</ul>
      </div>
    </div>
  );
}

function QuickAddForm({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV(""); } }} className="flex gap-2">
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
      <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">Add</button>
    </form>
  );
}
