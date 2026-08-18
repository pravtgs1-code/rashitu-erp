import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Branding() {
  const { tenant } = useAuth();
  const [form, setForm] = useState<any>({ ...tenant });
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.patch(`/tenants/${tenant?.id}/branding`, form);
    setMsg("Branding updated. Sign out and back in to see it fully applied.");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-slate-900 mb-4">School Branding (White-label)</h1>
      <p className="text-sm text-slate-500 mb-4">Customize how your Rasitu ERP instance looks for your school — name, logo, colors.</p>
      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 mb-4 text-sm">{msg}</div>}
      <form onSubmit={submit} className="bg-white border rounded-xl p-4 text-sm space-y-2">
        <input className="in" defaultValue={tenant?.schoolName} placeholder="School Name" onChange={(e) => setForm({ ...form, schoolName: e.target.value })} />
        <input className="in" defaultValue={tenant?.logoUrl || ""} placeholder="Logo URL" onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-slate-500">Primary Color<input type="color" className="w-full h-9" defaultValue={tenant?.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} /></label>
          <label className="flex-1 text-xs text-slate-500">Secondary Color<input type="color" className="w-full h-9" defaultValue={tenant?.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} /></label>
        </div>
        <input className="in" placeholder="Address" onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className="in" placeholder="Phone" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="in" placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs">Save Branding</button>
      </form>
      <style>{`.in{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px}`}</style>
    </div>
  );
}
