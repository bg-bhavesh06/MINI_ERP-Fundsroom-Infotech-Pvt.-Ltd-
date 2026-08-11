import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db";
import { requireAuth, JWT_SECRET } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthenticatedRequest } from "../types";

const router = Router();

// POST /api/auth/login
router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const { rows: [user] } = await query("SELECT * FROM users WHERE email = $1", [email.trim().toLowerCase()]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || "8h") as any }
    );

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  })
);

// GET /api/auth/me
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { rows: [user] } = await query("SELECT id, name, email, role FROM users WHERE id = $1", [req.user?.id]);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  })
);

export default router;
