import { Request, Response } from "express";
import { EscrowEventModel } from "../models/escrowEventModel";
import { UserModel } from "../models/userModel";

// Interface untuk event data
interface EscrowEventData {
  eventType:
    | "ESCROW_CREATED"
    | "TOPUP_FUNDS"
    | "ADD_RECIPIENTS"
    | "REMOVE_RECIPIENTS"
    | "UPDATE_RECIPIENTS_AMOUNT"
    | "WITHDRAW_FUNDS"
    | "ESCROW_COMPLETED";
  escrowId: string;
  groupId: string;
  transactionHash: string;
  blockNumber?: string;
  initiatorWalletAddress: string;
  tokenType: "USDC" | "USDT" | "IDRX";
  eventData: any;
  metadata?: {
    gasUsed?: string;
    gasPrice?: string;
    networkId?: string;
    contractAddress?: string;
  };
  blockTimestamp?: string;
}

// Controller utama untuk save escrow event
export async function saveEscrowEvent(req: Request, res: Response) {
  const eventPayload: EscrowEventData = req.body;

  try {
    // Validasi required fields
    const {
      eventType,
      escrowId,
      groupId,
      transactionHash,
      initiatorWalletAddress,
      tokenType,
      eventData,
    } = eventPayload;

    if (
      !eventType ||
      !escrowId ||
      !groupId ||
      !transactionHash ||
      !initiatorWalletAddress ||
      !tokenType
    ) {
      res.status(400).json({
        message: "Missing required fields",
        statusCode: 400,
        required: [
          "eventType",
          "escrowId",
          "groupId",
          "transactionHash",
          "initiatorWalletAddress",
          "tokenType",
        ],
      });
      return;
    }

    // Get user information
    const user = await UserModel.findOne({
      "WalletAddresses.walletAddress": new RegExp(
        `^${initiatorWalletAddress}$`,
        "i"
      ),
    });

    if (!user) {
      res.status(404).json({
        message: "User not found for the provided wallet address",
        statusCode: 404,
      });
      return;
    }

    // Create event record
    const escrowEvent = new EscrowEventModel({
      eventType,
      escrowId,
      groupId,
      transactionHash,
      blockNumber: eventPayload.blockNumber,
      initiatorId: user._id.toString(),
      initiatorWalletAddress,
      initiatorName: user.fullname,
      tokenType,
      eventData,
      metadata: eventPayload.metadata || {},
      status: "CONFIRMED",
      blockTimestamp: eventPayload.blockTimestamp
        ? new Date(parseInt(eventPayload.blockTimestamp) * 1000)
        : undefined,
    });

    const savedEvent = await escrowEvent.save();

    console.log(`📝 Escrow event saved: ${eventType} for escrow ${escrowId}`);

    res.status(201).json({
      message: "Escrow event saved successfully",
      statusCode: 201,
      data: {
        eventId: savedEvent._id,
        eventType: savedEvent.eventType,
        escrowId: savedEvent.escrowId,
        transactionHash: savedEvent.transactionHash,
        createdAt: savedEvent.createdAt,
      },
    });
    return;
  } catch (err: any) {
    console.error("❌ Error saving escrow event:", err);
    res.status(500).json({
      message: "Error saving escrow event",
      statusCode: 500,
      error: err.message,
    });
    return;
  }
}

// Controller untuk get escrow event history berdasarkan escrowId
export async function getEscrowEventHistory(req: Request, res: Response) {
  const { escrowId } = req.body;

  if (!escrowId) {
    res.status(400).json({
      message: "escrowId is required",
      statusCode: 400,
    });
    return;
  }

  try {
    const events = await EscrowEventModel.find({ escrowId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      message: "Escrow event history retrieved successfully",
      statusCode: 200,
      data: {
        escrowId,
        totalEvents: events.length,
        events,
      },
    });
    return;
  } catch (err: any) {
    console.error("❌ Error getting escrow event history:", err);
    res.status(500).json({
      message: "Error getting escrow event history",
      statusCode: 500,
      error: err.message,
    });
    return;
  }
}

