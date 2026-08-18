import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import tenantRoutes from "./routes/tenants";
import academicRoutes from "./routes/academic";
import studentRoutes from "./routes/students";
import staffRoutes from "./routes/staff";
import feeRoutes from "./routes/fees";
import attendanceRoutes from "./routes/attendance";
import examRoutes from "./routes/exams";
import homeworkRoutes from "./routes/homework";
import noticeRoutes from "./routes/notices";
import assetRoutes from "./routes/assets";
import frontOfficeRoutes from "./routes/frontoffice";
import accountsRoutes from "./routes/accounts";
import mastersRoutes from "./routes/masters";
import libraryRoutes from "./routes/library";
import transportRoutes from "./routes/transport";
import stockRoutes from "./routes/stock";
import payrollRoutes from "./routes/payroll";
import certificatesRoutes from "./routes/certificates";
import idcardsRoutes from "./routes/idcards";
import messagingRoutes from "./routes/messaging";

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "Rasitu App Management Services - School ERP API" }));

app.use("/api/auth", authRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/academic", academicRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/homework", homeworkRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/frontoffice", frontOfficeRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/masters", mastersRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/transport", transportRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/certificates", certificatesRoutes);
app.use("/api/idcards", idcardsRoutes);
app.use("/api/messaging", messagingRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error", detail: String(err?.message || err) });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`Rasitu ERP API running on http://localhost:${PORT}`);
});
