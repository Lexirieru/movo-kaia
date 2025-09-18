import {
  X,
  ChevronDown,
  Building2,
  CreditCard,
  Mail,
  ArrowRight,
  AlertTriangle,
  Plus,
  Info,
} from "lucide-react";
import { DollarSign } from "lucide-react";
import { bankDictionary } from "@/lib/dictionary";
import FormInput from "@/app/register/components/FormInput";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/userContext";
import { useRouter } from "next/navigation";
import {
  addBankAccountToDatabase,
  changeBankAccount,
  getBankAccount,
  getBankAccountFromDatabase,
  // getBankAccountFromDatabase,
  getUsdcIdrxRate,
} from "@/app/api/api";
import { BankAccountInformation } from "@/types/receiverInGroupTemplate";
import { parseTokenAmount, withdrawUSDCTofiat } from "@/lib/smartContract";
import { useWalletClientHook } from "@/lib/useWalletClient";

interface BankFormProps {
  bankForm: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectBank: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  isProcessing?: boolean;
  claimAmount?: number;
  netAmount?: number;
  protocolFee?: number;
}

interface SyntheticChangeEvent {
  target: {
    name: string;
    value: string;
  };
}

interface SavedBankAccount {
  id: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankCode: string;
}

export default function BankForm({
  bankForm,
  onChange,
  onCancel,
  // onSelectBank,
  // onConfirm,
  isProcessing,
  claimAmount = 0,
  netAmount = 0,
  protocolFee = 0,
}: BankFormProps) {
  const router = useRouter();
  const [bankAccountData, setBankAccountData] =
    useState<BankAccountInformation>();
  const [originalData, setOriginalData] = useState<BankAccountInformation>();
  const [hasFetched, setHasFetched] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [rate, setRate] = useState<number | null>(null);
  const walletClient = useWalletClientHook();
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

  // State untuk saved bank accounts dan Add Bank popup
  const [savedBankAccounts, setSavedBankAccounts] = useState<
    SavedBankAccount[]
  >([]);
  const [showAddBankPopup, setShowAddBankPopup] = useState(false);
  const [showSavedBankDropdown, setShowSavedBankDropdown] = useState(false);
  const [selectedSavedBank, setSelectedSavedBank] =
    useState<SavedBankAccount | null>(null);
  const { user, loading } = useAuth();
  const MIN_PAYOUT_AMOUNT = 2;
  const MAX_PAYOUT_AMOUNT = 5000;
  const isFormValid =
    bankForm.bankName &&
    bankForm.bankAccountNumber &&
    claimAmount >= MIN_PAYOUT_AMOUNT &&
    claimAmount <= MAX_PAYOUT_AMOUNT;
  const estimatedTime = "1-3 business days";

  const triggerChange = (name: string, value: string): void => {
    const syntheticEvent: SyntheticChangeEvent = {
      target: { name, value },
    };
    onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
  };

  // cek apakah ada perubahan
  const isChanged =
    originalData &&
    (bankForm.bankName !== originalData.bankName ||
      bankForm.bankAccountNumber !== originalData.bankAccountNumber ||
      bankForm.bankAccountName !== originalData.bankAccountName);

  useEffect(() => {
    if (loading || !user?._id || !user.email || hasFetched) return;

    const fetchBankAccountData = async () => {
      try {
        setIsFetching(true);
        const data = await getBankAccount(user._id);
        const listOfBankAccount = await getBankAccountFromDatabase(user._id);
        // asumsi listOfBankAccount bentuknya array dari bank accounts

        setSavedBankAccounts(
          listOfBankAccount.map((bank: any) => ({
            id: bank._id,
            bankName: bank.bankName,
            bankAccountNumber: bank.bankAccountNumber,
            bankAccountName: bank.bankAccountName,
            bankCode: bank.bankCode,
          })),
        );

        if (!data?.data) {
          setIsFetching(false);
          setHasFetched(true);
          return;
        }

        const initBankAccountInformation: BankAccountInformation = {
          bankId: data.data.bankId,
          bankName: data.data.bankName,
          bankCode: data.data.bankCode,
          bankAccountNumber: data.data.bankAccountNumber,
          bankAccountName: data.data.bankAccountName,
        };

        setBankAccountData(initBankAccountInformation);
        setOriginalData(initBankAccountInformation);

        // isi ke form
        onChange({
          target: {
            name: "bankName",
            value: initBankAccountInformation.bankName,
          },
        } as any);
        onChange({
          target: {
            name: "bankAccountNumber",
            value: initBankAccountInformation.bankAccountNumber,
          },
        } as any);
        onChange({
          target: {
            name: "bankAccountName",
            value: initBankAccountInformation.bankAccountName,
          },
        } as any);

        setHasFetched(true);
      } catch (err) {
        console.error("Failed to fetch bank account data", err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchBankAccountData();
  }, [loading, user, hasFetched, onChange]);

  // 👇 tampilkan loading screen sampai fetch selesai
  if (isFetching) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        <span className="ml-3 text-white/70">Loading bank account...</span>
      </div>
    );
  }

  const handleConfirmChanges = async (): Promise<void> => {
    if (!user?.id) return;
    try {
      setIsConfirming(true);
      console.log(bankForm);
      const bankCode = bankDictionary[bankForm.bankName];

      if (!bankCode) {
        throw new Error("Invalid bank name");
      }
      await changeBankAccount(user._id, bankForm.bankAccountNumber, bankCode);

      // // setelah sukses, ambil lagi data terbaru dari backend
      const refreshed = await getBankAccount(user?._id);
      console.log(refreshed);
      if (refreshed?.data) {
        const updated: BankAccountInformation = {
          bankId: refreshed.data.bankId,
          bankName: refreshed.data.bankName,
          bankCode: refreshed.data.bankCode,
          bankAccountNumber: refreshed.data.bankAccountNumber,
          bankAccountName: refreshed.data.bankAccountName,
        };

        setOriginalData(updated);
        setBankAccountData(updated);

        // isi lagi ke form (supaya Account Holder Name ke-update)
        onChange({
          target: { name: "bankName", value: updated.bankName },
        } as any);
        onChange({
          target: {
            name: "bankAccountNumber",
            value: updated.bankAccountNumber,
          },
        } as any);
        onChange({
          target: { name: "bankAccountName", value: updated.bankAccountName },
        } as any);
      }
    } catch (err) {
      console.error("Failed to update bank account", err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSaveBankAccount = async (newBankData: {
    bankName: string;
    bankAccountNumber: string;
  }): Promise<void> => {
    if (!user?._id) return;
    try {
      setIsConfirming(true);
      const bankCode = bankDictionary[newBankData.bankName];
      if (!bankCode) {
        throw new Error("Invalid bank name");
      }
      // harus changeBankAccount karena
      const addBankAccount = await addBankAccountToDatabase(
        user._id,
        newBankData.bankAccountNumber,
        bankCode,
      );
      // setelah sukses, ambil lagi data terbaru dari backend
      const refreshed = await getBankAccount(user._id);
      if (refreshed?.data) {
        const updated: BankAccountInformation = {
          bankId: refreshed.data.bankId,
          bankName: refreshed.data.bankName,
          bankCode: refreshed.data.bankCode,
          bankAccountNumber: refreshed.data.bankAccountNumber,
          bankAccountName: refreshed.data.bankAccountName,
        };

        setOriginalData(updated);
        setBankAccountData(updated);

        // isi lagi ke form utama dengan data terbaru
        triggerChange("bankName", updated.bankName);
        triggerChange("bankAccountNumber", updated.bankAccountNumber);
        triggerChange("bankAccountName", updated.bankAccountName);
      }

      // 🔥 JANGAN tutup popup! Biarkan user close manual setelah liat account holder name
      // setShowAddBankPopup(false);
    } catch (err) {
      console.error("Failed to save bank account", err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSelectSavedBank = (savedBank: SavedBankAccount) => {
    setSelectedSavedBank(savedBank);
    triggerChange("bankName", savedBank.bankName);
    triggerChange("bankAccountNumber", savedBank.bankAccountNumber);
    triggerChange("bankAccountName", savedBank.bankAccountName);
    setShowSavedBankDropdown(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (originalData) {
      triggerChange("bankName", originalData.bankName);
      triggerChange("bankAccountNumber", originalData.bankAccountNumber);
      triggerChange("bankAccountName", originalData.bankAccountName);
    }
  };

  const handleWithdraw = async (): Promise<void> => {
    if (!user?.depositWalletAddress || !user?.escowId) {
      console.error("User deposit wallet address or escrow ID is missing");
      return;
    }

    try {
      setIsConfirming(true);
      const amountParsed = parseTokenAmount(claimAmount.toString(), 6);
      const depositWalletAddress = user.depositWalletAddress;
      const escrowId = user.escrowId;

      const txHash = await withdrawUSDCTofiat(
        walletClient,
        escrowId,
        amountParsed,
        depositWalletAddress,
      );

      console.log("Transaction submitted:", txHash);
    } catch (error) {
      console.error("Failed to withdraw:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bank Account Form */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Building2 className="w-6 h-6 text-green-400" />
            <h4 className="text-white font-medium">Bank Account Details</h4>
          </div>

          {/* Add Bank Button */}
          <button
            onClick={() => setShowAddBankPopup(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bank</span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Saved Banks Dropdown */}
          <div className="relative">
            <label className="text-white/80 text-sm mb-2 block">
              Saved Bank Accounts
            </label>
            <button
              onClick={() => setShowSavedBankDropdown(!showSavedBankDropdown)}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors flex items-center justify-between group"
            >
              {selectedSavedBank ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {selectedSavedBank.bankName}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {selectedSavedBank.bankAccountNumber} •{" "}
                      {selectedSavedBank.bankAccountName}
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-gray-400">
                  Select from saved banks or add new bank
                </span>
              )}
              <ChevronDown
                className={`w-5 h-5 text-gray-400 group-hover:text-white transition-all ${showSavedBankDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown Menu */}
            {showSavedBankDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-white/10 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                {savedBankAccounts.length > 0 ? (
                  savedBankAccounts.map((bank) => (
                    <button
                      key={bank.id}
                      onClick={() => handleSelectSavedBank(bank)}
                      className="w-full p-4 hover:bg-white/10 transition-colors flex items-center space-x-3 text-left border-b border-white/5 last:border-b-0"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {bank.bankName}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {bank.bankAccountNumber} • {bank.bankAccountName}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-400">
                    No saved bank accounts. Add one to get started.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Current Form Fields - Show only if bank is selected */}
          {(selectedSavedBank || bankForm.bankName) && (
            <>
              <div>
                <label className="text-white/80 text-sm mb-2 block">
                  Selected Bank
                </label>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {bankForm.bankName}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Code: {bankDictionary[bankForm.bankName]}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <FormInput
                type="text"
                name="bankAccountNumber"
                placeholder="Bank Account Number"
                value={bankForm.bankAccountNumber}
                onChange={onChange}
                icon={CreditCard}
                required
                disabled
                readOnly={!!selectedSavedBank}
              />

              <FormInput
                type="text"
                name="bankAccountName"
                placeholder="Account Holder Name"
                value={bankForm.bankAccountName}
                onChange={() => {}} // kosongin, supaya nggak bisa diubah
                icon={Mail}
                disabled
                readOnly
              />
            </>
          )}
        </div>
      </div>

      {/* Show confirm changes button jika ada perubahan */}
      {isChanged && (
        <button
          onClick={handleConfirmChanges}
          disabled={isConfirming}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-all font-medium flex items-center justify-center space-x-2"
        >
          {isConfirming ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Confirming...</span>
            </>
          ) : (
            <span>Confirm Changes</span>
          )}
        </button>
      )}

      {/* Add Bank Popup */}
      {showAddBankPopup && (
        <AddBankPopup
          onClose={() => setShowAddBankPopup(false)}
          onSave={handleSaveBankAccount}
          isConfirming={isConfirming}
        />
      )}

      {/* Amount Summary */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-2xl p-6 border border-green-500/30">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h4 className="text-white font-semibold text-lg">
              Fiat Conversion Summary
            </h4>
          </div>

          {/* Summary Details */}
          <div className="space-y-3 text-sm">
            {/* Claim Amount */}
            <div className="flex justify-between">
              <span className="text-white/70">Claim Amount:</span>
              <span className="text-white font-medium">
                {rate
                  ? `Rp ${(claimAmount * rate).toLocaleString("id-ID")}`
                  : "Loading..."}
              </span>
            </div>

            {/* Protocol Fee */}
            <div className="flex justify-between items-start">
              <div className="text-white/70 max-w-xs">
                <span className="font-medium">Protocol Fee (0.25%):</span>
                <p className="text-xs text-white/50 mt-0.5">
                  A 0.25% protocol fee is applied to support platform operations
                  and development.
                </p>
              </div>
              <span className="text-red-400 font-medium">
                {rate
                  ? `-${(protocolFee * rate).toLocaleString("id-ID")} IDR`
                  : "Loading..."}
              </span>
            </div>

            {/* Protocol Fee */}
            <div className="flex justify-between items-start">
              <div className="text-white/70 max-w-xs">
                <span className="font-medium">Fiat Fee:</span>
                <p className="text-xs text-white/50 mt-0.5">
                  A flat Rp5.000,00 fee from IDRX payment gateway.
                </p>
              </div>
              <span className="text-red-400 font-medium">-5000 IDR</span>
            </div>

            {/* Net Amount */}
            <div className="border-t border-white/20 pt-3">
              <div className="flex justify-between items-end font-medium">
                <span className="text-white">You&apos;ll receive:</span>
                <div className="text-right">
                  {rate && (
                    <>
                      <div className="text-green-400 text-lg">
                        Rp {(netAmount * rate - 5000).toLocaleString("id-ID")}
                      </div>
                      <div className="text-green-300 text-xs mt-0.5">
                        ≈{" "}
                        {((netAmount * rate - 5000) / rate).toLocaleString(
                          "id-ID",
                        )}{" "}
                        USDC
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fiat Conversion Info */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-yellow-400 font-medium text-sm">
              Fiat Conversion Notice
            </div>
            <div className="text-white/60 text-sm mt-1">
              USDC will be converted to IDR at current market rate. Transfer to
              your bank account may take {estimatedTime}.
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          className="flex-1 bg-white/10 text-white py-3 rounded-xl hover:bg-white/20 transition-colors font-medium"
          disabled={isProcessing}
        >
          Cancel
        </button>

        <button
          onClick={handleWithdraw}
          disabled={
            !isFormValid ||
            isProcessing ||
            claimAmount < 2 ||
            claimAmount > 5000
          }
          className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${
            !isFormValid ||
            isProcessing ||
            claimAmount < 2 ||
            claimAmount > 5000
              ? "bg-gray-600 text-white/50 cursor-not-allowed"
              : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:scale-105"
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <DollarSign className="w-5 h-5" />
              <span>Claim as Fiat</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Add Bank Popup Component
function AddBankPopup({
  onClose,
  onSave,
  isConfirming,
}: {
  onClose: () => void;
  onSave: (bankData: {
    bankName: string;
    bankAccountNumber: string;
  }) => Promise<void>;
  isConfirming: boolean;
}) {
  const { user, loading } = useAuth();
  const [newBankForm, setNewBankForm] = useState({
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "", // 🔥 Akan di-populate dari backend setelah save
  });
  const [showBankSelector, setShowBankSelector] = useState(false);
  const [hasSaved, setHasSaved] = useState(false); // 🔥 Track apakah sudah save
  const [savedbankAccountName, setSavedbankAccountName] = useState(""); // 🔥 Simpan nama yang di-fetch

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewBankForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBankSelect = (bankName: string) => {
    setNewBankForm((prev) => ({
      ...prev,
      bankName,
    }));
    setShowBankSelector(false);
  };

  const handleSave = async () => {
    try {
      // 🔥 Panggil function dari parent
      await onSave({
        bankName: newBankForm.bankName,
        bankAccountNumber: newBankForm.bankAccountNumber,
      });

      // 🔥 Setelah save berhasil, fetch data terbaru untuk mendapatkan account holder name
      if (user?.email) {
        const refreshed = await getBankAccount(user._id);
        if (refreshed?.data?.bankAccountName) {
          setSavedbankAccountName(refreshed.data.bankAccountName);
          setHasSaved(true); // 🔥 Mark sebagai sudah saved
        }
      }
    } catch (err) {
      console.error("Failed to save bank account", err);
    }
  };

  // 🔥 Validasi hanya perlu bank name dan account number
  const isValid = newBankForm.bankName && newBankForm.bankAccountNumber;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white text-xl font-semibold">
            Add New Bank Account
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Bank Selection */}
          <div>
            <label className="text-white/80 text-sm mb-2 block">
              Bank Name
            </label>
            <button
              onClick={() => setShowBankSelector(true)}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors flex items-center justify-between group"
            >
              {newBankForm.bankName ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {newBankForm.bankName}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Code: {bankDictionary[newBankForm.bankName]}
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-gray-400">Select your bank</span>
              )}
              <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>
          </div>

          {/* Account Number */}
          <FormInput
            type="text"
            name="bankAccountNumber"
            placeholder="Bank Account Number"
            value={newBankForm.bankAccountNumber}
            onChange={handleInputChange}
            icon={CreditCard}
            required
          />

          {/* Account Holder Name - Show status based on save state */}
          <div>
            <label className="text-white/80 text-sm mb-2 block">
              Account Holder Name
            </label>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                {hasSaved && savedbankAccountName ? (
                  // 🔥 Tampilkan nama setelah berhasil save
                  <div className="flex-1">
                    <div className="text-white font-medium">
                      {savedbankAccountName}
                    </div>
                    <div className="text-green-400 text-xs mt-1">
                      ✓ Successfully fetched from bank
                    </div>
                  </div>
                ) : hasSaved && isConfirming ? (
                  // 🔥 Loading state setelah save
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-white/70 text-sm">
                      Fetching account holder name...
                    </span>
                  </div>
                ) : (
                  // 🔥 Default state sebelum save
                  <span className="text-gray-400 text-sm">
                    Will be fetched from bank after saving
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!isValid || isConfirming}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl transition-all font-medium flex items-center justify-center space-x-2"
          >
            {isConfirming ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : hasSaved && savedbankAccountName ? (
              // 🔥 Show success state
              <span>✓ Bank Account Saved</span>
            ) : (
              <span>Save Bank Account</span>
            )}
          </button>

          {/* 🔥 Success message dengan instruksi untuk close */}
          {hasSaved && savedbankAccountName && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <div className="text-green-400 font-medium text-sm">
                    Bank Account Added Successfully!
                  </div>
                  <div className="text-white/60 text-sm mt-1">
                    Your bank account has been verified and account holder name
                    has been fetched. You can close this popup using the ×
                    button above.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bank Selector in Popup */}
      {showBankSelector && (
        <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-96 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg font-semibold">Select Bank</h3>
              <button
                onClick={() => setShowBankSelector(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {Object.keys(bankDictionary).map((bankName) => (
                <button
                  key={bankName}
                  onClick={() => handleBankSelect(bankName)}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors flex items-center space-x-3 text-left"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">{bankName}</div>
                    <div className="text-gray-400 text-sm">
                      Code: {bankDictionary[bankName]}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
