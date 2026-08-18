import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Staff from "./pages/Staff";
import Academic from "./pages/Academic";
import Fees from "./pages/Fees";
import Attendance from "./pages/Attendance";
import Exams from "./pages/Exams";
import Homework from "./pages/Homework";
import Notices from "./pages/Notices";
import Assets from "./pages/Assets";
import Branding from "./pages/Branding";
import Schools from "./pages/Schools";

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/academic" element={<Academic />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/homework" element={<Homework />} />
            <Route path="/notices" element={<Notices />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/branding" element={<Branding />} />
            <Route path="/schools" element={<Schools />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
