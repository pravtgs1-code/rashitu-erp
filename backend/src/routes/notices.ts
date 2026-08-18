import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);

// Parent communication / staff notices - broadcast by audience
router.post("/", requireRole(...MANAGEMENT_ROLES, "ACADEMIC_STAFF", "RECEPTION"), ah(async (req: AuthRequest, res) => {
  const { title, message, audience, targetClassId, targetSectionId, targetDepartment, attachmentUrl } = req.body || {};
  if (!title || !message || !audience) return res.status(400).json({ error: "title, message, audience are required" });
  const [row] = await db
    .insert(schema.notices)
    .values({ tenantId: req.user!.tenantId, title, message, audience, targetClassId, targetSectionId, targetDepartment, attachmentUrl, senderId: req.user!.userId })
    .returning();
  res.status(201).json(row);
}));

router.get("/", ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.notices).where(eq(schema.notices.tenantId, req.user!.tenantId)));
}));

// Direct message between staff/parent (e.g. parent <-> class teacher)
router.post("/messages", ah(async (req: AuthRequest, res) => {
  const { studentId, toUserId, message } = req.body || {};
  if (!toUserId || !message) return res.status(400).json({ error: "toUserId, message are required" });
  const [row] = await db
    .insert(schema.parentMessages)
    .values({ tenantId: req.user!.tenantId, studentId, fromUserId: req.user!.userId, toUserId, message })
    .returning();
  res.status(201).json(row);
}));

router.get("/messages/thread/:studentId", ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.parentMessages).where(eq(schema.parentMessages.studentId, req.params.studentId)));
}));

export default router;
