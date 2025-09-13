import express, { NextFunction, Request, Response, Router } from "express";
import { generateToken } from "../config/generateToken";
import jwt from "jsonwebtoken";
import { LoginSessionTokenModel, UserModel } from "../models/userModel";
import bcrypt from "bcrypt";
import crypto from "crypto";
const router: Router = express.Router();

router.get(
  "/check-auth",
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.user_session;
    if (!token) {
      console.log("Token not found");
      res
        .status(401)
        .json({ authenticated: false, message: "Token not found" });
      return;
    } else {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
          _id: string;
          role: string;
          walletAddress: string;
        };

        const user = await UserModel.findOne({
          _id: decoded._id,
          "WalletAddresses.walletAddress": decoded.walletAddress,
          "WalletAddresses.role": decoded.role,
        });

        if (!user) {
          console.log("Invalid token");
          res
            .status(401)
            .json({ authenticated: false, message: "Invalid token" });
          return;
        } else {
          res.json({
            user,
            currentWalletAddress: decoded.walletAddress,
            currentRole: decoded.role,
            message: "Successfully authenticated",
            authenticated: true,
          });
          return;
        }
      } catch (err) {
        console.error("Error while verifying token:", err);
        res.status(401).json({ authenticated: false, message: "Token error" });
        return;
      }
    }
  }
);

// router.post(
//   "/login",
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       res.status(400).json({ message: "Email and password are required" });
//       return;
//     }

//     try {
//       const user = await UserModel.findOne({ email });
//       if (!user) {
//         res
//           .status(404)
//           .json({ message: "Account with specified email is not found" });
//         return;
//       }

//       const isPasswordValid = await bcrypt.compare(
//         password,
//         user.hashedPassword
//       );

//       if (!isPasswordValid) {
//         res.status(401).json({ message: "Invalid password" });
//         return;
//       }

//       const token = await generateCookiesToken(email, user);

//       res.cookie("user_session", token, {
//         httpOnly: true,
//         sameSite: "none",
//         secure: true,
//         maxAge: 30 * 24 * 60 * 60 * 1000,
//       });

//       res.status(200).json({
//         statusCode: 200,
//         message: "Login successful",
//       });

//       return;
//     } catch (err) {
//       console.error("Error while logging in:", err);
//       res.status(500).json({ message: "Internal server error" });
//       return;
//     }
//   }
// );

// sebelumnya FE harus bisa memasitkan bahwa user tersebut memang pemilik waleltAddressnya (tidak sekedar ngesend walletaddress ke BE saja)
// dan dari BE harus punya sesuatu yang bisa memastikan bahwa orang itu memang itu (agar tidak bisa di hack dari postman dll)
// ...existing code...

router.post(
  "/loginWithWallet",
  async (req: Request, res: Response, next: NextFunction) => {
    const { walletAddress, _id } = req.body;

    if (!walletAddress) {
      res.status(400).json({ message: "Wallet address is required" });
      return;
    }

    try {
      // Jika ada _id, cari user berdasarkan _id (untuk pairing scenario)
      let user;
      if (_id) {
        user = await UserModel.findById(_id);
        if (!user) {
          res.status(404).json({
            message: "User not found",
            requiresPairing: false,
          });
          return;
        }

        // Check if wallet exists in user's wallets
        const walletExists = user.WalletAddresses?.find(
          (wallet) => wallet.walletAddress == walletAddress
        );

        if (!walletExists) {
          // Wallet not found in user's account - requires pairing
          res.status(409).json({
            message: "Wallet not linked to this account",
            requiresPairing: true,
            userId: _id,
            walletAddress: walletAddress,
          });
          return;
        }
      } else {
        // Normal login flow - find user by wallet address
        user = await UserModel.findOne({
          "WalletAddresses.walletAddress": new RegExp(
            `^${walletAddress}$`,
            "i"
          ),
        });

        if (!user) {
          res.status(200).json({
            message:
              "Account with specified wallet address is not found. Please register first.",
            requiresPairing: false,
            redirect: `/sync-wallet`, // Tambah redirect URL
            statusCode: 404,
          });
          return;
        }
      }

      const token = await generateCookiesToken(user, walletAddress);

      res.cookie("user_session", token, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        statusCode: 200,
        message: "Login successful",
      });
      return;
    } catch (err) {
      console.error("Error while logging in:", err);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
);

export async function generateCookiesToken(
  newUser: InstanceType<typeof UserModel>,
  walletAddress: string
) {
  // nge return wallet yang merupakan object dari WalletAddresses kalok ketemu
  const walletData = newUser.WalletAddresses.find(
    (wallet) => wallet.walletAddress == walletAddress
  );

  if (!walletData) {
    throw new Error("No registered wallet address found in this account");
  }

  const token = generateToken({
    randomSeed: crypto.randomBytes(16).toString("hex"),
    _id: newUser._id.toString(),
    role: walletData.role, // Menggunakan role dari wallet yang sesuai
    walletAddress: walletData.walletAddress, // Optional: tambahkan wallet address ke token
  });

  const tokenSession = new LoginSessionTokenModel({
    userId: newUser._id.toString(),
    token,
    email: newUser.email,
    walletAddress: walletData.walletAddress,
    role: walletData.role, // Gunakan role dari wallet
  });

  await tokenSession.save();

  return token;
}

// LOGOUT
router.post("/logout", (req: Request, res: Response) => {
  req.logout(async (err) => {
    if (err) {
      res.status(500).json({ message: "Logout gagal" });
      return;
    }
    const token = req.cookies?.user_session;
    // Hapus token dari database
    const deleted = await LoginSessionTokenModel.deleteMany({ token });

    req.session.destroy(() => {
      res.clearCookie("user_session");
      res.status(200).json({ message: "Logout sukses" });
      return;
    });
  });
});

export default router;
