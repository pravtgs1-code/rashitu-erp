import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_MANAGE = [...MANAGEMENT_ROLES, "ACCOUNTANT"];

// Generic master items: category is passed as query/body param.
// Categories: ACADEMIC_SESSION, STAFF_DESIGNATION, EXAM_NAME, EXAM_GROUP, PERIOD,
// HOMEWORK_TYPE, HOUSE, STREAM, FEE_PARTICULAR, FEE_SLAB, FEE_DISCOUNT

router.get("/", ah(async (req: AuthRequest, res) => {
  const { category } = req.query;
  let rows = await db.select().from(schema.masterItems).where(eq(schema.masterItems.tenantId, req.user!.tenantId));
  if (category) rows = rows.filter((r) => r.category === category);
  res.json(rows);
}));

router.post("/", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const { category, name, value1, value2 } = req.body || {};
  if (!category || !name) return res.status(400).json({ error: "category and name are required" });
  const [row] = await db
    .insert(schema.masterItems)
    .values({ tenantId: req.user!.tenantId, category, name, value1, value2 })
    .returning();
  res.status(201).json(row);
}));

router.patch("/:id", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const { name, value1, value2, isActive } = req.body || {};
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (value1 !== undefined) patch.value1 = value1;
  if (value2 !== undefined) patch.value2 = value2;
  if (isActive !== undefined) patch.isActive = isActive;
  const [row] = await db
    .update(schema.masterItems)
    .set(patch)
    .where(eq(schema.masterItems.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
}));

router.delete("/:id", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  await db.delete(schema.masterItems).where(eq(schema.masterItems.id, req.params.id));
  res.json({ ok: true });
}));

export default router;
