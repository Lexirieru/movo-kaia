import { X } from "lucide-react";

interface Stream {
  id: string;
  token: string;
  tokenIcon: string;
  recipient: string;
  totalAmount: number;
  totalSent: number;
}

interface StreamsTableProps {
  streams: Stream[];
  onCancelStream: (streamId: string) => void;
}

export default function StreamTable({
  streams,
  onCancelStream,
}: StreamsTableProps) {
  if (streams.length == 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-12 text-center">
        <div className="text-white/40 mb-2">No streams found</div>
        <div className="text-white/60 text-sm">
          Try adjusting your search terms or create a new stream
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-white/80 font-medium">Token</th>
              <th className="text-left p-4 text-white/80 font-medium">
                Recipient
              </th>
              <th className="text-left p-4 text-white/80 font-medium">
                Total Amount
              </th>
              <th className="text-left p-4 text-white/80 font-medium">
                Claimed
              </th>
              <th className="text-left p-4 text-white/80 font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {streams.map((stream) => (
              <tr
                key={stream.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{stream.tokenIcon}</span>
                    <span className="text-white font-medium">
                      {stream.token}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-white/80 font-mono text-sm">
                    {stream.recipient}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-white font-medium">
                    {stream.totalAmount.toLocaleString()}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-white text-sm">
                      {stream.totalSent}/{stream.totalAmount}
                    </span>
                    <div className="w-24 bg-white/10 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((stream.totalSent / stream.totalAmount) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-white/60 text-xs">
                      {((stream.totalSent / stream.totalAmount) * 100).toFixed(
                        1,
                      )}
                      %
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center">
                    <button
                      onClick={() => onCancelStream(stream.id)}
                      className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center space-x-1"
                    >
                      {/* <X className="w-3 h-3"/> */}
                      <span>Refund</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile */}
      <div className="lg:hidden space-y-4 p-4">
        {streams.map((stream) => (
          <div
            key={stream.id}
            className="bg-white/10 rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{stream.tokenIcon}</span>
                <div>
                  <div className="text-white font-medium">{stream.token}</div>
                  <div className="text-white/60 text-sm font-mono">
                    {stream.recipient}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-white/60 text-xs mb-1">Total Amount</div>
                <div className="text-white font-medium">
                  {stream.totalAmount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs text-white/60 mb-2">
                <span>Progress</span>
                <span>
                  {stream.totalSent}/{stream.totalAmount}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((stream.totalSent / stream.totalAmount) * 100, 100)}%`,
                  }}
                ></div>
              </div>
              <div className="text-right text-xs text-white/60 mt-1">
                {((stream.totalSent / stream.totalAmount) * 100).toFixed(1)}%
              </div>
            </div>

            <div className="flex items-center space-x-2">
                <button
                    onClick={() => onCancelStream(stream.id)}
                    className="flex-1 bg-red-500/20 text-red-400 py-2 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center justify-center space-x-1"
                >
                    <X className="w-4 h-4"></X>
                    <span>Refund</span>
                </button>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
