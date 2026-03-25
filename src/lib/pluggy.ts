export interface PluggyAccount {
  id: string;
  name: string;
  balance: number;
  type: string;
  subtype: string;
  currencyCode: string;
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

export const getPluggyConnectToken = async (): Promise<string> => {
  const response = await fetch('/api/pluggy/connect-token', { method: 'POST' });
  if (!response.ok) throw new Error('Falha ao obter token');
  const { accessToken } = await response.json();
  return accessToken;
};

export const syncPluggyData = async (itemId: string) => {
  const response = await fetch('/api/pluggy/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId }),
  });
  if (!response.ok) throw new Error('Falha ao sincronizar dados');
  return response.json();
};
