import { useEffect, useState } from "react";
import { api } from "../api/client";

const CATEGORIES = ["COMPUTER_SET", "UPS", "FURNITURE", "LAB_EQUIPMENT", "SPORTS_EQUIPMENT", "ELECTRICAL", "VEHICLE", "LIBRARY_ITEM", "KITCHEN_CANTEEN", "OTHER"];
const COMPONENT_TYPES = ["MONITOR", "CPU", "KEYBOARD", "MOUSE", "UPS", "OTHER"];

export default function Assets() {
  const [assets, setAssets] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ components: [] });
  const [msg, setMsg] = useState("");

  function load() { api.get("/assets").then((r) => setAssets(r.data)).catch(() => setAssets([])); }
  useEffect(load, []);

  function addComponent() {
    setForm({ ...form, components: [...(form.components || []), { componentType: "MONITOR", brand: "" }] });
  }
  function updateComponent(i: number, key: string, value: string) {
    const comps = [...form.components];
    comps[i] = { ...comps[i], [key]: value };
    setForm({ ...form, components: comps });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/assets", form);
    setMsg("Asset registered.");
    setForm({ components: [] });
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Assets & Inventory</h1>
      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 mb-4 text-sm">{msg}</div>}

      <form onSubmit={submit} className="bg-white border rounded-xl p-4 text-sm space-y-2 mb-6 max-w-lg">
        <div className="font-medium text-slate-800">Register Asset</div>
        <input required placeholder="Asset Code e.g. AST-COMP-002" className="in" onChange={(e) => setForm({ ...form, assetCode: e.target.value })} />
        <select required className="in" onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="">Category...</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input required placeholder="Name / description" className="in" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Location e.g. Computer Lab" className="in" onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input type="number" placeholder="Cost" className="in" onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />

        {form.category === "COMPUTER_SET" && (
          <div className="border-t pt-2">
            <div className="text-xs text-slate-500 mb-1">Add components (Monitor, CPU, Keyboard, Mouse...)</div>
            {(form.components || []).map((c: any, i: number) => (
              <div key={i} className="flex gap-2 mb-1">
                <select className="in" value={c.componentType} onChange={(e) => updateComponent(i, "componentType", e.target.value)}>
                  {COMPONENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <input placeholder="Brand" className="in" value={c.brand || ""} onChange={(e) => updateComponent(i, "brand", e.target.value)} />
              </div>
            ))}
            <button type="button" onClick={addComponent} className="text-blue-600 text-xs underline">+ Add component</button>
          </div>
        )}
        <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs">Save Asset</button>
      </form>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left"><tr><th className="px-4 py-2">Code</th><th className="px-4 py-2">Category</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Location</th><th className="px-4 py-2">Status</th></tr></thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-2">{a.assetCode}</td><td className="px-4 py-2">{a.category.replace(/_/g, " ")}</td>
                <td className="px-4 py-2">{a.name}</td><td className="px-4 py-2">{a.location}</td><td className="px-4 py-2">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {assets.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">No assets registered.</div>}
      </div>
      <style>{`.in{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px}`}</style>
    </div>
  );
}
