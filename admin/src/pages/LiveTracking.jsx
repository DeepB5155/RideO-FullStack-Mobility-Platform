import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Navigation, Car, AlertTriangle } from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Car Icon
const carIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/744/744426.png', // Fallback simple car icon
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const LiveTracking = () => {
  const { trackingId } = useParams();
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    // 1. Fetch initial tracking data
    const fetchTrackingData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5248/api'}/Safety/track/${trackingId}`);
        if (!response.ok) {
          throw new Error('Tracking link is invalid or expired.');
        }
        const data = await response.json();
        setTrackingData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrackingData();
  }, [trackingId]);

  useEffect(() => {
    // 2. Connect to SignalR for live updates
    if (trackingData && trackingData.BookingStatus === 'Approved') { // Wait, tracking is active during "Started" usually? We can connect anyway
      let hubConnection;
      
      const connectSignalR = async () => {
        try {
          hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5248/ridehub')
            .withAutomaticReconnect()
            .build();

          hubConnection.on('ReceiveDriverLocation', (driverId, routeId, lat, lng) => {
            setTrackingData(prev => ({
              ...prev,
              CurrentLocation: { Latitude: lat, Longitude: lng, Timestamp: new Date().toISOString() }
            }));
          });

          await hubConnection.start();
          // We can join a specific group if the backend supports it, e.g., hubConnection.invoke('JoinTrackingGroup', trackingId);
          setConnection(hubConnection);
        } catch (err) {
          console.error('SignalR Connection Error:', err);
        }
      };

      connectSignalR();

      return () => {
        if (hubConnection) {
          hubConnection.stop();
        }
      };
    }
  }, [trackingData?.BookingStatus]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <p style={{ fontSize: '1.2rem', color: '#64748b' }}>Loading live tracking...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fef2f2' }}>
        <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
        <h2 style={{ color: '#991b1b', margin: 0 }}>Cannot Track Ride</h2>
        <p style={{ color: '#b91c1c' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ padding: '20px', backgroundColor: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ backgroundColor: '#3b82f6', padding: '10px', borderRadius: '50%' }}>
          <Navigation size={24} color="white" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>RideO Live Tracking</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>Tracking ID: {trackingId.substring(0,8)}</p>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        <div style={{ flex: 1, backgroundColor: '#e2e8f0', position: 'relative', zIndex: 0 }}>
           <div style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'white', padding: '10px 15px', borderRadius: '20px', fontWeight: 'bold', zIndex: 1000, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
              Live Map
           </div>

           {trackingData.CurrentLocation ? (
             <MapContainer center={[trackingData.CurrentLocation.Latitude, trackingData.CurrentLocation.Longitude]} zoom={15} style={{ height: '100%', width: '100%' }}>
               <TileLayer
                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
               />
               <Marker position={[trackingData.CurrentLocation.Latitude, trackingData.CurrentLocation.Longitude]} icon={carIcon}>
                 <Popup>
                   Vehicle is here
                 </Popup>
               </Marker>
             </MapContainer>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b' }}>
                <MapPin size={48} color="#94a3b8" />
                <p>Waiting for driver location...</p>
             </div>
           )}
        </div>

        {/* Ride Info Panel */}
        <div style={{ width: '350px', backgroundColor: 'white', padding: '24px', boxShadow: '-4px 0 15px rgba(0,0,0,0.05)', zIndex: 20 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#0f172a' }}>Ride Details</h2>
          
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Driver</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>{trackingData.DriverName || 'Assigning...'}</div>
            {trackingData.DriverRating && <div style={{ fontSize: '0.9rem', color: '#eab308', display: 'flex', alignItems: 'center', gap: '4px' }}>★ {trackingData.DriverRating.toFixed(1)}</div>}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle</div>
            <div style={{ fontSize: '1rem', color: '#334155' }}>
              {trackingData.Vehicle ? `${trackingData.Vehicle.Make} ${trackingData.Vehicle.Model} (${trackingData.Vehicle.LicensePlate})` : 'N/A'}
            </div>
          </div>

          <div style={{ marginBottom: '24px', position: 'relative' }}>
             <div style={{ position: 'absolute', left: '7px', top: '15px', bottom: '15px', width: '2px', backgroundColor: '#e2e8f0' }}></div>
             
             <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', position: 'relative' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '4px solid #3b82f6', backgroundColor: 'white', zIndex: 2, marginTop: '2px' }}></div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Pickup</div>
                  <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '500' }}>{trackingData.StartLocation}</div>
                </div>
             </div>

             <div style={{ display: 'flex', gap: '15px', position: 'relative' }}>
                <div style={{ width: '16px', height: '16px', backgroundColor: '#ef4444', borderRadius: '50%', zIndex: 2, marginTop: '2px' }}></div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Dropoff</div>
                  <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '500' }}>{trackingData.EndLocation}</div>
                </div>
             </div>
          </div>
          
          <div style={{ padding: '15px', backgroundColor: trackingData.RouteStatus === 'Completed' ? '#dcfce7' : '#f1f5f9', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: trackingData.RouteStatus === 'Completed' ? '#166534' : '#64748b', fontWeight: 'bold' }}>STATUS</div>
            <div style={{ fontSize: '1.2rem', color: trackingData.RouteStatus === 'Completed' ? '#15803d' : '#334155', fontWeight: 'bold' }}>
              {trackingData.RouteStatus === 'Started' ? 'In Progress' : trackingData.RouteStatus}
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}} />
    </div>
  );
};

export default LiveTracking;
