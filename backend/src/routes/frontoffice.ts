import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_MANAGE_FRONT_OFFICE = [...MANAGEMENT_ROLES, "RECEPTION", "ADMIN_CLERICAL"];

// ---- Visitors (in/out log) ----
router.post("/visitors", requireRole(...CAN_MANAGE_FRONT_OFFICE), ah(async (req: AuthRequest, res) => {
  const { name, phone, purpose, toMeet, photoUrl, idProofUrl, remarks } = req.body || {};
  if (!name || !purpose) return res.status(400).json({ error: "name, purpose are required" });
  const [row] = await db
    .insert(schema.visitors)
    .values({ tenantId: req.user!.tenantId, name, phone, purpose, toMeet, photoUrl, idProofUrl, remarks })
    .returning();
  res.status(201).json(row);
}));

router.get("/visitors", requireRole(...CAN_MANAGE_FRONT_OFFICE), ah(async (req: AuthRequest, res) => {
  const rows = await db.select().from(schema.visitors).where(eq(schema.visitors.tenantId, req.user!.tenantId));
  res.json(rows.sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1)));
}));

router.patch("/visitors/:id/checkout", requireRole(...CAN_MANAGE_FRONT_OFFICE), ah(async (req: AuthRequest, res) => {
  const [row] = await db.select().from(schema.visitors).where(eq(schema.visitors.id, req.params.id));
  if (!row || row.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });
  const [updated] = await db
    .update(schema.visitors)
    .set({ checkOut: new Date().toISOString() })
    .where(eq(schema.visitors.id, req.params.id))
    .returning();
  res.json(updated);
}));

// ---- Enquiries (General + Admission) ----
router.post("/enquiries", requireRole(...CAN_MANAGE_FRONT_OFFICE), ah(async (req: AuthRequest, res) => {
  const { type, name, phone, email, classInterested, subject, source, followUpDate, notes } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: "name, phone are required" });
  const [row] = await db
    .insert(schema.enquiries)
    .values({ tenantId: req.user!.tenantId, type: type || "ADMISSION", name, phone, email, classInterested, subject, source, followUpDate, notes })
    .returning();
  res.status(201).json(row);
}));

router.get("/enquiries", requireRole(...CAN_MANAGE_FRONT_OFFICE), ah(async (req: AuthRequest, res) => {
  const { type } = req.query;
  let rows = await db.select().from(schema.enquiries).where(eq(schema.enquiries.tenantId, req.user!.tenantId));
  if (type) rows = rows.filter((r) => r.type === type);
  res.json(rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
}));

router.patch("/enquiries/:id", requireRole(...CAN_MANAGE_FRONT_OFFICE), ah(async (req: AuthRequest, res) => {
  const [row] = await db.select().from(schema.enquiries).where(eq(schema.enquiries.id, req.params.id));
  if (!row || row.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });
  const allowed = ["status", "followUpDate", "notes"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (k in (req.body || {})) updates[k] = req.body[k];
  const [updated] = await db.update(schema.enquiries).set(updates).where(eq(schema.enquiries.id, req.params.id)).returning();
  res.json(updated);
}));

// ---- Gate Pass ----
router.post("/gatepasses", requireRole(...CAN_MANAGE_FRONT_OFFICE), ah(async (req: AuthRequest, res) => {
  const { personType, personName, studentId, staffId, reason, approvedBy } = req.body || {};
  if (!personType || !personName || !reason) return res.status(400).json({ error: "personType, personName, reason are required" });
  const [row] = await db
    .insert(schema.gatePasses)
    .values({ tenantId: req.user!.tenantId, personType, personName, studentId, staffId, reason, approvedBy })
    .returning();
  res.status(201).json(row);
}));

router.get("/gatepasses", requireRole(...CAN_MANAGE_FRONT_OFFICE), ah(async (req: AuthRequest, res) => {
  const rows = await db.select().from(schema.gatePasses).where(eq(schema.gatePasses.tenantId, req.user!.tenantId));
  res.json(rows.sort((a, b) => (a.exitTime < b.exitTime ? 1 : -1)));
}));

router.patch("/gatepasses/:id/return", requireRole(...CAN_MANAGE_FRONT_OFFICE), ah(async (req: AuthRequest, res) => {
  const [row] = await db.select().from(schema.gatePasses).where(eq(schema.gatePasses.id, req.params.id));
  if (!row || row.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });
  const [updated] = await db
    .update(schema.gatePasses)
    .set({ returnTime: new Date().toISOString(), status: "RETURNED" })
    .where(eq(schema.gatePasses.id, req.params.id))
    .returning();
  res.json(updated);
}));

export default router;
