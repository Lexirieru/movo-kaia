// import { createSignature } from "./generate_signature";
// import axios from "axios";
// import { ethers } from "ethers";
// import usdcABI from "../abi/usdcABI.json"; // ABI ERC20
// import erc20ABI from "../abi/erc20ABI.json"; // ABI ERC20
// // import { addInvoiceData } from "../controllers/transactionController";
// import dotenv from "dotenv";
// dotenv.config();

// const apiKey = process.env.IDRX_API_KEY;
// const secret = process.env.IDRX_SECRET_KEY!;

// // const PRIVATE_KEY = process.env.PRIVATE_KEY!;
// // const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL_BASE_MAINNET); // rpcnya chain base mainnet
// // const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// const provider = new ethers.providers.JsonRpcProvider(
//   process.env.ALCHEMY_RPC_URL_BASE_MAINNET
// ); // rpcnya chain base mainnet
// const usdcContractAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
// // // udah connect ke smart contract USDC di base dan connect ke walletku
// // const usdc = new ethers.Contract(usdcContractAddress, usdcABI, wallet);
// // const usdcERC20 = new ethers.Contract(usdcContractAddress, erc20ABI, wallet);

// // async function verifySmartContractAddress() {
// //     const usdc = new ethers.Contract(
// //         "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
// //         ["function name() view returns (string)", "function symbol() view returns (string)", "function decimals() view returns (uint8)"],
// //         provider
// //       );

// //       const name = await usdc.name();       // "USD Coin"
// //       const symbol = await usdc.symbol();   // "USDC"
// //       const decimals = await usdc.decimals(); // 6
// //     console.log({
// //         name,
// //         symbol,
// //         decimals
// //     })
// // }

// // async function checkUSDCBalance(){
// //     const balance = await usdcERC20.balanceOf(wallet.address);
// //     console.log("Your USDC balance:", ethers.utils.formatUnits(balance, 6));
// // }

// // dapetin wallet address yang dibuatkan oleh idrx
// export async function getBankAccounts(apiKey: string, secret: string) {
//   const path = "https://idrx.co/api/auth/get-bank-accounts";
//   console.log(apiKey)
//   const bufferReq = Buffer.from("", "base64").toString("utf8");
//   const timestamp = Math.round(new Date().getTime()).toString();
//   const sig = createSignature("GET", path, bufferReq, timestamp, secret);

//   const res = await axios.get(path, {
//     headers: {
//       "Content-Type": "application/json",
//       "idrx-api-key": apiKey,
//       "idrx-api-sig": sig,
//       "idrx-api-ts": timestamp,
//     },
//   });

//   console.log(res.data.data[0].DepositWalletAddress)

//   //   console.log('res.data: ');
//   //   console.log(JSON.stringify(res.data, null, 4));
//   return res.data.data[0].DepositWalletAddress.walletAddress;
// }

// export async function sendToken(
//   txId: string,
//   id: string,
//   companyId: string,
//   templateName: string,
//   amount: string,
//   recipient: string,
//   recipientAddress: string,
//   PRIVATE_KEY: string,
//   API_KEY: string
// ) {
//   const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
//   // udah connect ke smart contract USDC di base dan connect ke walletku
//   const usdc = new ethers.Contract(usdcContractAddress, usdcABI, wallet);
//   const decimals = 6; // untuk USDC

//   if (Number(amount) <= 0) {
//     throw new Error("Amount must be greater than zero");
//   }
//   if (!recipientAddress) {
//     throw new Error("Recipient address is required");
//   }
//   // const amountInWei = ethers.utils.parseUnits(amount, decimals);
//   //   const tx = await usdc.transfer(recipientAddress, amountInWei);
//   //   await tx.wait();
//   //   const txHash = tx.hash;

//   const txHash = "34424";
//   // await addInvoiceData({
//   //   txId,
//   //   id,
//   //   companyId,
//   //   templateName,
//   //   txHash,
//   //   amount: parseFloat(amount), // dari "1.3" → 1.3 (number)
//   //   recipient,
//   //   API_KEY,
//   // });

//   console.log(`USDC sent to ${recipient}: txHash = ${txHash}`);
// }

// export async function doMinting(
//   txId: string,
//   id: string,
//   companyId: string,
//   templateName: string,
//   amount: string,
//   recipient: string,
//   IDRX_API_KEY: string,
//   IDRX_SECRET_KEY: string,
//   PRIVATE_KEY: string
// ) {
//   const recipientAddress = await getBankAccounts(IDRX_API_KEY, IDRX_SECRET_KEY);
//   console.log(recipientAddress);
//   await sendToken(
//     txId,
//     id,
//     companyId,
//     templateName,
//     amount,
//     recipient,
//     recipientAddress,
//     PRIVATE_KEY,
//     IDRX_API_KEY
//   );
// }

// // doSimulation();
// // console.log(apiKey, secret)
// // getBankAccounts("3ea57f7821bf912c","e9a6c7ca2d9a864f263b941dd3a75c9136c531a88da4c45576e04aebeda69a86")
// // checkUSDCBalance();
