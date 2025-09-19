"use client";

import { useState, useEffect } from "react";
import { X, Wallet, DollarSign, Coins, ArrowRight, Info, Clock } from "lucide-react";
import BankSelector from "./BankSelector";
import BankForm from "./BankForm";
import ClaimSuccess from "./ClaimSuccess";
import VestingInfo from "./VestingInfo";
import { getUsdcIdrxRate } from "@/app/api/api";
import { bankDictionary } from "@/lib/dictionary";
import { useWallet } from "@/lib/walletContext";
import { useWalletClientHook } from "@/lib/useWalletClient";
import { withdrawUSDCToCrypto, withdrawIDRXToCrypto, parseTokenAmount } from "@/lib/smartContract";
import { canReceiverClaim } from "@/lib/escrowReader";

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
  const { address, isConnected } = useWallet();
  const walletClient = useWalletClientHook();
  
  // Helper function to format amount based on token type
  const formatTokenAmount = (amount: number, tokenType: string) => {
    // USDC and USDT use 6 decimals, IDRX uses 2 decimals
    const decimals = tokenType === "IDRX" ? 2 : 6;
    return amount.toFixed(decimals === 6 ? 4 : 2); // Show 4 decimal places for USDC/USDT, 2 for IDRX
  };

  // Get token type from selected streams (assuming all selected streams have the same token type)
  const tokenType = selectedStreams.length > 0 ? selectedStreams[0].originCurrency : "USDC";
  const [step, setStep] = useState<"claim" | "selectBank" | "success">("claim");
  const [claimType, setClaimType] = useState<"crypto" | "fiat">("crypto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState(totalAmount.toString());
  const [bankForm, setBankForm] = useState({
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [vestingInfo, setVestingInfo] = useState<any>(null);
  const [claimStatus, setClaimStatus] = useState<any>(null);

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

  useEffect(() =>{
    if(isOpen){
      setStep("claim");
      setClaimType('crypto')
      setIsProcessing(false);
      setCustomAmount(totalAmount.toString());
      setError(null);
      setVestingInfo(null);
      setClaimStatus(null);
      setBankForm({
        bankName: "",
        bankAccountNumber: "",
        bankAccountName: "",
      });
    }
  }, [isOpen, totalAmount])

  // Fetch vesting information when modal opens
  useEffect(() => {
    const fetchVestingInfo = async () => {
      if (!isOpen || !isConnected || !address || selectedStreams.length === 0) return;

      try {
        const escrowId = selectedStreams[0]?.escrowId;
        if (!escrowId) return;

        const claimCheck = await canReceiverClaim(escrowId, address, tokenType);
        setClaimStatus(claimCheck);
        
        if (claimCheck.vestingInfo) {
          setVestingInfo(claimCheck.vestingInfo);
        }
      } catch (err) {
        console.error("Error fetching vesting info:", err);
      }
    };

    fetchVestingInfo();
  }, [isOpen, isConnected, address, selectedStreams, tokenType]);

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
    claimAmount >= MIN_PAYOUT_AMOUNT && 
    claimAmount <= maxClaimAmount &&
    claimStatus?.canClaim === true;

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
    if (!isConnected || !address || !walletClient) {
      setError("Please connect your wallet first");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Get the escrow ID from the first selected stream
      const escrowId = selectedStreams[0]?.escrowId;
      if (!escrowId) {
        throw new Error("No escrow ID found");
      }

      // Parse the amount based on token type
      const decimals = tokenType === "IDRX" ? 2 : 6;
      const amountParsed = parseTokenAmount(claimAmount.toString(), decimals);

      let result;
      if (tokenType === "USDC") {
        result = await withdrawUSDCToCrypto(walletClient, escrowId, amountParsed);
      } else if (tokenType === "IDRX") {
        result = await withdrawIDRXToCrypto(walletClient, escrowId, amountParsed);
      } else {
        throw new Error("Unsupported token type");
      }

      if (result.success) {
        setStep("success");
      } else {
        setError(result.error || "Withdrawal failed");
      }
    } catch (err) {
      console.error("Error during withdrawal:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmBank = () => {
    console.log(
      "Bank Selected:",
      bankForm.bankName,
      bankDictionary[bankForm.bankName],
    );
    console.log("Account Number:", bankForm.bankAccountNumber);
    console.log("Account Holder:", bankForm.bankAccountName);
    console.log("Claim Amount:", claimAmount);
    console.log("Protocol Fee:", protocolFee);
    console.log("Net Amount:", netAmount);
    handleClaim();
  };

  const handleBankFormCancel = () =>{
    setBankForm({
      bankName: "",
      bankAccountNumber: "",
      bankAccountName: "",
    })
    onClose()
  }

  const handleModalClose = () =>{
    setStep("claim")
    setClaimType("crypto")
    setIsProcessing(false);
    setBankForm({
      bankName: "",
      bankAccountNumber: "",
      bankAccountName: "",
    })
    setCustomAmount(totalAmount.toString());
    onClose();
  }

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
          onClick={handleModalClose}
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
            tokenType={tokenType}
            onClose={handleModalClose}
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
                    disabled={true}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                      claimType === "fiat"
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                        : "text-white/30 cursor-not-allowed bg-white/5"
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />
                    <span>Fiat Currency</span>
                    <span className="text-xs opacity-60">(Disabled)</span>
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
                        ? `Minimum payout amount is ${MIN_PAYOUT_AMOUNT} ${tokenType}`
                        : claimAmount > totalAmount
                          ? `Amount exceeds your available balance of ${formatTokenAmount(totalAmount, tokenType)} ${tokenType}`
                          : `Maximum payout amount is ${MAX_PAYOUT_AMOUNT} ${tokenType}`}
                    </div>
                  )}

                  {/* Max Button */}
                  <button
                    onClick={() => setCustomAmount(maxClaimAmount.toString())}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    Max: {formatTokenAmount(maxClaimAmount, tokenType)} {tokenType}
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
                          ? `${formatTokenAmount(netAmount, tokenType)} ${tokenType}`
                          : `${
                              rate
                                ? `Rp ${(claimAmount * rate).toLocaleString("id-ID")}`
                                : ""
                            }`}
                      </div>
                      <div className="text-white/60 text-sm">
                        {claimType === "crypto"
                          ? `${
                              rate
                                ? `≈ Rp ${(netAmount * rate).toLocaleString("id-ID")}`
                                : ""
                            }`
                          : `From ${formatTokenAmount(claimAmount, tokenType)} ${tokenType}`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee Information */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-blue-400">
                  <Info className="w-4 h-4" />
                  <span className="text-sm">
                    After deducting platform fee (0.25%)
                  </span>
                </div>
              </div>

              {/* Vesting Information */}
              {vestingInfo && (
                <VestingInfo vestingInfo={vestingInfo} tokenType={tokenType} />
              )}

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

              {/* Error Display */}
              {(error || (claimStatus && !claimStatus.canClaim)) && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-center space-x-2 text-red-400">
                    <Info className="w-4 h-4" />
                    <span className="text-sm">
                      {error || claimStatus?.reason || "Unable to claim at this time"}
                    </span>
                  </div>
                </div>
              )}

              {/* Crypto Claim Button */}
              {claimType === "crypto" && (
                <button
                  onClick={handleClaim}
                  disabled={isProcessing || !isAmountValid || claimAmount <= 0 || !claimStatus?.canClaim}
                  className={`w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${
                    isProcessing || !isAmountValid || claimAmount <= 0 || !claimStatus?.canClaim
                      ? "bg-gray-600 text-white/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:scale-105"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : !claimStatus?.canClaim ? (
                    <>
                      <Clock className="w-5 h-5" />
                      <span>
                        {vestingInfo?.isVestingEnabled 
                          ? "Vesting in Progress" 
                          : "Cannot Claim"
                        }
                      </span>
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

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
