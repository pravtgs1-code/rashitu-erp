import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_MANAGE = [...MANAGEMENT_ROLES, "STORE_KEEPER", "LAB_ASSISTANT"];

// ---- Items ----
router.get("/items", ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.tenantId, req.user!.tenantId)));
}));
router.post("/items", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const { itemName, category, quantity, unit, reorderLevel } = req.body || {};
  if (!itemName) return res.status(400).json({ error: "itemName is required" });
  const [row] = await db
    .insert(schema.inventoryItems)
    .values({ tenantId: req.user!.tenantId, itemName, category, quantity: quantity || 0, unit, reorderLevel: reorderLevel || 0 })
    .returning();
  res.status(201).json(row);
}));

// ---- Transactions (Entry = stock in, Sale = stock out) ----
router.get("/transactions", ah(async (req: AuthRequest, res) => {
  const { type } = req.query;
  let rows = await db.select().from(schema.stockTransactions).where(eq(schema.stockTransactions.tenantId, req.user!.tenantId));
  if (type) rows = rows.filter((r) => r.type === type);
  res.json(rows.sort((a, b) => (a.date < b.date ? 1 : -1)));
}));
router.post("/transactions", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const { itemId, type, quantity, party, rate, remarks } = req.body || {};
  if (!itemId || !type || !quantity) return res.status(400).json({ error: "itemId, type, quantity are required" });
  const [item] = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, itemId));
  if (!item) return res.status(404).json({ error: "Item not found" });
  const qty = Number(quantity);
  const newQty = type === "SALE" ? item.quantity - qty : item.quantity + qty;
  if (newQty < 0) return res.status(400).json({ error: "Not enough stock" });
  await db.update(schema.inventoryItems).set({ quantity: newQty }).where(eq(schema.inventoryItems.id, itemId));
  const [row] = await db
    .insert(schema.stockTransactions)
    .values({ tenantId: req.user!.tenantId, itemId, type, quantity: qty, party, rate, remarks })
    .returning();
  res.status(201).json(row);
}));

export default router;
