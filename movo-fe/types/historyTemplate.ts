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
  receiverName : string;
  groupId: string;
  groupName: string; 
  totalAmount: string;
  Receiver : ReceiverInGroup[];
  totalReceiver : string;
  blockNumber : string;
  blockHash : string;
  from : string;
  to : string;
  status : string;
  gasUsed : string;
  gasPrice : string;
  timeStmap : string;
  originCurrency : string;
  depositWalletAddress?: string;
  tokenIcon? : string;
}
