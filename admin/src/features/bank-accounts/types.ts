export type BankAccountStatus = "pending" | "approved" | "rejected";
export type PaymentMethodType = "bank_account" | "upi";

export interface BankAccount {
  id: string;
  userId: string;
  type: PaymentMethodType;
  accountHolderName: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branchName?: string;
  accountType?: "savings" | "current";
  cancelledCheque?: { url: string; mime: string };
  upiId?: string;
  upiVerified?: boolean;
  isPrimary: boolean;
  status: BankAccountStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountsResponse {
  success: boolean;
  accounts: BankAccount[];
}

export interface BankAccountResponse {
  success: boolean;
  account: BankAccount;
}
