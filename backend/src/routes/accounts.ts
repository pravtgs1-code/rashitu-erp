import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_MANAGE_ACCOUNTS = [...MANAGEMENT_ROLES, "ACCOUNTANT"];

// ---- Vendors ----
router.post("/vendors", requireRole(...CAN_MANAGE_ACCOUNTS), ah(async (req: AuthRequest, res) => {
  const { name, category, phone, address } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const [row] = await db.insert(schema.vendors).values({ tenantId: req.user!.tenantId, name, category, phone, address }).returning();
  res.status(201).json(row);
}));
router.get("/vendors", requireRole(...CAN_MANAGE_ACCOUNTS), ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.vendors).where(eq(schema.vendors.tenantId, req.user!.tenantId)));
}));

// ---- Bank Accounts ----
router.post("/bank-accounts", requireRole(...CAN_MANAGE_ACCOUNTS), ah(async (req: AuthRequest, res) => {
  const { bankName, accountNo, ifsc, branch, openingBalance } = req.body || {};
  if (!bankName || !accountNo) return res.status(400).json({ error: "bankName, accountNo are required" });
  const [row] = await db
    .insert(schema.bankAccounts)
    .values({ tenantId: req.user!.tenantId, bankName, accountNo, ifsc, branch, openingBalance: openingBalance || 0 })
    .returning();
  res.status(201).json(row);
}));
router.get("/bank-accounts", requireRole(...CAN_MANAGE_ACCOUNTS), ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.tenantId, req.user!.tenantId)));
}));

// ---- Transactions (Expense / Income / Cash Deposit / Cash Withdraw) ----
router.post("/transactions", requireRole(...CAN_MANAGE_ACCOUNTS), ah(async (req: AuthRequest, res) => {
  const { type, category, amount, date, vendorId, bankAccountId, remarks } = req.body || {};
  if (!type || !amount) return res.status(400).json({ error: "type, amount are required" });
  const [row] = await db
    .insert(schema.accountsTransactions)
    .values({ tenantId: req.user!.tenantId, type, category, amount, date, vendorId, bankAccountId, remarks })
    .returning();
  res.status(201).json(row);
}));

router.get("/transactions", requireRole(...CAN_MANAGE_ACCOUNTS), ah(async (req: AuthRequest, res) => {
  const { type } = req.query;
  let rows = await db.select().from(schema.accountsTransactions).where(eq(schema.accountsTransactions.tenantId, req.user!.tenantId));
  if (type) rows = rows.filter((r) => r.type === type);
  res.json(rows.sort((a, b) => (a.date < b.date ? 1 : -1)));
}));

// ---- Summary (for dashboard-style totals) ----
router.get("/summary", requireRole(...CAN_MANAGE_ACCOUNTS), ah(async (req: AuthRequest, res) => {
  const rows = await db.select().from(schema.accountsTransactions).where(eq(schema.accountsTransactions.tenantId, req.user!.tenantId));
  const sum = (t: string) => rows.filter((r) => r.type === t).reduce((a, r) => a + r.amount, 0);
  res.json({ totalExpense: sum("EXPENSE"), totalIncome: sum("INCOME"), totalDeposit: sum("DEPOSIT"), totalWithdraw: sum("WITHDRAW") });
}));

export default router;
