import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "rasitu-dev-secret-change-in-production";

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  username: string;
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

// Generates a readable temp password, e.g. Rasitu@4821
export function generateTempPassword() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `Rasitu@${n}`;
}
