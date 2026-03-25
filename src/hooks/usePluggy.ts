import { useState, useEffect } from 'react';
import { getPluggyConnectToken, syncPluggyData } from '@/lib/pluggy';
import { useFinance } from '@/contexts/FinanceContext';
import { toast } from 'sonner';

// Regex simples para validar UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const usePluggy = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectedItems, setConnectedItems] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { importPluggyAccounts, importPluggyTransactions, importPluggyCreditCards, importPluggyInvestments } = useFinance();

  useEffect(() => {
    const savedItems = localStorage.getItem('pluggy_items');
    if (savedItems) {
      try {
        const items = JSON.parse(savedItems);
        // Filtra apenas itens válidos ao carregar
        const validItems = items.filter((id: string) => UUID_REGEX.test(id));
        if (validItems.length !== items.length) {
          console.warn("Itens inválidos removidos do localStorage:", items.filter((id: string) => !UUID_REGEX.test(id)));
          localStorage.setItem('pluggy_items', JSON.stringify(validItems));
        }
        setConnectedItems(validItems);
        setIsConnected(validItems.length > 0);
      } catch (e) {
        console.error("Erro ao carregar itens do Pluggy", e);
      }
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
    console.log("Tentando sincronizar itemId:", itemId);
    
    if (!itemId || !UUID_REGEX.test(itemId)) {
      toast.error('ID de conexão inválido.');
      console.error("Tentativa de sincronização com itemId inválido:", itemId);
      return;
    }

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
      console.error("Erro detalhado da API Pluggy:", error);
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