declare module 'react-pluggy-connect' {
  import React from 'react';

  interface PluggyConnectProps {
    connectToken: string;
    onSuccess: (itemId: string) => void;
    onError: (error: any) => void;
    onExit: () => void;
  }

  export const PluggyConnect: React.FC<PluggyConnectProps>;
}