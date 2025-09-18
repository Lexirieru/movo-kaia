import { Request, Response } from "express";
import { GroupOfUserModel, UserModel } from "../models/userModel"; // Pastikan path-nya benar
import { TransactionHistoryModel } from "../models/transactionRecordModel";
import mongoose from "mongoose";
import { group } from "console";
// const apiKey = process.env.IDRX_API_KEY!;
// const secretKey = process.env.IDRX_SECRET_KEY!;

// untuk ngeinisialisasi group baru
export async function addGroup(req: Request, res: Response) {
  // groupId ntar dari FE ngegenerate sendiri pake uuid
  const { _id, email, groupId, nameOfGroup, walletAddress } = req.body;

  if (!_id || !groupId || !nameOfGroup || !walletAddress) {
    res.status(400).json({
      message: "_id, groupId, nameOfGroup, and walletAddress are required",
    });
    return;
  }

  try {
    const existingGroup = await GroupOfUserModel.findOne({
      groupId,
      senderWalletAddress: walletAddress,
      senderId: _id,
    });

    if (existingGroup) {
      res.status(400).json({
        message: "Group with the same ID already exists",
      });
      return;
    }

    const senderData = await UserModel.findById(_id);
    if (!senderData) {
      res.status(404).json({
        message: "Sender with the provided email is not found",
      });
      return;
    }

    const newGroup = new GroupOfUserModel({
      senderId: _id,
      senderWalletAddress: walletAddress,
      senderName: senderData.fullname,
      email,
      groupId,
      nameOfGroup,
    });

    const saved = await newGroup.save();

    res.status(201).json({
      message: "New Groupsuccessfully created",
      data: saved,
    });
    return;
  } catch (err: any) {
    res.status(500).json({
      message: "Error adding new group",
      error: err.message,
    });
    return;
  }
}

export async function saveEscrowToDatabase(req: Request, res: Response) {
  const {
    groupId,
    escrowId,
    originCurrency,
    // wallet Addressnya sender
    walletAddress,
    totalAmount,
    // receivers itu array of object yang isinya address, fullname, amount
    // receivers,
    transactionHash,
    status,
    createdAt,
  } = req.body;

  try {
    // Update group dengan escrow information
    const updatedGroup = await GroupOfUserModel.findOneAndUpdate(
      { groupId },
      {
        $set: {
          escrowId,
          originCurrency,
          totalAmount,
          transactionHash,
          status,
          // Update receivers dengan bank account info jika ada
          // Receivers: receivers.map((receiver: any) => ({
          //   ...receiver,
          //   // Keep existing bank account info if available
          //   bankId: receiver.bankId,
          //   bankName: receiver.bankName,
          //   bankCode: receiver.bankCode,
          //   bankAccountNumber: receiver.bankAccountNumber,
          //   bankAccountName: receiver.bankAccountName,
          // })),
        },
      },
      { new: true }
    );

    if (!updatedGroup) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    res.status(201).json({
      message: "Escrow saved successfully",
      data: updatedGroup,
    });
  } catch (err: any) {
    res.status(500).json({
      message: "Error saving escrow to database",
      error: err.message,
    });
  }
}

