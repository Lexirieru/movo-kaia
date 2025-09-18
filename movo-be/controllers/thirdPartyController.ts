import { Request, Response } from "express";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { resolveTokenToIdrx } from "./pricefeedController";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ChatbotDataModel } from "../models/chatbotModel";
import chatbotFAQ from "../chatbot.json";
dotenv.config();

const supportedFromCurrencies = ["ETH", "USDC", "USDT", "DAI", "LINK", "BNB"];
const supportedToCurrencies = ["IDRX", "IDR"];

const ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL_ETH_MAINNET!;

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  apiKey: process.env.GEMINI_API_KEY,
  maxOutputTokens: 2048,
});

interface ChatItem {
  companyId?: string | null;
  question: string;
  response: string;
}

// export const goldskyEscrowCreatedWebhook = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const {
//       escrowId,
//       block_number,
//       sender,
//       id,
//       receivers,
//       timestamp_,
//       transactionHash_,
//       totalAmount,
//       createdAt,
//     } = req.body;

//     if (
//       !escrowId ||
//       !block_number ||
//       !sender ||
//       !id ||
//       !receivers ||
//       !totalAmount
//     ) {
//       res.status(400).send("Bad Request: Incomplete payload");
//       return;
//     }

//     const receivedSecret = req.headers["goldsky-webhook-secret"];
//     const expectedSecret = process.env.GOLDSKY_WEBHOOK_SECRET;
//     if (receivedSecret !== expectedSecret) {
//       res.status(403).send("Forbidden: Invalid Secret");
//       return;
//     }

//     console.log("✅ Webhook verified");

//     // Transaction hash dari payload atau fallback ke id
//     const transactionHash = transactionHash_ || id.split("-")[0];

//     // Pecah string receivers (jika ada multiple addresses)
//     const receiversArray = receivers.split(",");

//     // Cari user detail dari UserModel untuk setiap receiver
//     const mappedReceivers = await Promise.all(
//       receiversArray.map(async (addr: string) => {
//         const walletAddress = addr.trim();
//         const user = await UserModel.findOne({
//           "WalletAddresses.walletAddress": walletAddress,
//         });

//         if (!user) {
//           console.warn(
//             `⚠️ User not found for wallet address: ${walletAddress}`
//           );
//           return {
//             _id: null,
//             walletAddress: walletAddress,
//             fullname: "Unknown User",
//             apiKey: "",
//             secretKey: "",
//             depositWalletAddress: "",
//             bankId: "",
//             bankName: "",
//             bankAccountName: "",
//             bankAccountNumber: "",
//             originCurrency: "USDC",
//             tokenIcon: "USDC",
//             amount: 0, // akan diisi nanti dari pembagian totalAmount
//           };
//         }
//         return {
//           _id: user._id,
//           walletAddress: walletAddress,
//           fullname: user.fullname || "Unknown User",
//           apiKey: user.apiKey || "",
//           secretKey: user.secretKey || "",
//           depositWalletAddress: user.depositWalletAddress || "",
//           originCurrency: "USDC",
//           tokenIcon: "USDC",
//           amount: 0, // akan diisi nanti dari pembagian totalAmount
//         };
//       })
//     );

//     // Cari informasi sender
//     const senderUser = await UserModel.findOne({
//       "WalletAddresses.walletAddress": sender,
//     });

//     // Cari group untuk mendapatkan informasi tambahan
//     const existingGroup = await GroupOfUserModel.findOne({
//       senderWalletAddress: sender,
//     });

//     // Convert totalAmount dari wei/smallest unit ke decimal (assuming 6 decimals for USDC)
//     const totalAmountInDecimal = (parseInt(totalAmount) / 1000000).toString();

//     // Bagi rata amount untuk setiap receiver (bisa disesuaikan logic pembagiannya)
//     const amountPerReceiver =
//       parseFloat(totalAmountInDecimal) / receiversArray.length;

//     // Update mappedReceivers dengan amount yang tepat
//     const receiversWithAmount = mappedReceivers.map((receiver) => ({
//       ...receiver,
//       amount: amountPerReceiver.toString(),
//     }));

//     // Generate unique transaction ID
//     const txId = `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

//     // Create TransactionHistory record
//     const transactionHistoryData = {
//       txId: txId,
//       txHash: transactionHash,
//       senderWalletAddress: sender,
//       senderId: senderUser?._id?.toString() || "unknown",
//       senderName: senderUser?.fullname || "Unknown Sender",
//       receiverName:
//         receiversWithAmount.length > 1
//           ? `Multiple Recipients (${receiversWithAmount.length})`
//           : receiversWithAmount[0]?.fullname || "Unknown Receiver",
//       groupId: existingGroup?._id?.toString() || "unknown",
//       nameOfGroup: existingGroup?.nameOfGroup || "Unknown Group",
//       originCurrency: "USDC",
//       totalAmount: totalAmountInDecimal,
//       Receivers: receiversWithAmount.map((receiver) => ({
//         walletAddress: receiver.walletAddress,
//         fullname: receiver.fullname,
//         amount: receiver.amount,
//         createdAt: new Date(parseInt(createdAt) * 1000), // Convert timestamp to Date
//       })),
//       totalReceiver: receiversArray.length,
//       blockNumber: block_number,
//       timestamp: timestamp_ || createdAt,
//     };

