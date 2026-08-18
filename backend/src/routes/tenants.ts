import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { hashPassword, generateTempPassword } from "../utils/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();

// SUPER_ADMIN (Rasitu) onboards a new school (customer) - white-label instance.
// Creates the tenant with custom branding + the first SCHOOL_ADMIN login.
router.post("/", requireAuth, requireRole("SUPER_ADMIN"), ah(async (req: AuthRequest, res) => {
  const { code, schoolName, logoUrl, primaryColor, secondaryColor, address, phone, email, adminUsername } = req.body || {};
  if (!code || !schoolName || !adminUsername) {
    return res.status(400).json({ error: "code, schoolName, adminUsername are required" });
  }
  const [existing] = await db.select().from(schema.tenants).where(eq(schema.tenants.code, code));
  if (existing) return res.status(409).json({ error: "A school with this code already exists" });

  const [tenant] = await db
    .insert(schema.tenants)
    .values({ code, schoolName, logoUrl, primaryColor, secondaryColor, address, phone, email })
    .returning();

  const tempPassword = generateTempPassword();
  const [adminUser] = await db
    .insert(schema.users)
    .values({
      tenantId: tenant.id,
      username: adminUsername,
      email,
      passwordHash: hashPassword(tempPassword),
      role: "SCHOOL_ADMIN",
      mustChangePassword: true,
    })
    .returning();

  res.status(201).json({
    tenant,
    adminLogin: { username: adminUser.username, tempPassword, tenantCode: tenant.code },
  });
}));

router.get("/", requireAuth, requireRole("SUPER_ADMIN"), ah(async (_req, res) => {
  res.json(await db.select().from(schema.tenants));
}));

// School admin can update their own branding (customize by name/logo/colors)
router.patch("/:id/branding", requireAuth, requireRole("SUPER_ADMIN", "SCHOOL_ADMIN"), ah(async (req: AuthRequest, res) => {
  if (req.user!.role !== "SUPER_ADMIN" && req.user!.tenantId !== req.params.id) {
    return res.status(403).json({ error: "Cannot edit another school's branding" });
  }
  const { schoolName, logoUrl, primaryColor, secondaryColor, address, phone, email } = req.body || {};
  const [updated] = await db
    .update(schema.tenants)
    .set({ schoolName, logoUrl, primaryColor, secondaryColor, address, phone, email })
    .where(eq(schema.tenants.id, req.params.id))
    .returning();
  res.json(updated);
}));

export default router;
