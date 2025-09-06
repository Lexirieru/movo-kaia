import { Request, Response } from "express";
import { UserModel } from "../models/userModel"; // Pastikan path-nya benar
import { createSignature } from "../utils/generate_signature";
import axios from "axios";
import fs from "fs";
import bcrypt from "bcrypt";
import { generateCookiesToken } from "../routes/auth";
import { sha256, toUtf8Bytes } from "ethers/lib/utils";
const movoApiKey = process.env.IDRX_API_KEY!;
const movoSecretKey = process.env.IDRX_SECRET_KEY!;
import FormData from "form-data";
import { checkConnection } from "../config/atlas";

export async function onBoardingUser(req: Request, res: Response) {
  const { email, fullname, password } = req.body;

  if (!email || !fullname) {
    res.status(404).json({ message: "Email and fullname are required!" });
    return;
  }

  const isConnected = await checkConnection();
  if (!isConnected) {
    res.status(503).json({
      message: "Database temporarily unavailable. Please try again.",
      statusCode: 503,
      error: "DB_CONNECTION_ERROR",
    });
    return;
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const response = await axios({
    method: "GET",
    url: "https://movopayment.vercel.app/movo%20full.png",
    responseType: "arraybuffer",
  });

  let imageBuffer;
  if (Buffer.isBuffer(response.data)) {
    imageBuffer = response.data;
  } else if (response.data instanceof ArrayBuffer) {
    imageBuffer = Buffer.from(response.data);
  } else {
    imageBuffer = Buffer.from(response.data);
  }

  console.log("Image buffer size:", imageBuffer.length);

  // PENTING: Gunakan FormData untuk proper multipart handling
  const formData = new FormData();
  formData.append("email", email);
  formData.append("fullname", fullname);
  formData.append("hashedPassword", hashedPassword);
  formData.append("idFile", imageBuffer, {
    filename: "movo-full.png",
    contentType: "image/png",
  });

  // Untuk signature, tetap gunakan object biasa (tanpa FormData)
  const dataForSignature = {
    email,
    fullname,
    hashedPassword,
    idFile: imageBuffer.toString("base64"), // Convert ke base64 untuk signature
  };

  const path = "https://idrx.co/api/auth/onboarding";
  const bufferReq = Buffer.from(
    JSON.stringify(dataForSignature),
    "base64"
  ).toString("utf8");

  const timestamp = Math.round(new Date().getTime()).toString();
  const sig = createSignature(
    "POST",
    path,
    bufferReq,
    timestamp,
    movoSecretKey
  );

  try {
    const resData = await axios.post(path, formData, {
      headers: {
        ...formData.getHeaders(), // Penting: ambil headers dari FormData
        "idrx-api-key": movoApiKey,
        "idrx-api-sig": sig,
        "idrx-api-ts": timestamp,
      },
    });

    console.log("api key: ", resData.data.data.apiKey);
    console.log("res.data: ");
    console.log(resData.data);

    const newUser = new UserModel({
      idrxId: resData.data.data.id,
      email,
      hashedPassword,
      fullname,
      idFile: "movo-full.png",
      apiKey: resData.data.data.apiKey,
      secretKey: resData.data.data.apiSecret,
    });

    await newUser.save();

    const token = await generateCookiesToken(email, newUser);

    res.cookie("user_session", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      statusCode: 200,
    });

    return;
  } catch (err: any) {
    console.log("Full error:", err.response?.data || err.message);
    if (
      err.message?.includes("buffering timed out") ||
      err.message?.includes("timeout")
    ) {
      res.status(408).json({
        message: "Database operation timed out. Please try again.",
        statusCode: 408,
        error: "TIMEOUT",
      });
    }

    res.status(500).json({
      message: "Registration failed. Please try again.",
      statusCode: 500,
      error: "INTERNAL_ERROR",
    });
    return;
  }
}

// export async function loadAllGroupPaymentAndWithdrawHistory(req: Request, res: Response) {
//   const { _id } = req.body;

