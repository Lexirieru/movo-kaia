import mongoose, { Schema } from "mongoose";

// Schema untuk menyimpan history event escrow
const EscrowEventSchema = new Schema(
  {
    // Event Information
    eventType: {
      type: String,
      required: true,
      enum: [
        "ESCROW_CREATED",
        "TOPUP_FUNDS",
        "ADD_RECIPIENTS",
        "REMOVE_RECIPIENTS",
        "UPDATE_RECIPIENTS_AMOUNT",
        "WITHDRAW_FUNDS",
        "ESCROW_COMPLETED",
      ],
    },

    // Escrow Information
    escrowId: {
      type: String,
      required: true,
    },
    groupId: {
      type: String,
      required: true,
    },

    // Transaction Information
    transactionHash: {
      type: String,
      required: true,
    },
    blockNumber: {
      type: String,
      required: false,
    },

    // User Information
    initiatorId: {
      type: String,
      required: true,
    },
    initiatorWalletAddress: {
      type: String,
      required: true,
    },
    initiatorName: {
      type: String,
      required: true,
    },

    // Token Information
    tokenType: {
      type: String,
      required: true,
      enum: ["USDC", "USDT", "IDRX"],
    },

    // Event Specific Data
    eventData: {
      // For ESCROW_CREATED
      totalAmount: {
        type: String,
        required: false,
      },
      recipients: [
        {
          walletAddress: String,
          amount: String,
          fullname: String,
        },
      ],

      // For TOPUP_FUNDS
      topupAmount: {
        type: String,
        required: false,
      },

      // For ADD_RECIPIENTS
      newRecipients: [
        {
          walletAddress: String,
          amount: String,
          fullname: String,
        },
      ],

      // For REMOVE_RECIPIENTS
      removedRecipients: [
        {
          walletAddress: String,
          amount: String,
          fullname: String,
        },
      ],

      // For UPDATE_RECIPIENTS_AMOUNT
      updatedRecipients: [
        {
          walletAddress: String,
          oldAmount: String,
          newAmount: String,
          fullname: String,
        },
      ],

      // For WITHDRAW_FUNDS
      withdrawAmount: {
        type: String,
        required: false,
      },
      withdrawTo: {
        type: String,
        required: false,
      },
    },

    // Additional metadata
    metadata: {
      gasUsed: String,
      gasPrice: String,
      networkId: String,
      contractAddress: String,
    },

    // Status
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "CONFIRMED", "FAILED"],
      default: "PENDING",
    },

    // Timestamps
    blockTimestamp: {
      type: Date,
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing untuk performance
EscrowEventSchema.index({ escrowId: 1, createdAt: -1 });
EscrowEventSchema.index({ groupId: 1, createdAt: -1 });
EscrowEventSchema.index({ initiatorId: 1, createdAt: -1 });
EscrowEventSchema.index({ eventType: 1, createdAt: -1 });

export const EscrowEventModel = mongoose.model(
  "EscrowEvent",
  EscrowEventSchema
);
