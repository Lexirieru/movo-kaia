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
    console.log("🔍 Check-auth called");
    console.log("🍪 Cookies received:", req.cookies);

    const token = req.cookies?.user_session;
    if (!token) {
      console.log("❌ Token not found in cookies");
      res
        .status(401)
        .json({ authenticated: false, message: "Token not found" });
      return;
    } else {
      console.log("✅ Token found:", token.substring(0, 20) + "...");
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
          _id: string;
          role: string;
          walletAddress: string;
        };

        console.log("🔓 Token decoded:", decoded);

        const user = await UserModel.findOne({
          _id: decoded._id,
          "WalletAddresses.walletAddress": decoded.walletAddress,
          "WalletAddresses.role": decoded.role,
        });

        if (!user) {
          console.log("❌ User not found for token");
          res
            .status(401)
            .json({ authenticated: false, message: "Invalid token" });
          return;
        } else {
          console.log("✅ User authenticated:", user._id);
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
        console.error("❌ Error while verifying token:", err);
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
    console.log("🔐 LoginWithWallet endpoint called");
    console.log("📝 Request body:", req.body);

    const { walletAddress, _id } = req.body;

    if (!walletAddress) {
      console.log("❌ Wallet address is missing");
      res.status(400).json({ message: "Wallet address is required" });
      return;
    }

    console.log("✅ Wallet address provided:", walletAddress);
    console.log("🔧 Input wallet type:", typeof walletAddress);
    console.log("🔧 Input wallet length:", walletAddress.length);

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
        console.log(
          "🔍 Searching for user with wallet address:",
          walletAddress
        );

        user = await UserModel.findOne({
          "WalletAddresses.walletAddress": new RegExp(
            `^${walletAddress}$`,
            "i"
          ),
        });

        console.log("👤 Found user:", user ? user._id : "null");

        if (!user) {
          console.log("❌ User not found, trying alternative query");

          // Try alternative query without regex
          user = await UserModel.findOne({
            "WalletAddresses.walletAddress": walletAddress,
          });

          console.log("👤 Alternative query result:", user ? user._id : "null");

          if (!user) {
            console.log("❌ User definitely not found");

            // Debug disabled for production

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
      }

      const token = await generateCookiesToken(user, walletAddress);

      console.log(
        "🍪 Setting cookie for user:",
        user._id,
        "wallet:",
        walletAddress
      );

      // Set cookie dengan berbagai konfigurasi untuk development dan production
      const isProduction = process.env.NODE_ENV === "production";

      res.cookie("user_session", token, {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax", // Development gunakan lax
        secure: isProduction, // Hanya secure di production
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        domain: isProduction ? undefined : "localhost", // Explicit domain untuk development
        path: "/",
      });

      console.log("✅ Cookie set successfully");

      res.status(200).json({
        statusCode: 200,
        message: "Login successful",
        debug: {
          userId: user._id,
          walletAddress,
          tokenSet: true,
        },
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
  console.log("🔧 generateCookiesToken called for user:", newUser._id);
  console.log("🔧 Looking for wallet address:", walletAddress);
  console.log("🔧 User wallet addresses:");
  newUser.WalletAddresses?.forEach((wallet, index) => {
    console.log(`  ${index}: ${wallet.walletAddress} (${wallet.role})`);
    if (wallet.walletAddress) {
      console.log(
        `     Match check: ${wallet.walletAddress} == ${walletAddress} => ${
          wallet.walletAddress == walletAddress
        }`
      );
      console.log(
        `     Case-insensitive check: ${
          wallet.walletAddress.toLowerCase() == walletAddress.toLowerCase()
        }`
      );
    }
  });

  // nge return wallet yang merupakan object dari WalletAddresses kalok ketemu
  let walletData = newUser.WalletAddresses.find(
    (wallet) => wallet.walletAddress == walletAddress
  );

  // If not found with exact match, try case-insensitive
  if (!walletData) {
    console.log("🔧 Exact match failed, trying case-insensitive match");
    walletData = newUser.WalletAddresses.find(
      (wallet) =>
        wallet.walletAddress &&
        wallet.walletAddress.toLowerCase() == walletAddress.toLowerCase()
    );
  }

  if (!walletData) {
    console.log("❌ No wallet data found for address:", walletAddress);
    throw new Error("No registered wallet address found in this account");
  }

  console.log("✅ Found wallet data:", walletData);

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
