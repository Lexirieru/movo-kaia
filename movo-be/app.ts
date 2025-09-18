import dotenv from "dotenv";
dotenv.config();
import path from "path";

import { connectDB } from "./config/atlas";
import express from "express";
import methodOverride from "method-override";
import cors from "cors";
import loggedInRoutes from "./routes/loggedIn";
import { escrowEventRoutes } from "./routes/escrowEvents";
import { tokenWithdrawToFiatRoutes } from "./routes/tokenWithdrawToFiat";

import session from "express-session";
import passport from "passport";
import authRoutes from "./routes/auth";
import pricefeedRoutes from "./routes/pricefeed";
import cookieParser from "cookie-parser";
// import { receiverListener } from "./services/receiverSmartContractListener";
// import { senderListener } from "./services/senderSmartContractListener";

// import { checkSession } from "./config/checkSession";

const app = express();
connectDB();

const whitelist = [
  process.env.FRONTEND_URL || "",
  process.env.FARCASTER_URL || "",
  "http://localhost:3000", // Tambah localhost untuk development
  "http://127.0.0.1:3000",
];

const corsOptions = {
  origin: (origin: any, callback: any) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (whitelist.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.log("❌ CORS blocked for origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Set-Cookie"],
};
// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded());
app.use(methodOverride("_method")); //  buat munculin UPDATE dan DELETE
app.use("/public", express.static(path.join(__dirname, "../public")));

const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    secret: process.env.SESSION_SECRET || "somesecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: false,
      sameSite: isProduction ? "none" : "lax", // Use lax for development
      secure: isProduction, // Only secure in production
      maxAge: 24 * 60 * 60 * 1000 * 30, // 30 days
      domain: isProduction ? undefined : "localhost", // Explicit domain for development
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/", authRoutes);
app.use("/", pricefeedRoutes);
app.use("/", loggedInRoutes);
app.use("/escrow-events", escrowEventRoutes);
app.use("/tokenWithdrawToFiat", tokenWithdrawToFiatRoutes);

//handle semua endpoint yang gaada untuk menampilkan 404 not found page
app.get("*", (req, res) => {
  res.status(404).json({ message: "Not Found" }); // ubah ke res.render('404') jika pakai view engine
});

const PORT = process.env.PORT || 3300;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${process.env.PORT || PORT} in ${
      process.env.NODE_ENV || "development"
    } mode.`
  );
});

// receiverListener();
// senderListener();

export default app;
