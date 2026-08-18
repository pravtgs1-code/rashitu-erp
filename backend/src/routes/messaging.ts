import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_SEND = [...MANAGEMENT_ROLES, "ACADEMIC_STAFF", "ADMIN_CLERICAL", "RECEPTION"];

// Note: no external SMS gateway is configured yet, so messages are logged in-app
// (visible to the recipient's dashboard / notices) rather than actually sent as SMS.
router.get("/", ah(async (req: AuthRequest, res) => {
  const rows = await db.select().from(schema.messageLogs).where(eq(schema.messageLogs.tenantId, req.user!.tenantId));
  res.json(rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
}));

router.post("/", requireRole(...CAN_SEND), ah(async (req: AuthRequest, res) => {
  const { channel, recipientType, recipientId, recipientName, message } = req.body || {};
  if (!recipientType || !message) return res.status(400).json({ error: "recipientType and message are required" });
  const [row] = await db
    .insert(schema.messageLogs)
    .values({
      tenantId: req.user!.tenantId,
      channel: channel || "SMS",
      recipientType,
      recipientId,
      recipientName,
      message,
      sentById: req.user!.userId,
    })
    .returning();
  res.status(201).json(row);
}));

export default router;
