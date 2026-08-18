import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, tenant } = useAuth();
  const [counts, setCounts] = useState<{ students?: number; staff?: number } | null>(null);
  const [children, setChildren] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === "PARENT") {
      api.get("/students/parent/my-children").then((r) => setChildren(r.data)).catch(() => {});
    } else if (["SCHOOL_ADMIN", "ACADEMIC_STAFF", "ADMIN_CLERICAL", "RECEPTION", "ACCOUNTANT"].includes(user?.role || "")) {
      Promise.all([api.get("/students").catch(() => ({ data: [] })), api.get("/staff").catch(() => ({ data: [] }))]).then(
        ([s, st]) => setCounts({ students: s.data.length, staff: st.data.length })
      );
    }
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Welcome, {user?.username}</h1>
      <p className="text-slate-500 mb-6">{tenant?.schoolName} — {user?.role.replace(/_/g, " ")}</p>

      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Students" value={counts.students ?? "-"} />
          <StatCard label="Staff" value={counts.staff ?? "-"} />
        </div>
      )}

      {user?.role === "PARENT" && (
        <div>
          <h2 className="font-medium text-slate-800 mb-3">My Children</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {children.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="font-semibold text-slate-900">{c.name}</div>
                <div className="text-sm text-slate-500">Admission No: {c.admissionNo} · Roll No: {c.rollNo || "-"}</div>
              </div>
            ))}
            {children.length === 0 && <div className="text-slate-400 text-sm">No linked students found.</div>}
          </div>
        </div>
      )}

      <div className="mt-8 text-sm text-slate-400">
        Use the left menu to access modules available to your role/department.
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="text-slate-500 text-sm">{label}</div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
