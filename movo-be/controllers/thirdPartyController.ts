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
import { GroupOfUserModel, UserModel } from "../models/userModel";

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
export const goldskyEscrowCreatedWebhook = async (
  req: Request,
  res: Response
) => {
  try {
    const { escrowId, block_number, sender, id, receivers } = req.body;

    if (!escrowId || !block_number || !sender || !id || !receivers) {
      res.status(400).send("Bad Request: Incomplete payload");
      return;
    }

    const receivedSecret = req.headers["goldsky-webhook-secret"];
    const expectedSecret = process.env.GOLDSKY_WEBHOOK_SECRET;
    if (receivedSecret !== expectedSecret) {
      res.status(403).send("Forbidden: Invalid Secret");
      return;
    }

    console.log("✅ Webhook verified");

    // Transaction hash biasanya bagian pertama dari `id`
    const transactionHash = id.split("-")[0];

    // Pecah string receivers (jika ada multiple addresses)
    const receiversArray = receivers.split(",");
    // Cari user detail dari UserModel
    const mappedReceivers = await Promise.all(
      receiversArray.map(async (addr: string) => {
        const user = await UserModel.findOne({
          "WalletAddresses.walletAddress": addr.trim(),
        });

        return {
          _id: user?._id || null,
          walletAddress: addr.trim(),
          fullname: user?.fullname || "",
          apiKey: user?.apiKey || "",
          secretKey: user?.secretKey || "",
          depositWalletAddress: user?.depositWalletAddress || "",
          originCurrency: "", // masih kosong → bisa diisi frontend
          tokenIcon: "USDC", // masih placeholder → bisa diisi frontend
          amount: 0, // bisa diisi belakangan
        };
      })
    );

    // Update group
    const updatedGroup = await GroupOfUserModel.findOneAndUpdate(
      { senderWalletAddress: sender },
      {
        $set: {
          escrowId,
          blockNumber: block_number,
          transactionHash,
          status: "ESCROW_CREATED",
        },
        $push: { Receivers: { $each: mappedReceivers } },
      },
      { new: true }
    );

    if (!updatedGroup) {
      res.status(404).send("Group not found for this senderWalletAddress");
      return;
    }

    console.log("💾 EscrowCreated event + Receivers saved:", updatedGroup!._id);

    res.status(200).json({
      message: "EscrowCreated event saved with receivers",
      data: updatedGroup,
    });
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    res.status(500).send("Internal Server Error");
  }
};

export const goldskyEscrowReceiverAddedWebhook = async (
  req: Request,
  res: Response
) => {
  try {
    const { escrowId, blockNumber, transactionHash, sender, id } = req.body;
    if (!escrowId || !blockNumber || !transactionHash || !sender) {
      res.status(400).send("Bad Request: No payload received");
      return;
    }

    const receivedSecret = req.headers["goldsky-webhook-secret"];
    const expectedSecret = process.env.GOLDSKY_WEBHOOK_SECRET;

    if (receivedSecret !== expectedSecret) {
      console.error("Invalid secret header!");
      res.status(403).send("Forbidden: Invalid Secret");
      return;
    }

    console.log("✅ Webhook verified");

    const savedEvent = await GroupOfUserModel.findById(id);
    if (!savedEvent) {
      res
        .status(404)
        .send("Could not find groupofuser model with that specified id"); // sudah ada, skip
      return;
    }

    const updatedGroup = await GroupOfUserModel.findOneAndUpdate(
      { senderWalletAddress: sender, _id: id }, // cari group milik sender ini
      {
        $set: {
          escrowId: escrowId,
          blockNumber: blockNumber,
          transactionHash: transactionHash,
        },
      },
      { new: true }
    );

    if (!updatedGroup) {
      res.status(404).send("Group not found for this senderWalletAddress");
      return;
    }

    console.log("💾 EscrowCreated event saved:", savedEvent._id);
    res
      .status(200)
      .json({ message: "EscrowCreated event saved", data: updatedGroup });
    return;
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    res.status(500).send("Internal Server Error");
    return;
  }
};

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
