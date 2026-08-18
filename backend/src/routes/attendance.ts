import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_MARK_STUDENT_ATT = [...MANAGEMENT_ROLES, "ACADEMIC_STAFF"];

// ---- Student attendance (class/section-wise) ----
// Bulk mark: [{ studentId, status, remarks }] for a section + date.
// Designed for offline-first sync too: client can queue this call and retry when back online.
router.post("/students/bulk", requireRole(...CAN_MARK_STUDENT_ATT), ah(async (req: AuthRequest, res) => {
  const { sectionId, date, records } = req.body || {};
  if (!sectionId || !date || !Array.isArray(records)) {
    return res.status(400).json({ error: "sectionId, date, records[] are required" });
  }
  const results = [];
  for (const r of records) {
    const [existing] = await db
      .select()
      .from(schema.attendanceStudent)
      .where(and(eq(schema.attendanceStudent.studentId, r.studentId), eq(schema.attendanceStudent.date, date)));
    if (existing) {
      const [updated] = await db
        .update(schema.attendanceStudent)
        .set({ status: r.status, remarks: r.remarks, markedById: req.user!.userId })
        .where(eq(schema.attendanceStudent.id, existing.id))
        .returning();
      results.push(updated);
    } else {
      const [created] = await db
        .insert(schema.attendanceStudent)
        .values({
          tenantId: req.user!.tenantId, studentId: r.studentId, sectionId, date,
          status: r.status, remarks: r.remarks, markedById: req.user!.userId,
        })
        .returning();
      results.push(created);
    }
  }
  res.status(201).json({ marked: results.length, records: results });
}));

// QR Code Attendance: scan a student's QR (encodes "STUDENT:<id>") to mark present for today.
router.post("/students/qr-mark", requireRole(...CAN_MARK_STUDENT_ATT), ah(async (req: AuthRequest, res) => {
  const { qrText, date } = req.body || {};
  if (!qrText) return res.status(400).json({ error: "qrText is required" });
  const studentId = String(qrText).replace(/^STUDENT:/, "");
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  if (!student || student.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Student not found for this QR code" });
  const d = date || new Date().toISOString().slice(0, 10);
  const [existing] = await db
    .select()
    .from(schema.attendanceStudent)
    .where(and(eq(schema.attendanceStudent.studentId, student.id), eq(schema.attendanceStudent.date, d)));
  if (existing) {
    const [updated] = await db
      .update(schema.attendanceStudent)
      .set({ status: "PRESENT", markedById: req.user!.userId })
      .where(eq(schema.attendanceStudent.id, existing.id))
      .returning();
    return res.json({ student, attendance: updated });
  }
  const [created] = await db
    .insert(schema.attendanceStudent)
    .values({ tenantId: req.user!.tenantId, studentId: student.id, sectionId: student.sectionId, date: d, status: "PRESENT", markedById: req.user!.userId })
    .returning();
  res.status(201).json({ student, attendance: created });
}));

router.get("/students", ah(async (req: AuthRequest, res) => {
  const { sectionId, date, studentId } = req.query;
  let rows = await db.select().from(schema.attendanceStudent).where(eq(schema.attendanceStudent.tenantId, req.user!.tenantId));
  if (sectionId) rows = rows.filter((r) => r.sectionId === sectionId);
  if (date) rows = rows.filter((r) => r.date === date);
  if (studentId) rows = rows.filter((r) => r.studentId === studentId);
  res.json(rows);
}));

// ---- Staff attendance ----
router.post("/staff/bulk", requireRole(...MANAGEMENT_ROLES, "ADMIN_CLERICAL", "RECEPTION"), ah(async (req: AuthRequest, res) => {
  const { date, records } = req.body || {}; // records: [{ staffId, status, checkIn, checkOut }]
  if (!date || !Array.isArray(records)) return res.status(400).json({ error: "date, records[] are required" });
  const results = [];
  for (const r of records) {
    const [existing] = await db
      .select()
      .from(schema.attendanceStaff)
      .where(and(eq(schema.attendanceStaff.staffId, r.staffId), eq(schema.attendanceStaff.date, date)));
    if (existing) {
      const [updated] = await db
        .update(schema.attendanceStaff)
        .set({ status: r.status, checkIn: r.checkIn, checkOut: r.checkOut, markedById: req.user!.userId })
        .where(eq(schema.attendanceStaff.id, existing.id))
        .returning();
      results.push(updated);
    } else {
      const [created] = await db
        .insert(schema.attendanceStaff)
        .values({ tenantId: req.user!.tenantId, staffId: r.staffId, date, status: r.status, checkIn: r.checkIn, checkOut: r.checkOut, markedById: req.user!.userId })
        .returning();
      results.push(created);
    }
  }
  res.status(201).json({ marked: results.length, records: results });
}));

// Self check-in for any staff role (e.g. IT, security, reception marking own attendance)
router.post("/staff/self-checkin", ah(async (req: AuthRequest, res) => {
  const [staffRow] = await db.select().from(schema.staff).where(eq(schema.staff.userId, req.user!.userId));
  if (!staffRow) return res.status(400).json({ error: "No staff profile linked to this login" });
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(schema.attendanceStaff)
    .where(and(eq(schema.attendanceStaff.staffId, staffRow.id), eq(schema.attendanceStaff.date, date)));
  if (existing) {
    const [updated] = await db.update(schema.attendanceStaff).set({ checkOut: time }).where(eq(schema.attendanceStaff.id, existing.id)).returning();
    return res.json(updated);
  }
  const [created] = await db
    .insert(schema.attendanceStaff)
    .values({ tenantId: req.user!.tenantId, staffId: staffRow.id, date, status: "PRESENT", checkIn: time, markedById: req.user!.userId })
    .returning();
  res.status(201).json(created);
}));

router.get("/staff", requireRole(...MANAGEMENT_ROLES, "ADMIN_CLERICAL"), ah(async (req: AuthRequest, res) => {
  const { date, staffId } = req.query;
  let rows = await db.select().from(schema.attendanceStaff).where(eq(schema.attendanceStaff.tenantId, req.user!.tenantId));
  if (date) rows = rows.filter((r) => r.date === date);
  if (staffId) rows = rows.filter((r) => r.staffId === staffId);
  res.json(rows);
}));

export default router;
