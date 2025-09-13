import mongoose, { Schema } from "mongoose";

const UserDataSchema = new Schema(
  {
    idrxId: {
      type: String,
      required: true,
      unique: true,
    },
    bankId: {
      type: String,
      required: false,
      unique: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    fullname: {
      type: String,
      required: true,
    },
    idFile: {
      type: String,
      required: true,
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
    },
    secretKey: {
      type: String,
      required: true,
      unique: true,
    },
    WalletAddresses: [
      {
        // dibuat satu akun hanya bisa terpaut ke satu wallet address
        walletAddress: {
          type: String,
          required: false,
          unique: false,
        },
        role: {
          type: String,
          required: true,
          enum: ["none", "sender", "receiver"],
          default: "none",
        },
        availableBalance: {
          type: Number,
          required: false,
          default: 0,
        },
      },
    ],

    depositWalletAddress: {
      type: String,
      required: false,
      unique: false,
    },
    hashBankAccountNumber: {
      type: String,
      required: false,
    },
    bankAccountNumber: {
      type: String,
      required: false,
    },
    bankAccountName: {
      type: String,
      required: false,
    },
    bankCode: {
      type: Number,
      required: false,
    },
    bankName: {
      type: String,
      required: false,
    },
    ListOfRegisteredBankAccount: [
      {
        bankAccountNumber: { type: String, required: true },
        bankAccountName: { type: String, required: true },
        bankCode: { type: Number, required: true },
        bankName: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }, // optional
        hashBankAccountNumber: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

export const UserModel = mongoose.model("UserData", UserDataSchema);
const GroupOfUserSchema = new Schema(
  {
    escrowId: {
      type: String,
      required: false,
    },
    groupId: {
      type: String,
      required: true,
    },
    nameOfGroup: {
      type: String,
      required: true,
    },
    senderWalletAddress: {
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
    // 🔥 Tambahan fields untuk escrow transaction
    originCurrency: {
      type: String,
      enum: ["USDC", "IDRX"],
      required: false,
    },
    totalAmount: {
      type: String,
      required: false,
    },
    transactionHash: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      required: false,
    },
    Receivers: [
      {
        // dari be
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
        fullname: {
          type: String,
          required: true,
        },
        apiKey: {
          type: String,
          required: true,
        },
        secretKey: {
          type: String,
          required: true,
        },

        // dari fe
        originCurrency: {
          type: String,
          required: true,
        },
        tokenIcon: {
          type: String,
          required: true,
        },
        walletAddress: {
          type: String,
          required: true,
        },
        depositWalletAddress: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
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
        bankCode: {
          type: String,
          required: false,
        },
        bankAccountNumber: {
          type: String,
          required: false,
        },
        bankAccountName: {
          type: String,
          required: false,
        },
      },
    ],
    totalRecipients: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

export const GroupOfUserModel = mongoose.model(
  "GroupOfUserData",
  GroupOfUserSchema
);

const LoginSessionTokenSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  walletAddress: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
});

export const LoginSessionTokenModel = mongoose.model(
  "LoginSession",
  LoginSessionTokenSchema
);
