import { Router } from "express";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_ISSUE = [...MANAGEMENT_ROLES, "ACADEMIC_STAFF", "ADMIN_CLERICAL"];

function drawCard(doc: PDFKit.PDFDocument, x: number, y: number, tenant: any, opts: {
  photoUrl?: string | null; name: string; sub1: string; sub2: string; sub3?: string; qrDataUrl: string;
}) {
  const w = 260, h = 160;
  doc.roundedRect(x, y, w, h, 10).fillAndStroke("#ffffff", "#c7d2fe");
  doc.fillColor("#312e81").fontSize(11).font("Helvetica-Bold").text(tenant?.schoolName || "School", x + 10, y + 8, { width: w - 20 });
  doc.fillColor("#64748b").fontSize(7).font("Helvetica").text(tenant?.address || "", x + 10, y + 22, { width: w - 20 });

  // Photo
  try {
    if (opts.photoUrl && opts.photoUrl.startsWith("data:")) {
      const base64 = opts.photoUrl.split(",")[1];
      doc.image(Buffer.from(base64, "base64"), x + 10, y + 38, { width: 55, height: 65, fit: [55, 65] });
    } else {
      doc.rect(x + 10, y + 38, 55, 65).stroke("#cbd5e1");
    }
  } catch {
    doc.rect(x + 10, y + 38, 55, 65).stroke("#cbd5e1");
  }

  doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text(opts.name, x + 75, y + 40, { width: 130 });
  doc.fillColor("#334155").fontSize(8).font("Helvetica");
  doc.text(opts.sub1, x + 75, y + 58, { width: 130 });
  doc.text(opts.sub2, x + 75, y + 70, { width: 130 });
  if (opts.sub3) doc.text(opts.sub3, x + 75, y + 82, { width: 130 });

  // QR
  try {
    const qrBase64 = opts.qrDataUrl.split(",")[1];
    doc.image(Buffer.from(qrBase64, "base64"), x + 190, y + 95, { width: 55, height: 55 });
  } catch {}

  doc.fillColor("#94a3b8").fontSize(6).text("Valid for current academic session", x + 10, y + h - 14, { width: w - 20, align: "center" });
}

router.get("/student/:studentId.pdf", requireRole(...CAN_ISSUE), ah(async (req: AuthRequest, res) => {
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, req.params.studentId));
  if (!student || student.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, req.user!.tenantId));
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, student.classId));
  const [sec] = await db.select().from(schema.sections).where(eq(schema.sections.id, student.sectionId));
  const qrDataUrl = await QRCode.toDataURL(`STUDENT:${student.id}`);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=idcard-${student.admissionNo}.pdf`);
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  drawCard(doc, 40, 40, tenant, {
    photoUrl: student.photoUrl,
    name: student.name,
    sub1: `Class: ${cls?.name || "-"} - ${sec?.name || "-"}`,
    sub2: `Adm No: ${student.admissionNo}  Roll: ${student.rollNo || "-"}`,
    sub3: `DOB: ${student.dob}  Blood: ${student.bloodGroup || "-"}`,
    qrDataUrl,
  });
  doc.end();
}));

router.get("/staff/:staffId.pdf", requireRole(...CAN_ISSUE), ah(async (req: AuthRequest, res) => {
  const [staffRow] = await db.select().from(schema.staff).where(eq(schema.staff.id, req.params.staffId));
  if (!staffRow || staffRow.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, req.user!.tenantId));
  const qrDataUrl = await QRCode.toDataURL(`STAFF:${staffRow.id}`);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=idcard-${staffRow.employeeCode}.pdf`);
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);
  drawCard(doc, 40, 40, tenant, {
    photoUrl: staffRow.photoUrl,
    name: staffRow.name,
    sub1: `${staffRow.designation} - ${staffRow.department}`,
    sub2: `Emp Code: ${staffRow.employeeCode}`,
    sub3: `Contact: ${staffRow.contactNumber || "-"}`,
    qrDataUrl,
  });
  doc.end();
}));

export default router;
