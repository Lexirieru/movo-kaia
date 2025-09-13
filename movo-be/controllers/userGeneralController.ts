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

// di form pendaftaran, walletAddress harus langsung didaftarin
// di form pendaftaran, walletAddress harus langsung didaftarin
export async function onBoardingUser(req: Request, res: Response) {
  const { email, fullname, password, walletAddress } = req.body;

  if (!email || !fullname || !walletAddress) {
    res
      .status(400)
      .json({ message: "Email, fullname, and walletAddress are required!" });
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

  try {
    // Validasi 1: Cek apakah email sudah digunakan
    const existingUserByEmail = await UserModel.findOne({ email });
    if (existingUserByEmail) {
      res.status(409).json({
        message: "Email address is already registered",
        statusCode: 409,
        error: "EMAIL_EXISTS",
      });
      return;
    }

    // Validasi 2: Cek apakah wallet address sudah digunakan di WalletAddresses array
    const existingUserByWallet = await UserModel.findOne({
      "WalletAddresses.walletAddress": walletAddress,
    });

    if (existingUserByWallet) {
      res.status(409).json({
        message: "Wallet address is already registered to another account",
        statusCode: 409,
        error: "WALLET_EXISTS",
      });
      return;
    }

    // Validasi 3: Format wallet address (optional - untuk Ethereum address)
    const walletAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletAddressRegex.test(walletAddress)) {
      res.status(400).json({
        message: "Invalid wallet address format",
        statusCode: 400,
        error: "INVALID_WALLET_FORMAT",
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

    const resData = await axios.post(path, formData, {
      headers: {
        ...formData.getHeaders(), // Penting: ambil headers dari FormData
        "idrx-api-key": movoApiKey,
        "idrx-api-sig": sig,
        "idrx-api-ts": timestamp,
      },
    });

    const newUser = new UserModel({
      idrxId: resData.data.data.id,
      email,
      hashedPassword,
      fullname,
      idFile: "movo-full.png",
      apiKey: resData.data.data.apiKey,
      secretKey: resData.data.data.apiSecret,
      WalletAddresses: [
        {
          walletAddress,
        },
      ],
    });

    await newUser.save();

    const token = await generateCookiesToken(newUser, walletAddress);

    res.cookie("user_session", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Registration successful",
      statusCode: 200,
    });

    return;
  } catch (err: any) {
    console.log("Full error:", err.response?.data || err.message);

    // Handle MongoDB duplicate key error (jika ada unique index)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      res.status(409).json({
        message: `${field} is already registered`,
        statusCode: 409,
        error: "DUPLICATE_KEY",
      });
      return;
    }

    if (
      err.message?.includes("buffering timed out") ||
      err.message?.includes("timeout")
    ) {
      res.status(408).json({
        message: "Database operation timed out. Please try again.",
        statusCode: 408,
        error: "TIMEOUT",
      });
      return;
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

// kepake diawal pendaftaran aja
export async function addBankAccount(req: Request, res: Response) {
  const { _id, bankAccountNumber, bankCode } = req.body;
  const form = {
    bankAccountNumber,
    bankCode,
  };

  const path = "https://idrx.co/api/auth/add-bank-account";
  const bufferReq = Buffer.from(JSON.stringify(form), "base64").toString(
    "utf8"
  );
  const timestamp = Math.round(new Date().getTime()).toString();

  const user = await UserModel.findOne({ _id });
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

    const updatedUser = await UserModel.findByIdAndUpdate(
      _id,
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

// nambahin wallet Address ke akun orang tersebut di database (bukan primary WalletAddress karena itu dah didaftarin di registrasi)
export async function addWalletAddress(req: Request, res: Response) {
  const { email, password, walletAddress } = req.body;

  if (!email || !password || !walletAddress) {
    res
      .status(400)
      .json({ message: "email, password, and walletAddress are required" });
    return;
  }

  // Find the user
  const user = await UserModel.findOne({ email });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

  if (!isPasswordValid) {
    res.status(401).json({ message: "Invalid password" });
    return;
  }

  try {
    // Validasi format wallet address
    const walletAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletAddressRegex.test(walletAddress)) {
      res.status(400).json({
        message: "Invalid wallet address format",
        statusCode: 400,
        error: "INVALID_WALLET_FORMAT",
      });
      return;
    }

    // Check if wallet address is already used by any user (termasuk user ini sendiri)
    const isWalletAddressUsed = await UserModel.findOne({
      "WalletAddresses.walletAddress": walletAddress,
    });

    if (isWalletAddressUsed) {
      // Cek apakah wallet ini milik user yang sama atau user lain
      if (isWalletAddressUsed.email.toString() === email) {
        res.status(400).json({
          message: "This wallet address is already added to your account",
          statusCode: 400,
          error: "WALLET_ALREADY_OWNED",
        });
      } else {
        res.status(409).json({
          message: "Wallet address is already registered to another account",
          statusCode: 409,
          error: "WALLET_EXISTS",
        });
      }
      return;
    }
    // Add new wallet address to the array
    const userData = await UserModel.findOneAndUpdate(
      { email },
      {
        $push: {
          WalletAddresses: {
            walletAddress,
            availableBalance: 0, // default balance
          },
        },
      },
      { new: true }
    );

    if (!userData) {
      res.status(404).json({ message: "Failed to update user data" });
      return;
    }
    const token = await generateCookiesToken(userData, walletAddress);

    res.cookie("user_session", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Wallet address added successfully",
      statusCode: 200,
      data: {
        _id: userData._id,
        email: userData.email,
        fullname: userData.fullname,
        WalletAddresses: userData.WalletAddresses,
      },
    });
    return;
  } catch (err: any) {
    console.error("Error adding wallet address:", err);
    res.status(500).json({
      message: "Internal server error",
      statusCode: 500,
      error: err.message,
    });
  }
}

export async function updateWalletAddressRole(req: Request, res: Response) {
  // role disini hanya ada "none", "sender", "receiver"
  const { _id, walletAddress, role } = req.body;

  // Validation input
  if (!_id || !walletAddress || !role) {
    res.status(400).json({
      message: "User ID, wallet address, and role are required",
    });
    return;
  }

  // Validate role enum
  if (!["none", "sender", "receiver"].includes(role)) {
    res.status(400).json({
      message: "Role must be one of: none, sender, receiver",
    });
    return;
  }

  try {
    // Check if user exists
    const isUser = await UserModel.findById(_id);
    if (!isUser) {
      res.status(404).json({ message: "User with specified id not found!" });
      return;
    }

    // Check if wallet address exists in user's WalletAddresses array
    const walletExists = isUser.WalletAddresses?.find(
      (wallet) => wallet.walletAddress === walletAddress
    );

    if (!walletExists) {
      res.status(404).json({
        message: "Wallet address not found in user's wallet list",
      });
      return;
    }

    // Update the specific wallet's role using arrayFilters
    const updatedUser = await UserModel.findOneAndUpdate(
      {
        _id,
        "WalletAddresses.walletAddress": walletAddress,
      },
      {
        $set: { "WalletAddresses.$.role": role },
      },
      {
        new: true,
        runValidators: true, // This ensures enum validation runs
      }
    );

    if (!updatedUser) {
      res.status(404).json({
        message: "Failed to update wallet role",
      });
      return;
    }
    res.status(200).json({
      message: "Successfully updated wallet address role",
    });

    return;
  } catch (err: any) {
    console.error("Error updating wallet address role:", err);

    // Handle MongoDB validation errors
    if (err.name === "ValidationError") {
      res.status(400).json({
        message: "Validation error",
        error: err.message,
      });
      return;
    }

    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
    return;
  }
}

// ...existing code...

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
  const { _id } = req.body;
  if (!_id) {
    res.status(404).json("Missing id");
    return;
  }

  const user = await UserModel.findById(_id);
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

  const updatedUser = await UserModel.findByIdAndUpdate(
    _id,
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
