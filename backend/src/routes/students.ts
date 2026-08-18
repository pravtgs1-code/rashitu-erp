import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { hashPassword, generateTempPassword } from "../utils/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);

const CAN_MANAGE_STUDENTS = [...MANAGEMENT_ROLES, "ADMIN_CLERICAL", "RECEPTION"];

// Admission: creates Student record + family/guardian details + login accounts
// (student login + parent login) in one call.
router.post("/", requireRole(...CAN_MANAGE_STUDENTS), ah(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const {
    srNo, admissionNo, rollNo, name, dob, gender, bloodGroup, classId, sectionId,
    admissionDate, previousSchool, photoUrl, religion, category, aadharNo,
    fatherPhotoUrl, motherPhotoUrl, familyPhotoUrl, documentsJson,
    guardian, // { fatherName, motherName, guardianName, relation, occupation, phone, altPhone, email, address, annualIncome }
    createLogins, // boolean - also create student + parent login accounts
  } = req.body || {};

  if (!srNo || !admissionNo || !name || !dob || !gender || !classId || !sectionId || !admissionDate) {
    return res.status(400).json({ error: "srNo, admissionNo, name, dob, gender, classId, sectionId, admissionDate are required" });
  }

  let studentUserId: string | undefined;
  let studentTempPassword: string | undefined;
  let parentUserId: string | undefined;
  let parentTempPassword: string | undefined;

  if (createLogins) {
    studentTempPassword = generateTempPassword();
    const [studentUser] = await db
      .insert(schema.users)
      .values({ tenantId, username: admissionNo, passwordHash: hashPassword(studentTempPassword), role: "STUDENT" })
      .returning();
    studentUserId = studentUser.id;

    if (guardian?.phone) {
      parentTempPassword = generateTempPassword();
      const parentUsername = `p-${guardian.phone}`;
      const [existingParent] = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.tenantId, tenantId), eq(schema.users.username, parentUsername)));
      if (existingParent) {
        parentUserId = existingParent.id; // sibling: reuse parent login
      } else {
        const [parentUser] = await db
          .insert(schema.users)
          .values({ tenantId, username: parentUsername, phone: guardian.phone, passwordHash: hashPassword(parentTempPassword), role: "PARENT" })
          .returning();
        parentUserId = parentUser.id;
      }
    }
  }

  const [student] = await db
    .insert(schema.students)
    .values({
      tenantId, userId: studentUserId, srNo, admissionNo, rollNo, name, dob, gender, bloodGroup,
      classId, sectionId, admissionDate, previousSchool, photoUrl, religion, category, aadharNo,
      fatherPhotoUrl, motherPhotoUrl, familyPhotoUrl, documentsJson,
    })
    .returning();

  if (guardian) {
    await db.insert(schema.studentGuardians).values({ studentId: student.id, userId: parentUserId, ...guardian });
  }

  res.status(201).json({
    student,
    studentLogin: studentUserId ? { username: admissionNo, tempPassword: studentTempPassword } : null,
    parentLogin: parentUserId ? { username: `p-${guardian.phone}`, tempPassword: parentTempPassword } : null,
  });
}));

router.get("/", requireRole(...CAN_MANAGE_STUDENTS, "ACADEMIC_STAFF"), ah(async (req: AuthRequest, res) => {
  const { classId, sectionId } = req.query;
  let rows = await db.select().from(schema.students).where(eq(schema.students.tenantId, req.user!.tenantId));
  if (classId) rows = rows.filter((r) => r.classId === classId);
  if (sectionId) rows = rows.filter((r) => r.sectionId === sectionId);
  res.json(rows);
}));

router.get("/parent/my-children", requireRole("PARENT"), ah(async (req: AuthRequest, res) => {
  const links = await db.select().from(schema.studentGuardians).where(eq(schema.studentGuardians.userId, req.user!.userId));
  const kids = [];
  for (const l of links) {
    const [s] = await db.select().from(schema.students).where(eq(schema.students.id, l.studentId));
    if (s) kids.push(s);
  }
  res.json(kids);
}));

router.get("/:id", ah(async (req: AuthRequest, res) => {
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, req.params.id));
  if (!student || student.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });

  // Access control: student can only see self, parent only their children
  if (req.user!.role === "STUDENT" && student.userId !== req.user!.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const guardians = await db.select().from(schema.studentGuardians).where(eq(schema.studentGuardians.studentId, student.id));
  if (req.user!.role === "PARENT" && !guardians.some((g) => g.userId === req.user!.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json({ ...student, guardians });
}));

router.patch("/:id", requireRole(...CAN_MANAGE_STUDENTS), ah(async (req: AuthRequest, res) => {
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, req.params.id));
  if (!student || student.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });
  const allowed = ["rollNo", "name", "classId", "sectionId", "bloodGroup", "photoUrl", "isActive", "category", "religion", "fatherPhotoUrl", "motherPhotoUrl", "familyPhotoUrl", "documentsJson", "aadharNo", "previousSchool"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (k in (req.body || {})) updates[k] = req.body[k];
  const [updated] = await db.update(schema.students).set(updates).where(eq(schema.students.id, req.params.id)).returning();
  res.json(updated);
}));

export default router;
