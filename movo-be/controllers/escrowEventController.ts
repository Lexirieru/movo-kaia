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

    // Get user information - try multiple approaches
    let user = await UserModel.findOne({
      "WalletAddresses.walletAddress": new RegExp(
        `^${initiatorWalletAddress}$`,
        "i"
      ),
    });

    // If not found with regex, try exact match
    if (!user) {
      user = await UserModel.findOne({
        "WalletAddresses.walletAddress": initiatorWalletAddress,
      });
    }

    // If still not found, try case-insensitive exact match
    if (!user) {
      user = await UserModel.findOne({
        "WalletAddresses.walletAddress": { $regex: `^${initiatorWalletAddress}$`, $options: 'i' },
      });
    }

    if (!user) {
      console.log(`❌ User not found for wallet address: ${initiatorWalletAddress}`);
      console.log(`🔍 Searching for users with similar addresses...`);
      
      // Debug: Find users with similar addresses
      const similarUsers = await UserModel.find({
        "WalletAddresses.walletAddress": { $exists: true }
      }).limit(5);
      
      console.log(`📋 Found ${similarUsers.length} users with wallet addresses:`);
      similarUsers.forEach(u => {
        u.WalletAddresses?.forEach((wallet: any) => {
          console.log(`  - ${wallet.walletAddress} (role: ${wallet.role})`);
        });
      });

      // Instead of failing, create a temporary user record for tracking
      console.log(`⚠️ Creating temporary user record for wallet: ${initiatorWalletAddress}`);
      
      // Create a temporary user record for this wallet address
      const tempUser = new UserModel({
        idrxId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: `temp_${initiatorWalletAddress}@temp.movo.com`,
        hashedPassword: 'temp_password',
        fullname: 'Temporary User',
        idFile: 'temp_id_file',
        apiKey: `temp_api_${Date.now()}`,
        secretKey: `temp_secret_${Date.now()}`,
        WalletAddresses: [{
          walletAddress: initiatorWalletAddress,
          role: 'sender',
          availableBalance: 0
        }]
      });

      try {
        await tempUser.save();
        console.log(`✅ Temporary user created: ${tempUser._id}`);
        user = tempUser;
      } catch (tempUserError) {
        console.error(`❌ Failed to create temporary user:`, tempUserError);
        
        res.status(404).json({
          message: "User not found for the provided wallet address",
          statusCode: 404,
          debug: {
            searchedAddress: initiatorWalletAddress,
            addressLength: initiatorWalletAddress.length,
            addressFormat: initiatorWalletAddress.startsWith('0x') ? 'valid' : 'invalid'
          }
        });
        return;
      }
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

// Controller untuk get escrow event history berdasarkan escrowId (dengan validasi user)
export async function getEscrowEventHistory(req: Request, res: Response) {
  const { escrowId } = req.body;
  const user = (req as any).user; // From JWT middleware

  if (!escrowId) {
    res.status(400).json({
      message: "escrowId is required",
      statusCode: 400,
    });
    return;
  }

  try {
    console.log(
      `📋 Getting escrow history for escrowId: ${escrowId}, user: ${user._id}, wallet: ${user.walletAddress}`
    );

    // STRICT FILTERING: Only events for this escrow where initiatorWalletAddress matches
    const events = await EscrowEventModel.find({
      escrowId,
      initiatorWalletAddress: new RegExp(`^${user.walletAddress}$`, "i"),
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📊 Found ${events.length} events for escrow ${escrowId}`);

    res.status(200).json({
      message: "Escrow event history retrieved successfully",
      statusCode: 200,
      data: {
        escrowId,
        userId: user._id,
        walletAddress: user.walletAddress,
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

// Controller untuk get user's all escrow events (optimized dengan authentication)
export async function getUserEscrowEvents(req: Request, res: Response) {
  const user = (req as any).user; // From JWT middleware
  const { timeRange, eventType, tokenType, limit = 50, page = 1 } = req.body;

  try {
    console.log(
      `📋 Getting user escrow events for user: ${user._id}, wallet: ${user.walletAddress}`
    );

    // Log JWT content for debugging
    console.log(`🔍 JWT user object:`, JSON.stringify(user, null, 2));

    // STRICT FILTERING: Only events where initiatorWalletAddress matches the authenticated user's wallet
    // This prevents cross-wallet data leakage
    let filter: any = {
      initiatorWalletAddress: new RegExp(`^${user.walletAddress}$`, "i"),
    };

    console.log(
      `🔍 Strict filter (wallet-only):`,
      JSON.stringify(filter, null, 2)
    );

    // Add time range filter
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

      filter.createdAt = { $gte: startDate };
    }

    // Add event type filter
    if (eventType) {
      filter.eventType = eventType;
    }

    // Add token type filter
    if (tokenType) {
      filter.tokenType = tokenType;
    }

    console.log(`🔍 Filter query:`, JSON.stringify(filter, null, 2));

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get events with pagination and sorting
    const events = await EscrowEventModel.find(filter)
      .sort({ createdAt: -1, blockTimestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalEvents = await EscrowEventModel.countDocuments(filter);

    // Group events by escrow for better organization
    const groupedEvents = events.reduce((acc: any, event) => {
      if (!acc[event.escrowId]) {
        acc[event.escrowId] = [];
      }
      acc[event.escrowId].push(event);
      return acc;
    }, {});

    // Get unique escrows count
    const uniqueEscrows = new Set(events.map((event) => event.escrowId));

    console.log(
      `📊 Found ${events.length} events across ${uniqueEscrows.size} escrows`
    );

    res.status(200).json({
      message: "User escrow events retrieved successfully",
      statusCode: 200,
      data: {
        user: {
          _id: user._id,
          walletAddress: user.walletAddress,
        },
        filters: {
          timeRange: timeRange || "all",
          eventType: eventType || "all",
          tokenType: tokenType || "all",
        },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalEvents / limit),
          totalEvents,
          eventsPerPage: limit,
          hasNextPage: skip + events.length < totalEvents,
          hasPrevPage: page > 1,
        },
        summary: {
          totalEvents: events.length,
          totalEscrows: uniqueEscrows.size,
          eventTypes: [...new Set(events.map((e) => e.eventType))],
          tokenTypes: [...new Set(events.map((e) => e.tokenType))],
        },
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

// Controller untuk get event statistics (optimized dengan authentication)
export async function getEscrowEventStatistics(req: Request, res: Response) {
  const user = (req as any).user; // From JWT middleware
  const { timeRange } = req.body;

  try {
    console.log(
      `📊 Getting escrow event statistics for user: ${user._id}, wallet: ${user.walletAddress}`
    );

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

    // STRICT FILTERING: Base match filter for user's events (wallet-only)
    const baseMatch = {
      initiatorWalletAddress: new RegExp(`^${user.walletAddress}$`, "i"),
      ...dateFilter,
    };

    console.log(
      `🔍 Statistics base match filter:`,
      JSON.stringify(baseMatch, null, 2)
    );

    // Aggregation pipeline for detailed statistics
    const pipeline = [
      { $match: baseMatch },
      {
        $group: {
          _id: {
            eventType: "$eventType",
            tokenType: "$tokenType",
          },
          count: { $sum: 1 },
          lastEvent: { $max: "$createdAt" },
          firstEvent: { $min: "$createdAt" },
        },
      },
      {
        $group: {
          _id: "$_id.eventType",
          count: { $sum: "$count" },
          lastEvent: { $max: "$lastEvent" },
          firstEvent: { $min: "$firstEvent" },
          tokenBreakdown: {
            $push: {
              tokenType: "$_id.tokenType",
              count: "$count",
            },
          },
        },
      },
      { $sort: { count: -1 as -1 } },
    ];

    const statistics = await EscrowEventModel.aggregate(pipeline);

    // Get total events count
    const totalEvents = await EscrowEventModel.countDocuments(baseMatch);

    // Get unique escrows count
    const uniqueEscrowsPipeline = [
      { $match: baseMatch },
      { $group: { _id: "$escrowId", count: { $sum: 1 } } },
      { $group: { _id: null, totalEscrows: { $sum: 1 } } },
    ];

    const uniqueEscrowsResult = await EscrowEventModel.aggregate(
      uniqueEscrowsPipeline
    );
    const uniqueEscrows = uniqueEscrowsResult[0]?.totalEscrows || 0;

    // Get token type statistics
    const tokenStatsPipeline = [
      { $match: baseMatch },
      {
        $group: {
          _id: "$tokenType",
          count: { $sum: 1 },
          lastActivity: { $max: "$createdAt" },
        },
      },
      { $sort: { count: -1 as -1 } },
    ];

    const tokenStats = await EscrowEventModel.aggregate(tokenStatsPipeline);

    // Calculate activity trends (last 30 days if timeRange is not specified)
    const trendTimeRange = timeRange === "all" ? "30d" : timeRange;
    let trendStartDate = new Date();
    switch (trendTimeRange) {
      case "24h":
        trendStartDate.setHours(trendStartDate.getHours() - 24);
        break;
      case "7d":
        trendStartDate.setDate(trendStartDate.getDate() - 7);
        break;
      default:
        trendStartDate.setDate(trendStartDate.getDate() - 30);
    }

    const trendPipeline = [
      {
        $match: {
          ...baseMatch,
          createdAt: { $gte: trendStartDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as 1 } },
    ];

    const activityTrend = await EscrowEventModel.aggregate(trendPipeline);

    console.log(
      `📈 Statistics calculated: ${totalEvents} total events, ${uniqueEscrows} unique escrows`
    );

    res.status(200).json({
      message: "Escrow event statistics retrieved successfully",
      statusCode: 200,
      data: {
        user: {
          _id: user._id,
          walletAddress: user.walletAddress,
        },
        timeRange: timeRange || "all",
        summary: {
          totalEvents,
          totalEscrows: uniqueEscrows,
          averageEventsPerEscrow:
            uniqueEscrows > 0 ? (totalEvents / uniqueEscrows).toFixed(2) : "0",
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
          completions:
            statistics.find((s) => s._id === "ESCROW_COMPLETED")?.count || 0,
        },
        eventsByType: statistics,
        tokenBreakdown: tokenStats,
        activityTrend: activityTrend,
        performance: {
          queryExecutionTime: new Date().toISOString(),
          dataFreshness: "real-time",
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

// Controller untuk dashboard metrics (lightweight dan cepat)
export async function getDashboardMetrics(req: Request, res: Response) {
  const user = (req as any).user; // From JWT middleware

  try {
    console.log(
      `📊 Getting dashboard metrics for user: ${user._id}, wallet: ${user.walletAddress}`
    );

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // STRICT FILTERING: Only events from authenticated user's wallet
    const baseFilter = {
      initiatorWalletAddress: new RegExp(`^${user.walletAddress}$`, "i"),
    };

    console.log(
      `🔍 Dashboard metrics base filter:`,
      JSON.stringify(baseFilter, null, 2)
    );

    // Quick metrics aggregation
    const [
      totalEvents,
      recent24h,
      recent7d,
      recent30d,
      recentEvents,
      tokenStats,
      activeEscrows,
    ] = await Promise.all([
      // Total all-time events
      EscrowEventModel.countDocuments(baseFilter),

      // 24h activity
      EscrowEventModel.countDocuments({
        ...baseFilter,
        createdAt: { $gte: last24h },
      }),

      // 7d activity
      EscrowEventModel.countDocuments({
        ...baseFilter,
        createdAt: { $gte: last7d },
      }),

      // 30d activity
      EscrowEventModel.countDocuments({
        ...baseFilter,
        createdAt: { $gte: last30d },
      }),

      // Most recent 5 events
      EscrowEventModel.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .select("eventType escrowId tokenType createdAt transactionHash")
        .lean(),

      // Token type breakdown
      EscrowEventModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$tokenType", count: { $sum: 1 } } },
        { $sort: { count: -1 as -1 } },
      ]),

      // Active escrows (escrows with recent activity)
      EscrowEventModel.aggregate([
        {
          $match: {
            ...baseFilter,
            createdAt: { $gte: last30d },
          },
        },
        { $group: { _id: "$escrowId", lastActivity: { $max: "$createdAt" } } },
        { $count: "activeEscrows" },
      ]),
    ]);

    const activeEscrowCount = activeEscrows[0]?.activeEscrows || 0;

    res.status(200).json({
      message: "Dashboard metrics retrieved successfully",
      statusCode: 200,
      data: {
        user: {
          _id: user._id,
          walletAddress: user.walletAddress,
        },
        overview: {
          totalEvents,
          activeEscrows: activeEscrowCount,
          last24h: recent24h,
          last7d: recent7d,
          last30d: recent30d,
        },
        activity: {
          trend24h: recent24h > 0 ? "active" : "quiet",
          weeklyGrowth: recent7d - (recent30d - recent7d),
          monthlyTotal: recent30d,
        },
        tokenBreakdown: tokenStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        recentActivity: recentEvents,
        performance: {
          queryTime: Date.now(),
          freshness: "real-time",
        },
      },
    });
    return;
  } catch (err: any) {
    console.error("❌ Error getting dashboard metrics:", err);
    res.status(500).json({
      message: "Error getting dashboard metrics",
      statusCode: 500,
      error: err.message,
    });
    return;
  }
}
