import express from "express";
import {
  saveEscrowEvent,
  getEscrowEventHistory,
  getDashboardMetrics,
} from "../controllers/escrowEventController";
import jwt from "jsonwebtoken";

const escrowEventRoutes = express.Router();

// Middleware untuk validasi token - support both Authorization header and cookies
const authenticateToken = (req: any, res: any, next: any) => {
  // Try to get token from Authorization header first
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];

  // If no Authorization header, try to get token from cookies
  if (!token) {
    token = req.cookies?.user_session;
  }

  if (!token) {
    return res.status(401).json({
      message: "Access token is required",
      statusCode: 401,
    });
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({
        message: "Invalid or expired token",
        statusCode: 403,
      });
    }
    req.user = user;
    next();
  });
};

// POST: Save escrow event (untuk webhook atau internal use)
escrowEventRoutes.post("/save-event", saveEscrowEvent);

// POST: Get escrow event history berdasarkan escrowId (dengan auth)
escrowEventRoutes.post(
  "/get-history",
  authenticateToken,
  getEscrowEventHistory
);

// GET: Get dashboard metrics (quick overview untuk dashboard)
escrowEventRoutes.get(
  "/dashboard-metrics",
  authenticateToken,
  getDashboardMetrics
);

export { escrowEventRoutes };
