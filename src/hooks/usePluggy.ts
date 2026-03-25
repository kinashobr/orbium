import { useState, useEffect, useCallback } from 'react';
import { getPluggyConnectToken, syncPluggyData } from '@/lib/pluggy';
import { useFinance } from '@/contexts/FinanceContext';
import { toast } from 'sonner';

export const usePluggy = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectedItems, setConnectedItems] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { importPluggyAccounts, importPluggyTransactions, importPluggyCreditCards, importPluggyInvestments } = useFinance();

  useEffect(() => {
    const savedItems = localStorage.getItem('pluggy_items');
    if (savedItems) {
      const items = JSON.parse(savedItems);
      setConnectedItems(items);
      setIsConnected(items.length > 0);
    }
    const savedSync = localStorage.getItem('pluggy_last_sync');
    if (savedSync) setLastSync(savedSync);
  }, []);

  const getConnectToken = async () => {
    try {
      return await getPluggyConnectToken();
    } catch (error) {
      toast.error('Erro ao iniciar conexão com banco');
      throw error;
    }
  };

  const syncItem = async (itemId: string) => {
    setIsSyncing(true);
    try {
      const data = await syncPluggyData(itemId);
      
      importPluggyAccounts(data.accounts || []);
      importPluggyTransactions(data.transactions || []);
      importPluggyCreditCards(data.creditCards || []);
      importPluggyInvestments(data.investments || []);
      
      const now = new Date().toLocaleString();
      setLastSync(now);
      localStorage.setItem('pluggy_last_sync', now);
      
      if (!connectedItems.includes(itemId)) {
        const newItems = [...connectedItems, itemId];
        setConnectedItems(newItems);
        localStorage.setItem('pluggy_items', JSON.stringify(newItems));
        setIsConnected(true);
      }
      
      toast.success('Sincronização concluída!');
    } catch (error) {
      toast.error('Erro ao sincronizar dados');
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnectItem = (itemId: string) => {
    const newItems = connectedItems.filter(id => id !== itemId);
    setConnectedItems(newItems);
    localStorage.setItem('pluggy_items', JSON.stringify(newItems));
    setIsConnected(newItems.length > 0);
    toast.info('Conta desconectada');
  };

  return { isConnected, isSyncing, connectedItems, lastSync, getConnectToken, syncItem, disconnectItem };
};
