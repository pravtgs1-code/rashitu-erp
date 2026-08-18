import { useEffect, useState } from "react";
import { api, openAuthenticatedPdf } from "../api/client";

export default function Exams() {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [classId, setClassId] = useState("");
  const [examForm, setExamForm] = useState<any>({});
  const [marksExamId, setMarksExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => { api.get("/academic/classes").then((r) => setClasses(r.data)); }, []);
  useEffect(() => {
    if (classId) {
      api.get(`/academic/subjects?classId=${classId}`).then((r) => setSubjects(r.data));
      api.get(`/students?classId=${classId}`).then((r) => setStudents(r.data));
      api.get(`/exams?classId=${classId}`).then((r) => setExams(r.data));
    }
  }, [classId]);

  async function createExam(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/exams", { ...examForm, classId });
    api.get(`/exams?classId=${classId}`).then((r) => setExams(r.data));
    setMsg("Exam created.");
  }

  async function saveMarks(e: React.FormEvent) {
    e.preventDefault();
    const records = students.map((s) => ({ studentId: s.id, marksObtained: marks[s.id] ?? 0, maxMarks: 100 }));
    await api.post(`/exams/${marksExamId}/marks/bulk`, { subjectId, records });
    setMsg("Marks saved.");
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Exams, Marks & Marksheet</h1>
      <select className="in mb-4" onChange={(e) => setClassId(e.target.value)}><option value="">Select class...</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 mb-4 text-sm">{msg}</div>}

      {classId && (
        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={createExam} className="bg-white border rounded-xl p-4 text-sm space-y-2">
            <div className="font-medium text-slate-800">Create Exam / Test</div>
            <input required placeholder="Exam name e.g. Unit Test 1" className="in" onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} />
            <input required placeholder="Academic Year e.g. 2026-2027" className="in" onChange={(e) => setExamForm({ ...examForm, academicYearLabel: e.target.value })} />
            <input required type="date" className="in" onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })} />
            <input required type="date" className="in" onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })} />
            <button className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs">Create Exam</button>
          </form>

          <form onSubmit={saveMarks} className="bg-white border rounded-xl p-4 text-sm space-y-2">
            <div className="font-medium text-slate-800">Enter Marks</div>
            <select required className="in" onChange={(e) => setMarksExamId(e.target.value)}><option value="">Exam...</option>{exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}</select>
            <select required className="in" onChange={(e) => setSubjectId(e.target.value)}><option value="">Subject...</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <span>{s.name}</span>
                <input type="number" max={100} min={0} className="in w-24" placeholder="/100" onChange={(e) => setMarks({ ...marks, [s.id]: Number(e.target.value) })} />
              </div>
            ))}
            {students.length > 0 && <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs">Save Marks</button>}
          </form>
        </div>
      )}

      {classId && exams.length > 0 && students.length > 0 && (
        <div className="mt-6 bg-white border rounded-xl p-4 text-sm">
          <div className="font-medium text-slate-800 mb-2">Download Marksheet (PDF)</div>
          <div className="flex flex-wrap gap-3">
            {exams.map((ex) =>
              students.map((s) => (
                <button
                  key={ex.id + s.id}
                  className="underline text-blue-600"
                  onClick={() => openAuthenticatedPdf(`/exams/${ex.id}/marksheet/${s.id}.pdf`)}
                >
                  {ex.name} — {s.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      <style>{`.in{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px}`}</style>
    </div>
  );
}
