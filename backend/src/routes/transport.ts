import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_MANAGE = [...MANAGEMENT_ROLES, "TRANSPORT_STAFF"];

// ---- Vehicles ----
router.get("/vehicles", ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.vehicles).where(eq(schema.vehicles.tenantId, req.user!.tenantId)));
}));
router.post("/vehicles", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const { vehicleNo, type, capacity, driverName, driverPhone } = req.body || {};
  if (!vehicleNo) return res.status(400).json({ error: "vehicleNo is required" });
  const [row] = await db
    .insert(schema.vehicles)
    .values({ tenantId: req.user!.tenantId, vehicleNo, type, capacity, driverName, driverPhone })
    .returning();
  res.status(201).json(row);
}));

// ---- Routes ----
router.get("/routes", ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.transportRoutes).where(eq(schema.transportRoutes.tenantId, req.user!.tenantId)));
}));
router.post("/routes", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const { routeName, vehicleId, stops } = req.body || {};
  if (!routeName) return res.status(400).json({ error: "routeName is required" });
  const [row] = await db
    .insert(schema.transportRoutes)
    .values({ tenantId: req.user!.tenantId, routeName, vehicleId, stops })
    .returning();
  res.status(201).json(row);
}));

// ---- Student Route Mapping ----
router.get("/assignments", ah(async (req: AuthRequest, res) => {
  // join-less: filter routes by tenant, then assignments referencing those routes
  const routes = await db.select().from(schema.transportRoutes).where(eq(schema.transportRoutes.tenantId, req.user!.tenantId));
  const routeIds = new Set(routes.map((r) => r.id));
  const rows = await db.select().from(schema.studentTransportAssignments);
  res.json(rows.filter((r) => routeIds.has(r.routeId)));
}));
router.post("/assignments", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const { studentId, routeId, pickupStop, monthlyFee } = req.body || {};
  if (!studentId || !routeId) return res.status(400).json({ error: "studentId and routeId are required" });
  const [row] = await db
    .insert(schema.studentTransportAssignments)
    .values({ studentId, routeId, pickupStop, monthlyFee })
    .returning();
  res.status(201).json(row);
}));

export default router;
