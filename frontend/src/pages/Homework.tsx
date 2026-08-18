import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Homework() {
  const { user } = useAuth();
  const isTeacher = user?.role === "ACADEMIC_STAFF" || user?.role === "SCHOOL_ADMIN";
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [msg, setMsg] = useState("");

  useEffect(() => { api.get("/academic/classes").then((r) => setClasses(r.data)); }, []);
  useEffect(() => {
    if (form.classId) {
      api.get(`/academic/sections?classId=${form.classId}`).then((r) => setSections(r.data));
      api.get(`/academic/subjects?classId=${form.classId}`).then((r) => setSubjects(r.data));
    }
  }, [form.classId]);
  useEffect(() => {
    if (form.sectionId) api.get(`/homework?sectionId=${form.sectionId}`).then((r) => setHomework(r.data));
    else api.get(`/homework`).then((r) => setHomework(r.data)).catch(() => {});
  }, [form.sectionId]);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/homework", form);
    setMsg("Homework assigned to the whole section.");
    api.get(`/homework?sectionId=${form.sectionId}`).then((r) => setHomework(r.data));
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Online Homework</h1>
      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 mb-4 text-sm">{msg}</div>}

      {isTeacher && (
        <form onSubmit={assign} className="bg-white border rounded-xl p-4 text-sm space-y-2 mb-6 max-w-lg">
          <div className="font-medium text-slate-800">Assign Homework</div>
          <select required className="in" onChange={(e) => setForm({ ...form, classId: e.target.value })}><option value="">Class...</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select required className="in" onChange={(e) => setForm({ ...form, sectionId: e.target.value })}><option value="">Section...</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select required className="in" onChange={(e) => setForm({ ...form, subjectId: e.target.value })}><option value="">Subject...</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <input required placeholder="Title" className="in" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea required placeholder="Description / instructions" className="in" onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input required type="date" className="in" onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs">Assign</button>
        </form>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {homework.map((h) => (
          <div key={h.id} className="bg-white border rounded-xl p-4">
            <div className="font-medium text-slate-900">{h.title}</div>
            <div className="text-sm text-slate-600 mt-1">{h.description}</div>
            <div className="text-xs text-slate-400 mt-2">Due: {h.dueDate}</div>
          </div>
        ))}
        {homework.length === 0 && <div className="text-slate-400 text-sm">No homework yet.</div>}
      </div>
      <style>{`.in{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px}`}</style>
    </div>
  );
}
