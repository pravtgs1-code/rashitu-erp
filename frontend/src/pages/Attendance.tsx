import { useEffect, useState } from "react";
import { api, writeWithOfflineFallback } from "../api/client";
import { useAuth } from "../context/AuthContext";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "HALF_DAY", "ON_LEAVE"];

export default function Attendance() {
  const { user } = useAuth();
  const selfCheckin = user?.role === "SECURITY" || user?.role === "TRANSPORT_STAFF";

  if (selfCheckin) return <SelfCheckin />;
  return <ClassAttendance />;
}

function SelfCheckin() {
  const [msg, setMsg] = useState("");
  async function checkin() {
    const r = await writeWithOfflineFallback("post", "/attendance/staff/self-checkin", {});
    setMsg(r.offline ? "No signal — saved on this device, will sync automatically once you're back online." : "Attendance marked successfully.");
  }
  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold text-slate-900 mb-4">My Attendance</h1>
      <button onClick={checkin} className="bg-slate-900 text-white px-5 py-3 rounded-lg text-sm w-full">Check In / Check Out Now</button>
      {msg && <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm">{msg}</div>}
    </div>
  );
}

function ClassAttendance() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<any[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => { api.get("/academic/classes").then((r) => setClasses(r.data)); }, []);
  useEffect(() => { if (classId) api.get(`/academic/sections?classId=${classId}`).then((r) => setSections(r.data)); }, [classId]);
  useEffect(() => {
    if (sectionId) api.get(`/students?sectionId=${sectionId}`).then((r) => {
      setStudents(r.data);
      const init: Record<string, string> = {};
      r.data.forEach((s: any) => (init[s.id] = "PRESENT"));
      setStatusMap(init);
    });
  }, [sectionId]);

  async function submit() {
    const records = students.map((s) => ({ studentId: s.id, status: statusMap[s.id] || "PRESENT" }));
    const r = await writeWithOfflineFallback("post", "/attendance/students/bulk", { sectionId, date, records });
    setMsg(r.offline ? "No signal — attendance saved on this device, will sync automatically once you're back online." : `Attendance saved for ${records.length} students.`);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Attendance — Class / Section wise</h1>
      <div className="flex gap-3 mb-4 text-sm flex-wrap">
        <select className="in" onChange={(e) => setClassId(e.target.value)}><option value="">Class...</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className="in" onChange={(e) => setSectionId(e.target.value)}><option value="">Section...</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input type="date" className="in" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 mb-4 text-sm">{msg}</div>}

      {students.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left"><tr><th className="px-4 py-2">Roll No</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Status</th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2">{s.rollNo}</td><td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">
                    <select value={statusMap[s.id]} onChange={(e) => setStatusMap({ ...statusMap, [s.id]: e.target.value })} className="border rounded-lg px-2 py-1">
                      {STATUSES.map((st) => <option key={st}>{st}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3"><button onClick={submit} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Save Attendance</button></div>
        </div>
      )}
      <style>{`.in{border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px}`}</style>
    </div>
  );
}
