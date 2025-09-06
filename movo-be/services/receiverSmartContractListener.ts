import { ethers } from "ethers";
import payrollAbi from "../abi/payrollABI.json";
import dotenv from "dotenv";
import {
  generateSignatureForSwap,
  generateSignatureForRedeem,
} from "../utils/generate_signature";
import {
  burnIdrx,
  checkGasFeeEstimation,
  checkIDRXBalance,
} from "../utils/burnIdrx";
import axios from "axios";

import BigNumber from "bignumber.js";
import { WithdrawHistoryModel } from "../models/transactionRecordModel";

dotenv.config();

export const receiverListener = async () => {
  if (
    !process.env.LISK_SEPOLIA ||
    !process.env.CONTRACT_ADDRESS ||
    !process.env.IDRX_API_KEY ||
    !process.env.IDRX_SECRET_KEY
  ) {
    throw new Error("Missing environment variables. Cek kembali file .env");
  }

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.LISK_SEPOLIA!
  );

  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS!,
    payrollAbi,
    provider
  );

  // listen to receiver withdraw smartcontract's event
  contract.on(
    "WithdrawApproved",
    async (
      // wajib dari IDRX untuk redeem
      txHash: string,
      networkChainId: string,
      amountTransfer: string,
      // bank account number
      bankAccount: string,
      bankCode: string,
      // nama bank
      bankName: string,
      // nama orangnya di bank tersebut
      bankAccountName: string,
      walletAddress: string,

      withdrawId: string,
      receiverId: string,
      choice: string,
      originCurrency: string,
      targetCurrency: string,
      bankId: string,
      depositWalletAddress: string,

      event: string
    ) => {
      console.log(`[EVENT RECEIVED]`);

      console.log({
        txHash,
        bankAccount,
        bankCode,
        withdrawId,
        receiverId,
        amountTransfer,
        choice,
        originCurrency,
        targetCurrency,
        bankId,
        depositWalletAddress,
        bankName,
        bankAccountName,
        walletAddress,
        networkChainId,
      });
      // kalok wallet to wallet (originCurrencynya crypto non idrx), listen ke sc  (sc send langsung ke walletAddress)
      if (choice == "crypto") {
        // listen to sc (sc send langsung ke walletAddress) -> backend dapetin parameter yang disend dari eventnya sc ->
        // backend ngesave parameter tersebut ke db
        try {
          const withdrawHistory = new WithdrawHistoryModel({
            withdrawId,
            receiverId,
            amountTransfer,
            choice,
            originCurrency,
            targetCurrency,
            networkChainId,
            walletAddress,
          });
          await withdrawHistory.save();
        } catch (err) {
          console.log(err);
          return;
        }
      }
      // kalok wallet to fiat {originCurrencynya crypto usdc/usdt}, listen ke sc (sc send langsung ke depositwalletaddress)
      else if (
        choice == "fiat" &&
        (originCurrency == "USDC" || originCurrency == "USDT")
      ) {
        try {
          const withdrawHistory = new WithdrawHistoryModel({
            withdrawId,
            receiverId,
            amountTransfer,
            choice,
            originCurrency,
            targetCurrency,
            depositWalletAddress,
            bankId,
            bankName,
            bankAccountName,
            bankAccountNumber: bankAccount,
          });
          await withdrawHistory.save();
        } catch (err) {
          console.log(err);
          return;
        }
        // listen to sc (sc send langsung ke depositWalletAddress) -> backend dapetin parameter yang disend dari eventnya sc ->
        // backend ngesave parameter tersebut ke db
      }
    }
  );
};
