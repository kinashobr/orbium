export interface PluggyAccount {
  id: string;
  name: string;
  type: string;
  subtype: string;
  balance: number;
  currency: string;
  number: string;
}

export interface PluggyTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  status: string;
}

export interface PluggyInvestment {
  id: string;
  name: string;
  balance: number;
  type: string;
}

export interface PluggyCreditCardBill {
  id: string;
  dueDate: string;
  amount: number;
  status: string;
}

export interface PluggySyncData {
  accounts: PluggyAccount[];
  transactions: PluggyTransaction[];
  investments: PluggyInvestment[];
  creditCardBills: PluggyCreditCardBill[];
}

export const getConnectToken = async (): Promise<string> => {
  const response = await fetch('/api/pluggy/connect-token', {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to get connect token');
  const data = await response.json();
  return data.accessToken;
};

export const syncPluggyData = async (itemId: string): Promise<PluggySyncData> => {
  const response = await fetch('/api/pluggy/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId }),
  });
  if (!response.ok) throw new Error('Failed to sync data');
  return response.json();
};