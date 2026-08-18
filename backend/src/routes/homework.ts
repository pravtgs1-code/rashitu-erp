import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);

// Online homework - assigned by academic staff, class/section/subject-wise
router.post("/", requireRole("ACADEMIC_STAFF", "SCHOOL_ADMIN", "SUPER_ADMIN"), ah(async (req: AuthRequest, res) => {
  const { classId, sectionId, subjectId, title, description, attachmentUrl, dueDate } = req.body || {};
  if (!classId || !sectionId || !subjectId || !title || !description || !dueDate) {
    return res.status(400).json({ error: "classId, sectionId, subjectId, title, description, dueDate are required" });
  }
  const [staffRow] = await db.select().from(schema.staff).where(eq(schema.staff.userId, req.user!.userId));
  const [row] = await db
    .insert(schema.homework)
    .values({ tenantId: req.user!.tenantId, classId, sectionId, subjectId, staffId: staffRow?.id || "", title, description, attachmentUrl, dueDate })
    .returning();

  // auto-create pending submission rows for every active student in the section
  const kids = await db.select().from(schema.students).where(and(eq(schema.students.sectionId, sectionId), eq(schema.students.isActive, true)));
  for (const k of kids) {
    await db.insert(schema.homeworkSubmissions).values({ homeworkId: row.id, studentId: k.id, status: "PENDING" });
  }

  res.status(201).json(row);
}));

router.get("/", ah(async (req: AuthRequest, res) => {
  const { sectionId } = req.query;
  let rows = await db.select().from(schema.homework).where(eq(schema.homework.tenantId, req.user!.tenantId));
  if (sectionId) rows = rows.filter((r) => r.sectionId === sectionId);
  res.json(rows);
}));

// Student submits homework online
router.post("/:id/submit", requireRole("STUDENT"), ah(async (req: AuthRequest, res) => {
  const [student] = await db.select().from(schema.students).where(eq(schema.students.userId, req.user!.userId));
  if (!student) return res.status(400).json({ error: "No student profile linked" });
  const [existing] = await db
    .select()
    .from(schema.homeworkSubmissions)
    .where(and(eq(schema.homeworkSubmissions.homeworkId, req.params.id), eq(schema.homeworkSubmissions.studentId, student.id)));
  if (!existing) return res.status(404).json({ error: "Submission slot not found" });
  const { attachmentUrl } = req.body || {};
  const [updated] = await db
    .update(schema.homeworkSubmissions)
    .set({ attachmentUrl, submittedAt: new Date().toISOString(), status: "SUBMITTED" })
    .where(eq(schema.homeworkSubmissions.id, existing.id))
    .returning();
  res.json(updated);
}));

// Teacher grades a submission
router.patch("/submissions/:id/grade", requireRole("ACADEMIC_STAFF", "SCHOOL_ADMIN"), ah(async (req: AuthRequest, res) => {
  const { marks, feedback } = req.body || {};
  const [updated] = await db
    .update(schema.homeworkSubmissions)
    .set({ marks, feedback, status: "GRADED" })
    .where(eq(schema.homeworkSubmissions.id, req.params.id))
    .returning();
  res.json(updated);
}));

router.get("/:id/submissions", requireRole("ACADEMIC_STAFF", "SCHOOL_ADMIN", "SUPER_ADMIN"), ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.homeworkSubmissions).where(eq(schema.homeworkSubmissions.homeworkId, req.params.id)));
}));

// Student/parent: my homework
router.get("/student/:studentId/mine", ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.homeworkSubmissions).where(eq(schema.homeworkSubmissions.studentId, req.params.studentId)));
}));

export default router;
