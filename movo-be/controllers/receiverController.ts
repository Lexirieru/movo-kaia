import { Request, Response } from "express";
import { EscrowEventModel } from "../models/escrowEventModel";
import { UserModel } from "../models/userModel";

// Get receiver dashboard summary - combines escrow events and withdrawals
export async function getReceiverDashboardSummary(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      res.status(400).json({
        success: false,
        message: "Wallet address is required",
      });
      return;
    }

    console.log("📋 Fetching receiver dashboard summary for:", walletAddress);

    // Get both escrow events and available withdrawals
    const [escrowEvents, withdrawalsResult] = await Promise.all([
      EscrowEventModel.find({
        "eventData.recipients.walletAddress": {
          $regex: new RegExp(walletAddress, "i"),
        },
      })
        .sort({ createdAt: -1 })
        .lean(),
      // We'll calculate withdrawals here too for consistency
      getAvailableWithdrawalsData(walletAddress),
    ]);

    res.status(200).json({
      success: true,
      message: "Receiver dashboard summary retrieved successfully",
      data: {
        escrowEvents: escrowEvents,
        availableWithdrawals: withdrawalsResult.withdrawals,
        totalAvailable: withdrawalsResult.totalAvailable,
        summary: {
          totalEscrows: escrowEvents.length,
          availableWithdrawals: withdrawalsResult.withdrawals.length,
          totalAvailableAmount: withdrawalsResult.totalAvailable,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching receiver dashboard summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// Helper function to calculate withdrawals (reusable)
async function getAvailableWithdrawalsData(walletAddress: string) {
  const escrowCreatedEvents = await EscrowEventModel.find({
    eventType: "ESCROW_CREATED",
    "eventData.recipients.walletAddress": {
      $regex: new RegExp(walletAddress, "i"),
    },
  })
    .sort({ createdAt: -1 })
    .lean();

  const withdrawEvents = await EscrowEventModel.find({
    eventType: "WITHDRAW_FUNDS",
    initiatorWalletAddress: {
      $regex: new RegExp(walletAddress, "i"),
    },
  }).lean();

  const availableWithdrawals = [];

  for (const escrowEvent of escrowCreatedEvents) {
    if (!escrowEvent.eventData || !escrowEvent.eventData.recipients) continue;

    const recipientEntry = escrowEvent.eventData.recipients.find(
      (recipient: any) =>
        recipient.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );

    if (!recipientEntry) continue;

    const totalAllocated = parseFloat(recipientEntry.amount || "0");

    const withdrawnFromThisEscrow = withdrawEvents
      .filter((withdraw: any) => withdraw.escrowId === escrowEvent.escrowId)
      .reduce((sum: number, withdraw: any) => {
        return sum + parseFloat(withdraw.eventData.withdrawAmount || "0");
      }, 0);

    const availableAmount = totalAllocated - withdrawnFromThisEscrow;

    if (availableAmount > 0) {
      availableWithdrawals.push({
        escrowId: escrowEvent.escrowId,
        groupId: escrowEvent.groupId,
        senderAddress: escrowEvent.initiatorWalletAddress,
        senderName: escrowEvent.initiatorName,
        totalAmount: escrowEvent.eventData.totalAmount,
        allocatedAmount: recipientEntry.amount,
        withdrawnAmount: withdrawnFromThisEscrow.toString(),
        availableAmount: availableAmount.toString(),
        tokenSymbol: escrowEvent.tokenType,
        createdAt: escrowEvent.createdAt,
        transactionHash: escrowEvent.transactionHash,
      });
    }
  }

  const totalAvailable = availableWithdrawals.reduce(
    (sum, withdrawal) => sum + parseFloat(withdrawal.availableAmount),
    0
  );

  return {
    withdrawals: availableWithdrawals,
    totalAvailable: totalAvailable.toString(),
  };
}
