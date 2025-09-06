import { Request, Response } from "express";
import dotenv from "dotenv";
import axios from "axios";
import { ethers } from "ethers";

dotenv.config();

// --- API Key & Chain Info ---
const IDRX_API_KEY = process.env.IDRX_API_KEY || "";
const LISK_MAINNET_CHAIN_ID = "1135";
const BASE_MAINNET_CHAIN_ID = "8453";


// const IDRX_CHAIN_ID = "1135"; // Lisk Mainnet

// --- Chainlink Price Feed Addresses (Ethereum Mainnet) ---
const ETH_USD_ADDRESS = "0x5147eA642CAEF7BD9c1265AadcA78f997AbB9649";
const USDC_USD_ADDRESS = "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6";
const USDT_USD_ADDRESS = "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D";
const DAI_USD_ADDRESS = "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9";
const BNB_USD_ADDRESS = "0x14e613AC84a31f709eadbdF89C6CC390fDc9540A";
const AVAX_USD_ADDRESS = "0xFF3EEb22B5E3dE6e705b44749C2559d704923FD7";
const LINK_USD_ADDRESS = "0x76F8C9E423C228E83DCB11d17F0Bd8aEB0Ca01bb";
const AAVE_USD_ADDRESS = "0xbd7F896e60B650C01caf2d7279a1148189A68884";
const UNI_USD_ADDRESS = "0x553303d460EE0afB37EdFf9bE42922D8addFF63220e";

// --- ABI for Chainlink Aggregator ---
const aggregatorV3Abi = [
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
  "function decimals() view returns (uint8)",
];

// API untuk dapetin rate semua token ke IDRX
export const resolveTokenToIdrx = async (
  fromCurrency: string,
  provider: ethers.providers.JsonRpcProvider,
  IDRX_CHAIN_ID : string
): Promise<number> => {
  // dapetin rate dari USDC ke IDRX
  const buyAmount = await fetchIdrxRateFromUSDC(IDRX_CHAIN_ID); // 1 USDC = x IDRX
  if (fromCurrency.toUpperCase() === "USDC") {
    return buyAmount.idrxRate;
  }

  const feedMap: Record<string, string> = {
    ETH: ETH_USD_ADDRESS,
    USDT: USDT_USD_ADDRESS,
    DAI: DAI_USD_ADDRESS,
    BNB: BNB_USD_ADDRESS,
    AVAX: AVAX_USD_ADDRESS,
    LINK: LINK_USD_ADDRESS,
    AAVE: AAVE_USD_ADDRESS,
    UNI: UNI_USD_ADDRESS,
  };

  const tokenFeedAddress = feedMap[fromCurrency.toUpperCase()];
  if (!tokenFeedAddress) {
    throw new Error(`Unsupported fromCurrency: ${fromCurrency}`);
  }
  // dapetin rate token ke USDC
  const tokenToUsdcRate = await getTokenToUsdcRate(tokenFeedAddress, provider);
  // dapetin rate token ke IDRX
  return tokenToUsdcRate * buyAmount.idrxRate;
};
// API khusus untuk ngesend rate USDC ke IDRX
export const getIdrxRateFromUSDC = async (_req: Request, res: Response) => {
  const { IDRX_CHAIN_ID } = _req.body;
  try {
    const buyAmount = await fetchIdrxRateFromUSDC(IDRX_CHAIN_ID);
    res.status(200).json({ rate : buyAmount.idrxRate, chainId : buyAmount.chainId });
    return;
  } catch (error: any) {
    console.error("Failed to fetch IDRX rate:", error.message);
    res.status(500).json({ error: error.message || "Internal server error" });
    return;
  }
};
// API khusus untuk dapetin rate semua token ke USDC
export const getAllRatesToUsdc = async (req: Request, res: Response) => {
  const { fromCurrency, toCurrency, IDRX_CHAIN_ID } = req.body;
  if (!fromCurrency || !toCurrency) {
    res.status(400).json({ error: "Missing fromCurrency or toCurrency" });
    return;
  }

  if (
    toCurrency.toUpperCase() !== "IDRX" &&
    toCurrency.toUpperCase() !== "IDR"
  ) {
    res
      .status(400)
      .json({ error: "Currently only supports conversion to IDRX" });
    return;
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL_ETH_MAINNET);
    const result = await resolveTokenToIdrx(fromCurrency, provider, IDRX_CHAIN_ID);
    res.status(200).json({
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: "IDRX",
      rate: result,
      lastUpdated: new Date().toISOString(),
    });
    return;
  } catch (error: any) {
    console.error("Error resolving rate:", error.message);
    res.status(500).json({ error: error.message || "Internal error" });
    return;
  }
};

// Fungsi umum untuk rate semua token ke USDC 
const getTokenToUsdcRate = async (
  tokenFeedAddress: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<number> => {
  const tokenFeed = new ethers.Contract(
    tokenFeedAddress,
    aggregatorV3Abi,
    provider
  );
  const usdcFeed = new ethers.Contract(
    USDC_USD_ADDRESS,
    aggregatorV3Abi,
    provider
  );

  const [, tokenUsdRaw] = await tokenFeed.latestRoundData();
  const tokenDecimals = await tokenFeed.decimals();

  const [, usdcUsdRaw] = await usdcFeed.latestRoundData();
  const usdcDecimals = await usdcFeed.decimals();

  const tokenUsd = Number(tokenUsdRaw) / 10 ** tokenDecimals;
  const usdcUsd = Number(usdcUsdRaw) / 10 ** usdcDecimals;

  return tokenUsd / usdcUsd;
};
// function untuk dapetin rate USDC ke USDX
const fetchIdrxRateFromUSDC = async (IDRX_CHAIN_ID : string) => {
  if (!IDRX_API_KEY) {
    throw new Error("Missing IDRX API key");
  }

  const url = `https://idrx.co/api/transaction/rates?usdtAmount=1&chainId=${IDRX_CHAIN_ID}`;
  
  const response = await axios.get(url, {
    headers: {
      "idrx-api-key": IDRX_API_KEY,
      "idrx-api-sig" : "v0-lo3DmbCH8U7B1HyVKW1EJ7m0IMRMwT9w-2_tZdP0"
    },
  });
  const buyAmount = response.data?.data?.buyAmount;
  if (!buyAmount) {
    throw new Error("No buyAmount in response");
  }
  const responseData = {
    idrxRate : parseFloat(buyAmount),
    chainId : IDRX_CHAIN_ID
  }
  return responseData;
};
