import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAuth, requireRole, MANAGEMENT_ROLES, AuthRequest } from "../middleware/auth";
import { ah } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);
const CAN_MANAGE = [...MANAGEMENT_ROLES, "LIBRARIAN"];

// ---- Books ----
router.get("/books", ah(async (req: AuthRequest, res) => {
  res.json(await db.select().from(schema.books).where(eq(schema.books.tenantId, req.user!.tenantId)));
}));
router.post("/books", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const { title, author, isbn, copiesTotal } = req.body || {};
  if (!title) return res.status(400).json({ error: "title is required" });
  const total = Number(copiesTotal) || 1;
  const [row] = await db
    .insert(schema.books)
    .values({ tenantId: req.user!.tenantId, title, author, isbn, copiesTotal: total, copiesAvailable: total })
    .returning();
  res.status(201).json(row);
}));

// ---- Book Issue / Return ----
router.get("/issues", ah(async (req: AuthRequest, res) => {
  const { status } = req.query;
  let rows = await db.select().from(schema.bookIssues).where(eq(schema.bookIssues.tenantId, req.user!.tenantId));
  if (status) rows = rows.filter((r) => r.status === status);
  res.json(rows.sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1)));
}));

router.post("/issues", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const { bookId, personType, studentId, staffId, personName, dueDate } = req.body || {};
  if (!bookId || !personType || !personName) return res.status(400).json({ error: "bookId, personType, personName are required" });
  const [book] = await db.select().from(schema.books).where(eq(schema.books.id, bookId));
  if (!book || book.copiesAvailable < 1) return res.status(400).json({ error: "No copies available" });
  const [row] = await db
    .insert(schema.bookIssues)
    .values({ tenantId: req.user!.tenantId, bookId, personType, studentId, staffId, personName, dueDate })
    .returning();
  await db.update(schema.books).set({ copiesAvailable: book.copiesAvailable - 1 }).where(eq(schema.books.id, bookId));
  res.status(201).json(row);
}));

router.patch("/issues/:id/return", requireRole(...CAN_MANAGE), ah(async (req: AuthRequest, res) => {
  const [issue] = await db.select().from(schema.bookIssues).where(eq(schema.bookIssues.id, req.params.id));
  if (!issue) return res.status(404).json({ error: "Not found" });
  const [row] = await db
    .update(schema.bookIssues)
    .set({ status: "RETURNED", returnDate: new Date().toISOString().slice(0, 10) })
    .where(eq(schema.bookIssues.id, req.params.id))
    .returning();
  const [book] = await db.select().from(schema.books).where(eq(schema.books.id, issue.bookId));
  if (book) await db.update(schema.books).set({ copiesAvailable: book.copiesAvailable + 1 }).where(eq(schema.books.id, book.id));
  res.json(row);
}));

export default router;
