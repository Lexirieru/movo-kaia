import mongoose, { Schema } from "mongoose";

const TransactionHistorySchema = new Schema({
  txId: {
    type: String,
    required: true,
  },
  txHash: {
    type: String,
    required: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  receiverName: {
    type: String,
    required: true,
  },
  groupId: {
    type: String,
    required: true,
  },
  groupName: {
    type: String,
    required: true,
  },
  originCurrency: {
    type: String,
    required: true,
  },
  // in crypto
  totalAmount: {
    type: String,
    required: true,
  },
  Receivers: [
    {
      email: {
        type: String,
        required: true,
      },
      fullname: {
        type: String,
        required: true,
      },
      // in crypto
      amount: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  totalReceiver: {
    type: Number,
    required: true,
  },
  // blockNumber :  {
  //   type : String,
  //   required : true,
  // },
  // blockHash :  {
  //   type : String,
  //   required : true,
  // },
  // from :  {
  //   type : String,
  //   required : true,
  // },
  // to :  {
  //   type : String,
  //   required : true,
  // },
  // status :  {
  //   type : String,
  //   required : true,
  // },
  // gasUsed :  {
  //   type : String,
  //   required : true,
  // },
  // gasPrice :  {
  //   type : String,
  //   required : true,
  // },
  // timestamp dari transaksi blockchain
  timestamp: {
    type: String,
    required: true,
  },
});

export const TransactionHistoryModel = mongoose.model(
  "TransactionHistory",
  TransactionHistorySchema
);

const WithdrawHistorySchema = new Schema(
  {
    withdrawId: {
      type: String,
      required: false,
    },
    receiverId: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    choice: {
      type: String,
      required: false,
    },
    originCurrency: {
      type: String,
      required: true,
    },
    targetCurrency: {
      type: String,
      required: false,
    },

    networkChainId: {
      type: Number,
      required: false,
    },
    walletAddress: {
      type: String,
      required: false,
    },

    depositWalletAddress: {
      type: String,
      required: false,
    },
    bankId: {
      type: String,
      required: false,
    },
    bankName: {
      type: String,
      required: false,
    },
    bankAccountName: {
      type: String,
      required: false,
    },
    bankAccountNumber: {
      type: String,
      required: false,
    },
    createdAt: {
      type: String,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const WithdrawHistoryModel = mongoose.model(
  "WithdrawHistory",
  WithdrawHistorySchema
);
