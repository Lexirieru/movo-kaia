"use client";
import { useState } from "react";
import { X, Plus, Trash2, Wallet } from "lucide-react";
import { ReceiverInGroup } from "@/types/receiverInGroupTemplate";
import { useAuth } from "@/lib/userContext";
import { addReceiverToGroup, saveEscrowToDatabase } from "@/app/api/api";
import { useParams } from "next/navigation";
import { useWalletClientHook } from "@/lib/useWalletClient";
import {
  createEscrowOnchain,
  parseTokenAmount,
  addReceiver,
} from "@/lib/smartContract";

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateStream: (stream: ReceiverInGroup) => void;
  //If there is already escrow
  existingEscrow?: {
    escrowId: string;
    tokenType: "USDC" | "IDRX";
  };
}

interface ReceiverData {
  id: string;
  address: string;
  fullname: string;
  amount: string;
}

interface FormData {
  token: "USDC" | "IDRX" | null;
  receivers: ReceiverData[];
}

// Available tokens for escrow
const AVAILABLE_TOKENS = [
  {
    symbol: "USDC",
    name: "USD Coin (Base)",
    icon: "💵",
    description: "USDC on Base Network",
    escrowType: "EscrowUSDC",
  },
  {
    symbol: "IDRX",
    name: "IDRX Token (Base)",
    icon: "🔗",
    description: "IDRX on Base Network",
    escrowType: "EscrowIDRX",
  },
];

