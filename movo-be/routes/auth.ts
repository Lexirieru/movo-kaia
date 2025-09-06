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
        // console.log(token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
          _id: string;
          email: string;
          role: string;
        };

        const user = await UserModel.findOne({
          _id: decoded._id,
          email: decoded.email,
          role: decoded.role,
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

router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    try {
      const user = await UserModel.findOne({ email });
      if (!user) {
        res
          .status(404)
          .json({ message: "Account with specified email is not found" });
        return;
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.hashedPassword
      );

      if (!isPasswordValid) {
        res.status(401).json({ message: "Invalid password" });
        return;
      }

      const token = await generateCookiesToken(email, user);

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

// sebelumnya FE harus bisa memasitkan bahwa user tersebut memang pemilik waleltAddressnya (tidak sekedar ngesend walletaddress ke BE saja)
// dan dari BE harus punya sesuatu yang bisa memastikan bahwa orang itu memang itu (agar tidak bisa di hack dari postman dll)
router.post(
  "/loginWithWallet",
  async (req: Request, res: Response, next: NextFunction) => {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      res.status(400).json({ message: "Wallet address are required" });
      return;
    }

    try {
      const user = await UserModel.findOne({ walletAddress });

      if (!user) {
        res.status(404).json({
          message: "Account with specified wallet address is not found",
        });
        return;
      }

      const token = await generateCookiesToken(user.email, user);

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
  email: string,
  newUser: InstanceType<typeof UserModel>
) {
  const token = generateToken({
    randomSeed: crypto.randomBytes(16).toString("hex"),
    _id: newUser._id.toString(),
    email: newUser.email,
    role: newUser.role,
  });
  console.log("Role : ", newUser.role);

  const tokenSession = new LoginSessionTokenModel({
    userId: newUser._id.toString(),
    email,
    token,
    role: newUser.role,
  });

  await tokenSession.save();

  return token;
}

// LOGOUT
router.post("/logout", (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ message: "Logout gagal" });
      return;
    }

    req.session.destroy(() => {
      res.clearCookie("user_session");

      res.status(200).json({ message: "Logout sukses" });
      return;
    });
  });
});

export default router;
