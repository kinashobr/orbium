import { useState, useEffect, useCallback } from 'react';
import { getConnectToken, syncPluggyData, PluggySyncData } from '../lib/pluggy';
import { useToast } from '../components/ui/use-toast';

export const usePluggy = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectedItems, setConnectedItems] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedItems = localStorage.getItem('pluggy_items');
    if (savedItems) {
      const items = JSON.parse(savedItems);
      setConnectedItems(items);
      setIsConnected(items.length > 0);
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      return await getConnectToken();
    } catch (error) {
      toast({ title: 'Erro ao conectar', description: 'Não foi possível obter o token de conexão.' });
      throw error;
    }
  }, [toast]);

  const syncItem = useCallback(async (itemId: string): Promise<PluggySyncData | null> => {
    setIsSyncing(true);
    try {
      const data = await syncPluggyData(itemId);
      setLastSync(new Date());
      if (!connectedItems.includes(itemId)) {
        const newItems = [...connectedItems, itemId];
        setConnectedItems(newItems);
        localStorage.setItem('pluggy_items', JSON.stringify(newItems));
        setIsConnected(true);
      }
      return data;
    } catch (error) {
      toast({ title: 'Erro na sincronização', description: 'Não foi possível sincronizar os dados.' });
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [connectedItems, toast]);

  const disconnectItem = useCallback((itemId: string) => {
    const newItems = connectedItems.filter(id => id !== itemId);
    setConnectedItems(newItems);
    localStorage.setItem('pluggy_items', JSON.stringify(newItems));
    setIsConnected(newItems.length > 0);
  }, [connectedItems]);

  return { isConnected, isSyncing, connectedItems, lastSync, connect, syncItem, disconnectItem };
};