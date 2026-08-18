import { Router } from "express";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_ISSUE = [...MANAGEMENT_ROLES, "ACADEMIC_STAFF", "ADMIN_CLERICAL"];

function header(doc: PDFKit.PDFDocument, tenant: any, title: string) {
  doc.fontSize(20).font("Helvetica-Bold").text(tenant?.schoolName || "School", { align: "center" });
  doc.fontSize(9).font("Helvetica").text(tenant?.address || "", { align: "center" });
  if (tenant?.affiliationNo) doc.fontSize(9).text(`Affiliation No: ${tenant.affiliationNo}`, { align: "center" });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#94a3b8").stroke();
  doc.moveDown(1);
  doc.fontSize(16).font("Helvetica-Bold").text(title, { align: "center", underline: true });
  doc.moveDown(1.5);
  doc.font("Helvetica").fontSize(12);
}

function footer(doc: PDFKit.PDFDocument) {
  doc.moveDown(4);
  const y = doc.y;
  doc.text("_______________________", 60, y);
  doc.text("Class Teacher", 60);
  doc.text("_______________________", 380, y);
  doc.text("Principal / Head of Institution", 380);
}

// ---- Student certificates: character, bonafide, tc, appreciation, participation, achievement ----
router.get("/student/:type/:studentId.pdf", requireRole(...CAN_ISSUE), ah(async (req: AuthRequest, res) => {
  const { type, studentId } = req.params as any;
  const { eventName, remarks } = req.query as any;
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  if (!student || student.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Student not found" });
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, req.user!.tenantId));
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, student.classId));
  const [sec] = await db.select().from(schema.sections).where(eq(schema.sections.id, student.sectionId));
  const today = new Date().toISOString().slice(0, 10);

  const TITLES: Record<string, string> = {
    character: "Character Certificate",
    bonafide: "Bonafide Certificate",
    tc: "Transfer Certificate",
    appreciation: "Certificate of Appreciation",
    participation: "Certificate of Participation",
    achievement: "Certificate of Achievement",
  };
  const title = TITLES[type];
  if (!title) return res.status(400).json({ error: "Unknown certificate type" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=${type}-${student.admissionNo}.pdf`);
  const doc = new PDFDocument({ size: "A4", margin: 60 });
  doc.pipe(res);
  header(doc, tenant, title);

  if (type === "character") {
    doc.text(
      `This is to certify that ${student.name}, S/o / D/o, a student of Class ${cls?.name || "-"} - ${sec?.name || "-"} (Admission No: ${student.admissionNo}), bearing Date of Birth ${student.dob}, has been a student of this institution. During the period of study, his/her character and conduct have been found to be good.`,
      { align: "justify" }
    );
    doc.moveDown();
    doc.text(`This certificate is issued on request for whatever purpose it may serve.`, { align: "justify" });
  } else if (type === "bonafide") {
    doc.text(
      `This is to certify that ${student.name} (Admission No: ${student.admissionNo}, Roll No: ${student.rollNo || "-"}) is a bonafide student of this institution, studying in Class ${cls?.name || "-"} - ${sec?.name || "-"} for the academic session.`,
      { align: "justify" }
    );
    doc.moveDown();
    doc.text(`This certificate is issued for official/verification purposes.`, { align: "justify" });
  } else if (type === "tc") {
    doc.text(`Student Name: ${student.name}`);
    doc.text(`Admission No: ${student.admissionNo}      SR No: ${student.srNo}`);
    doc.text(`Date of Birth: ${student.dob}      Gender: ${student.gender}`);
    doc.text(`Class Last Studied: ${cls?.name || "-"} - ${sec?.name || "-"}`);
    doc.text(`Date of Admission: ${student.admissionDate}      Date of Leaving: ${today}`);
    doc.moveDown();
    doc.text(`This is to certify that the above-named student has been on the rolls of this institution and is being relieved. Conduct and character during the period of study were found satisfactory.`, { align: "justify" });
  } else if (type === "appreciation" || type === "participation" || type === "achievement") {
    doc.fontSize(13).text(`This certificate is proudly presented to`, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(18).font("Helvetica-Bold").text(student.name, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica").text(
      `of Class ${cls?.name || "-"} - ${sec?.name || "-"} for ${type === "achievement" ? "outstanding achievement" : type === "participation" ? "active participation" : "commendable performance"} in ${eventName || "the school event"}.`,
      { align: "center" }
    );
    if (remarks) { doc.moveDown(0.5); doc.text(String(remarks), { align: "center" }); }
  }

  doc.text(`Date: ${today}`, 60, doc.y + 20);
  footer(doc);
  doc.end();
}));

// ---- Staff Experience Certificate ----
router.get("/staff/experience/:staffId.pdf", requireRole(...CAN_ISSUE), ah(async (req: AuthRequest, res) => {
  const [staffRow] = await db.select().from(schema.staff).where(eq(schema.staff.id, req.params.staffId));
  if (!staffRow || staffRow.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Staff not found" });
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, req.user!.tenantId));
  const today = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=experience-${staffRow.employeeCode}.pdf`);
  const doc = new PDFDocument({ size: "A4", margin: 60 });
  doc.pipe(res);
  header(doc, tenant, "Experience Certificate");

  doc.text(
    `This is to certify that ${staffRow.name} (Employee Code: ${staffRow.employeeCode}) worked at this institution as ${staffRow.designation} in the ${staffRow.department} department, from ${staffRow.dateOfJoining} to ${today}. During the tenure, his/her performance and conduct were found to be satisfactory.`,
    { align: "justify" }
  );
  doc.moveDown();
  doc.text(`We wish him/her all success in future endeavours.`, { align: "justify" });
  doc.text(`Date: ${today}`, 60, doc.y + 20);
  footer(doc);
  doc.end();
}));

export default router;