//     // Save TransactionHistory to database
//     const transactionHistory = new TransactionHistoryModel(
//       transactionHistoryData
//     );
//     const savedTransactionHistory = await transactionHistory.save();

//     console.log("💾 TransactionHistory saved:", savedTransactionHistory._id);

//     // Create IncomingTransaction records untuk setiap receiver
//     const incomingTransactions = await Promise.all(
//       receiversWithAmount.map(async (receiver) => {
//         const incomingTransactionData = {
//           receiverWalletAddress: receiver.walletAddress,
//           receiverId: receiver._id?.toString() || "unknown",
//           availableAmount: receiver.amount, // Initially available amount = total amount
//           originCurrency: "USDC",
//           senderWalletAddress: sender,
//           senderName: senderUser?.fullname || "Unknown Sender",
//           createdAt: new Date(parseInt(createdAt) * 1000).toISOString(),
//           escrowId: escrowId,
//         };

//         const incomingTransaction = new IncomingTransactionModel(
//           incomingTransactionData
//         );

//         return await incomingTransaction.save();
//       })
//     );

//     console.log(
//       "💰 IncomingTransactions created:",
//       incomingTransactions.length
//     );

//     // Update group dengan informasi escrow
//     const updatedGroup = await GroupOfUserModel.findOneAndUpdate(
//       { senderWalletAddress: sender },
//       {
//         $set: {
//           escrowId,
//           blockNumber: block_number,
//           transactionHash,
//           status: "ESCROW_CREATED",
//           totalAmount: totalAmountInDecimal,
//         },
//         $push: { Receivers: { $each: receiversWithAmount } },
//       },
//       { new: true, upsert: true } // Create if doesn't exist
//     );

//     console.log("📦 Group updated:", updatedGroup._id);

//     // Create EscrowEvent record untuk audit trail
//     try {
//       const escrowEventData = createEscrowCreatedEvent({
//         escrowId,
//         groupId: updatedGroup._id.toString(),
//         transactionHash,
//         blockNumber: block_number,
//         initiatorWalletAddress: sender,
//         tokenType: "USDC",
//         totalAmount: totalAmountInDecimal,
//         recipients: receiversWithAmount.map((receiver) => ({
//           walletAddress: receiver.walletAddress,
//           amount: receiver.amount,
//           fullname: receiver.fullname,
//         })),
//         metadata: {
//           blockNumber: block_number,
//           networkId: "1", // Ethereum mainnet
//           contractAddress: "escrow_contract_address", // Update with actual contract address
//         },
//         blockTimestamp: timestamp_ || createdAt,
//       });

//       const escrowEvent = new EscrowEventModel({
//         ...escrowEventData,
//         initiatorId: senderUser?._id?.toString() || "unknown",
//         initiatorName: senderUser?.fullname || "Unknown Sender",
//         status: "CONFIRMED",
//         blockTimestamp: new Date(parseInt(timestamp_ || createdAt) * 1000),
//       });

//       const savedEscrowEvent = await escrowEvent.save();
//       console.log("📝 EscrowEvent saved:", savedEscrowEvent._id);
//     } catch (eventError) {
//       console.error("⚠️ Error saving escrow event:", eventError);
//       // Don't fail the main webhook if event saving fails
//     }

//     res.status(200).json({
//       message: "EscrowCreated event processed successfully",
//       data: {
//         transactionHistory: {
//           _id: savedTransactionHistory._id,
//           txId: savedTransactionHistory.txId,
//           totalAmount: savedTransactionHistory.totalAmount,
//           totalReceivers: savedTransactionHistory.totalReceiver,
//         },
//         incomingTransactions: incomingTransactions.length,
//         group: {
//           _id: updatedGroup._id,
//           escrowId: updatedGroup.escrowId,
//           status: updatedGroup.status,
//         },
//         receivers: receiversWithAmount.length,
//       },
//     });
//     return;
//   } catch (err) {
//     console.error("❌ Error handling EscrowCreated webhook:", err);
//     res.status(500).send("Internal Server Error");
//     return;
//   }
// };

// export const goldskyEscrowReceiverAddedWebhook = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { escrowId, blockNumber, transactionHash, sender, id, receivers } =
//       req.body;

