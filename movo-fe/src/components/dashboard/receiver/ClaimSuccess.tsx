import { CheckCircle, Wallet, DollarSign, ArrowRight } from "lucide-react";

interface ClaimSuccessProps {
  amount: number;
  claimType: "crypto" | "fiat";
  onClose?: () => void;
}

export default function ClaimSuccess({ amount, claimType, onClose }: ClaimSuccessProps) {
  const fiatAmount = amount * 15850; // Mock exchange rate

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md mx-auto">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/30">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>

        {/* Success Title */}
        <h3 className="text-3xl font-bold text-white mb-4">Claim Successful!</h3>

        {/* Amount Details */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
          {claimType === "crypto" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {amount.toFixed(4)} USDC
                  </div>
                  <div className="text-white/60 text-sm">
                    ≈ Rp {fiatAmount.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 text-cyan-400">
                <span className="text-sm">Transferred to your wallet</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    Rp {fiatAmount.toLocaleString('id-ID')}
                  </div>
                  <div className="text-white/60 text-sm">
                    From {amount.toFixed(4)} USDC
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 text-green-400">
                <span className="text-sm">Converted and sent to your bank</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="space-y-3">
          <p className="text-white/60">
            Transaction completed successfully
          </p>
          
          {claimType === "fiat" && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-400 text-sm">
                💡 Bank transfer may take 1-3 business days to appear in your account
              </p>
            </div>
          )}

          {/* Auto Close Info */}
          <p className="text-white/40 text-sm">
            This modal will close automatically in a few seconds
          </p>
        </div>

        {/* Manual Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="mt-6 bg-white/10 text-white px-6 py-2 rounded-xl hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}