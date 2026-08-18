import { Router } from "express";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_MANAGE = [...MANAGEMENT_ROLES, "ACCOUNTANT"];

// ---- Allowance / Deduction Heads ----
router.get("/heads", ah(async (req: AuthRequest, res) => {
  const { type } = req.query;
  let rows = await db.select().from(schema.payrollHeads).where(eq(schema.payrollHeads.tenantId, req.user!.tenantId));
  if (type) rows = rows.filter((r) => r.type === type);
  res.json(rows);
}));
router.post("/heads", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const { type, name, amount } = req.body || {};
  if (!type || !name) return res.status(400).json({ error: "type and name are required" });
  const [row] = await db
    .insert(schema.payrollHeads)
    .values({ tenantId: req.user!.tenantId, type, name, amount: amount || 0 })
    .returning();
  res.status(201).json(row);
}));

// ---- Salary Payments ----
router.get("/payments", ah(async (req: AuthRequest, res) => {
  const { month, staffId } = req.query;
  let rows = await db.select().from(schema.salaryPayments).where(eq(schema.salaryPayments.tenantId, req.user!.tenantId));
  if (month) rows = rows.filter((r) => r.month === month);
  if (staffId) rows = rows.filter((r) => r.staffId === staffId);
  res.json(rows.sort((a, b) => (a.month < b.month ? 1 : -1)));
}));
router.post("/payments", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const { staffId, month, basic, allowances, deductions, remarks } = req.body || {};
  if (!staffId || !month) return res.status(400).json({ error: "staffId and month are required" });
  const b = Number(basic) || 0;
  const a = Number(allowances) || 0;
  const d = Number(deductions) || 0;
  const [row] = await db
    .insert(schema.salaryPayments)
    .values({ tenantId: req.user!.tenantId, staffId, month, basic: b, allowances: a, deductions: d, netPay: b + a - d, remarks })
    .returning();
  res.status(201).json(row);
}));
router.patch("/payments/:id/mark-paid", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const [row] = await db
    .update(schema.salaryPayments)
    .set({ status: "PAID", paidOn: new Date().toISOString().slice(0, 10) })
    .where(eq(schema.salaryPayments.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
}));

// Printable salary slip
router.get("/payments/:id/slip.pdf", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const [payment] = await db.select().from(schema.salaryPayments).where(eq(schema.salaryPayments.id, req.params.id));
  if (!payment || payment.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });
  const [staffRow] = await db.select().from(schema.staff).where(eq(schema.staff.id, payment.staffId));
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, req.user!.tenantId));

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=payslip-${payment.month}-${staffRow?.employeeCode || payment.staffId}.pdf`);
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).font("Helvetica-Bold").text(tenant?.schoolName || "School", { align: "center" });
  doc.fontSize(9).font("Helvetica").text(tenant?.address || "", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).font("Helvetica-Bold").text(`Salary Slip - ${payment.month}`, { align: "center", underline: true });
  doc.moveDown();

  doc.fontSize(11).font("Helvetica");
  doc.text(`Employee Name: ${staffRow?.name || "-"}`);
  doc.text(`Employee Code: ${staffRow?.employeeCode || "-"}    Designation: ${staffRow?.designation || "-"}`);
  doc.text(`Department: ${staffRow?.department || "-"}`);
  doc.moveDown();

  const y0 = doc.y;
  doc.font("Helvetica-Bold");
  doc.text("Basic Pay", 50, y0, { width: 200 });
  doc.text(`Rs. ${payment.basic}`, 300, y0, { width: 200 });
  doc.font("Helvetica");
  doc.moveDown(0.7);
  const y1 = doc.y;
  doc.text("Allowances", 50, y1, { width: 200 });
  doc.text(`Rs. ${payment.allowances}`, 300, y1, { width: 200 });
  doc.moveDown(0.7);
  const y2 = doc.y;
  doc.text("Deductions", 50, y2, { width: 200 });
  doc.text(`Rs. ${payment.deductions}`, 300, y2, { width: 200 });
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(13);
  doc.text(`Net Pay: Rs. ${payment.netPay}`, 50);
  doc.fontSize(10).font("Helvetica").text(`Status: ${payment.status}${payment.paidOn ? ` (Paid on ${payment.paidOn})` : ""}`);

  doc.moveDown(3);
  doc.text("_______________________", 380, doc.y);
  doc.text("Authorized Signatory", 380);

  doc.end();
}));

export default router;
