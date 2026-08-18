import { useEffect, useState } from "react";
import { api } from "../api/client";

const DEPARTMENTS = ["ACADEMIC", "ADMIN_CLERICAL", "RECEPTION", "SECURITY", "IT", "STORE", "LAB", "TRANSPORT", "CANTEEN", "LIBRARY", "ACCOUNTS", "MANAGEMENT"];

export default function Staff() {
  const [staff, setStaff] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<any>({});
  const [result, setResult] = useState<any>(null);

  function load() {
    api.get("/staff").then((r) => setStaff(r.data)).catch(() => setStaff([]));
  }
  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.post("/staff", form);
    setResult(res.data);
    setShowForm(false);
    setForm({});
    load();
  }

  const filtered = filter ? staff.filter((s) => s.department === filter) : staff;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Staff (All Departments)</h1>
        <button onClick={() => setShowForm((s) => !s)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">
          {showForm ? "Cancel" : "+ Onboard Staff"}
        </button>
      </div>

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 mb-4 text-sm">
          Staff onboarded. Login — username: {result.login.username}, temp password: {result.login.tempPassword}, role: {result.login.role}
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-5 mb-6 grid grid-cols-2 gap-3 text-sm">
          <L label="Employee Code"><input required className="in" onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></L>
          <L label="Full Name"><input required className="in" onChange={(e) => setForm({ ...form, name: e.target.value })} /></L>
          <L label="Department">
            <select required className="in" onChange={(e) => setForm({ ...form, department: e.target.value })}>
              <option value="">Select...</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}
            </select>
          </L>
          <L label="Designation"><input required className="in" onChange={(e) => setForm({ ...form, designation: e.target.value })} /></L>
          <L label="Date of Joining"><input type="date" required className="in" onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} /></L>
          <L label="Qualification"><input className="in" onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></L>
          <L label="Contact Number"><input className="in" onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} /></L>
          <L label="Email"><input className="in" onChange={(e) => setForm({ ...form, email: e.target.value })} /></L>
          <L label="Salary"><input type="number" className="in" onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} /></L>
          <div className="col-span-2"><button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Create Staff & Login</button></div>
        </form>
      )}

      <div className="mb-3 flex gap-2 flex-wrap text-xs">
        <button onClick={() => setFilter("")} className={`px-3 py-1 rounded-full border ${!filter ? "bg-slate-900 text-white" : ""}`}>All</button>
        {DEPARTMENTS.map((d) => (
          <button key={d} onClick={() => setFilter(d)} className={`px-3 py-1 rounded-full border ${filter === d ? "bg-slate-900 text-white" : ""}`}>{d.replace(/_/g, " ")}</button>
        ))}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr><th className="px-4 py-2">Emp Code</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Department</th><th className="px-4 py-2">Designation</th></tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-2">{s.employeeCode}</td><td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2">{s.department.replace(/_/g, " ")}</td><td className="px-4 py-2">{s.designation}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">No staff records.</div>}
      </div>
      <style>{`.in{margin-top:4px;width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px}`}</style>
    </div>
  );
}
function L({ label, children }: any) {
  return <label className="block"><span className="text-slate-600">{label}</span>{children}</label>;
}
