import { Request, Response } from "express";
import TokenWithdrawToFiat, {
  ITokenWithdrawToFiat,
} from "../models/tokenWithdrawToFiatModel";
import axios from "axios";

const GOLDSKY_API_URL = process.env.GOLDSKY_API_URL;

// Function to fetch and save tokenWithdrawnToFiat data from Goldsky
export const fetchAndSaveTokenWithdrawToFiat = async (
  req: Request,
  res: Response
) => {
  try {
    const { receiver } = req.body;

    if (!receiver) {
      res.status(400).json({
        success: false,
        message: "Receiver address is required",
      });
      return;
    }

    console.log("🔍 Fetching tokenWithdrawnToFiat for receiver:", receiver);

    // GraphQL query to Goldsky
    const query = `
      query FetchTokenWithdrawnToFiat($receiver: String!) {
        tokenWithdrawnToFiat(receiver: $receiver) {
          block_number
          amount  
          contractId_
          depositWallet
          escrowId
          id
          receiver
          timestamp_
          transactionHash_
        }
      }
    `;

    const response = await axios.post(GOLDSKY_API_URL!, {
      query,
      variables: { receiver },
    });

    if (response.data.errors) {
      console.error("❌ GraphQL errors:", response.data.errors);
      res.status(500).json({
        success: false,
        message: "GraphQL query failed",
        errors: response.data.errors,
      });
      return;
    }

    const withdrawData = response.data.data.tokenWithdrawnToFiat || [];
    console.log("✅ Fetched withdraw data:", withdrawData);

    // Save each withdrawal to database (avoid duplicates)
    let savedCount = 0;
    let skippedCount = 0;

    for (const withdraw of withdrawData) {
      try {
        // Check if already exists by chainId (Goldsky ID)
        const existingWithdraw = await TokenWithdrawToFiat.findOne({
          chainId: withdraw.id,
        });

        if (existingWithdraw) {
          skippedCount++;
          continue;
        }

        // Create new withdrawal record
        const newWithdraw = new TokenWithdrawToFiat({
          blockNumber: withdraw.block_number,
          amount: withdraw.amount,
          contractId: withdraw.contractId_,
          depositWallet: withdraw.depositWallet,
          escrowId: withdraw.escrowId,
          chainId: withdraw.id, // Goldsky ID
          receiver: withdraw.receiver,
          timestamp: withdraw.timestamp_,
          transactionHash: withdraw.transactionHash_,
        });

        await newWithdraw.save();
        savedCount++;
        console.log("✅ Saved withdrawal:", withdraw.id);
      } catch (saveError) {
        console.error("❌ Error saving withdrawal:", withdraw.id, saveError);
      }
    }

    res.status(200).json({
      success: true,
      message: "TokenWithdrawToFiat data processed successfully",
      data: {
        totalFetched: withdrawData.length,
        newSaved: savedCount,
        skipped: skippedCount,
      },
    });
  } catch (error) {
    console.error("❌ Error in fetchAndSaveTokenWithdrawToFiat:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch and save tokenWithdrawToFiat data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Function to get tokenWithdrawToFiat history for a receiver
export const getTokenWithdrawToFiatHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const { receiver } = req.params;

    if (!receiver) {
      res.status(400).json({
        success: false,
        message: "Receiver address is required",
      });
      return;
    }

    console.log(
      "📚 Getting tokenWithdrawToFiat history for receiver:",
      receiver
    );

    // Get withdrawal history sorted by timestamp (newest first)
    const withdrawHistory = await TokenWithdrawToFiat.find({
      receiver: receiver.toLowerCase(),
    })
      .sort({ timestamp: -1 })
      .limit(100); // Limit to last 100 withdrawals

    res.status(200).json({
      success: true,
      data: withdrawHistory,
      total: withdrawHistory.length,
    });
  } catch (error) {
    console.error("❌ Error getting tokenWithdrawToFiat history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get tokenWithdrawToFiat history",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Function to get tokenWithdrawToFiat by escrow ID
export const getTokenWithdrawToFiatByEscrow = async (
  req: Request,
  res: Response
) => {
  try {
    const { escrowId } = req.params;

    if (!escrowId) {
      res.status(400).json({
        success: false,
        message: "Escrow ID is required",
      });
      return;
    }

    console.log("📋 Getting tokenWithdrawToFiat for escrow:", escrowId);

    const withdrawals = await TokenWithdrawToFiat.find({ escrowId }).sort({
      timestamp: -1,
    });

    res.status(200).json({
      success: true,
      data: withdrawals,
      total: withdrawals.length,
    });
  } catch (error) {
    console.error("❌ Error getting tokenWithdrawToFiat by escrow:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get tokenWithdrawToFiat by escrow",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
