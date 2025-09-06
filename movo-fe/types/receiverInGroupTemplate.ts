export interface ReceiverInGroup {
  _id: string;
  fullname?: string;
  groupId: string;
  // Token
  originCurrency: string;
  tokenIcon: string;
  // receiverAddress
  depositWalletAddress: string;
  amount: number;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  icon: string;
  balance: number;
}

export interface GroupOfUser {
  groupId: string;
  nameOfGroup: string;
  senderId: string;
  senderName: string;
  Receivers: ReceiverInGroup[];
  totalRecipients?: number; // optional
  createdAt?: string; // dari timestamps mongoose
  updatedAt?: string; // dari timestamps mongoose
  escrowId?: string
}

export interface BankAccountInformation {
  bankId?: string;
  bankName: string;
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
}