// Controller untuk mengecek apakah wallet addresses sudah terdaftar di Movo
export async function checkWalletAddressesRegistration(
  req: Request,
  res: Response
) {
  const { walletAddresses } = req.body;

  // Validasi input
  if (!walletAddresses || !Array.isArray(walletAddresses)) {
    res.status(400).json({
      message: "walletAddresses array is required",
      statusCode: 400,
    });
    return;
  }

  if (walletAddresses.length === 0) {
    res.status(400).json({
      message: "walletAddresses array cannot be empty",
      statusCode: 400,
    });
    return;
  }

  // Validasi format wallet address
  const invalidFormatAddresses = walletAddresses.filter((addr: string) => {
    if (typeof addr !== "string") return true;
    const cleanAddr = addr.trim().toLowerCase();
    return !cleanAddr.startsWith("0x") || cleanAddr.length !== 42;
  });

  if (invalidFormatAddresses.length > 0) {
    res.status(400).json({
      message: "Invalid wallet address format detected",
      statusCode: 400,
      data: {
        invalidAddresses: invalidFormatAddresses,
        note: "Wallet addresses must start with 0x and be 42 characters long",
      },
    });
    return;
  }

  try {
    // Normalize wallet addresses (lowercase untuk case-insensitive comparison)
    const normalizedAddresses = walletAddresses.map((addr: string) =>
      addr.trim().toLowerCase()
    );

    // Remove duplicates
    const uniqueAddresses = [...new Set(normalizedAddresses)];

    console.log("🔍 Checking wallet addresses:", uniqueAddresses);

    // Query database untuk cari users dengan wallet addresses yang diminta
    const registeredUsers = await UserModel.find(
      {
        "WalletAddresses.walletAddress": {
          $in: uniqueAddresses.map((addr) => new RegExp(`^${addr}$`, "i")), // Case-insensitive regex
        },
      },
      {
        "WalletAddresses.$": 1, // Hanya ambil matching wallet address
        fullname: 1,
        email: 1,
        _id: 1,
      }
    ).lean();

    // Extract registered wallet addresses dari hasil query
    const registeredAddresses = new Set();
    const registeredAddressDetails: Array<{
      walletAddress: string;
      userId: string;
      fullname: string;
      email: string;
      role: string;
    }> = [];

    registeredUsers.forEach((user) => {
      user.WalletAddresses?.forEach((wallet: any) => {
        const normalizedWalletAddr = wallet.walletAddress.toLowerCase();
        if (uniqueAddresses.includes(normalizedWalletAddr)) {
          registeredAddresses.add(normalizedWalletAddr);
          registeredAddressDetails.push({
            walletAddress: wallet.walletAddress, // Original case
            userId: user._id.toString(),
            fullname: user.fullname,
            email: user.email,
            role: wallet.role || "none",
          });
        }
      });
    });

    // Cari wallet addresses yang belum terdaftar
    const unregisteredAddresses = uniqueAddresses.filter(
      (addr) => !registeredAddresses.has(addr)
    );

    // Prepare response
    const totalChecked = uniqueAddresses.length;
    const totalRegistered = registeredAddressDetails.length;
    const totalUnregistered = unregisteredAddresses.length;
    const isAllRegistered = totalUnregistered === 0;

    console.log("📊 Registration check results:", {
      totalChecked,
      totalRegistered,
      totalUnregistered,
      isAllRegistered,
    });

    res.status(200).json({
      message: isAllRegistered
        ? "All wallet addresses are registered in Movo"
        : `${totalUnregistered} wallet address(es) are not registered in Movo`,
      statusCode: 200,
      data: {
        summary: {
          totalChecked,
          totalRegistered,
          totalUnregistered,
          isAllRegistered,
        },
        registeredAddresses: registeredAddressDetails,
        unregisteredAddresses: unregisteredAddresses.map((addr) => ({
          walletAddress: addr,
          status: "Not registered in Movo",
          note: "This address needs to register first before receiving escrow payments",
        })),
        // Untuk debugging - addresses yang dicek
        checkedAddresses: uniqueAddresses,
      },
      // Flag untuk easy checking di frontend
      canProceedWithEscrow: isAllRegistered,
    });

    return;
  } catch (err: any) {
    console.error("❌ Error checking wallet addresses registration:", err);
    res.status(500).json({
      message: "Error checking wallet addresses registration",
      statusCode: 500,
      error: err.message,
    });
    return;
  }
}

// // Helper function untuk validate single wallet address format
// function isValidWalletAddress(address: string): boolean {
//   if (typeof address !== "string") return false;
//   const cleanAddr = address.trim();
//   return cleanAddr.startsWith("0x") && cleanAddr.length === 42;
// }

// // Helper function untuk get user details by wallet address
// async function getUserByWalletAddress(walletAddress: string) {
//   try {
//     const user = await UserModel.findOne({
//       "WalletAddresses.walletAddress": new RegExp(`^${walletAddress}$`, "i"),
//     }).lean();

//     if (!user) return null;

//     // Find the specific wallet address data
//     const walletData = user.WalletAddresses?.find(
//       (wallet: any) =>
//         wallet.walletAddress.toLowerCase() === walletAddress.toLowerCase()
//     );

//     return {
//       userId: user._id.toString(),
//       fullname: user.fullname,
//       email: user.email,
//       walletAddress: walletData?.walletAddress || walletAddress,
//       role: walletData?.role || "none",
//       availableBalance: walletData?.availableBalance || 0,
//     };
//   } catch (error) {
//     console.error("Error getting user by wallet address:", error);
//     return null;
//   }
// }

export async function editReceiverAmountInGroup(req: Request, res: Response) {
  const { senderId, groupId, receiverId, amount } = req.body;
  if (!senderId || !receiverId || !groupId || amount === undefined) {
    res.status(400).json({
      message: "All data specified are required",
    });
    return;
  }

  try {
    const groupData = await GroupOfUserModel.findOne({ groupId });
    if (!groupData) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    if (groupData.senderId.toString() !== senderId) {
      res
        .status(403)
        .json({ message: "You are not authorized to modify this group" });
      return;
    }

    // pakai $set supaya nilai amount diganti, bukan ditambah
    const updatedGroup = await GroupOfUserModel.findOneAndUpdate(
      {
        groupId,
        "Receivers._id": receiverId,
      },
      { $set: { "Receivers.$.amount": amount } },
      { new: true }
    );

    if (!updatedGroup) {
      res.status(404).json({ message: "Receiver not found in group" });
      return;
    }

    res.status(200).json({
      message: "Receiver amount updated successfully",
      data: updatedGroup,
    });
    return;
  } catch (err: any) {
    res.status(500).json({
      message: "Error updating receiver amount",
      error: err.message,
    });
    return;
  }
}

