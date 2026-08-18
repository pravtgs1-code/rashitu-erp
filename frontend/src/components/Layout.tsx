import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { getQueue, syncOfflineQueue } from "../api/client";

interface NavItem { to: string; label: string; }

const ROLE_NAV: Record<string, NavItem[]> = {
  SUPER_ADMIN: [{ to: "/schools", label: "Schools (Customers)" }],
  SCHOOL_ADMIN: [
    { to: "/", label: "Dashboard" }, { to: "/students", label: "Students" }, { to: "/staff", label: "Staff" },
    { to: "/academic", label: "Classes & Subjects" }, { to: "/fees", label: "Fees & Receipts" },
    { to: "/attendance", label: "Attendance" }, { to: "/exams", label: "Exams & Marksheet" },
    { to: "/homework", label: "Homework" }, { to: "/notices", label: "Notices" }, { to: "/assets", label: "Assets" },
    { to: "/branding", label: "School Branding" },
  ],
  ACCOUNTANT: [{ to: "/", label: "Dashboard" }, { to: "/fees", label: "Fees & Receipts" }, { to: "/notices", label: "Notices" }],
  ACADEMIC_STAFF: [
    { to: "/", label: "Dashboard" }, { to: "/students", label: "Students" }, { to: "/attendance", label: "Attendance" },
    { to: "/exams", label: "Exams & Marksheet" }, { to: "/homework", label: "Homework" }, { to: "/notices", label: "Notices" },
  ],
  ADMIN_CLERICAL: [{ to: "/", label: "Dashboard" }, { to: "/students", label: "Students" }, { to: "/staff", label: "Staff" }, { to: "/notices", label: "Notices" }],
  RECEPTION: [{ to: "/", label: "Dashboard" }, { to: "/students", label: "Students" }, { to: "/notices", label: "Notices" }],
  SECURITY: [{ to: "/", label: "Dashboard" }, { to: "/attendance", label: "My Attendance" }, { to: "/notices", label: "Notices" }],
  IT_STAFF: [{ to: "/", label: "Dashboard" }, { to: "/assets", label: "Assets" }, { to: "/notices", label: "Notices" }],
  STORE_KEEPER: [{ to: "/", label: "Dashboard" }, { to: "/assets", label: "Assets & Inventory" }, { to: "/notices", label: "Notices" }],
  LAB_ASSISTANT: [{ to: "/", label: "Dashboard" }, { to: "/assets", label: "Lab Assets & Inventory" }, { to: "/notices", label: "Notices" }],
  TRANSPORT_STAFF: [{ to: "/", label: "Dashboard" }, { to: "/attendance", label: "My Attendance" }, { to: "/notices", label: "Notices" }],
  CANTEEN_STAFF: [{ to: "/", label: "Dashboard" }, { to: "/assets", label: "Canteen Inventory" }, { to: "/notices", label: "Notices" }],
  LIBRARIAN: [{ to: "/", label: "Dashboard" }, { to: "/notices", label: "Notices" }],
  PARENT: [{ to: "/", label: "My Children" }, { to: "/notices", label: "Notices" }],
  STUDENT: [{ to: "/", label: "My Dashboard" }, { to: "/homework", label: "Homework" }, { to: "/notices", label: "Notices" }],
};

export default function Layout() {
  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();
  const [queueCount, setQueueCount] = useState(getQueue().length);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const i = setInterval(() => setQueueCount(getQueue().length), 2000);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { clearInterval(i); window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  const nav = ROLE_NAV[user?.role || ""] || [{ to: "/", label: "Dashboard" }];

  return (
    <div className="min-h-screen flex" style={{ ["--brand" as any]: tenant?.primaryColor }}>
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700">
          <div className="font-semibold leading-tight">{tenant?.schoolName || "Rasitu ERP"}</div>
          <div className="text-xs text-slate-400 mt-0.5">Powered by Rasitu App Management Services</div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm ${isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700 text-xs text-slate-400">
          <div>{user?.username} — <span className="text-slate-300">{user?.role.replace(/_/g, " ")}</span></div>
          <button onClick={() => { logout(); navigate("/login"); }} className="mt-2 text-red-300 hover:text-red-200">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        <div className={`px-6 py-2 text-xs flex items-center justify-between ${online ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
          <span>{online ? "● Online" : "● Offline — changes will save locally and sync automatically when back online"}</span>
          {queueCount > 0 && (
            <button
              className="underline"
              onClick={async () => { await syncOfflineQueue(); setQueueCount(getQueue().length); }}
            >
              {queueCount} change(s) waiting to sync — tap to retry now
            </button>
          )}
        </div>
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
