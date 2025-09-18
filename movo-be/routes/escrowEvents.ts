import express from "express";
import {
  saveEscrowEvent,
  getEscrowEventHistory,
  getUserEscrowEvents,
  getEscrowEventStatistics,
} from "../controllers/escrowEventController";
import jwt from "jsonwebtoken";

const escrowEventRoutes = express.Router();

// Middleware untuk validasi token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
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

// POST: Get escrow event history berdasarkan escrowId
escrowEventRoutes.post(
  "/get-history",
  authenticateToken,
  getEscrowEventHistory
);

// POST: Get user's all escrow events
escrowEventRoutes.post(
  "/get-user-events",
  authenticateToken,
  getUserEscrowEvents
);

// POST: Get escrow event statistics
escrowEventRoutes.post(
  "/get-statistics",
  authenticateToken,
  getEscrowEventStatistics
);

export { escrowEventRoutes };
