import { ethers } from "ethers";
import payrollAbi from "../abi/payrollABI.json";
import dotenv from "dotenv";
import {
  TransactionHistoryModel,
  WithdrawHistoryModel,
} from "../models/transactionRecordModel";
import { GroupOfUserModel, UserModel } from "../models/userModel";
import escrowABI from "../abi/escrowABI.json";

dotenv.config();

const RPC_URL = process.env.RPC_URL!;
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT!;

export const senderListener = async () => {
  if (!ESCROW_CONTRACT_ADDRESS || !RPC_URL) {
    throw new Error("Missing environment variables. Cek kembali file .env");
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  console.log("🔄 Listening to EscrowCreated events...");

  const contract = new ethers.Contract(
    ESCROW_CONTRACT_ADDRESS!,
    escrowABI,
    provider
  );
  contract.on(
    "EscrowCreated",
    async (
      escrowId,
      sender,
      totalAmount,
      createdAt,
      receivers,
      amounts,
      event
    ) => {
      console.log("📢 New Escrow Created!");
      console.log("Escrow ID:", escrowId);
      console.log("Sender:", sender);
      console.log("Total Amount:", totalAmount.toString());
      console.log("Created At (timestamp):", createdAt.toString());
      console.log("Receivers:", receivers);
      console.log(
        "Amounts:",
        amounts.map((a: any) => a.toString())
      );
      console.log("Block:", event.blockNumber);

      // cari user sender
      const userData = await UserModel.findOne({ walletAddress: sender });
      if (!userData) {
        console.log("User data not found!");
        return;
      }

      // update group dengan escrowId terbaru
      const addEscrowId = await GroupOfUserModel.findOneAndUpdate(
        { senderId: userData._id },
        { $set: { escrowId } },
        { new: true, sort: { createdAt: -1 } }
      );

      if (addEscrowId) {
        console.log("EscrowId berhasil ditambahkan ke group:", addEscrowId._id);
      } else {
        console.log("Failed to fetch escrow ID");
      }

      // loop setiap receiver dan amount pasangannya
      for (let i = 0; i < receivers.length; i++) {
        const receiverAddress = receivers[i];
        const amount = amounts[i];

        const receiverData = await UserModel.findOne({
          walletAddress: receiverAddress,
        });

        if (!receiverData) {
          console.log(`Receiver ${receiverAddress} not found in DB`);
          continue;
        }

        const addWithdrawHistoryToReceiver = new WithdrawHistoryModel({
          receiverId: receiverData._id,
          amount: amount.toString(),
          originCurrency: "USDC",
          escrowId: escrowId, // optional: simpan escrowId biar traceable
        });

        await addWithdrawHistoryToReceiver.save();
        console.log(
          `Withdraw history ditambahkan utk receiver ${receiverAddress}, amount: ${amount.toString()}`
        );
      }
    }
  );

  // 👂 Listener event sc waktu sender top up fund ke escrow
  // contract.on(
  //   "TopUpFunds",
  //   async (
  //     txId: string,
  //     senderId: string,
  //     senderName: string,
  //     receiverName: string,
  //     groupId: string,
  //     groupName: string,
  //     totalAmount: string,
  //     Receivers: string[],
  //     totalReceiver: number,
  //     originCurrency,
  //     event
  //   ) => {
  //     const addTransactionHistoryToSender = new TransactionHistoryModel();
  //   }
  // );

  console.log("👂 Listening for PayrollApproved...");
};
