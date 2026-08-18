import { Request, Response, NextFunction } from "express";

// Express 4 does not auto-catch rejected promises from async route handlers,
// so an error thrown inside `await db...` would hang the request instead of
// reaching our error-handling middleware. Wrap every async handler with this.
export function ah(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
