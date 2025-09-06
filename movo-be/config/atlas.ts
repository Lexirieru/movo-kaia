import env from "dotenv";
env.config();
import mongoose from "mongoose";

let isConnecting = false;

export const connectDB = async () => {
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    return;
  }

  try {
    isConnecting = true;

    await mongoose.connect(process.env.MONGODB_URI!, {
      // Connection timeouts
      serverSelectionTimeoutMS: 10000, // 10s (lebih lama)
      socketTimeoutMS: 60000, // 60s (lebih lama)
      connectTimeoutMS: 15000, // 15s (lebih lama)

      // Connection pooling
      maxPoolSize: 15, // Lebih besar untuk serverless
      minPoolSize: 2, // Lebih kecil
      maxIdleTimeMS: 60000, // 60s (lebih lama)

      // Heartbeat and monitoring
      heartbeatFrequencyMS: 10000, // Check every 10s

      // Auto-reconnection
      retryWrites: true,
      retryReads: true,
    });

    console.log("MongoDB Connected Successfully");

    // Disable command buffering untuk avoid timeout
    mongoose.set("bufferCommands", false);

    isConnecting = false;
  } catch (error) {
    isConnecting = false;
    console.error("MongoDB connection error:", error);

    // Auto-retry connection after 5 seconds
    console.log("Retrying MongoDB connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

// Auto-reconnect pada disconnect
mongoose.connection.on("disconnected", async () => {
  console.log("MongoDB disconnected. Attempting to reconnect...");

  // Wait a bit before reconnecting
  setTimeout(async () => {
    if (mongoose.connection.readyState === 0) {
      // Only if truly disconnected
      await connectDB();
    }
  }, 3000);
});

mongoose.connection.on("error", async (err) => {
  console.error("MongoDB error:", err);

  // Auto-reconnect on error
  if (err.name === "MongoNetworkError" || err.name === "MongoTimeoutError") {
    console.log("Network error detected, reconnecting...");
    setTimeout(connectDB, 2000);
  }
});

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected successfully");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});

// Connection health check function
export const checkConnection = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log("MongoDB not connected, attempting to connect...");
      await connectDB();
    }
    return mongoose.connection.readyState === 1;
  } catch (error) {
    console.error("Connection check failed:", error);
    return false;
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed through app termination");
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
});
