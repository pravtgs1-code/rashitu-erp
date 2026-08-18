import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/auth";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// Every department/role that can log in
export const ALL_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "ACCOUNTANT",
  "ACADEMIC_STAFF",
  "ADMIN_CLERICAL",
  "RECEPTION",
  "SECURITY",
  "IT_STAFF",
  "STORE_KEEPER",
  "LAB_ASSISTANT",
  "TRANSPORT_STAFF",
  "CANTEEN_STAFF",
  "LIBRARIAN",
  "PARENT",
  "STUDENT",
] as const;

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Role-based access control: pass allowed roles for a route.
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires role(s) ${roles.join(", ")}` });
    }
    next();
  };
}

// Convenience group: any staff/admin role (excludes parent & student)
export const STAFF_ROLES = ALL_ROLES.filter((r) => r !== "PARENT" && r !== "STUDENT");
export const MANAGEMENT_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
