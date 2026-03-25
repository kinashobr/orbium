import React, { useState } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';
import { Button } from '@/components/ui/button';
import { usePluggy } from '@/hooks/usePluggy';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Trash2, Building2 } from 'lucide-react';

export const PluggyConnectButton = () => {
  const { isConnected, isSyncing, lastSync, getConnectToken, syncItem, disconnectItem, connectedItems } = usePluggy();
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      const accessToken = await getConnectToken();
      setToken(accessToken);
      setIsOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const onSuccess = (itemId: string) => {
    setIsOpen(false);
    syncItem(itemId);
  };

  const onError = (error: any) => {
    toast.error('Erro na conexão bancária');
    console.error(error);
  };

  if (isConnected) {
    return (
      <div className="flex flex-col gap-2 p-2 border rounded-md bg-muted/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Conectado</span>
          <span className="truncate max-w-[100px]">{lastSync}</span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1" 
            onClick={() => connectedItems.forEach(syncItem)}
            disabled={isSyncing}
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => connectedItems.forEach(disconnectItem)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" className="w-full justify-start gap-2" onClick={handleConnect}>
        <Building2 className="w-4 h-4" />
        Conectar Banco
      </Button>
      {isOpen && token && (
        <PluggyConnect
          connectToken={token}
          onSuccess={onSuccess}
          onError={onError}
          onExit={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
