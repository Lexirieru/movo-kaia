"use client";

import React, { useState, useEffect } from "react";
import {
  getEscrowEventHistory,
  getUserEscrowEvents,
  getEscrowEventStatistics,
} from "@/app/api/api";

interface EscrowEvent {
  _id: string;
  eventType: string;
  escrowId: string;
  groupId: string;
  transactionHash: string;
  blockNumber?: string;
  initiatorId: string;
  initiatorWalletAddress: string;
  initiatorName: string;
  tokenType: string;
  eventData: any;
  metadata: any;
  status: string;
  blockTimestamp?: Date;
  createdAt: Date;
}

interface EventHistoryProps {
  userId?: string;
  walletAddress?: string;
  escrowId?: string;
  showUserEvents?: boolean;
  showStatistics?: boolean;
}

const EventTypeColors = {
  ESCROW_CREATED: "bg-green-100 text-green-800 border-green-200",
  TOPUP_FUNDS: "bg-blue-100 text-blue-800 border-blue-200",
  ADD_RECIPIENTS: "bg-purple-100 text-purple-800 border-purple-200",
  REMOVE_RECIPIENTS: "bg-red-100 text-red-800 border-red-200",
  UPDATE_RECIPIENTS_AMOUNT: "bg-yellow-100 text-yellow-800 border-yellow-200",
  WITHDRAW_FUNDS: "bg-orange-100 text-orange-800 border-orange-200",
  ESCROW_COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",
};

const EventTypeLabels = {
  ESCROW_CREATED: "Escrow Created",
  TOPUP_FUNDS: "Funds Added",
  ADD_RECIPIENTS: "Recipients Added",
  REMOVE_RECIPIENTS: "Recipients Removed",
  UPDATE_RECIPIENTS_AMOUNT: "Amount Updated",
  WITHDRAW_FUNDS: "Funds Withdrawn",
  ESCROW_COMPLETED: "Escrow Completed",
};

export const EscrowEventHistory: React.FC<EventHistoryProps> = ({
  userId,
  walletAddress,
  escrowId,
  showUserEvents = false,
  showStatistics = false,
}) => {
  const [events, setEvents] = useState<EscrowEvent[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "24h" | "7d" | "30d" | "90d" | "all"
  >("30d");

  useEffect(() => {
    fetchEventData();
  }, [userId, walletAddress, escrowId, selectedTimeRange]);

  const fetchEventData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (escrowId) {
        // Fetch specific escrow events
        const response = await getEscrowEventHistory(escrowId);
        setEvents(response.data.events || []);
      } else if (showUserEvents && userId && walletAddress) {
        // Fetch user's all escrow events
        const response = await getUserEscrowEvents(userId, walletAddress);
        setEvents(response.data.allEvents || []);

        if (showStatistics) {
          const statsResponse = await getEscrowEventStatistics(
            userId,
            walletAddress,
            selectedTimeRange,
          );
          setStatistics(statsResponse.data);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch event data");
      console.error("Error fetching escrow events:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatEventData = (eventType: string, eventData: any) => {
    switch (eventType) {
      case "ESCROW_CREATED":
        return (
          <div className="text-sm">
            <p>
              <span className="font-medium">Total Amount:</span>{" "}
              {eventData.totalAmount} USDC
            </p>
            <p>
              <span className="font-medium">Recipients:</span>{" "}
              {eventData.recipients?.length || 0}
            </p>
          </div>
        );
      case "TOPUP_FUNDS":
        return (
          <div className="text-sm">
            <p>
              <span className="font-medium">Topup Amount:</span>{" "}
              {eventData.topupAmount} USDC
            </p>
          </div>
        );
      case "ADD_RECIPIENTS":
        return (
          <div className="text-sm">
            <p>
              <span className="font-medium">New Recipients:</span>{" "}
              {eventData.newRecipients?.length || 0}
            </p>
          </div>
        );
      default:
        return (
          <div className="text-sm text-gray-600">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(eventData, null, 2)}
            </pre>
          </div>
        );
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading event history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="text-red-400">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error Loading Events
            </h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {escrowId ? `Escrow Events - ${escrowId}` : "Your Escrow Activity"}
        </h2>

        {showUserEvents && (
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        )}
      </div>

      {/* Statistics */}
      {showStatistics && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-800">
              Escrows Created
            </h3>
            <p className="text-2xl font-bold text-green-900">
              {statistics.summary.escrowsCreated}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800">Topups</h3>
            <p className="text-2xl font-bold text-blue-900">
              {statistics.summary.topups}
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-purple-800">
              Recipient Changes
            </h3>
            <p className="text-2xl font-bold text-purple-900">
              {statistics.summary.recipientChanges}
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-orange-800">Withdrawals</h3>
            <p className="text-2xl font-bold text-orange-900">
              {statistics.summary.withdrawals}
            </p>
          </div>
        </div>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No events found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {escrowId
              ? "This escrow has no recorded events yet."
              : "You haven't performed any escrow actions yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event._id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${EventTypeColors[event.eventType as keyof typeof EventTypeColors] || EventTypeColors.ESCROW_COMPLETED}`}
                    >
                      {EventTypeLabels[
                        event.eventType as keyof typeof EventTypeLabels
                      ] || event.eventType}
                    </span>
                    <span className="text-sm text-gray-500">
                      {event.tokenType}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {event.initiatorName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {event.initiatorWalletAddress.slice(0, 6)}...
                        {event.initiatorWalletAddress.slice(-4)}
                      </p>
                    </div>
                    {!escrowId && (
                      <div>
                        <p className="text-sm text-gray-700">
                          Escrow: {event.escrowId}
                        </p>
                      </div>
                    )}
                  </div>

                  {formatEventData(event.eventType, event.eventData)}
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {formatDate(event.blockTimestamp || event.createdAt)}
                  </p>
                  <a
                    href={`https://etherscan.io/tx/${event.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    View Transaction
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
