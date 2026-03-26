import React, { useState } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';
import { Button } from '../ui/button';
import { usePluggy } from '../../hooks/usePluggy';
import { useToast } from '../ui/use-toast';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';

export const PluggyConnectButton = () => {
  const { connect, syncItem, isSyncing, connectedItems, disconnectItem } = usePluggy();
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      const token = await connect();
      if (token) setIsWidgetOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const onSuccess = async (itemId: string) => {
    setIsWidgetOpen(false);
    toast({ title: 'Conectado com sucesso!', description: 'Sincronizando dados...' });
    await syncItem(itemId);
  };

  const onError = (error: any) => {
    console.error(error);
    toast({ title: 'Erro na conexão', description: 'Não foi possível conectar à conta.' });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleConnect} variant="outline" className="w-full">
        Conectar Banco
      </Button>

      {isWidgetOpen && (
        <PluggyConnect
          connectToken={/* Token obtido via connect() */}
          onSuccess={onSuccess}
          onError={onError}
          onExit={() => setIsWidgetOpen(false)}
        />
      )}

      {connectedItems.map(itemId => (
        <div key={itemId} className="flex items-center justify-between p-2 border rounded text-sm">
          <span>Conta {itemId.slice(0, 8)}...</span>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => syncItem(itemId)} disabled={isSyncing}>
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => disconnectItem(itemId)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};