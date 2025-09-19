"use client";
import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, Wallet, TrendingUp } from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import Image from "next/image";
import { ReceiverInGroup } from "@/types/receiverInGroupTemplate";
import { useParams } from "next/navigation";
import { useWalletClientHook } from "@/lib/useWalletClient";
import {
  createEscrowOnchain,
  parseTokenAmount,
  addReceiver,
} from "@/lib/smartContract";

const Modal = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pb-24">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-2xl mx-4">{children}</div>
    </div>
  );
};

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateStream: (stream: ReceiverInGroup) => void;
  onEscrowCreated?: () => void;
  existingEscrow?: {
    escrowId: string;
    tokenType: "USDC" | "USDT" | "IDRX_BASE" | "IDRX_KAIA";
  };
}

interface ReceiverData {
  id: string;
  address: string;
  amount: string;
}

interface FormData {
  token: "USDC" | "USDT" | "IDRX_BASE" | "IDRX_KAIA" | null;
  receivers: ReceiverData[];
  vestingEnabled: boolean;
  vestingDuration: number;
  vestingUnit: "days" | "weeks";
}

// Available tokens for escrow
const AVAILABLE_TOKENS = [
  {
    symbol: "USDC",
    name: "USD Coin (Base)",
    icon: "/USDC-Base.png",
    description: "USDC on Base",
    escrowType: "Escrow",
  },
  {
    symbol: "USDT",
    name: "Tether USD (Kaia)",
    icon: "/Tether-Kaia.png",
    description: "USDT on Kaia",
    escrowType: "Escrow",
  },
  {
    symbol: "IDRX_BASE",
    name: "IDRX Token (Base)",
    icon: "/IDRX-Base.png",
    description: "IDRX on Base",
    escrowType: "EscrowIDRX",
  },
  {
    symbol: "IDRX_KAIA",
    name: "IDRX Token (Kaia)",
    icon: "/IDRX-Kaia.png",
    description: "IDRX on Kaia",
    escrowType: "EscrowIDRX",
  },
];

