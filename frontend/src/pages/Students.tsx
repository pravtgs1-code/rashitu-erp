import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState<any>({ createLogins: true, guardian: {} });

  function load() {
    api.get("/students").then((r) => setStudents(r.data));
    api.get("/academic/classes").then((r) => setClasses(r.data));
  }
  useEffect(load, []);
  useEffect(() => {
    if (form.classId) api.get(`/academic/sections?classId=${form.classId}`).then((r) => setSections(r.data));
  }, [form.classId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.post("/students", form);
    setResult(res.data);
    setShowForm(false);
    setForm({ createLogins: true, guardian: {} });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Students</h1>
        <button onClick={() => setShowForm((s) => !s)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">
          {showForm ? "Cancel" : "+ New Admission"}
        </button>
      </div>

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 mb-4 text-sm">
          <div className="font-medium">Admission successful.</div>
          {result.studentLogin && <div>Student login — username: {result.studentLogin.username}, temp password: {result.studentLogin.tempPassword}</div>}
          {result.parentLogin && <div>Parent login — username: {result.parentLogin.username}, temp password: {result.parentLogin.tempPassword}</div>}
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-5 mb-6 grid grid-cols-2 gap-3 text-sm">
          <Input label="SR No (overall)" onChange={(v) => setForm({ ...form, srNo: v })} required />
          <Input label="Admission No" onChange={(v) => setForm({ ...form, admissionNo: v })} required />
          <Input label="Roll No" onChange={(v) => setForm({ ...form, rollNo: v })} />
          <Input label="Full Name" onChange={(v) => setForm({ ...form, name: v })} required />
          <Input label="Date of Birth" type="date" onChange={(v) => setForm({ ...form, dob: v })} required />
          <Select label="Gender" options={["Male", "Female", "Other"]} onChange={(v) => setForm({ ...form, gender: v })} required />
          <Select label="Class" options={classes.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => setForm({ ...form, classId: v })} required />
          <Select label="Section" options={sections.map((s) => ({ value: s.id, label: s.name }))} onChange={(v) => setForm({ ...form, sectionId: v })} required />
          <Input label="Admission Date" type="date" onChange={(v) => setForm({ ...form, admissionDate: v })} required />
          <Input label="Blood Group" onChange={(v) => setForm({ ...form, bloodGroup: v })} />

          <div className="col-span-2 font-medium text-slate-700 mt-2">Family Details</div>
          <Input label="Father's Name" onChange={(v) => setForm({ ...form, guardian: { ...form.guardian, fatherName: v } })} />
          <Input label="Mother's Name" onChange={(v) => setForm({ ...form, guardian: { ...form.guardian, motherName: v } })} />
          <Input label="Guardian Phone (for parent login)" onChange={(v) => setForm({ ...form, guardian: { ...form.guardian, phone: v } })} required />
          <Input label="Guardian Email" onChange={(v) => setForm({ ...form, guardian: { ...form.guardian, email: v } })} />
          <Input label="Address" onChange={(v) => setForm({ ...form, guardian: { ...form.guardian, address: v } })} />

          <div className="col-span-2 mt-2">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Save Admission</button>
          </div>
        </form>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr><Th>SR No</Th><Th>Admission No</Th><Th>Roll No</Th><Th>Name</Th><Th>DOB</Th><Th>Gender</Th></tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t">
                <Td>{s.srNo}</Td><Td>{s.admissionNo}</Td><Td>{s.rollNo}</Td><Td>{s.name}</Td><Td>{s.dob}</Td><Td>{s.gender}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">No students yet.</div>}
      </div>
    </div>
  );
}

function Input({ label, onChange, type = "text", required }: { label: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-slate-600">{label}{required && " *"}</span>
      <input type={type} required={required} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-1.5" />
    </label>
  );
}
function Select({ label, options, onChange, required }: { label: string; options: any[]; onChange: (v: string) => void; required?: boolean }) {
  const opts = options.length && typeof options[0] === "string" ? options.map((o: string) => ({ value: o, label: o })) : options;
  return (
    <label className="block">
      <span className="text-slate-600">{label}{required && " *"}</span>
      <select required={required} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-1.5">
        <option value="">Select...</option>
        {opts.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
function Th({ children }: any) { return <th className="px-4 py-2 font-medium">{children}</th>; }
function Td({ children }: any) { return <td className="px-4 py-2">{children}</td>; }