//     if (
//       !escrowId ||
//       !blockNumber ||
//       !transactionHash ||
//       !sender ||
//       !id ||
//       !receivers
//     ) {
//       res.status(400).send("Bad Request: Incomplete payload");
//       return;
//     }

//     const receivedSecret = req.headers["goldsky-webhook-secret"];
//     const expectedSecret = process.env.GOLDSKY_WEBHOOK_SECRET;

//     if (receivedSecret !== expectedSecret) {
//       console.error("Invalid secret header!");
//       res.status(403).send("Forbidden: Invalid Secret");
//       return;
//     }

//     console.log("✅ Webhook verified");

//     // Check if group exists
//     const existingGroup = await GroupOfUserModel.findById(id);
//     if (!existingGroup) {
//       res
//         .status(404)
//         .send("Could not find groupofuser model with that specified id");
//       return;
//     }

//     // Pecah string receivers (jika ada multiple addresses)
//     const receiversArray = receivers.split(",");

//     // Cari user detail dari UserModel untuk setiap receiver
//     const mappedReceivers = await Promise.all(
//       receiversArray.map(async (addr: string) => {
//         const walletAddress = addr.trim();

//         // Query user berdasarkan wallet address
//         const user = await UserModel.findOne({
//           "WalletAddresses.walletAddress": walletAddress,
//         });

//         if (!user) {
//           console.warn(
//             `⚠️ User not found for wallet address: ${walletAddress}`
//           );
//           return {
//             _id: null,
//             walletAddress: walletAddress,
//             fullname: "",
//             apiKey: "",
//             secretKey: "",
//             depositWalletAddress: "",
//             bankId: "",
//             bankName: "",
//             bankAccountName: "",
//             bankAccountNumber: "",
//             originCurrency: "", // masih kosong → bisa diisi frontend
//             tokenIcon: "USDC", // masih placeholder → bisa diisi frontend
//             amount: 0, // bisa diisi belakangan
//           };
//         }

//         return {
//           _id: user._id,
//           walletAddress: walletAddress,
//           fullname: user.fullname || "",
//           apiKey: user.apiKey || "",
//           secretKey: user.secretKey || "",
//           depositWalletAddress: user.depositWalletAddress || "",
//           originCurrency: "", // masih kosong → bisa diisi frontend
//           tokenIcon: "USDC", // masih placeholder → bisa diisi frontend
//           amount: 0, // bisa diisi belakangan
//         };
//       })
//     );

//     console.log("👥 Mapped receivers with bank info:", mappedReceivers.length);

//     // Update group dengan informasi receiver baru dan data webhook
//     const updatedGroup = await GroupOfUserModel.findOneAndUpdate(
//       { senderWalletAddress: sender, _id: id },
//       {
//         $set: {
//           escrowId: escrowId,
//           blockNumber: blockNumber,
//           transactionHash: transactionHash,
//           status: "RECEIVER_ADDED", // atau status lain yang sesuai
//         },
//         // Add new receivers atau update existing ones
//         $addToSet: { Receivers: { $each: mappedReceivers } },
//       },
//       { new: true }
//     );

//     if (!updatedGroup) {
//       res.status(404).send("Group not found for this senderWalletAddress");
//       return;
//     }

//     console.log(
//       "💾 EscrowReceiverAdded event + Receivers saved:",
//       updatedGroup._id
//     );
//     console.log(
//       "📊 Total receivers in group:",
//       updatedGroup.Receivers?.length || 0
//     );

//     res.status(200).json({
//       message: "EscrowReceiverAdded event saved with receivers and bank info",
//       data: {
//         groupId: updatedGroup._id,
//         escrowId: updatedGroup.escrowId,
//         totalReceivers: updatedGroup.Receivers?.length || 0,
//         newReceiversAdded: mappedReceivers.length,
//         receiversWithBankInfo: mappedReceivers.filter(
//           (r) => r.bankAccountNumber
//         ).length,
//       },
//     });
//     return;
//   } catch (err) {
//     console.error("❌ Error handling EscrowReceiverAdded webhook:", err);
//     res.status(500).send("Internal Server Error");
//     return;
//   }
// };

