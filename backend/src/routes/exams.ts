import { Router } from "express";
import { eq, and } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_MANAGE_EXAMS = [...MANAGEMENT_ROLES, "ACADEMIC_STAFF"];

function gradeFor(pct: number) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 33) return "D";
  return "F";
}

router.post("/", requireRole(...CAN_MANAGE_EXAMS), ah(async (req: AuthRequest, res) => {
  const { classId, name, academicYearLabel, startDate, endDate } = req.body || {};
  if (!classId || !name || !academicYearLabel || !startDate || !endDate) {
    return res.status(400).json({ error: "classId, name, academicYearLabel, startDate, endDate are required" });
  }
  const [row] = await db.insert(schema.exams).values({ tenantId: req.user!.tenantId, classId, name, academicYearLabel, startDate, endDate }).returning();
  res.status(201).json(row);
}));

router.get("/", ah(async (req: AuthRequest, res) => {
  const { classId } = req.query;
  let rows = await db.select().from(schema.exams).where(eq(schema.exams.tenantId, req.user!.tenantId));
  if (classId) rows = rows.filter((r) => r.classId === classId);
  res.json(rows);
}));

// Bulk enter/update marks (test/exam marks entry, class/subject-wise)
router.post("/:examId/marks/bulk", requireRole(...CAN_MANAGE_EXAMS), ah(async (req: AuthRequest, res) => {
  const { examId } = req.params;
  const { subjectId, records } = req.body || {}; // records: [{ studentId, marksObtained, maxMarks, remarks }]
  if (!subjectId || !Array.isArray(records)) return res.status(400).json({ error: "subjectId, records[] are required" });

  const results = [];
  for (const r of records) {
    const maxMarks = r.maxMarks ?? 100;
    const grade = gradeFor((r.marksObtained / maxMarks) * 100);
    const [existing] = await db
      .select()
      .from(schema.examMarks)
      .where(and(eq(schema.examMarks.examId, examId), eq(schema.examMarks.studentId, r.studentId), eq(schema.examMarks.subjectId, subjectId)));
    if (existing) {
      const [updated] = await db
        .update(schema.examMarks)
        .set({ marksObtained: r.marksObtained, maxMarks, grade, remarks: r.remarks })
        .where(eq(schema.examMarks.id, existing.id))
        .returning();
      results.push(updated);
    } else {
      const [created] = await db
        .insert(schema.examMarks)
        .values({ tenantId: req.user!.tenantId, examId, studentId: r.studentId, subjectId, marksObtained: r.marksObtained, maxMarks, grade, remarks: r.remarks })
        .returning();
      results.push(created);
    }
  }
  res.status(201).json({ saved: results.length, records: results });
}));

router.get("/:examId/marks", ah(async (req: AuthRequest, res) => {
  const { studentId } = req.query;
  let rows = await db.select().from(schema.examMarks).where(and(eq(schema.examMarks.tenantId, req.user!.tenantId), eq(schema.examMarks.examId, req.params.examId)));
  if (studentId) rows = rows.filter((r) => r.studentId === studentId);
  res.json(rows);
}));

// Generate marksheet (PDF) for a student for a given exam - shareable with parents.
router.get("/:examId/marksheet/:studentId.pdf", ah(async (req: AuthRequest, res) => {
  const { examId, studentId } = req.params as any;
  const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, examId));
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  if (!exam || !student || exam.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });

  const marks = await db
    .select()
    .from(schema.examMarks)
    .where(and(eq(schema.examMarks.examId, examId), eq(schema.examMarks.studentId, studentId)));
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, req.user!.tenantId));

  const totalObtained = marks.reduce((s, m) => s + m.marksObtained, 0);
  const totalMax = marks.reduce((s, m) => s + m.maxMarks, 0);
  const pct = totalMax ? (totalObtained / totalMax) * 100 : 0;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=marksheet-${student.admissionNo}.pdf`);
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text(tenant?.schoolName || "School", { align: "center" });
  doc.fontSize(10).text(tenant?.address || "", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Marksheet - ${exam.name} (${exam.academicYearLabel})`, { align: "center", underline: true });
  doc.moveDown();

  doc.fontSize(11);
  doc.text(`Student Name: ${student.name}`);
  doc.text(`Admission No: ${student.admissionNo}   Roll No: ${student.rollNo || "-"}`);
  doc.moveDown();

  const startY = doc.y;
  doc.font("Helvetica-Bold");
  doc.text("Subject", 50, startY, { width: 200 });
  doc.text("Marks Obtained", 250, startY, { width: 120 });
  doc.text("Max Marks", 370, startY, { width: 90 });
  doc.text("Grade", 460, startY, { width: 60 });
  doc.font("Helvetica");
  doc.moveDown(0.5);

  for (const m of marks) {
    const [subj] = await db.select().from(schema.subjects).where(eq(schema.subjects.id, m.subjectId));
    const y = doc.y;
    doc.text(subj?.name || m.subjectId, 50, y, { width: 200 });
    doc.text(String(m.marksObtained), 250, y, { width: 120 });
    doc.text(String(m.maxMarks), 370, y, { width: 90 });
    doc.text(m.grade || "-", 460, y, { width: 60 });
    doc.moveDown(0.7);
  }

  doc.moveDown();
  doc.font("Helvetica-Bold").text(`Total: ${totalObtained} / ${totalMax}   Percentage: ${pct.toFixed(2)}%   Overall Grade: ${gradeFor(pct)}`);
  doc.moveDown(2);
  doc.font("Helvetica").text("_______________________", 400, doc.y);
  doc.text("Class Teacher Signature", 400);

  doc.end();
}));

export default router;
