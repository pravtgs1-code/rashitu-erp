import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Schools() {
  const [schools, setSchools] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [result, setResult] = useState<any>(null);

  function load() { api.get("/tenants").then((r) => setSchools(r.data)); }
  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.post("/tenants", form);
    setResult(res.data);
    setForm({});
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Schools (Rasitu Customers)</h1>
      <p className="text-sm text-slate-500 mb-4">Onboard a new school as a white-labeled, isolated instance with its own branding and admin login.</p>

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 mb-4 text-sm">
          School onboarded — Code: {result.tenant.code}. Admin login: username <b>{result.adminLogin.username}</b>, temp password <b>{result.adminLogin.tempPassword}</b>.
        </div>
      )}

      <form onSubmit={submit} className="bg-white border rounded-xl p-4 text-sm space-y-2 mb-6 max-w-lg">
        <input required placeholder="School Code (slug, no spaces) e.g. sunrise-academy" className="in" onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input required placeholder="School Name" className="in" onChange={(e) => setForm({ ...form, schoolName: e.target.value })} />
        <input placeholder="Logo URL" className="in" onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
        <input placeholder="Address" className="in" onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input placeholder="Phone" className="in" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Email" className="in" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required placeholder="First School Admin Username" className="in" onChange={(e) => setForm({ ...form, adminUsername: e.target.value })} />
        <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs">Onboard School</button>
      </form>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left"><tr><th className="px-4 py-2">Code</th><th className="px-4 py-2">School Name</th><th className="px-4 py-2">Active</th></tr></thead>
          <tbody>
            {schools.map((s) => (
              <tr key={s.id} className="border-t"><td className="px-4 py-2">{s.code}</td><td className="px-4 py-2">{s.schoolName}</td><td className="px-4 py-2">{s.isActive ? "Yes" : "No"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`.in{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px}`}</style>
    </div>
  );
}
