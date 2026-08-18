import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_MANAGE_ASSETS = [...MANAGEMENT_ROLES, "IT_STAFF", "STORE_KEEPER", "LAB_ASSISTANT"];

// Assets: computer sets (Monitor+CPU+Keyboard+Mouse), UPS, furniture, lab & other equipment.
router.post("/", requireRole(...CAN_MANAGE_ASSETS), ah(async (req: AuthRequest, res) => {
  const { assetCode, category, name, location, purchaseDate, cost, vendor, warrantyExpiry, assignedToId, notes, components } = req.body || {};
  if (!assetCode || !category || !name) return res.status(400).json({ error: "assetCode, category, name are required" });
  const [row] = await db
    .insert(schema.assets)
    .values({ tenantId: req.user!.tenantId, assetCode, category, name, location, purchaseDate, cost, vendor, warrantyExpiry, assignedToId, notes })
    .returning();

  // e.g. for a COMPUTER_SET: components = [{componentType:"MONITOR",brand,model,serialNumber}, {componentType:"CPU",...}, ...]
  if (Array.isArray(components)) {
    for (const c of components) {
      await db.insert(schema.assetComponents).values({ assetId: row.id, componentType: c.componentType, brand: c.brand, model: c.model, serialNumber: c.serialNumber });
    }
  }
  res.status(201).json(row);
}));

router.get("/", requireRole(...CAN_MANAGE_ASSETS), ah(async (req: AuthRequest, res) => {
  const { category, status } = req.query;
  let rows = await db.select().from(schema.assets).where(eq(schema.assets.tenantId, req.user!.tenantId));
  if (category) rows = rows.filter((r) => r.category === category);
  if (status) rows = rows.filter((r) => r.status === status);
  res.json(rows);
}));

router.get("/:id", requireRole(...CAN_MANAGE_ASSETS), ah(async (req: AuthRequest, res) => {
  const [row] = await db.select().from(schema.assets).where(eq(schema.assets.id, req.params.id));
  if (!row || row.tenantId !== req.user!.tenantId) return res.status(404).json({ error: "Not found" });
  const components = await db.select().from(schema.assetComponents).where(eq(schema.assetComponents.assetId, row.id));
  res.json({ ...row, components });
}));

router.patch("/:id", requireRole(...CAN_MANAGE_ASSETS), ah(async (req: AuthRequest, res) => {
  const allowed = ["location", "status", "assignedToId", "notes"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (k in (req.body || {})) updates[k] = req.body[k];
  const [updated] = await db.update(schema.assets).set(updates).where(eq(schema.assets.id, req.params.id)).returning();
  res.json(updated);
}));

// Store / lab consumable inventory (separate from fixed assets)
router.get("/inventory/items", requireRole(...CAN_MANAGE_ASSETS), ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.tenantId, req.user!.tenantId)));
}));
router.post("/inventory/items", requireRole(...CAN_MANAGE_ASSETS), ah(async (req: AuthRequest, res) => {
  const { itemName, category, quantity, unit, reorderLevel } = req.body || {};
  if (!itemName) return res.status(400).json({ error: "itemName is required" });
  const [row] = await db.insert(schema.inventoryItems).values({ tenantId: req.user!.tenantId, itemName, category, quantity: quantity || 0, unit, reorderLevel }).returning();
  res.status(201).json(row);
}));

export default router;
