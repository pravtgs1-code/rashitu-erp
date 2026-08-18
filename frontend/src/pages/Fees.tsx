import { useEffect, useState } from "react";
import { api, openAuthenticatedPdf } from "../api/client";

export default function Fees() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [structForm, setStructForm] = useState<any>({});
  const [invForm, setInvForm] = useState<any>({});
  const [payForm, setPayForm] = useState<any>({});
  const [msg, setMsg] = useState("");

  function loadInvoices() { api.get("/fees/invoices").then((r) => setInvoices(r.data)); }
  useEffect(() => {
    api.get("/students").then((r) => setStudents(r.data)).catch(() => {});
    api.get("/academic/classes").then((r) => setClasses(r.data)).catch(() => {});
    loadInvoices();
  }, []);

  async function createStructure(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/fees/structure", structForm);
    setMsg("Fee structure saved.");
    setStructForm({});
  }
  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/fees/invoices", invForm);
    setMsg("Invoice created.");
    setInvForm({});
    loadInvoices();
  }
  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.post("/fees/payments", payForm);
    setMsg(`Payment recorded. Receipt: ${res.data.receiptNo}`);
    setPayForm({});
    loadInvoices();
    openAuthenticatedPdf(`/fees/payments/${res.data.id}/receipt.pdf`);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Fees & Receipts</h1>
      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 mb-4 text-sm">{msg}</div>}

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <form onSubmit={createStructure} className="bg-white border rounded-xl p-4 text-sm space-y-2">
          <div className="font-medium text-slate-800 mb-1">Define Fee Structure</div>
          <SelectClass classes={classes} onChange={(v) => setStructForm({ ...structForm, classId: v })} />
          <input required placeholder="Fee Head e.g. Tuition Fee" className="in" onChange={(e) => setStructForm({ ...structForm, feeHead: e.target.value })} />
          <input required type="number" placeholder="Amount" className="in" onChange={(e) => setStructForm({ ...structForm, amount: Number(e.target.value) })} />
          <select required className="in" onChange={(e) => setStructForm({ ...structForm, frequency: e.target.value })}>
            <option value="">Frequency...</option>
            {["ONE_TIME", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUAL"].map((f) => <option key={f}>{f}</option>)}
          </select>
          <input required placeholder="Academic Year e.g. 2026-2027" className="in" onChange={(e) => setStructForm({ ...structForm, academicYearLabel: e.target.value })} />
          <button className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs">Save Structure</button>
        </form>

        <form onSubmit={createInvoice} className="bg-white border rounded-xl p-4 text-sm space-y-2">
          <div className="font-medium text-slate-800 mb-1">Generate Invoice</div>
          <SelectStudent students={students} onChange={(v) => setInvForm({ ...invForm, studentId: v })} />
          <input required placeholder="Period e.g. April 2026" className="in" onChange={(e) => setInvForm({ ...invForm, period: e.target.value })} />
          <input required placeholder="Fee Head" className="in" onChange={(e) => setInvForm({ ...invForm, feeHead: e.target.value })} />
          <input required type="number" placeholder="Total Amount" className="in" onChange={(e) => setInvForm({ ...invForm, totalAmount: Number(e.target.value) })} />
          <input required type="date" className="in" onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })} />
          <input placeholder="Academic Year" className="in" onChange={(e) => setInvForm({ ...invForm, academicYearLabel: e.target.value })} />
          <button className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs">Create Invoice</button>
        </form>

        <form onSubmit={recordPayment} className="bg-white border rounded-xl p-4 text-sm space-y-2">
          <div className="font-medium text-slate-800 mb-1">Collect Fee (Receipt)</div>
          <select required className="in" onChange={(e) => setPayForm({ ...payForm, invoiceId: e.target.value })}>
            <option value="">Select invoice...</option>
            {invoices.filter((i) => i.status !== "PAID").map((i) => (
              <option key={i.id} value={i.id}>{i.feeHead} · {i.period} · Due Rs.{(i.totalAmount - i.paidAmount).toFixed(0)}</option>
            ))}
          </select>
          <input required type="number" placeholder="Amount" className="in" onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })} />
          <select required className="in" onChange={(e) => setPayForm({ ...payForm, mode: e.target.value })}>
            <option value="">Payment Mode...</option>
            {["CASH", "ONLINE", "CHEQUE", "UPI", "CARD", "BANK_TRANSFER"].map((m) => <option key={m}>{m}</option>)}
          </select>
          <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs">Collect & Print Receipt</button>
        </form>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr><th className="px-4 py-2">Period</th><th className="px-4 py-2">Fee Head</th><th className="px-4 py-2">Total</th><th className="px-4 py-2">Paid</th><th className="px-4 py-2">Status</th></tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-4 py-2">{i.period}</td><td className="px-4 py-2">{i.feeHead}</td>
                <td className="px-4 py-2">Rs. {i.totalAmount}</td><td className="px-4 py-2">Rs. {i.paidAmount}</td>
                <td className="px-4 py-2"><Badge status={i.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">No invoices yet.</div>}
      </div>
      <style>{`.in{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px}`}</style>
    </div>
  );
}

function SelectClass({ classes, onChange }: { classes: any[]; onChange: (v: string) => void }) {
  return <select className="in" onChange={(e) => onChange(e.target.value)}><option value="">Class...</option>{classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>;
}
function SelectStudent({ students, onChange }: { students: any[]; onChange: (v: string) => void }) {
  return <select required className="in" onChange={(e) => onChange(e.target.value)}><option value="">Student...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.admissionNo})</option>)}</select>;
}
function Badge({ status }: { status: string }) {
  const color = status === "PAID" ? "bg-emerald-100 text-emerald-700" : status === "PARTIAL" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{status}</span>;
}
