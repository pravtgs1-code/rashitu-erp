import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const AUDIENCES = ["ALL", "CLASS", "SECTION", "STAFF_ALL", "STAFF_DEPARTMENT", "PARENTS_ALL"];
const CAN_SEND = ["SCHOOL_ADMIN", "SUPER_ADMIN", "ACADEMIC_STAFF", "RECEPTION"];

export default function Notices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ audience: "ALL" });
  const [msg, setMsg] = useState("");

  function load() { api.get("/notices").then((r) => setNotices(r.data)); }
  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/notices", form);
    setMsg("Notice posted.");
    setForm({ audience: "ALL" });
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Notices & Communication</h1>
      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 mb-4 text-sm">{msg}</div>}

      {CAN_SEND.includes(user?.role || "") && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-4 text-sm space-y-2 mb-6 max-w-lg">
          <input required placeholder="Title" className="in" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea required placeholder="Message" className="in" value={form.message || ""} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <select className="in" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
            {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
          </select>
          <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs">Post Notice</button>
        </form>
      )}

      <div className="space-y-3">
        {notices.map((n) => (
          <div key={n.id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-900">{n.title}</div>
              <span className="text-xs text-slate-400">{n.audience.replace(/_/g, " ")}</span>
            </div>
            <div className="text-sm text-slate-600 mt-1">{n.message}</div>
            <div className="text-xs text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString("en-IN")}</div>
          </div>
        ))}
        {notices.length === 0 && <div className="text-slate-400 text-sm">No notices yet.</div>}
      </div>
      <style>{`.in{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px}`}</style>
    </div>
  );
}
