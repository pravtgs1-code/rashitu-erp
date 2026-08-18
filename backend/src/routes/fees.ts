import { Router } from "express";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_MANAGE_FEES = [...MANAGEMENT_ROLES, "ACCOUNTANT"];

// ---- Fee Structure ----
router.post("/structure", requireRole(...CAN_MANAGE_FEES), ah(async (req: AuthRequest, res) => {
  const { classId, feeHead, amount, frequency, academicYearLabel } = req.body || {};
  if (!classId || !feeHead || !amount || !frequency || !academicYearLabel) {
    return res.status(400).json({ error: "classId, feeHead, amount, frequency, academicYearLabel are required" });
  }
  const [row] = await db
    .insert(schema.feeStructures)
    .values({ tenantId: req.user!.tenantId, classId, feeHead, amount, frequency, academicYearLabel })
    .returning();
  res.status(201).json(row);
}));
router.get("/structure", ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.feeStructures).where(eq(schema.feeStructures.tenantId, req.user!.tenantId)));
}));

// ---- Invoices ----
router.post("/invoices", requireRole(...CAN_MANAGE_FEES), ah(async (req: AuthRequest, res) => {
  const { studentId, academicYearLabel, period, feeHead, totalAmount, dueDate } = req.body || {};
  if (!studentId || !period || !feeHead || !totalAmount || !dueDate) {
    return res.status(400).json({ error: "studentId, period, feeHead, totalAmount, dueDate are required" });
  }
  const [row] = await db
    .insert(schema.feeInvoices)
    .values({ tenantId: req.user!.tenantId, studentId, academicYearLabel, period, feeHead, totalAmount, dueDate })
    .returning();
  res.status(201).json(row);
}));

router.get("/invoices", ah(async (req: AuthRequest, res) => {
  const { studentId, status } = req.query;
  let rows = await db.select().from(schema.feeInvoices).where(eq(schema.feeInvoices.tenantId, req.user!.tenantId));
  if (studentId) rows = rows.filter((r) => r.studentId === studentId);
  if (status) rows = rows.filter((r) => r.status === status);
  res.json(rows);
}));

// ---- Payments / Receipts ----
router.post("/payments", requireRole(...CAN_MANAGE_FEES), ah(async (req: AuthRequest, res) => {
  const { invoiceId, amount, mode, remarks, collectedById } = req.body || {};
  if (!invoiceId || !amount || !mode) return res.status(400).json({ error: "invoiceId, amount, mode are required" });

  const [invoice] = await db.select().from(schema.feeInvoices).where(eq(schema.feeInvoices.id, invoiceId));
  if (!invoice || invoice.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Invoice not found" });

  const receiptNo = `RCPT-${Date.now().toString(36).toUpperCase()}`;
  const [payment] = await db
    .insert(schema.feePayments)
    .values({ tenantId: req.user!.tenantId, invoiceId, studentId: invoice.studentId, receiptNo, amount, mode, remarks, collectedById })
    .returning();

  const newPaid = invoice.paidAmount + amount;
  const status = newPaid >= invoice.totalAmount ? "PAID" : newPaid > 0 ? "PARTIAL" : "PENDING";
  await db.update(schema.feeInvoices).set({ paidAmount: newPaid, status }).where(eq(schema.feeInvoices.id, invoiceId));

  res.status(201).json(payment);
}));

router.get("/payments", ah(async (req: AuthRequest, res) => {
  const { studentId } = req.query;
  let rows = await db.select().from(schema.feePayments).where(eq(schema.feePayments.tenantId, req.user!.tenantId));
  if (studentId) rows = rows.filter((r) => r.studentId === studentId);
  res.json(rows);
}));

// Printable fee receipt (PDF)
router.get("/payments/:id/receipt.pdf", ah(async (req: AuthRequest, res) => {
  const [payment] = await db.select().from(schema.feePayments).where(eq(schema.feePayments.id, req.params.id));
  if (!payment || payment.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, payment.studentId));
  const [invoice] = await db.select().from(schema.feeInvoices).where(eq(schema.feeInvoices.id, payment.invoiceId));
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, req.user!.tenantId));

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=${payment.receiptNo}.pdf`);
  const doc = new PDFDocument({ size: "A5", margin: 40 });
  doc.pipe(res);

  doc.fontSize(16).text(tenant?.schoolName || "School", { align: "center" });
  doc.fontSize(9).text(tenant?.address || "", { align: "center" });
  doc.moveDown();
  doc.fontSize(13).text("Fee Receipt", { align: "center", underline: true });
  doc.moveDown();

  doc.fontSize(10);
  doc.text(`Receipt No: ${payment.receiptNo}`);
  doc.text(`Date: ${new Date(payment.paymentDate).toLocaleDateString("en-IN")}`);
  doc.text(`Student Name: ${student?.name || ""}`);
  doc.text(`Admission No: ${student?.admissionNo || ""}`);
  doc.text(`Class/Section: ${student?.classId || ""} / ${student?.sectionId || ""}`);
  doc.moveDown();
  doc.text(`Fee Head: ${invoice?.feeHead || ""}`);
  doc.text(`Period: ${invoice?.period || ""}`);
  doc.text(`Amount Paid: Rs. ${payment.amount}`);
  doc.text(`Payment Mode: ${payment.mode}`);
  doc.text(`Invoice Total: Rs. ${invoice?.totalAmount}   Paid Till Date: Rs. ${invoice?.paidAmount}   Status: ${invoice?.status}`);
  doc.moveDown(2);
  doc.text("_______________________", { align: "right" });
  doc.text("Authorized Signatory", { align: "right" });

  doc.end();
}));

export default router;
