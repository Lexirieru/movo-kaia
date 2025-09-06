"use client";

import { useState, useEffect } from "react";
import { X, Wallet, DollarSign, Coins, ArrowRight, Info } from "lucide-react";
import BankSelector from "./BankSelector";
import BankForm from "./BankForm";
import ClaimSuccess from "./ClaimSuccess";
import { getUsdcIdrxRate } from "@/app/api/api";
import { bankDictionary } from "@/lib/dictionary";

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStreams: any[];
  totalAmount: number;
}

export default function ClaimModal({
  isOpen,
  onClose,
  selectedStreams,
  totalAmount,
}: ClaimModalProps) {
  const [step, setStep] = useState<"claim" | "selectBank" | "success">("claim");
  const [claimType, setClaimType] = useState<"crypto" | "fiat">("crypto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState(totalAmount.toString());
  const [bankForm, setBankForm] = useState({
    bankName: "",
    bankAccountNumber: "",
    accountHolderName: "",
  });

  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await getUsdcIdrxRate();
        setRate(res?.rate ?? null);
      } catch (err) {
        console.error("Failed to fetch rate", err);
      }
    };

    fetchRate();
  }, []);

  // Protocol fee and limits calculation
  const PROTOCOL_FEE_PERCENTAGE = 0.25; // 0.25%
  const MIN_PAYOUT_AMOUNT = 2; // $2 minimum
  const MAX_PAYOUT_AMOUNT = 5000; // $5000 maximum
  const claimAmount = parseFloat(customAmount) || 0;
  const protocolFee = claimAmount * (PROTOCOL_FEE_PERCENTAGE / 100);
  const netAmount = claimAmount - protocolFee;
  // maxClaimAmount will be the lower of totalAmount and MAX_PAYOUT_AMOUNT
  const maxClaimAmount = Math.min(totalAmount, MAX_PAYOUT_AMOUNT);

  // Validation functions
  const isAmountValid =
    claimAmount >= MIN_PAYOUT_AMOUNT && claimAmount <= maxClaimAmount;

  const handleBankSelect = (bankName: string) => {
    setBankForm((prev) => ({ ...prev, bankName }));
    setStep("claim");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBankForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value);
      // Allow empty value for UX purposes or valid amounts within both balance and max limit
      if (value === "" || (numValue >= 0 && numValue <= maxClaimAmount)) {
        setCustomAmount(value);
      }
    }
  };

  const handleClaim = async () => {
    setIsProcessing(true);

    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      setStep("success");
    }, 2000);
  };

  const handleConfirmBank = () => {
    console.log(
      "Bank Selected:",
      bankForm.bankName,
      bankDictionary[bankForm.bankName],
    );
    console.log("Account Number:", bankForm.bankAccountNumber);
    console.log("Account Holder:", bankForm.accountHolderName);
    console.log("Claim Amount:", claimAmount);
    console.log("Protocol Fee:", protocolFee);
    console.log("Net Amount:", netAmount);
    handleClaim();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black z-50 flex flex-col mt-16">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-white/10">
        <h2 className="text-white text-2xl font-bold">
          {step === "selectBank"
            ? "Choose Your Bank"
            : step === "success"
              ? "Claim Successful"
              : "Claim Tokens"}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === "selectBank" ? (
          <BankSelector
            onSelect={handleBankSelect}
            onClose={() => setStep("claim")}
          />
        ) : step === "success" ? (
          <ClaimSuccess
            amount={netAmount}
            claimType={claimType}
            onClose={onClose}
          />
        ) : (
          <div className="p-6">
            <div className="space-y-6 max-w-lg mx-auto">
              {/* Claim Type Switch */}
              <div className="space-y-4">
                <h3 className="text-white font-medium">Claim As:</h3>
                <div className="bg-white/5 rounded-2xl p-2 flex">
                  <button
                    onClick={() => setClaimType("crypto")}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                      claimType === "crypto"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Coins className="w-5 h-5" />
                    <span>Cryptocurrency</span>
                  </button>
                  <button
                    onClick={() => setClaimType("fiat")}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                      claimType === "fiat"
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />
                    <span>Fiat Currency</span>
                  </button>
                </div>
              </div>

              {/* Amount Setting */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="space-y-4">
                  <label className="text-white/80 text-sm block">
                    Claim Amount (USDC)
                  </label>

                  {/* Amount Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={customAmount}
                      onChange={handleAmountChange}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 text-lg font-medium focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                      placeholder="0.0000"
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 text-sm">
                      USDC
                    </div>
                  </div>

                  {/* Validation Messages */}
                  {claimAmount > 0 && !isAmountValid && (
                    <div className="mt-2 flex items-center text-red-400 text-sm">
                      <Info className="w-4 h-4 mr-2" />
                      {claimAmount < MIN_PAYOUT_AMOUNT
                        ? `Minimum payout amount is ${MIN_PAYOUT_AMOUNT} USDC`
                        : claimAmount > totalAmount
                          ? `Amount exceeds your available balance of ${totalAmount.toFixed(4)} USDC`
                          : `Maximum payout amount is ${MAX_PAYOUT_AMOUNT} USDC`}
                    </div>
                  )}

                  {/* Max Button */}
                  <button
                    onClick={() => setCustomAmount(maxClaimAmount.toString())}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    Max: {maxClaimAmount.toFixed(4)} USDC
                  </button>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white/60">
                      {claimType === "crypto"
                        ? `Total Amount:`
                        : `Exchange Rate:`}
                    </span>
                    <span className="text-white/60 text-sm">
                      {selectedStreams.length} stream(s)
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        claimType === "crypto"
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600"
                          : "bg-gradient-to-r from-green-500 to-emerald-600"
                      }`}
                    >
                      {claimType === "crypto" ? (
                        <Coins className="w-6 h-6 text-white" />
                      ) : (
                        <DollarSign className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {claimType === "crypto"
                          ? `${netAmount.toFixed(4)} USDC`
                          : `${
                              rate
                                ? `Rp ${(claimAmount * rate).toLocaleString("id-ID")}`
                                : "Loading..."
                            }`}
                      </div>
                      <div className="text-white/60 text-sm">
                        {claimType === "crypto"
                          ? `${
                              rate
                                ? `≈ Rp ${(netAmount * rate).toLocaleString("id-ID")}`
                                : "Loading..."
                            }`
                          : `From ${claimAmount.toFixed(4)} USDC`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stream Details */}
              <div className="space-y-3">
                <h4 className="text-white/80 font-medium">Claiming from:</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedStreams.map((stream, index) => (
                    <div
                      key={stream.id || index}
                      className="bg-white/5 rounded-xl p-4 flex items-center justify-between border border-white/10"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            U
                          </span>
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">
                            USDC
                          </div>
                          <div className="text-white/60 text-xs">
                            Stream #{stream.id || index + 1}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Crypto Claim Button */}
              {claimType === "crypto" && (
                <button
                  onClick={handleClaim}
                  disabled={isProcessing || !isAmountValid || claimAmount <= 0}
                  className={`w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${
                    isProcessing || !isAmountValid || claimAmount <= 0
                      ? "bg-gray-600 text-white/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:scale-105"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5" />
                      <span>Send to Connected Wallet</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              {/* Fiat Bank Form */}
              {claimType === "fiat" && (
                <BankForm
                  bankForm={bankForm}
                  onChange={handleInputChange}
                  onSelectBank={() => setStep("selectBank")}
                  onConfirm={handleConfirmBank}
                  isProcessing={isProcessing}
                  claimAmount={claimAmount}
                  netAmount={netAmount}
                  protocolFee={protocolFee}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
