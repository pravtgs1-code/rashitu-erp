import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);

// ---- Classes ----
router.get("/classes", ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.classes).where(eq(schema.classes.tenantId, req.user!.tenantId)));
}));
router.post("/classes", requireRole(...MANAGEMENT_ROLES, "ADMIN_CLERICAL"), ah(async (req: AuthRequest, res) => {
  const { name, order } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const [row] = await db.insert(schema.classes).values({ tenantId: req.user!.tenantId, name, order: order || 0 }).returning();
  res.status(201).json(row);
}));

// ---- Sections ----
router.get("/sections", ah(async (req: AuthRequest, res) => {
  const { classId } = req.query;
  let rows = await db.select().from(schema.sections).where(eq(schema.sections.tenantId, req.user!.tenantId));
  if (classId) rows = rows.filter((r) => r.classId === classId);
  res.json(rows);
}));
router.post("/sections", requireRole(...MANAGEMENT_ROLES, "ADMIN_CLERICAL"), ah(async (req: AuthRequest, res) => {
  const { classId, name, classTeacherId } = req.body || {};
  if (!classId || !name) return res.status(400).json({ error: "classId and name are required" });
  const [row] = await db
    .insert(schema.sections)
    .values({ tenantId: req.user!.tenantId, classId, name, classTeacherId })
    .returning();
  res.status(201).json(row);
}));

// ---- Subjects ----
router.get("/subjects", ah(async (req: AuthRequest, res) => {
  const { classId } = req.query;
  let rows = await db.select().from(schema.subjects).where(eq(schema.subjects.tenantId, req.user!.tenantId));
  if (classId) rows = rows.filter((r) => r.classId === classId);
  res.json(rows);
}));
router.post("/subjects", requireRole(...MANAGEMENT_ROLES, "ADMIN_CLERICAL"), ah(async (req: AuthRequest, res) => {
  const { classId, name, code } = req.body || {};
  if (!classId || !name) return res.status(400).json({ error: "classId and name are required" });
  const [row] = await db.insert(schema.subjects).values({ tenantId: req.user!.tenantId, classId, name, code }).returning();
  res.status(201).json(row);
}));

export default router;
