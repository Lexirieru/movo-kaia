import { GroupOfUser, ReceiverInGroup } from "@/types/receiverInGroupTemplate";
import { Users, Send, CheckCircle2 } from "lucide-react";
import { g } from "motion/react-client";

interface GroupStatsCardsProps {
  groups: GroupOfUser[];
}

const getTotalAmount = (
  receivers: ReceiverInGroup[] | undefined | null,
): number => {
  if (!Array.isArray(receivers)) return 0;
  return receivers.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
};

export default function GroupStatsCards({ groups }: GroupStatsCardsProps) {
  const totalGroups = groups.length;
  const totalRecipients = groups.reduce(
    (acc, g) => acc + (g.Receivers?.length || 0),
    0,
  );
  const totalAmount = groups.reduce(
    (acc, g) => acc + getTotalAmount(g.Receivers),
    0,
  );

  const formattedAmount =
    typeof totalAmount === "number" && !isNaN(totalAmount)
      ? totalAmount.toFixed(2)
      : "0.00";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Kartu Total Grup */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-cyan-400" />
          <div>
            <div className="text-2xl font-bold text-white">{totalGroups}</div>
            <div className="text-white/60 text-sm">Total Groups</div>
          </div>
        </div>
      </div>

      {/* Kartu Total Penerima */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center space-x-3">
          <Send className="w-8 h-8 text-green-400" />
          <div>
            <div className="text-2xl font-bold text-white">
              {totalRecipients}
            </div>
            <div className="text-white/60 text-sm">Total Recipients</div>
          </div>
        </div>
      </div>

      {/* Kartu Total USDC */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center space-x-3">
          <CheckCircle2 className="w-8 h-8 text-purple-400" />
          <div>
            <div className="text-2xl font-bold text-white">
              {formattedAmount}
            </div>
            <div className="text-white/60 text-sm">Total USDC</div>
          </div>
        </div>
      </div>
    </div>
  );
}
