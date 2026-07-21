import React, { createContext, useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { TokenHelper } from '../utils/tokenHelper';

export const SignalRContext = createContext({
  connection: null,
});

export const SignalRProvider = ({ children }) => {
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    let hubConnection = null;

    const connectSignalR = async () => {
      try {
        const token = TokenHelper.getToken();
        
        hubConnection = new signalR.HubConnectionBuilder()
          .withUrl(import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5248/ridehub', {
            accessTokenFactory: () => token || ''
          })
          .withAutomaticReconnect()
          .build();

        await hubConnection.start();
        setConnection(hubConnection);
        console.log('Admin Global SignalR Connected');
      } catch (err) {
        console.error('Admin Global SignalR Connection Error:', err);
      }
    };

    connectSignalR();

    return () => {
      if (hubConnection) {
        hubConnection.stop();
      }
    };
  }, []);

  return (
    <SignalRContext.Provider value={{ connection }}>
      {children}
    </SignalRContext.Provider>
  );
};
