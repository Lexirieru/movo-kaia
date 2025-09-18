import express from "express";
import {
  fetchAndSaveTokenWithdrawToFiat,
  getTokenWithdrawToFiatHistory,
  getTokenWithdrawToFiatByEscrow,
} from "../controllers/tokenWithdrawToFiatController";

const tokenWithdrawToFiatRoutes = express.Router();

// POST /api/tokenWithdrawToFiat/fetch - Fetch and save tokenWithdrawToFiat data from Goldsky
tokenWithdrawToFiatRoutes.post("/fetch", fetchAndSaveTokenWithdrawToFiat);

// GET /api/tokenWithdrawToFiat/history/:receiver - Get withdrawal history for a receiver
tokenWithdrawToFiatRoutes.get(
  "/history/:receiver",
  getTokenWithdrawToFiatHistory
);

// GET /api/tokenWithdrawToFiat/escrow/:escrowId - Get withdrawals by escrow ID
tokenWithdrawToFiatRoutes.get(
  "/escrow/:escrowId",
  getTokenWithdrawToFiatByEscrow
);

export { tokenWithdrawToFiatRoutes };