export const getResponseFromGemini = async (req: Request, res: Response) => {
  const { companyId, question, IDRX_CHAIN_ID } = req.body;

  if (!question) {
    res.status(400).json({
      success: false,
      response: "Missing required parameters (companyId or question)",
    });
    return;
  }

  try {
    const conversionParsed = parseConversionRequest(question);
    if (conversionParsed) {
      const { amount, fromCurrency, toCurrency } = conversionParsed;
      const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_RPC_URL);
      const rate = await resolveTokenToIdrx(
        fromCurrency,
        provider,
        IDRX_CHAIN_ID
      );
      const convertedAmount = (amount * rate).toFixed(2);

      res.status(200).json({
        success: true,
        response: `Jika kamu membayar dengan ${amount} ${fromCurrency}, maka kamu akan mendapatkan sekitar ${convertedAmount} ${toCurrency} setelah biaya admin NusaPay.`,
      });
      return;
    }

    const memoryContext = chatbotFAQ
      .map((qa) => `Q: ${qa.question}\nA: ${qa.response}`)
      .join("\n\n");

    const systemMessageText = !companyId
      ? `Jika dan hanya jika pengguna bertanya tentang topik sebelumnya namun belum login, balas: 'Saya tidak dapat mengingat percakapan sebelumnya. Silakan login agar saya bisa menyimpan dan mengingat pertanyaan Anda ke depannya.". Namun, jika user tidak bertanya sama sekali terkait percakapan sebelumnya, tidak usah mengatakan hal tersebut. Selain itu, jawablah sebagai assisten spesialis website NusaPay. Berikut adalah pertanyaan dan jawaban sebelumnya yang harus kamu jadikan referensi utama: ${memoryContext}`
      : `Jawablah sebagai assisten spesialis website NusaPay. Berikut adalah pertanyaan dan jawaban sebelumnya yang harus kamu jadikan referensi utama: ${memoryContext}`;

    const systemMessage = new SystemMessage(systemMessageText);

    // Load chat history from database
    const chatHistory = await loadChatHistory(companyId);
    const formattedMessages = formatChatHistory(chatHistory);

    const chain = RunnableSequence.from([
      ChatPromptTemplate.fromMessages([
        systemMessage,
        ...formattedMessages,
        new HumanMessage(question),
      ]),
      model,
      new StringOutputParser(),
    ]);

    const response = await chain.invoke({});

    // Simpan hasil ke database
    await saveChatHistory(companyId, question, response);

    res.status(200).json({ success: true, response });
    return;
  } catch (error: any) {
    console.error("Error generating chat response:", error);
    res.status(500).json({ success: false, response: error.message });
    return;
  }
};

export const formatChatHistory = (chatHistory: ChatItem[]): AIMessage[] => {
  const formattedMessages: AIMessage[] = [];

  for (const chat of chatHistory) {
    try {
      if (chat.question?.trim()) {
        formattedMessages.push(new HumanMessage(chat.question));
      }
      if (chat.response?.trim()) {
        formattedMessages.push(new AIMessage(chat.response));
      }
    } catch (err) {
      console.error("Error formatting message:", err, chat);
    }
  }

  return formattedMessages;
};

export const saveChatHistory = async (
  companyId: string,
  question: string,
  response: string
): Promise<void> => {
  try {
    const newChat = new ChatbotDataModel({ companyId, question, response });
    await newChat.save();
  } catch (error: any) {
    console.error("Error saving chat history:", error);
    throw new Error(`Failed to save chat history: ${error.message}`);
  }
};

// di BE
export const loadChatHistory = async (companyId: string) => {
  try {
    const chats = await ChatbotDataModel.find({ companyId })
      .sort({ createdAt: -1 }) // Terbaru dulu
      .limit(10)
      .lean();

    return chats.reverse(); // Balik ke urutan kronologis (lama ke baru)
  } catch (error: any) {
    console.error("Error loading chat history:", error);
    throw new Error(`Failed to load chat history: ${error.message}`);
  }
};

// untuk FE
export const getChatHistory = async (req: Request, res: Response) => {
  const { companyId } = req.body;

  if (!companyId) {
    res.status(400).json({
      success: false,
      response: "Missing required parameter (companyId)",
    });
    return;
  }

  try {
    const chats = await loadChatHistory(companyId);
    res.status(200).json({
      success: true,
      response: chats,
    });
    return;
  } catch (error: any) {
    console.error("Error retrieving chat history:", error);
    res.status(500).json({
      success: false,
      response: error.message || "Internal server error",
    });
    return;
  }
};

const parseConversionRequest = (input: string) => {
  const regex = /(\d+(?:\.\d+)?)\s*([A-Za-z]+)\s*(?:ke|to)\s*([A-Za-z]+)/i;
  const match = input.match(regex);

  if (!match) return null;

  const amount = parseFloat(match[1]);
  const fromCurrency = match[2].toUpperCase();
  const toCurrency = match[3].toUpperCase();
  if (
    !supportedFromCurrencies.includes(fromCurrency) ||
    !supportedToCurrencies.includes(toCurrency)
  ) {
    throw new Error("Unsupported currency conversion");
  }
  return { amount, fromCurrency, toCurrency };
};

// buat chatbotnya biar bisa memperkirakan jika dia membayar dengan a dollar, maka nantinya bisa dapet sekian rupiah dengan keadaan pricefeed sekarang dan
// kebayarnya jadi berapa setelah dipotong biaya admin nusapay
