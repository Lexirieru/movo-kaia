import { ReceiverInGroup } from "./receiverInGroupTemplate";

export interface WithdrawHistory {
  withdrawId?: string;
  receiverId: string;
  amount: string;
  choice?: string;
  originCurrency: string;
  targetCurrency?: string;
  networkChainId?: string;
  walletAddress?: string;
  depositWalletAddress?: string;
  bankId?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
}

export interface TransactionHistory {
  txId: string;
  txHash?: string;
  senderId: string;
  senderName: string;
  receiverName: string;
  groupId: string;
  nameOfGroup: string;
  totalAmount: string;
  Receiver: ReceiverInGroup[];
  totalReceiver: string;
  blockNumber: string;
  blockHash: string;
  from: string;
  to: string;
  status: string;
  gasUsed: string;
  gasPrice: string;
  timeStmap: string;
  originCurrency: string;
  depositWalletAddress?: string;
  tokenIcon?: string;
}

export interface IncomingTransaction {
  receiverWalletAddress: string;
  receiverId: string;
  availableAmount: string;
  originCurrency: string;
  senderWalletAddress: string;
  senderName: string;
  createdAt: Date;
  // Additional onchain metadata
  escrowId?: string;
  transactionHash?: string;
  blockNumber?: number;
  allocatedAmount?: string;
  withdrawnAmount?: string;
  hasWithdrawn?: boolean;
  // Token metadata
  tokenAddress?: string;
  tokenType?: string;
  tokenIcon?: string;
}