// Controller untuk get user's all escrow events
export async function getUserEscrowEvents(req: Request, res: Response) {
  const { _id, walletAddress } = req.body;

  if (!_id || !walletAddress) {
    res.status(400).json({
      message: "_id and walletAddress are required",
      statusCode: 400,
    });
    return;
  }

  try {
    const events = await EscrowEventModel.find({
      $or: [
        { initiatorId: _id },
        { initiatorWalletAddress: new RegExp(`^${walletAddress}$`, "i") },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    // Group events by escrow
    const groupedEvents = events.reduce((acc: any, event) => {
      if (!acc[event.escrowId]) {
        acc[event.escrowId] = [];
      }
      acc[event.escrowId].push(event);
      return acc;
    }, {});

    res.status(200).json({
      message: "User escrow events retrieved successfully",
      statusCode: 200,
      data: {
        totalEvents: events.length,
        totalEscrows: Object.keys(groupedEvents).length,
        eventsByEscrow: groupedEvents,
        allEvents: events,
      },
    });
    return;
  } catch (err: any) {
    console.error("❌ Error getting user escrow events:", err);
    res.status(500).json({
      message: "Error getting user escrow events",
      statusCode: 500,
      error: err.message,
    });
    return;
  }
}

// Controller untuk get event statistics
export async function getEscrowEventStatistics(req: Request, res: Response) {
  const { _id, walletAddress, timeRange } = req.body;

  if (!_id || !walletAddress) {
    res.status(400).json({
      message: "_id and walletAddress are required",
      statusCode: 400,
    });
    return;
  }

  try {
    // Calculate date range
    let dateFilter = {};
    if (timeRange) {
      const now = new Date();
      let startDate = new Date();

      switch (timeRange) {
        case "24h":
          startDate.setHours(now.getHours() - 24);
          break;
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate = new Date("2020-01-01"); // All time
      }

      dateFilter = { createdAt: { $gte: startDate } };
    }

    // Aggregation pipeline
    const pipeline = [
      {
        $match: {
          $or: [
            { initiatorId: _id },
            { initiatorWalletAddress: new RegExp(`^${walletAddress}$`, "i") },
          ],
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: "$eventType",
          count: { $sum: 1 },
          lastEvent: { $max: "$createdAt" },
        },
      },
    ];

    const statistics = await EscrowEventModel.aggregate(pipeline);

    // Get total events count
    const totalEvents = await EscrowEventModel.countDocuments({
      $or: [
        { initiatorId: _id },
        { initiatorWalletAddress: new RegExp(`^${walletAddress}$`, "i") },
      ],
      ...dateFilter,
    });

    res.status(200).json({
      message: "Escrow event statistics retrieved successfully",
      statusCode: 200,
      data: {
        timeRange: timeRange || "all",
        totalEvents,
        eventsByType: statistics,
        summary: {
          escrowsCreated:
            statistics.find((s) => s._id === "ESCROW_CREATED")?.count || 0,
          topups: statistics.find((s) => s._id === "TOPUP_FUNDS")?.count || 0,
          recipientChanges:
            (statistics.find((s) => s._id === "ADD_RECIPIENTS")?.count || 0) +
            (statistics.find((s) => s._id === "REMOVE_RECIPIENTS")?.count ||
              0) +
            (statistics.find((s) => s._id === "UPDATE_RECIPIENTS_AMOUNT")
              ?.count || 0),
          withdrawals:
            statistics.find((s) => s._id === "WITHDRAW_FUNDS")?.count || 0,
        },
      },
    });
    return;
  } catch (err: any) {
    console.error("❌ Error getting escrow event statistics:", err);
    res.status(500).json({
      message: "Error getting escrow event statistics",
      statusCode: 500,
      error: err.message,
    });
    return;
  }
}

// Helper function untuk create specific event types
export const createEscrowCreatedEvent = (data: {
  escrowId: string;
  groupId: string;
  transactionHash: string;
  blockNumber?: string;
  initiatorWalletAddress: string;
  tokenType: "USDC" | "USDT" | "IDRX";
  totalAmount: string;
  recipients: Array<{
    walletAddress: string;
    amount: string;
    fullname: string;
  }>;
  metadata?: any;
  blockTimestamp?: string;
}) => ({
  eventType: "ESCROW_CREATED" as const,
  escrowId: data.escrowId,
  groupId: data.groupId,
  transactionHash: data.transactionHash,
  blockNumber: data.blockNumber,
  initiatorWalletAddress: data.initiatorWalletAddress,
  tokenType: data.tokenType,
  eventData: {
    totalAmount: data.totalAmount,
    recipients: data.recipients,
  },
  metadata: data.metadata,
  blockTimestamp: data.blockTimestamp,
});

export const createTopupFundsEvent = (data: {
  escrowId: string;
  groupId: string;
  transactionHash: string;
  blockNumber?: string;
  initiatorWalletAddress: string;
  tokenType: "USDC" | "USDT" | "IDRX";
  topupAmount: string;
  metadata?: any;
  blockTimestamp?: string;
}) => ({
  eventType: "TOPUP_FUNDS" as const,
  escrowId: data.escrowId,
  groupId: data.groupId,
  transactionHash: data.transactionHash,
  blockNumber: data.blockNumber,
  initiatorWalletAddress: data.initiatorWalletAddress,
  tokenType: data.tokenType,
  eventData: {
    topupAmount: data.topupAmount,
  },
  metadata: data.metadata,
  blockTimestamp: data.blockTimestamp,
});

export const createAddRecipientsEvent = (data: {
  escrowId: string;
  groupId: string;
  transactionHash: string;
  blockNumber?: string;
  initiatorWalletAddress: string;
  tokenType: "USDC" | "USDT" | "IDRX";
  newRecipients: Array<{
    walletAddress: string;
    amount: string;
    fullname: string;
  }>;
  metadata?: any;
  blockTimestamp?: string;
}) => ({
  eventType: "ADD_RECIPIENTS" as const,
  escrowId: data.escrowId,
  groupId: data.groupId,
  transactionHash: data.transactionHash,
  blockNumber: data.blockNumber,
  initiatorWalletAddress: data.initiatorWalletAddress,
  tokenType: data.tokenType,
  eventData: {
    newRecipients: data.newRecipients,
  },
  metadata: data.metadata,
  blockTimestamp: data.blockTimestamp,
});
