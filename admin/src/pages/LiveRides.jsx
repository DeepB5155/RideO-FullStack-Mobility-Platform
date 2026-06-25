import React, { useState, useEffect } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import * as signalR from '@microsoft/signalr';

const LiveRides = () => {
  const [activeDrivers, setActiveDrivers] = useState({});
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    let hubConnection;

    const connectSignalR = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        
        hubConnection = new signalR.HubConnectionBuilder()
          .withUrl('http://localhost:5248/ridehub', {
            accessTokenFactory: () => token || ''
          })
          .withAutomaticReconnect()
          .build();

        hubConnection.on('ReceiveDriverLocation', (driverId, routeId, lat, lng) => {
          setActiveDrivers(prev => ({
            ...prev,
            [driverId]: { routeId, lat, lng, lastUpdate: new Date() }
          }));
        });

        await hubConnection.start();
        await hubConnection.invoke('JoinAdminMonitors');
        
        setConnection(hubConnection);
        console.log('Admin connected to RideHub');
      } catch (err) {
        console.error('SignalR Admin Connection Error: ', err);
      }
    };

    connectSignalR();

    return () => {
      if (hubConnection) hubConnection.stop();
    };
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Live Rides Monitoring</h1>
        <p>Real-time GPS tracking of all active platform drivers.</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 180px)' }}>
        
        {/* Left Side: Map Simulation */}
        <div style={{ flex: 2, backgroundColor: '#e2e8f0', borderRadius: '8px', position: 'relative', overflow: 'hidden', border: '2px solid #cbd5e1' }}>
          <div style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'white', padding: '10px', borderRadius: '4px', fontWeight: 'bold', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            System Map (Mock)
          </div>

          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Object.keys(activeDrivers).length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>Waiting for drivers to start their rides...</p>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <MapPin size={48} color="#ef4444" style={{ marginBottom: '10px' }} />
                <h3 style={{ color: '#0f172a' }}>{Object.keys(activeDrivers).length} Active Drivers on Map</h3>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Data Feed */}
        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            <Navigation size={18} color="#3b82f6" /> 
            Active Data Feed
          </h3>

          {Object.keys(activeDrivers).length === 0 && (
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>No active telemetry data.</p>
          )}

          {Object.entries(activeDrivers).map(([driverId, data]) => (
            <div key={driverId} style={{ padding: '15px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong style={{ color: '#334155' }}>Driver {driverId.substring(0,8)}...</strong>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>LIVE</span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>
                <div>Route: {data.routeId.substring(0,8)}...</div>
                <div>Lat: {data.lat.toFixed(6)}</div>
                <div>Lng: {data.lng.toFixed(6)}</div>
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
                  Updated: {data.lastUpdate.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default LiveRides;