export default function CreateStreamModal({
  isOpen,
  onClose,
  onCreateStream,
  onEscrowCreated,
  existingEscrow,
}: CreateStreamModalProps) {
  const params = useParams();
  const groupId = params.groupId as string;
  const walletClient = useWalletClientHook();

  // Fix: Proper initial form data
  const initialFormData: FormData = existingEscrow
    ? {
        token: existingEscrow.tokenType,
        receivers: [{ id: "1", address: "", amount: "" }],
        vestingEnabled: false,
        vestingDuration: 0,
        vestingUnit: "days",
      }
    : {
        token: null,
        receivers: [{ id: "1", address: "", amount: "" }],
        vestingEnabled: false,
        vestingDuration: 0,
        vestingUnit: "days",
      };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Determine Mode
  const isAddReceiverMode = !!existingEscrow;
  const modalTitle = isAddReceiverMode
    ? "Add Receiver to Escrow"
    : "Create Escrow Stream";
  const modalDescription = isAddReceiverMode
    ? `Add a new receiver to existing escrow (${existingEscrow.tokenType})`
    : "Set up payment streams with smart contract escrow";
  const buttonText = isAddReceiverMode
    ? "Add Receiver to Escrow"
    : "Create Escrow Stream";
  const loadingText = isAddReceiverMode
    ? "Adding Receiver..."
    : "Creating Escrow...";

  // Map our token types to smart contract expected types
  const mapToSmartContractToken = (
    token: "USDC" | "USDT" | "IDRX_BASE" | "IDRX_KAIA",
  ): "USDC" | "USDT" | "IDRX" => {
    switch (token) {
      case "USDC":
        return "USDC";
      case "USDT":
        return "USDT";
      case "IDRX_BASE":
      case "IDRX_KAIA":
        return "IDRX";
      default:
        return "USDC";
    }
  };

  // Get token icon based on token type
  const getTokenIcon = (
    token: "USDC" | "USDT" | "IDRX_BASE" | "IDRX_KAIA",
  ): string => {
    switch (token) {
      case "USDC":
        return "/USDC-Base.png";
      case "USDT":
        return "/Tether-Kaia.png";
      case "IDRX_BASE":
        return "/IDRX-Base.png";
      case "IDRX_KAIA":
        return "/IDRX-Kaia.png";
      default:
        return "/USDC-Base.png";
    }
  };

  // Fix: Better canSubmit logic
  const canSubmit = isAddReceiverMode
    ? formData.receivers.length === 1 &&
      formData.receivers[0].address.trim() &&
      formData.receivers[0].amount.trim() &&
      parseFloat(formData.receivers[0].amount) > 0 &&
      !isLoading &&
      walletClient
    : formData.token &&
      formData.receivers.length > 0 &&
      formData.receivers.every(
        (r) => r.address.trim() && r.amount.trim() && parseFloat(r.amount) > 0,
      ) &&
      !isLoading &&
      walletClient;

  const handleTokenSelect = (
    token: "USDC" | "USDT" | "IDRX_BASE" | "IDRX_KAIA",
  ) => {
    if (isAddReceiverMode) return; // Prevent token change in add receiver mode
    setFormData({ ...formData, token });
  };

  const addNewReceiver = () => {
    if (isAddReceiverMode) return;
    const newId = (formData.receivers.length + 1).toString();
    setFormData({
      ...formData,
      receivers: [
        ...formData.receivers,
        { id: newId, address: "", amount: "" },
      ],
    });
  };

  const removeReceiver = (id: string) => {
    if (isAddReceiverMode || formData.receivers.length <= 1) return;
    if (formData.receivers.length > 1) {
      setFormData({
        ...formData,
        receivers: formData.receivers.filter((r) => r.id !== id),
      });
    }
  };

  const updateReceiver = (
    id: string,
    field: keyof ReceiverData,
    value: string,
  ) => {
    setFormData({
      ...formData,
      receivers: formData.receivers.map((r) =>
        r.id === id ? { ...r, [field]: value } : r,
      ),
    });
  };

  // Fix: Complete handleSubmit function
  const handleSubmit = async () => {
    if (!walletClient) {
      setMessage({
        type: "error",
        text: "Wallet client not ready. Please try reconnecting your wallet.",
      });
      return;
    }

    // Validate all receivers have data
    const isValid = formData.receivers.every(
      (r) => r.address.trim() && r.amount.trim() && parseFloat(r.amount) > 0,
    );

    if (!isValid) {
      setMessage({
        type: "error",
        text: "Please fill in all receiver information and ensure amounts are greater than 0",
      });
      return;
    }

    // Fix: Skip token validation for add receiver mode
    if (!isAddReceiverMode && !formData.token) {
      setMessage({ type: "error", text: "Please select a token type" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (isAddReceiverMode) {
        const receiver = formData.receivers[0];
        const tokenType = existingEscrow!.tokenType;

        console.log("🔍 Adding receiver with details:", {
          escrowId: existingEscrow!.escrowId,
          tokenType,
          receiverAddress: receiver.address,
          amount: receiver.amount,
        });

        // Fix: Use tokenType for decimals calculation
        const parsedAmount = parseTokenAmount(
          receiver.amount,
          tokenType === "USDC" || tokenType === "USDT" ? 6 : 2,
        );

        // Format escrowId properly
        let escrowIdBytes = existingEscrow!.escrowId;

        // Remove 0x prefix if it exists
        if (escrowIdBytes.startsWith("0x")) {
          escrowIdBytes = escrowIdBytes.slice(2);
        }

        // Ensure it's exactly 32 bytes (64 hex characters)
        if (escrowIdBytes.length < 64) {
          escrowIdBytes = escrowIdBytes.padEnd(64, "0");
        } else if (escrowIdBytes.length > 64) {
          escrowIdBytes = escrowIdBytes.slice(0, 64);
        }

        // Add single 0x prefix
        const formattedEscrowId = `0x${escrowIdBytes}` as `0x${string}`;

        console.log("🔍 EscrowId formatting for addReceiver:", {
          original: existingEscrow!.escrowId,
          formatted: formattedEscrowId,
          length: formattedEscrowId.length,
          tokenType: tokenType,
        });

        // Fix: Use mapToSmartContractToken for consistency
        const smartContractTokenType = mapToSmartContractToken(tokenType);
        const addReceiverResult = await addReceiver(
          walletClient,
          smartContractTokenType,
          formattedEscrowId,
          receiver.address as `0x${string}`,
          parsedAmount,
        );

        if (!addReceiverResult.success) {
          throw new Error(
            addReceiverResult.error ||
              "Failed to add receiver to escrow onchain",
          );
        }

        const newStream: ReceiverInGroup = {
          _id: `${existingEscrow!.escrowId}-${receiver.address}-${Date.now()}`,
          groupId: existingEscrow!.escrowId,
          originCurrency: tokenType,
          tokenIcon: getTokenIcon(tokenType),
          depositWalletAddress: receiver.address,
          amount: parseFloat(receiver.amount),
        };

        onCreateStream(newStream);

        setMessage({
          type: "success",
          text: `Receiver added successfully! Transaction: ${addReceiverResult.transactionHash}`,
        });
      } else {
        // Create new escrow
        const receivers = formData.receivers.map(
          (r) => r.address as `0x${string}`,
        );
        const amounts = formData.receivers.map((r) =>
          parseTokenAmount(
            r.amount,
            formData.token === "USDC" || formData.token === "USDT" ? 6 : 2,
          ),
        );
        const totalAmount = amounts.reduce(
          (acc, amount) => acc + amount,
          BigInt(0),
        );

        console.log("Escrow data prepared:", {
          receivers,
          amounts: amounts.map((a) => a.toString()),
          totalAmount: totalAmount.toString(),
          tokenType: formData.token,
        });

        const smartContractTokenType = mapToSmartContractToken(formData.token!);
        const escrowResult = await createEscrowOnchain(
          walletClient,
          smartContractTokenType,
          {
            receivers,
            amounts,
            totalAmount,
            vestingEnabled: formData.vestingEnabled,
            vestingDuration: formData.vestingEnabled
              ? formData.vestingUnit === "weeks"
                ? formData.vestingDuration * 7
                : formData.vestingDuration
              : 0,
          },
          undefined,
        );

        if (!escrowResult.success) {
          throw new Error(
            escrowResult.error || "Failed to create escrow onchain",
          );
        }

        // Create stream objects for each receiver
        for (const receiver of formData.receivers) {
          const newStream: ReceiverInGroup = {
            _id:
              Date.now().toString() + Math.random().toString(36).substr(2, 9),
            groupId: escrowResult.escrowId!,
            originCurrency: formData.token!,
            tokenIcon: getTokenIcon(formData.token!),
            depositWalletAddress: receiver.address,
            amount: parseFloat(receiver.amount),
          };

          onCreateStream(newStream);
        }

        setMessage({
          type: "success",
          text: `Escrow created successfully! Transaction: ${escrowResult.transactionHash}`,
        });

        if (onEscrowCreated) {
          setTimeout(() => {
            onEscrowCreated();
          }, 1000);
        }
      }

      // Close modal after success
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (e) {
      console.error("❌ Error in escrow operation:", e);
      setMessage({
        type: "error",
        text:
          e instanceof Error
            ? e.message
            : "Transaction failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-gray-900/95 border border-cyan-400/20 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b border-white/10 flex-shrink-0">
          <div>
            <h3 className="text-white text-xl font-semibold">{modalTitle}</h3>
            <p className="text-white/60 text-sm mt-1">{modalDescription}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Show Existing Escrow Info for Add Receiver Mode */}
        {isAddReceiverMode && (
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg m-6 mb-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 relative">
                <Image
                  src={getTokenIcon(existingEscrow!.tokenType)}
                  alt={existingEscrow!.tokenType}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              </div>
              <div>
                <p className="text-cyan-300 font-medium">
                  Existing{" "}
                  {existingEscrow!.tokenType === "IDRX_BASE" ||
                  existingEscrow!.tokenType === "IDRX_KAIA"
                    ? "IDRX"
                    : existingEscrow!.tokenType}{" "}
                  Escrow
                </p>
                <p className="text-cyan-400/80 text-sm">
                  ID: {existingEscrow!.escrowId.slice(0, 10)}...
                  {existingEscrow!.escrowId.slice(-8)}
                </p>
                <p className="text-cyan-400/60 text-xs">
                  Token type is fixed for this escrow
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="space-y-6">
            {/* Token Selection - Hide for add receiver mode */}
            {!isAddReceiverMode && (
              <div>
                <label className="text-white/80 text-sm mb-3 block font-medium">
                  Select Token for Escrow
                </label>
                <div className="relative" ref={dropdownRef}>
                  {/* Dropdown Trigger */}
                  <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`w-full p-4 rounded-xl cursor-pointer transition-all border ${
                      formData.token
                        ? "bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/15"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    } focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50`}
                  >
                    {formData.token ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 relative">
                            <Image
                              src={getTokenIcon(formData.token)}
                              alt={formData.token}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          </div>
                          <div>
                            <p className="text-cyan-300 font-medium">
                              {formData.token === "IDRX_BASE" ||
                              formData.token === "IDRX_KAIA"
                                ? "IDRX"
                                : formData.token}
                            </p>
                            <p className="text-cyan-400/80 text-sm">
                              {
                                AVAILABLE_TOKENS.find(
                                  (t) => t.symbol === formData.token,
                                )?.description
                              }
                            </p>
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-cyan-400 transition-transform ${
                            isDropdownOpen ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-white/60">Choose a token</span>
                        <svg
                          className={`w-5 h-5 text-white/40 transition-transform ${
                            isDropdownOpen ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/10 rounded-xl shadow-lg z-50 overflow-hidden">
                      {AVAILABLE_TOKENS.map((token) => (
                        <div
                          key={token.symbol}
                          onClick={() => {
                            handleTokenSelect(
                              token.symbol as
                                | "USDC"
                                | "USDT"
                                | "IDRX_BASE"
                                | "IDRX_KAIA",
                            );
                            setIsDropdownOpen(false);
                          }}
                          className={`flex items-center space-x-3 p-4 cursor-pointer transition-colors hover:bg-white/10 ${
                            formData.token === token.symbol
                              ? "bg-cyan-500/20 border-l-4 border-cyan-400"
                              : ""
                          }`}
                        >
                          <div className="w-8 h-8 relative">
                            <Image
                              src={token.icon}
                              alt={token.symbol}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">
                              {token.symbol === "IDRX_BASE" ||
                              token.symbol === "IDRX_KAIA"
                                ? "IDRX"
                                : token.symbol}
                            </p>
                            <p className="text-white/60 text-sm">
                              {token.description}
                            </p>
                          </div>
                          {formData.token === token.symbol && (
                            <svg
                              className="w-5 h-5 text-cyan-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Receivers */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-white/80 text-sm font-medium">
                  {isAddReceiverMode ? "New Receiver" : "Receivers"}
                </label>
                {!isAddReceiverMode && (
                  <button
                    type="button"
                    onClick={addNewReceiver}
                    className="flex items-center space-x-2 px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/30 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Receiver</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {formData.receivers.map((receiver) => (
                  <div
                    key={receiver.id}
                    className="flex items-center space-x-3 p-3 bg-white/5 border border-white/10 rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={receiver.address}
                        onChange={(e) =>
                          updateReceiver(receiver.id, "address", e.target.value)
                        }
                        placeholder="Wallet Address (0x...)"
                        className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={receiver.amount}
                        onChange={(e) =>
                          updateReceiver(receiver.id, "amount", e.target.value)
                        }
                        placeholder={`Amount (${
                          isAddReceiverMode
                            ? existingEscrow!.tokenType === "IDRX_BASE" ||
                              existingEscrow!.tokenType === "IDRX_KAIA"
                              ? "IDRX"
                              : existingEscrow!.tokenType
                            : formData.token === "IDRX_BASE" ||
                                formData.token === "IDRX_KAIA"
                              ? "IDRX"
                              : formData.token || "Token"
                        })`}
                        className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    {!isAddReceiverMode && formData.receivers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeReceiver(receiver.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Vesting Options - Hide for add receiver mode */}
            {!isAddReceiverMode && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="vestingEnabled"
                      checked={formData.vestingEnabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vestingEnabled: e.target.checked,
                          vestingDuration: e.target.checked
                            ? formData.vestingDuration
                            : 0,
                        })
                      }
                      className="sr-only"
                    />
                    <label
                      htmlFor="vestingEnabled"
                      className="flex items-center cursor-pointer"
                    >
                      <div
                        className={`relative w-5 h-5 rounded border-2 transition-all duration-200 ${
                          formData.vestingEnabled
                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 shadow-md shadow-cyan-500/25"
                            : "bg-white/5 border-white/20 hover:border-white/30"
                        }`}
                      >
                        {formData.vestingEnabled && (
                          <svg
                            className="absolute inset-0 w-3 h-3 m-auto text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="ml-3 text-white/80 text-sm font-medium">
                        Enable Vesting (Optional)
                      </span>
                    </label>
                  </div>
                </div>

                {formData.vestingEnabled && (
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-3">
                      Vesting Duration
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        id="vestingDuration"
                        min="1"
                        max={formData.vestingUnit === "days" ? "3650" : "520"}
                        value={
                          formData.vestingDuration === 0
                            ? ""
                            : formData.vestingDuration
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vestingDuration: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="Duration"
                        className="flex-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-cyan-300/50 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <select
                        value={formData.vestingUnit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vestingUnit: e.target.value as "days" | "weeks",
                            vestingDuration: 0,
                          })
                        }
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-cyan-300/50 text-sm"
                      >
                        <option value="days" className="bg-gray-800 text-white">
                          Days
                        </option>
                        <option
                          value="weeks"
                          className="bg-gray-800 text-white"
                        >
                          Weeks
                        </option>
                      </select>
                    </div>
                    <p className="text-cyan-300/80 text-xs mt-2">
                      Tokens will be gradually released over the specified
                      duration. Receivers can claim their proportional share at
                      any time during the vesting period.
                      {formData.vestingDuration > 0 && (
                        <span className="block mt-1 font-medium">
                          Total duration: {formData.vestingDuration}{" "}
                          {formData.vestingUnit} (
                          {formData.vestingUnit === "weeks"
                            ? formData.vestingDuration * 7
                            : formData.vestingDuration}{" "}
                          days)
                        </span>
                      )}
                    </p>

                    {/* Vesting Chart Preview */}
                    {formData.vestingDuration > 0 && (
                      <div className="mt-4 rounded-lg">
                        <h4 className="text-white/90 text-sm font-medium mb-3">
                          Vesting Schedule Preview
                        </h4>
                        {(() => {
                          const totalAmount = formData.receivers.reduce(
                            (sum, receiver) =>
                              sum + (parseFloat(receiver.amount) || 0),
                            0,
                          );

                          const startDate = new Date();
                          const vestingDurationInDays =
                            formData.vestingUnit === "weeks"
                              ? formData.vestingDuration * 7
                              : formData.vestingDuration;
                          const endDate = new Date(startDate);
                          endDate.setDate(
                            startDate.getDate() + vestingDurationInDays,
                          );

                          const chartData = [];
                          const maxDataPoints = Math.min(
                            vestingDurationInDays + 1,
                            30,
                          );
                          const interval =
                            vestingDurationInDays > 30
                              ? Math.ceil(vestingDurationInDays / 30)
                              : 1;

                          for (
                            let i = 0;
                            i <= vestingDurationInDays;
                            i += interval
                          ) {
                            const progress = i / vestingDurationInDays;
                            const currentDate = new Date(startDate);
                            currentDate.setDate(startDate.getDate() + i);

                            chartData.push({
                              date: currentDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              }),
                              amount: totalAmount * progress,
                              fullDate: currentDate.toLocaleDateString(),
                              percentage: (progress * 100).toFixed(1),
                              day: i,
                            });
                          }

                          if (
                            chartData[chartData.length - 1].day !==
                            vestingDurationInDays
                          ) {
                            const currentDate = new Date(startDate);
                            currentDate.setDate(
                              startDate.getDate() + vestingDurationInDays,
                            );
                            chartData.push({
                              date: currentDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              }),
                              amount: totalAmount,
                              fullDate: currentDate.toLocaleDateString(),
                              percentage: "100.0",
                              day: vestingDurationInDays,
                            });
                          }

                          const CustomTooltip = ({
                            active,
                            payload,
                            label,
                          }: any) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-gray-800/95 border border-cyan-400/30 rounded-lg p-3 shadow-lg backdrop-blur-sm">
                                  <p className="text-cyan-300 text-sm font-medium">
                                    {payload[0].payload.fullDate}
                                  </p>
                                  <p className="text-white text-sm">
                                    <span className="text-cyan-400">
                                      ● Vested:
                                    </span>{" "}
                                    {payload[0].value.toFixed(4)}{" "}
                                    {formData.token === "IDRX_BASE" ||
                                    formData.token === "IDRX_KAIA"
                                      ? "IDRX"
                                      : formData.token}
                                  </p>
                                  <p className="text-cyan-400/80 text-xs">
                                    {payload[0].payload.percentage}% of total
                                    amount
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          };

                          return totalAmount > 0 ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="text-cyan-300">
                                    Total Amount:
                                  </span>
                                  <span className="block text-white font-medium">
                                    {totalAmount.toFixed(2)}{" "}
                                    {formData.token === "IDRX_BASE" ||
                                    formData.token === "IDRX_KAIA"
                                      ? "IDRX"
                                      : formData.token}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-cyan-300">
                                    End Date:
                                  </span>
                                  <span className="block text-white font-medium">
                                    {endDate.toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart
                                    data={chartData}
                                    margin={{
                                      top: 10,
                                      right: 10,
                                      left: 10,
                                      bottom: 10,
                                    }}
                                  >
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      stroke="rgba(34, 211, 238, 0.15)"
                                      vertical={false}
                                    />
                                    <XAxis
                                      dataKey="date"
                                      tick={{
                                        fill: "rgba(255,255,255,0.6)",
                                        fontSize: 11,
                                      }}
                                      tickLine={false}
                                      axisLine={{
                                        stroke: "rgba(34, 211, 238, 0.2)",
                                      }}
                                      interval="preserveStartEnd"
                                    />
                                    <Tooltip
                                      content={<CustomTooltip />}
                                      cursor={{
                                        stroke: "#22d3ee",
                                        strokeWidth: 1,
                                        strokeDasharray: "5 5",
                                      }}
                                    />
                                    <Area
                                      dataKey="amount"
                                      type="linear"
                                      stroke="#22d3ee"
                                      fill="url(#colorCyan)"
                                      strokeWidth={2.5}
                                      dot={false}
                                      activeDot={{
                                        r: 5,
                                        fill: "#22d3ee",
                                        stroke: "#ffffff",
                                        strokeWidth: 2,
                                        filter:
                                          "drop-shadow(0 0 6px rgba(34, 211, 238, 0.6))",
                                      }}
                                      connectNulls={true}
                                    />
                                    <defs>
                                      <linearGradient
                                        id="colorCyan"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                      >
                                        <stop
                                          offset="5%"
                                          stopColor="#22d3ee"
                                          stopOpacity={0.6}
                                        />
                                        <stop
                                          offset="95%"
                                          stopColor="#22d3ee"
                                          stopOpacity={0.1}
                                        />
                                      </linearGradient>
                                    </defs>
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>

                              <p className="text-cyan-300/80 text-xs">
                                Linear vesting from{" "}
                                {startDate.toLocaleDateString()} to{" "}
                                {endDate.toLocaleDateString()}
                              </p>
                            </div>
                          ) : (
                            <p className="text-cyan-300/60 text-xs">
                              Enter receiver amounts to see vesting preview
                            </p>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Message Display */}
            {message && (
              <div
                className={`p-4 rounded-lg border ${
                  message.type === "success"
                    ? "bg-green-500/20 border-green-500/30 text-green-300"
                    : message.type === "error"
                      ? "bg-red-500/20 border-red-500/30 text-red-300"
                      : "bg-blue-500/20 border-blue-500/30 text-blue-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{message.text}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-4 px-6 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                !canSubmit
                  ? "bg-gray-500/50 text-gray-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{loadingText}</span>
                </>
              ) : !walletClient ? (
                <>
                  <Wallet className="w-5 h-5" />
                  <span>Connect your wallet first</span>
                </>
              ) : (
                <span>{buttonText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
