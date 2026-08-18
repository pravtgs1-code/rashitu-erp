import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { hashPassword, generateTempPassword } from "../utils/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);

// Department -> login Role mapping, so each staff member gets department-appropriate access.
const DEPARTMENT_ROLE: Record<string, string> = {
  ACADEMIC: "ACADEMIC_STAFF",
  ADMIN_CLERICAL: "ADMIN_CLERICAL",
  RECEPTION: "RECEPTION",
  SECURITY: "SECURITY",
  IT: "IT_STAFF",
  STORE: "STORE_KEEPER",
  LAB: "LAB_ASSISTANT",
  TRANSPORT: "TRANSPORT_STAFF",
  CANTEEN: "CANTEEN_STAFF",
  LIBRARY: "LIBRARIAN",
  ACCOUNTS: "ACCOUNTANT",
  MANAGEMENT: "SCHOOL_ADMIN",
};

// HR / staff onboarding - creates Staff record + department-wise login account.
router.post("/", requireRole(...MANAGEMENT_ROLES), ah(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const {
    employeeCode, name, department, designation, qualification, dateOfJoining, dob,
    gender, contactNumber, email, address, photoUrl, bloodGroup, salary,
  } = req.body || {};

  if (!employeeCode || !name || !department || !designation || !dateOfJoining) {
    return res.status(400).json({ error: "employeeCode, name, department, designation, dateOfJoining are required" });
  }
  const role = DEPARTMENT_ROLE[department];
  if (!role) return res.status(400).json({ error: `Unknown department: ${department}` });

  const tempPassword = generateTempPassword();
  const [user] = await db
    .insert(schema.users)
    .values({ tenantId, username: employeeCode, email, phone: contactNumber, passwordHash: hashPassword(tempPassword), role })
    .returning();

  const [staffRow] = await db
    .insert(schema.staff)
    .values({
      tenantId, userId: user.id, employeeCode, name, department, designation, qualification,
      dateOfJoining, dob, gender, contactNumber, email, address, photoUrl, bloodGroup, salary,
    })
    .returning();

  res.status(201).json({ staff: staffRow, login: { username: employeeCode, tempPassword, role } });
}));

router.get("/", requireRole(...MANAGEMENT_ROLES, "ADMIN_CLERICAL"), ah(async (req: AuthRequest, res) => {
  const { department } = req.query;
  let rows = await db.select().from(schema.staff).where(eq(schema.staff.tenantId, req.user!.tenantId));
  if (department) rows = rows.filter((r) => r.department === department);
  res.json(rows);
}));

router.get("/:id", ah(async (req: AuthRequest, res) => {
  const [row] = await db.select().from(schema.staff).where(eq(schema.staff.id, req.params.id));
  if (!row || row.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });
  if (!MANAGEMENT_ROLES.includes(req.user!.role) && row.userId !== req.user!.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(row);
}));

router.patch("/:id", requireRole(...MANAGEMENT_ROLES), ah(async (req: AuthRequest, res) => {
  const [row] = await db.select().from(schema.staff).where(eq(schema.staff.id, req.params.id));
  if (!row || row.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });
  const allowed = ["designation", "qualification", "contactNumber", "email", "address", "photoUrl", "salary", "isActive"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (k in (req.body || {})) updates[k] = req.body[k];
  const [updated] = await db.update(schema.staff).set(updates).where(eq(schema.staff.id, req.params.id)).returning();
  res.json(updated);
}));

export default router;
