import mongoose, { Document, Schema } from "mongoose";

export interface ITokenWithdrawToFiat extends Document {
  blockNumber: string;
  amount: string;
  contractId: string;
  depositWallet: string;
  escrowId: string;
  chainId: string; // Goldsky ID
  receiver: string;
  timestamp: string;
  transactionHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const tokenWithdrawToFiatSchema: Schema = new Schema(
  {
    blockNumber: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: String,
      required: true,
    },
    contractId: {
      type: String,
      required: true,
    },
    depositWallet: {
      type: String,
      required: true,
      index: true,
    },
    escrowId: {
      type: String,
      required: true,
      index: true,
    },
    chainId: {
      type: String,
      required: true,
      unique: true, // Goldsky ID should be unique
    },
    receiver: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: String,
      required: true,
    },
    transactionHash: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "tokenWithdrawToFiat",
  }
);

// Index untuk query performance
tokenWithdrawToFiatSchema.index({ receiver: 1, timestamp: -1 });
tokenWithdrawToFiatSchema.index({ escrowId: 1, receiver: 1 });
tokenWithdrawToFiatSchema.index({ transactionHash: 1 });

export default mongoose.model<ITokenWithdrawToFiat>(
  "TokenWithdrawToFiat",
  tokenWithdrawToFiatSchema
);