//   try {
//     // Ambil semua payment history
//     const paymentHistories = await TransactionHistoryModel.find({ senderId: _id })
//       .sort({ timestamp: -1 })
//       .lean();

//     // Ambil semua withdraw history
//     const withdrawHistories = await WithdrawHistoryModel.find({ receiverId: _id })
//       .sort({ timestamp: -1 })
//       .lean();

//     // Samakan struktur data biar bisa digabung
//     const normalizedPayments = paymentHistories.map((p) => ({
//       ...p,
//       historyType: "payment",
//       createdAt: p.timestamp, // fallback ke createdAt kalau ada
//     }));

//     const normalizedWithdraws = withdrawHistories.map((w) => ({
//       ...w,
//       historyType: "withdraw",
//       createdAt: w.createdAt,
//     }));

//     // Gabungkan
//     const allHistories = [...normalizedPayments, ...normalizedWithdraws]
//       .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

//     res.status(200).json({
//       message: "Payment and Withdraw history successfully loaded",
//       data: allHistories,
//     });
//   } catch (err: any) {
//     res.status(500).json({
//       message: "Error loading payment and withdraw history",
//       error: err.message,
//     });
//   }
// }

export async function giveRole(req: Request, res: Response) {
  const { _id, role } = req.body;
  try {
    const isUser = await UserModel.findById(_id);
    if (!isUser) {
      res.status(404).json({ message: "User with specified id not found!" });
      return;
    }

    const userData = await UserModel.findByIdAndUpdate(
      _id,
      { role },
      { new: true }
    );
    if (!userData) {
      res.status(200).json({
        message: "Success updating user data's role",
        data: userData!.role,
      });
    }
    return;
  } catch (err) {
    console.log(err);
  }
}

// kepake diawal pendaftaran aja
export async function addBankAccount(req: Request, res: Response) {
  const { email, bankAccountNumber, bankCode } = req.body;
  const form = {
    bankAccountNumber,
    bankCode,
  };

  const path = "https://idrx.co/api/auth/add-bank-account";
  const bufferReq = Buffer.from(JSON.stringify(form), "base64").toString(
    "utf8"
  );
  const timestamp = Math.round(new Date().getTime()).toString();

  const user = await UserModel.findOne({ email });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  const sig = createSignature(
    "POST",
    path,
    bufferReq,
    timestamp,
    user.secretKey!
  );

  try {
    const resData = await axios.post(path, form, {
      headers: {
        "Content-Type": "application/json",
        "idrx-api-key": user.apiKey,
        "idrx-api-sig": sig,
        "idrx-api-ts": timestamp,
      },
    });

    const bank = `${user.bankName}_${user.bankAccountNumber}`;
    console.log(bank);
    const hashBankAccountNumber = sha256(toUtf8Bytes(bank));

    console.log(resData.data.data);
    console.log(resData.data.statusCode);

    const updatedUser = await UserModel.findOneAndUpdate(
      { email },
      {
        hashBankAccountNumber,
        bankId: resData.data.data.id,
        bankAccountNumber: resData.data.data.bankAccountNumber,
        bankAccountName: resData.data.data.bankAccountName,
        bankCode: resData.data.data.bankCode,
        bankName: resData.data.data.bankName,
        depositWalletAddress:
          resData.data.data.DepositWalletAddress.walletAddress,

        // push ke list bank yang terdaftar
        $push: {
          ListOfRegisteredBankAccount: {
            hashBankAccountNumber,
            bankAccountNumber: resData.data.data.bankAccountNumber,
            bankAccountName: resData.data.data.bankAccountName,
            bankCode: resData.data.data.bankCode,
            bankName: resData.data.data.bankName,
          },
        },
      },
      { new: true }
    );

    console.log(updatedUser);

    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(201).json({
      data: updatedUser,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
    return;
  }
}

export async function addWalletAddress(req: Request, res: Response) {
  const { _id, walletAddress } = req.body;

  if (!_id || !walletAddress) {
    res.status(400).json({ message: "id and walletAddress are required" });
    return;
  }

  try {
    const isWalletAddress = await UserModel.findOne({ walletAddress });
    if (isWalletAddress) {
      res.status(400).json({
        message:
          "Wallet address has been used before, please use another wallet",
      });
      return;
    }

    const userData = await UserModel.findByIdAndUpdate(
      _id,
      { walletAddress },
      { new: true }
    );

    if (!userData) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      message: "Wallet address updated successfully",
      data: userData,
    });
    return;
  } catch (err: any) {
    console.error("Error updating wallet address:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function getBankAccount(req: Request, res: Response) {
  const { _id } = req.body;
  const path = "https://idrx.co/api/auth/get-bank-accounts";

  const user = await UserModel.findOne({ _id });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const bufferReq = Buffer.from("", "base64").toString("utf8");
  const timestamp = Math.round(new Date().getTime()).toString();
  const sig = createSignature(
    "GET",
    path,
    bufferReq,
    timestamp,
    user.secretKey
  );

  try {
    const resData = await axios.get(path, {
      headers: {
        "Content-Type": "application/json",
        "idrx-api-key": user.apiKey,
        "idrx-api-sig": sig,
        "idrx-api-ts": timestamp,
      },
    });
    res.status(200).json({ data: resData.data.data[0] });
    return;
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err });
    return;
  }
}

