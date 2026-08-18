import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db";
import { verifyPassword, signToken, hashPassword } from "../utils/auth";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();

// One login endpoint for every role: SchoolAdmin, Academic, Clerical, Reception,
// Security, IT, Store, Lab, Transport, Canteen, Librarian, Accountant, Parent, Student.
// tenantCode identifies the school (white-label instance); username + password identify the user.
router.post("/login", ah(async (req, res) => {
  const { tenantCode, username, password } = req.body || {};
  if (!tenantCode || !username || !password) {
    return res.status(400).json({ error: "tenantCode, username and password are required" });
  }

  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.code, tenantCode));
  if (!tenant || !tenant.isActive) {
    return res.status(404).json({ error: "School not found or inactive" });
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.tenantId, tenant.id), eq(schema.users.username, username)));

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  await db.update(schema.users).set({ lastLoginAt: new Date().toISOString() }).where(eq(schema.users.id, user.id));

  const token = signToken({ userId: user.id, tenantId: tenant.id, role: user.role, username: user.username });

  res.json({
    token,
    mustChangePassword: user.mustChangePassword,
    user: { id: user.id, username: user.username, role: user.role, email: user.email },
    tenant: {
      id: tenant.id,
      code: tenant.code,
      schoolName: tenant.schoolName,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
    },
  });
}));

router.get("/me", requireAuth, ah(async (req: AuthRequest, res) => {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.user!.userId));
  if (!user) return res.status(404).json({ error: "Not found" });
  const { passwordHash, ...safe } = user;
  res.json(safe);
}));

router.post("/change-password", requireAuth, ah(async (req: AuthRequest, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "newPassword must be at least 6 characters" });
  }
  await db
    .update(schema.users)
    .set({ passwordHash: hashPassword(newPassword), mustChangePassword: false })
    .where(eq(schema.users.id, req.user!.userId));
  res.json({ ok: true });
}));

export default router;
