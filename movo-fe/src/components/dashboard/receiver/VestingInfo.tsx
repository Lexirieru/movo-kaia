"use client";

import { Clock, TrendingUp, Calendar } from "lucide-react";

interface VestingInfoProps {
  vestingInfo: {
    isVestingEnabled: boolean;
    vestingStartTime: bigint;
    vestingEndTime: bigint;
    currentTime: bigint;
    vestedAmount: bigint;
    totalVestedAmount: bigint;
    vestingProgress: bigint;
  };
  tokenType: string;
}

export default function VestingInfo({ vestingInfo, tokenType }: VestingInfoProps) {
  if (!vestingInfo.isVestingEnabled) {
    return null;
  }

  const formatTokenAmount = (amount: bigint, decimals: number) => {
    const divisor = Math.pow(10, decimals);
    return (Number(amount) / divisor).toFixed(decimals === 6 ? 4 : 2);
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const formatTime = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleTimeString();
  };

  const currentTime = Number(vestingInfo.currentTime);
  const vestingStartTime = Number(vestingInfo.vestingStartTime);
  const vestingEndTime = Number(vestingInfo.vestingEndTime);
  const progress = Number(vestingInfo.vestingProgress) / 100;
  const decimals = tokenType === "IDRX" ? 2 : 6;

  const isVestingStarted = currentTime >= vestingStartTime;
  const isVestingCompleted = currentTime >= vestingEndTime;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Clock className="w-5 h-5 text-purple-400" />
        <h4 className="text-purple-300 font-medium">Vesting Information</h4>
      </div>

      <div className="space-y-3">
        {/* Vesting Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/80 text-sm">Vesting Progress</span>
            <span className="text-purple-300 font-medium">
              {progress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Vested Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/60 text-xs">Vested Amount</p>
            <p className="text-white font-semibold">
              {formatTokenAmount(vestingInfo.vestedAmount, decimals)} {tokenType}
            </p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Total Allocation</p>
            <p className="text-white font-semibold">
              {formatTokenAmount(vestingInfo.totalVestedAmount, decimals)} {tokenType}
            </p>
          </div>
        </div>

        {/* Time Information */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-white/60" />
            <div className="flex-1">
              <p className="text-white/60 text-xs">Vesting Start</p>
              <p className="text-white text-sm">
                {formatDate(vestingInfo.vestingStartTime)} at {formatTime(vestingInfo.vestingStartTime)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-white/60" />
            <div className="flex-1">
              <p className="text-white/60 text-xs">Vesting End</p>
              <p className="text-white text-sm">
                {formatDate(vestingInfo.vestingEndTime)} at {formatTime(vestingInfo.vestingEndTime)}
              </p>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="bg-white/5 rounded-lg p-3">
          {!isVestingStarted ? (
            <p className="text-yellow-400 text-sm">
              ⏳ Vesting hasn't started yet. You'll be able to claim tokens when vesting begins.
            </p>
          ) : isVestingCompleted ? (
            <p className="text-green-400 text-sm">
              ✅ Vesting completed! All tokens are now available for withdrawal.
            </p>
          ) : (
            <p className="text-blue-400 text-sm">
              🔄 Vesting in progress. You can withdraw the vested portion of your tokens.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
