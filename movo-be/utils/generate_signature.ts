import * as crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

// console.log(process.env.IDRX_API_KEY);
const SECRET_KEY = process.env.IDRX_SECRET_KEY!;

function atob(str: string) {
  return Buffer.from(str, "base64").toString("binary");
}

// fungsi customku generate signature untuk redeem request
export function generateSignatureForRedeem(
  txHash: string,
  networkChainId: string,
  amountTransfer: string,
  bankAccount: string,
  bankCode: string,
  bankName: string,
  bankAccountName: string,
  walletAddress: string
) {
  const r_METHOD = "POST";
  const r_URL_ENDPOINT = "/api/transaction/redeem-request";

  const r_body = {
    txHash,
    networkChainId,
    amountTransfer,
    bankAccount,
    bankCode,
    bankName,
    bankAccountName,
    walletAddress,
  };

  const r_timestamp = Date.now().toString(); // current time in ms
  if (!SECRET_KEY) throw new Error("Missing secret key");

  const r_signature = createSignature(
    r_METHOD,
    r_URL_ENDPOINT,
    r_body,
    r_timestamp,
    SECRET_KEY
  );
  return { r_signature, r_METHOD, r_URL_ENDPOINT, r_timestamp, r_body };
}

// fungsi customku generate signature untuk swap
export function generateSignatureForSwap() {
  const s_METHOD = "GET";
  const s_URL_ENDPOINT = `/api/transaction/rates?usdtAmount=15`;
  const s_timestamp = Date.now().toString(); // current time in ms
  const s_signature = createSignature(
    s_METHOD,
    s_URL_ENDPOINT,
    null,
    s_timestamp,
    SECRET_KEY
  );
  return { s_signature, s_METHOD, s_URL_ENDPOINT, s_timestamp };
}

// bawaan IDRX
export function createSignature(
  method: string,
  url: string,
  body: any,
  timestamp: string,
  secretKey: string
) {
  // payload body yang isinya data transaksi setiap pengguna pada saat redeem request (artinya setiap transaksi harus buat signature, shitt)
  const bodyBuffer = Buffer.from(JSON.stringify(body));

  const secret = atob(secretKey);
  // ngeenkripsiin secret keynya dalam bentuk hmac
  const hmac = crypto.createHmac("sha256", secret);
  // nambahin timestamp method dan url ke hmac
  hmac.update(timestamp);
  hmac.update(method);
  hmac.update(url);

  if (bodyBuffer != null) {
    // nambahin body dalam bentuk buffer ke hmac
    hmac.update(bodyBuffer);
  }
  // ngehashing si hmacnya itu
  const hash = hmac.digest();
  // hash to string untuk bentuk signaturenya itu
  const signature = hash.toString("base64url");

  return signature;
}
