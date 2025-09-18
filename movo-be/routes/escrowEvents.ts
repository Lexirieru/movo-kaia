import express from "express";
import {
  saveEscrowEvent,
  getEscrowEventHistory,
  getUserEscrowEvents,
  getEscrowEventStatistics,
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

// POST: Get user's all escrow events (dengan pagination dan filtering)
escrowEventRoutes.post(
  "/get-user-events",
  authenticateToken,
  getUserEscrowEvents
);

// POST: Get escrow event statistics (dengan time range dan trends)
escrowEventRoutes.post(
  "/get-statistics",
  authenticateToken,
  getEscrowEventStatistics
);

// GET: Get dashboard metrics (quick overview untuk dashboard)
escrowEventRoutes.get(
  "/dashboard-metrics",
  authenticateToken,
  getDashboardMetrics
);

// GET: Get user's recent activity (untuk dashboard)
escrowEventRoutes.get(
  "/recent-activity",
  authenticateToken,
  async (req: any, res: any) => {
    try {
      const user = req.user;
      const recentEvents = await getUserEscrowEvents(
        {
          ...req,
          body: { limit: 10, page: 1, timeRange: "7d" },
        } as any,
        res
      );
    } catch (error) {
      res.status(500).json({
        message: "Error getting recent activity",
        statusCode: 500,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export { escrowEventRoutes };