export default function CreateStreamModal({
  isOpen,
  onClose,
  onCreateStream,
  existingEscrow,
}: CreateStreamModalProps) {
  const params = useParams();
  const groupId = params.groupId as string;
  const { user } = useAuth();
  const walletClient = useWalletClientHook();

  const initialFormData: FormData = existingEscrow
    ? {
        token: existingEscrow.tokenType,
        receivers: [{ id: "1", address: "", fullname: "", amount: "" }],
      }
    : {
        token: null,
        receivers: [{ id: "1", address: "", fullname: "", amount: "" }],
      };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

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
  const loadingText = isAddReceiverMode ? "Adding Receiver" : "Creating Escrow";
  const handleTokenSelect = (token: "USDC" | "IDRX") => {
    setFormData({ ...formData, token });
  };

  const addNewReceiver = () => {
    if (isAddReceiverMode) return;
    const newId = (formData.receivers.length + 1).toString();
    setFormData({
      ...formData,
      receivers: [
        ...formData.receivers,
        { id: newId, address: "", fullname: "", amount: "" },
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
      (r) =>
        r.address.trim() &&
        r.fullname.trim() &&
        r.amount.trim() &&
        parseFloat(r.amount) > 0,
    );

    if (!isValid) {
      setMessage({
        type: "error",
        text: "Please fill in all receiver information and ensure amounts are greater than 0",
      });
      return;
    }

    if (!formData.token) {
      setMessage({ type: "error", text: "Please select a token type" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (isAddReceiverMode) {
        const receiver = formData.receivers[0];
        const parsedAmount = parseTokenAmount(
          receiver.amount,
          formData.token == "USDC" ? 6 : 2,
        );

        const escrowIdBytes = `0x${existingEscrow.escrowId}` as `0x${string}`;
        const addReceiverResult = await addReceiver(
          walletClient,
          formData.token,
          escrowIdBytes,
          receiver.address as `0x${string}`,
          parsedAmount,
        );

        if (!addReceiverResult.success) {
          throw new Error(
            addReceiverResult.error ||
              "Failed to add receiver to escrow onchain",
          );
        }

        await addReceiverToGroup(
          user._id,
          formData.token,
          formData.token === "USDC" ? "💵" : "🔗",
          groupId,
          receiver.address,
          receiver.amount,
        );

        const newStream: ReceiverInGroup = {
          _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          groupId,
          originCurrency: formData.token,
          fullname: receiver.fullname,
          tokenIcon: formData.token === "USDC" ? "💵" : "🔗",
          depositWalletAddress: receiver.address,
          amount: parseFloat(receiver.amount),
        };
        onCreateStream(newStream);
        setMessage({
          type: "success",
          text: `Receiver addedd successfully! Transaction: ${addReceiverResult.transactionHash}`,
        });
      } else {
        // Prepare escrow data for onchain creation
        const receivers = formData.receivers.map(
          (r) => r.address as `0x${string}`,
        );
        const amounts = formData.receivers.map((r) =>
          parseTokenAmount(r.amount, formData.token === "USDC" ? 6 : 2),
        );
        const totalAmount = amounts.reduce(
          (acc, amount) => acc + amount,
          BigInt(0),
        );

        // Debug logging
        console.log("Escrow data prepared:", {
          receivers,
          amounts: amounts.map((a) => a.toString()),
          totalAmount: totalAmount.toString(),
          tokenType: formData.token,
        });

        // Create escrow onchain first
        const escrowResult = await createEscrowOnchain(
          walletClient,
          formData.token,
          {
            receivers,
            amounts,
            totalAmount,
          },
        );

        if (!escrowResult.success) {
          throw new Error(
            escrowResult.error || "Failed to create escrow onchain",
          );
        }
        const escrowIdBytes = `0x${escrowResult.escrowId}` as `0x${string}`;
        console.log(escrowResult);

        const escrowData = {
          groupId: groupId,
          escrowId: escrowIdBytes,
          originCurrency: formData.token,
          walletAddress: walletClient.account.address,
          totalAmount: totalAmount.toString(),
          receivers: formData.receivers.map((r) => ({
            address: r.address,
            fullname: r.fullname,
            amount: r.amount,
          })),
          transactionHash: escrowResult.transactionHash ?? "",
          status: "active",
          createdAt: new Date().toISOString(),
        };

        // Save escrow data to database to link escrowId with groupId
        await saveEscrowToDatabase(escrowData);

        // If escrow created successfully onchain, save to backend
        for (const receiver of formData.receivers) {
          await addReceiverToGroup(
            user._id,
            formData.token,
            formData.token === "USDC" ? "💵" : "🔗",
            groupId,
            receiver.address,
            receiver.amount,
          );

          const newStream: ReceiverInGroup = {
            _id:
              Date.now().toString() + Math.random().toString(36).substr(2, 9),
            groupId,
            originCurrency: formData.token,
            fullname: receiver.fullname,
            tokenIcon: formData.token === "USDC" ? "💵" : "🔗",
            depositWalletAddress: receiver.address,
            amount: parseFloat(receiver.amount),
          };

          // Send to parent component
          onCreateStream(newStream);
        }

        setMessage({
          type: "success",
          text: `Escrow created successfully onchain! Transaction: ${escrowResult.transactionHash}`,
        });
      }

      // Close modal after a delay to show success message
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (e) {
      console.error("Error creating escrow:", e);
      setMessage({
        type: "error",
        text:
          e instanceof Error
            ? e.message
            : "Failed to create escrow streams. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      token: null,
      receivers: [{ id: "1", address: "", fullname: "", amount: "" }],
    });
    setMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 border border-cyan-400/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <h3 className="text-white text-xl font-semibold">
              {modalTitle}
            </h3>
            <p className="text-white/60 text-sm mt-1">
              {modalDescription}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Token Selection */}
            {!isAddReceiverMode && (
              <div>
                <label className="text-white/80 text-sm mb-3 block font-medium">
                  Select Token for Escrow
                </label>
                <select
                  value={formData.token || ""}
                  onChange={(e) =>
                    handleTokenSelect(e.target.value as "USDC" | "IDRX")
                  }
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                >
                  <option value="" disabled>
                    Choose a token
                  </option>
                  {AVAILABLE_TOKENS.map((token) => (
                    <option
                      key={token.symbol}
                      value={token.symbol}
                      className="bg-gray-800 text-white"
                    >
                      {token.symbol} - {token.description}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Selected Token Display */}
            {formData.token && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="text-2xl">
                    {formData.token === "USDC" ? "💵" : "🔗"}
                  </div>
                  <div>
                    <p className="text-cyan-300 font-medium">
                      {isAddReceiverMode ? "Existing Escrow: " : "Selected Token: "}{formData.token}
                    </p>
                    {isAddReceiverMode && (
                      <p className="text-cyan-400/80 text-sm">
                        ID: {existingEscrow.escrowId}
                      </p>
                    )}
                  </div>
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
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={receiver.fullname}
                        onChange={(e) =>
                          updateReceiver(
                            receiver.id,
                            "fullname",
                            e.target.value,
                          )
                        }
                        placeholder="Full Name"
                        className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 text-sm"
                      />
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
                        placeholder={`Amount (${formData.token || "Token"})`}
                        className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 text-sm"
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
              disabled={isLoading || !walletClient}
              className={`w-full py-4 px-6 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                isLoading || !walletClient
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
                  <span>
                    Wallet client not ready. Please try reconnecting your
                    wallet.
                  </span>
                </>
              ) : (
                <>
                  <span>{buttonText}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