// untuk ngeremove receiver dari group
export async function removeReceiverDataFromGroup(req: Request, res: Response) {
  const { receiverId, groupId, senderId } = req.body;

  if (!groupId || !receiverId || !senderId) {
    res.status(400).json({
      message: "groupId, receiverAddress, and sender _id are required",
    });
    return;
  }

  try {
    const groupData = await GroupOfUserModel.findOneAndUpdate(
      { groupId, senderId },
      {
        $pull: { Receivers: { _id: new mongoose.Types.ObjectId(receiverId) } },
      },
      { new: true }
    );

    if (!groupData) {
      res.status(404).json({
        message: "Group or receiver not found",
      });
      return;
    }

    res.status(200).json({
      message: "Receiver successfully removed from group",
      data: groupData, // kembalikan data biar frontend bisa refresh
    });
    return;
  } catch (err: any) {
    res.status(500).json({
      message: "Error removing receiver from group",
      error: err.message,
    });
    return;
  }
}

export async function getEscrowId(req: Request, res: Response) {
  const { _id, groupId } = req.body;
  if (!_id || !groupId) {
    res.status(404).json({ message: "id and groupId are required" });
    return;
  }
  try {
    const loadAllGroup = await GroupOfUserModel.findOne({
      _id,
      groupId,
    });

    console.log(loadAllGroup);

    res.status(201).json({
      message: "Group successfully fetched",
      data: loadAllGroup?.escrowId,
    });

    return;
  } catch (err: any) {
    res.status(500).json({
      message: "Error fetching/sending all fetched group",
      error: err.message,
    });
    return;
  }
}

// untuk nampilin semua group yang dia gaji
export async function loadAllGroup(req: Request, res: Response) {
  const { _id, walletAddress } = req.body;

  if (!_id || !walletAddress) {
    res.status(404).json({ message: "id and walletAddress are required" });
    return;
  }
  try {
    const loadAllGroup = await GroupOfUserModel.find({
      senderId: _id,
      senderWalletAddress: walletAddress,
    })
      .sort({ timestamp: -1 }) // descending (terbaru di atas)
      .lean(); // supaya hasilnya plain JS object dan lebih cepat

    res.status(201).json({
      message: "Group successfully fetched",
      data: loadAllGroup,
    });
    return;
  } catch (err: any) {
    res.status(500).json({
      message: "Error fetching/sending all fetched group",
      error: err.message,
    });
    return;
  }
}
// untuk nampilin satu specified group yang dia gaji
export async function loadSpecifiedGroup(req: Request, res: Response) {
  const { _id, groupId } = req.body;
  if (!_id || !groupId) {
    res.status(404).json({ message: "id and groupId are required" });
    return;
  }
  try {
    const loadSpecifiedGroup = await GroupOfUserModel.findOne({
      senderId: _id,
      groupId,
    });

    res.status(201).json({
      message: "Specified group successfully fetched",
      data: loadSpecifiedGroup,
    });
    return;
  } catch (err: any) {
    res.status(500).json({
      message: "Error sending specified group",
      error: err.message,
    });
    return;
  }
}
// untuk ngehapus satu group spesifik
export async function deleteGroup(req: Request, res: Response) {
  const { _id, groupId } = req.body;

  if (!groupId || !_id) {
    res.status(400).json({
      message: "groupId and sender _id are required",
    });
    return;
  }

  try {
    const deletedGroup = await GroupOfUserModel.findOneAndDelete({
      groupId,
      senderId: _id,
    });
    if (!deletedGroup) {
      res.status(404).json({
        message: "Group not found",
      });
      return;
    }

    res.status(200).json({
      message: "Group successfully deleted",
      group: deletedGroup,
    });
    return;
  } catch (err: any) {
    res.status(500).json({
      message: "Error deleting group",
      error: err.message,
    });
    return;
  }
}
// history tentang kapan dia ngebayar semua receivernya, berapa totalnya
export async function loadAllGroupTransactionHistory(
  req: Request,
  res: Response
) {
  const { _id, walletAddress } = req.body;
  if (!_id || !walletAddress) {
    res.status(404).json({ message: "id and walletAddress are required" });
    return;
  }
  try {
    const histories = await TransactionHistoryModel.find({
      senderId: _id,
      senderWalletAddress: walletAddress,
    })
      .sort({ timestamp: -1 })
      .lean();
    res.status(201).json({
      data: histories,
      message: "Transaction history successfully sended",
    });
    return;
  } catch (err: any) {
    res.status(500).json({
      message: "Error sending transaction history",
      error: err.message,
    });
    return;
  }
}

// siapa namanya, berapa total yang dia terima
export async function loadSpecifiedGroupTransactionHistory(
  req: Request,
  res: Response
) {
  const { _id, groupId, txId } = req.body;

  try {
    // dapetin detail transaksi history ke masing masing receivernya pada satu transaksi group tertentu
    const detailPaymentHistory = await TransactionHistoryModel.findOne({
      senderId: _id,
      groupId,
      txId,
    });
    if (!detailPaymentHistory) {
      res.status(404).json({
        message: "Transaction history not found",
      });
      return;
    }
    res.status(201).json({
      message: "Transaction history successfully sended",
      data: detailPaymentHistory.Receivers,
    });
    return;
  } catch (err: any) {
    res.status(500).json({
      message: "Error sending transaction history",
      error: err.message,
    });
    return;
  }
}
