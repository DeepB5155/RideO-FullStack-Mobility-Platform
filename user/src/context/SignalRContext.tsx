import React, { createContext, useContext, useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '@env';
import { API_BASE_URL } from '../api/axios';
import { AuthContext } from './AuthContext';
import { TokenHelper } from '../utils/tokenHelper';

interface SignalRContextProps {
  connection: signalR.HubConnection | null;
}

export const SignalRContext = createContext<SignalRContextProps>({
  connection: null,
});

export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    let newConnection: signalR.HubConnection | null = null;

    const initConnection = async () => {
      const token = await TokenHelper.getToken();
      if (!token) return;

      const hubUrl = SIGNALR_HUB_URL || API_BASE_URL.replace('/api', '/rideHub');
      
      newConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, { accessTokenFactory: () => token })
        .withAutomaticReconnect()
        .build();

      setConnection(newConnection);
      
      try {
        await newConnection.start();
        console.log('User App SignalR connected globally');
      } catch (e) {
        console.log('User App SignalR connection error: ', e);
      }
    };

    if (user) {
      initConnection();
    }

    return () => {
      if (newConnection) {
        newConnection.stop();
      }
    };
  }, [user]);

  return (
    <SignalRContext.Provider value={{ connection }}>
      {children}
    </SignalRContext.Provider>
  );
};