export async function getBankAccountFromDatabase(req: Request, res: Response) {
  const { _id } = req.body;

  try {
    const user = await UserModel.findById(_id).lean(); // pakai lean biar lebih ringan
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // ambil array ListOfRegisteredBankAccount
    const bankAccounts = user.ListOfRegisteredBankAccount || [];

    res.status(200).json({
      data: bankAccounts,
      count: bankAccounts.length,
    });
    return;
  } catch (err) {
    console.error("Error fetching bank accounts:", err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
}

// acuannya adalah bankId (bankId adalah id yang digenerate oleh idrx setiap selesai adding bank accounts)
export async function deleteBankAccount(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) {
    res.status(404).json("Missing email");
    return;
  }

  const user = await UserModel.findOne({ email });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const path = `https://idrx.co/api/auth/delete-bank-account/${user.bankId}`;
  const bufferReq = Buffer.from("", "base64").toString("utf8");
  const timestamp = Math.round(new Date().getTime()).toString();
  const sig = createSignature(
    "DELETE",
    path,
    bufferReq,
    timestamp,
    user.secretKey
  );

  const resData = await axios.delete(path, {
    headers: {
      "Content-Type": "application/json",
      "idrx-api-key": user.apiKey,
      "idrx-api-sig": sig,
      "idrx-api-ts": timestamp,
    },
  });
  console.log(resData);

  const updatedUser = await UserModel.findOneAndUpdate(
    { email },
    {
      $unset: {
        bankId: "",
        bankAccountNumber: "",
        bankAccountName: "",
        bankCode: "",
        bankName: "",
        depositWalletAddress: "",
        // hashBankAccountNumber : "",
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res
    .status(201)
    .json({ message: "Successfully delete bankAccounts", data: resData.data });

  console.log("berhasil hapus bankAccount");
  return;
}

// kekurangannya adalah ketika dia menambahkan akun bank yang belum ada di database,
// maka selain adding, dia akan changing ke akun bank itu (demi hematnya pemanggilan API IDRX)
export async function addBankAccountToDatabase(req: Request, res: Response) {
  const { _id, bankAccountNumber, bankCode } = req.body;
  console.log("_id:  ", _id);

  if (!_id || !bankAccountNumber || !bankCode) {
    res.status(400).json({ message: "Missing required fields" });
    return;
  }

  const user = await UserModel.findOne({ _id });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (
    bankAccountNumber == user.bankAccountNumber &&
    bankCode == user.bankCode
  ) {
    res
      .status(400)
      .json({ message: "You are currently using this bank account" });
    return;
  }

  // Cek apakah bank account sudah ada di list
  const existingInDatabase = await UserModel.findOne({
    _id,
    "ListOfRegisteredBankAccount.bankAccountNumber": bankAccountNumber,
    "ListOfRegisteredBankAccount.bankCode": bankCode,
  });

  if (existingInDatabase) {
    res
      .status(400)
      .json({ message: "You have added this bank account to database" });
    return;
  }

  const timestamp = Math.round(new Date().getTime()).toString();

  try {
    // 1. Delete existing bank account if exists
    if (user.bankId) {
      const deletePath = `https://idrx.co/api/auth/delete-bank-account/${user.bankId}`;
      const deleteSig = createSignature(
        "DELETE",
        deletePath,
        "",
        timestamp,
        user.secretKey!
      );

      const deleteBank = await axios.delete(deletePath, {
        headers: {
          "Content-Type": "application/json",
          "idrx-api-key": user.apiKey!,
          "idrx-api-sig": deleteSig,
          "idrx-api-ts": timestamp,
        },
      });

      if (!deleteBank) {
        res
          .status(400)
          .json({ message: "Failed to delete previous bank account" });
        return;
      }
    } else {
      res
        .status(404)
        .json({ message: "Previous bank account information not found" });
      return;
    }

    // 2. Add new bank account
    const addPath = "https://idrx.co/api/auth/add-bank-account";
    const form = { bankAccountNumber, bankCode };

    const addSig = createSignature(
      "POST",
      addPath,
      JSON.stringify(form), // cukup JSON.stringify
      timestamp,
      user.secretKey!
    );

    const addRes = await axios.post(addPath, form, {
      headers: {
        "Content-Type": "application/json",
        "idrx-api-key": user.apiKey!,
        "idrx-api-sig": addSig,
        "idrx-api-ts": timestamp,
      },
    });

    const newBankData = addRes.data.data;

    const bank = `${newBankData.bankName}_${newBankData.bankAccountNumber}`;
    const hashBankAccountNumber = sha256(toUtf8Bytes(bank));

    // 3. Update user with new bank info
    const updatedMainBankData = await UserModel.findByIdAndUpdate(
      _id,
      {
        $set: {
          bankId: newBankData.id,
          hashBankAccountNumber,
          bankAccountNumber: newBankData.bankAccountNumber,
          bankAccountName: newBankData.bankAccountName,
          bankCode: newBankData.bankCode,
          bankName: newBankData.bankName,
          depositWalletAddress: newBankData.DepositWalletAddress.walletAddress,
        },
      },
      { new: true }
    );

    if (!existingInDatabase) {
      // Kalau belum ada → push
      await UserModel.findByIdAndUpdate(
        _id,
        {
          $push: {
            ListOfRegisteredBankAccount: {
              hashBankAccountNumber,
              bankAccountNumber: newBankData.bankAccountNumber,
              bankAccountName: newBankData.bankAccountName,
              bankCode: newBankData.bankCode,
              bankName: newBankData.bankName,
            },
          },
        },
        { new: true }
      );
    } else {
      // Kalau sudah ada → skip atau bisa update data yg sudah ada
      console.log("Bank account already registered, skipping push.");
    }

    if (updatedMainBankData) {
      console.log("User's bank account information saved successfully");
    } else if (!updatedMainBankData) {
      console.log("Failed to save user's bank account information");
    }

    res.status(200).json({
      message: "Bank account changed successfully",
      data: updatedMainBankData,
    });

    return;
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to change bank account", error: err });
  }
}

export async function changeBankAccount(req: Request, res: Response) {
  const { _id, bankAccountNumber, bankCode } = req.body;

  if (!_id || !bankAccountNumber || !bankCode) {
    res.status(400).json({ message: "Missing required fields" });
    return;
  }

  const user = await UserModel.findOne({ _id });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (
    bankAccountNumber == user.bankAccountNumber &&
    bankCode == user.bankCode
  ) {
    res
      .status(400)
      .json({ message: "You are currently using this bank account" });
    return;
  }

  const timestamp = Math.round(new Date().getTime()).toString();

  try {
    // 1. Delete existing bank account if exists
    if (user.bankId) {
      const deletePath = `https://idrx.co/api/auth/delete-bank-account/${user.bankId}`;
      const deleteSig = createSignature(
        "DELETE",
        deletePath,
        "",
        timestamp,
        user.secretKey!
      );

      const deleteBank = await axios.delete(deletePath, {
        headers: {
          "Content-Type": "application/json",
          "idrx-api-key": user.apiKey!,
          "idrx-api-sig": deleteSig,
          "idrx-api-ts": timestamp,
        },
      });

      if (!deleteBank) {
        res
          .status(400)
          .json({ message: "Failed to delete previous bank account" });
        return;
      }
    } else {
      res
        .status(404)
        .json({ message: "Previous bank account information not found" });
      return;
    }

    // 2. Add new bank account
    const addPath = "https://idrx.co/api/auth/add-bank-account";
    const form = { bankAccountNumber, bankCode };

    const addSig = createSignature(
      "POST",
      addPath,
      JSON.stringify(form), // cukup JSON.stringify
      timestamp,
      user.secretKey!
    );

    const addRes = await axios.post(addPath, form, {
      headers: {
        "Content-Type": "application/json",
        "idrx-api-key": user.apiKey!,
        "idrx-api-sig": addSig,
        "idrx-api-ts": timestamp,
      },
    });

    const newBankData = addRes.data.data;

    const bank = `${newBankData.bankName}_${newBankData.bankAccountNumber}`;
    const hashBankAccountNumber = sha256(toUtf8Bytes(bank));

    // 3. Update user with new bank info
    const updatedMainBankData = await UserModel.findByIdAndUpdate(
      _id,
      {
        $set: {
          bankId: newBankData.id,
          hashBankAccountNumber,
          bankAccountNumber: newBankData.bankAccountNumber,
          bankAccountName: newBankData.bankAccountName,
          bankCode: newBankData.bankCode,
          bankName: newBankData.bankName,
          depositWalletAddress: newBankData.DepositWalletAddress.walletAddress,
        },
      },
      { new: true }
    );

    if (updatedMainBankData) {
      console.log("Successfully changed bank account");
    } else if (!updatedMainBankData) {
      console.log("Failed to change user's bank account");
    }

    res.status(200).json({
      message: "Bank account changed successfully",
      data: updatedMainBankData,
    });

    return;
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to change bank account", error: err });
  }
}

// controller untuk admin MOVO
export async function getOrganizationMembers(req: Request, res: Response) {
  const path = "https://idrx.co/api/auth/members";
  const bufferReq = Buffer.from("", "base64").toString("utf8");
  const timestamp = Math.round(new Date().getTime()).toString();
  const sig = createSignature("GET", path, bufferReq, timestamp, movoSecretKey);

  try {
    const resData = await axios.get(path, {
      headers: {
        "Content-Type": "multipart/form-data",
        "idrx-api-key": movoApiKey,
        "idrx-api-sig": sig,
        "idrx-api-ts": timestamp,
      },
    });
    res.status(200).json(resData.data);
    console.log("res.data: ");
    console.log(resData.data);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
    return;
  }
}

// buat controller untuk ngasih akses ke FE biar bisa akses status berdasarkan txIdnya
export async function loadTransactionStatusData(
  txHash: string,
  API_KEY: string
) {
  try {
    const response = await axios.get(
      `https://idrx.co/api/transaction/user-transaction-history?transactionType=DEPOSIT_REDEEM&txHash=${txHash}&page=1&take=1`,
      {
        headers: {
          "Content-Type": "application/json",
          "idrx-api-key": API_KEY,
          "idrx-api-sig": "v0-lo3DmbCH8U7B1HyVKW1EJ7m0IMRMwT9w-2_tZdP0",
        },
      }
    );
    if (!response.data) {
      console.log(response.data);
      return response.data;
    } else {
      console.log(response);
      console.log("[API Response]", response.data);
      console.log(response.data.records[0].status);
      return response.data.records[0].status;
    }
  } catch (err: any) {
    console.error("[Failed to call redeem-request]", err);
    // return err.message;
  }
}
