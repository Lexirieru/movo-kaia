import { Request, Response } from "express";
import { GroupOfUserModel, UserModel } from "../models/userModel"; // Pastikan path-nya benar
import { WithdrawHistoryModel } from "../models/transactionRecordModel";
import { generateSignatureForRedeem } from "../utils/generate_signature";
import axios from "axios";
import { burnIdrx } from "../utils/burnIdrx";
import { bankDictionary } from "../utils/dictionary";

const movoApiKey = process.env.IDRX_API_KEY!;
const movoSecretKey = process.env.IDRX_SECRET_KEY!;

// nampilin semua info group yang dia join (Nama grup, nama sendernya, total saldo dia di grup itu)
export async function loadAllJoinedGroupInformation(
  req: Request,
  res: Response
) {
  const { _id } = req.body;

  try {
    const loadAllJoinedGroup = await GroupOfUserModel.find({
      "Receivers._id": _id,
    })
      .sort({ timestamp: -1 }) // descending (terbaru di atas)
      .lean(); // supaya hasilnya plain JS object dan lebih cepat

    res.status(201).json({
      message: "All group information successfully sended",
      data: loadAllJoinedGroup,
    });
    return;
  } catch (err: any) {
    res.status(500).json({
      message: "Error sending all joined group information",
      error: err.message,
    });
    return;
  }
}
// untuk nampilin semua informasi tentang group (nama group, siapa yang jadi sendernya, total saldo dari masing masing group yang belun diwithdraw))
export async function loadSpecificGroupInformation(
  req: Request,
  res: Response
) {
  const { _id, groupId } = req.body;

  try {
    const loadSpecificGroup = await GroupOfUserModel.find({
      "Receivers._id": _id,
      groupId,
    });

    res.status(201).json({
      message: "Specified group's detail successfully sended",
      data: loadSpecificGroup,
    });
    return;
  } catch (err: any) {
    res.status(500).json({
      message: "Error sending specified group's detail",
      error: err.message,
    });
    return;
  }
}
// untuk leave group (db ngeremove receiver ini dari group)
export async function leaveGroup(req: Request, res: Response) {
  const { _id, groupId } = req.body;

  try {
    const specifiedGroup = await GroupOfUserModel.findOne({
      groupId,
      "Receivers._id": _id,
    });
    if (!specifiedGroup) {
      res.status(404).json({
        message: "Specified group not found",
      });
      return;
    }
    await GroupOfUserModel.updateOne(
      { groupId },
      {
        $pull: {
          Receivers: { id: _id },
        },
      }
    );

    res.status(200).json({
      message: "Specified receiver successfully removed from group",
      groupId,
      removedReceiverId: _id,
    });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Error removing specified receiver from group",
      error: err,
    });
    return;
  }
}
// untuk ngefetch total saldo yang belum diwithdraw.
export async function loadDashboardData(req: Request, res: Response) {
  const { _id } = req.body;
  try {
    const user = await UserModel.findById(_id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({
      availableBalance: user.availableBalance,
    });
    return;
  } catch (err) {
    res
      .status(500)
      .json({ message: "Could not load dashboard data", error: err });
    return;
  }
}

// kalok wallet to fiat (originCurrencynya crypto idrx), backend yang jalanin kek biasanya
export async function withdrawFromIDRXtoIDR(req: Request, res: Response) {
  const {
    _id,
    withdrawId,
    receiverId,
    choice,
    originCurrency,
    targetCurrency,
    bankId,
    bankName,
    bankAccountNumber,
    bankAccountName,
    networkChainId,
    walletAddress,
    amount,
  } = req.body;

  if (!choice || !originCurrency) {
    res
      .status(404)
      .json({ message: "Choice and originCurrency are required!" });
    return;
  }

  if (choice == "fiat" && originCurrency == "IDRX") {
    // listen to payrollApproved, burn idrx, generate signature (redeem), post redeem,
    try {
      // BURN idrx disini
      const txHash = await burnIdrx(amount, bankName, bankAccountNumber);
      if (!txHash) {
        return res.status(500).json({ message: "Failed to burn IDRX" });
      }
      console.log(txHash);

      // generate signature untuk redeem disini
      const bankCode = bankDictionary[bankName];
      if (!bankDictionary[bankName]) {
        return res.status(400).json({ message: "Invalid bankName" });
      }

      const { r_signature, r_METHOD, r_URL_ENDPOINT, r_timestamp, r_body } =
        generateSignatureForRedeem(
          txHash,
          networkChainId,
          amount,
          bankAccountNumber,
          bankCode,
          bankName,
          bankAccountName,
          walletAddress
        );

      console.log(
        "Request payload ke IDRX:",
        JSON.stringify({
          chainId: r_body.networkChainId.toString(),
          txHash: r_body.txHash,
          signature: r_signature,
          timestamp: r_timestamp,
        })
      );
      const userData = await UserModel.findById(_id);

      const response = await axios.post(
        "https://idrx.co/api/transaction/redeem-request",
        r_body,
        {
          headers: {
            "Content-Type": "application/json",
            "idrx-api-key": userData?.apiKey,
            "idrx-api-sig": r_signature,
            "idrx-api-ts": r_timestamp,
          },
        }
      );
      console.log(response);
      const withdrawHistory = new WithdrawHistoryModel({
        withdrawId,
        receiverId,
        amount,
        choice,
        originCurrency,
        targetCurrency,
        bankId,
        depositWalletAddress: userData?.depositWalletAddress,
        walletAddress,
        bankName,
        bankAccountName,
        bankAccountNumber,
      });
      // save history ini ke db
      await withdrawHistory.save();
      res.status(201).json({
        data: withdrawHistory,
        txHash,
        message: "Successfully withdrawn into fiat",
      });
      return;
    } catch (err) {
      console.log(err);
      res.status(400).json({ error: err });
      return;
    }
  } else {
    res.status(400).json({
      message: "originCurrency must be IDRX and transfer must end on fiat",
    });
    return;
  }
}

// untuk nampilin all withdraw history
export async function loadAllWithdrawHistory(req: Request, res: Response) {
  const { _id } = req.body;

  try {
    const histories = await WithdrawHistoryModel.find({ receiverId: _id })
      .sort({ timestamp: -1 })
      .lean();

    res.status(200).json({
      message: "Withdraw history successfully loaded",
      data: histories,
    });
  } catch (err: any) {
    res.status(500).json({
      message: "Error loading withdraw history",
      error: err.message,
    });
  }
}
// untuk nampilin spesifik withdraw history
export async function loadSpecificWithdrawHistory(req: Request, res: Response) {
  const { _id, withdrawId } = req.body;

  try {
    const withdrawHistory = await WithdrawHistoryModel.findOne({
      receiverId: _id,
      withdrawId,
    });

    res.status(200).json({
      message: "Specified withdraw history successfully loaded",
      data: withdrawHistory,
    });
  } catch (err: any) {
    res.status(500).json({
      message: "Error loading specified withdraw history",
      error: err.message,
    });
  }
}
