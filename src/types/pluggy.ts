export interface PluggyIdentity {
  id: string;
  itemId: string;
  fullName: string;
  taxNumber: string; // CPF ou CNPJ formatado
  documentType: string;
  emails: string[];
  phoneNumbers: string[];
  institutionName?: string;
  createdAt: string;
}

export interface PluggyAccount {
  id: string;
  itemId: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | string;
  name: string;
  number: string;
  agency?: string;
  balance: number;
  currencyCode: string;
  bankData?: {
    name: string;
    primaryColor?: string;
    logo?: string;
  };
}

export interface PluggyBill {
  id: string;
  accountId: string;
  dueDate: string;
  closeDate: string;
  totalAmount: number;
  minimumPaymentAmount?: number;
  totalNewCharges?: number;
  balance?: number;
  status: 'OPEN' | 'CLOSED' | 'OVERDUE' | string;
}

export interface PluggyInvestment {
  id: string;
  itemId: string;
  name: string;
  code?: string;
  type: 'FIXED_INCOME' | 'MUTUAL_FUND' | 'EQUITY' | 'ETF' | string;
  subtype?: string;
  balance: number;
  amount: number;
  currencyCode: string;
  rate?: number;
  rateType?: string;
  dueDate?: string;
  issueDate?: string;
}

export interface PluggyTransaction {
  id: string;
  accountId: string;
  description: string;
  amount: number; // Negativo para saída/débito, positivo para entrada/crédito na API Pluggy
  date: string; // YYYY-MM-DD ou ISO
  category?: string;
  type?: 'DEBIT' | 'CREDIT';
  status?: 'POSTED' | 'PENDING';
  operationType?: string;
}

export interface PluggyConfig {
  itemId: string; // Legado / principal
  itemIds?: string[]; // Lista de múltiplos Item IDs
  itemLabels?: Record<string, string>; // Rótulo opcional por itemId (ex: "Nubank", "Itaú")
  linkedAccounts: Record<string, string>; // pluggyAccountId -> orbiumAccountId
  linkedCards: Record<string, string>; // pluggyCardId -> orbiumCardAccountId
  linkedInvestments: Record<string, string>; // pluggyInvestmentId -> orbiumAccountId
  lastSyncAt?: string;
}

export interface PluggySyncPayload {
  identity: PluggyIdentity | null;
  accounts: PluggyAccount[];
  bills: PluggyBill[];
  investments: PluggyInvestment[];
  transactions: Record<string, PluggyTransaction[]>; // accountId -> transactions
  isSandboxOrDemo?: boolean;
  logs?: string[];
  rawResponse?: Record<string, any>;
}

export interface DetectedCardInstallment {
  id: string;
  cleanDescription: string;
  originalDescription: string;
  currentInstallment: number;
  totalInstallments: number;
  installmentAmount: number;
  totalAmount: number;
  firstDueDate: string;
  targetAccountId: string;
  transactionDate: string;
  pluggyTransactionId: string;
}
