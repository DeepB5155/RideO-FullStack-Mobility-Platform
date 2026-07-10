import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Map, Navigation, ArrowLeft, MapPin, Clock } from 'lucide-react';

const RidePlayback = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5248/api'}/Ride/${id}/location-logs`);
        if (!response.ok) {
          throw new Error('Failed to fetch location logs.');
        }
        const data = await response.json();
        // Assume data is an array of { latitude, longitude, timestamp }
        setLogs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [id]);

  useEffect(() => {
    let interval;
    if (isPlaying && logs.length > 0) {
      interval = setInterval(() => {
        setPlaybackIndex((prev) => {
          if (prev >= logs.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000); // 1 second per tick
    }
    return () => clearInterval(interval);
  }, [isPlaying, logs]);

  const currentLog = logs[playbackIndex];

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <p style={{ fontSize: '1.2rem', color: '#64748b' }}>Loading historical logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fef2f2' }}>
        <h2 style={{ color: '#991b1b', margin: 0 }}>Cannot Load Playback</h2>
        <p style={{ color: '#b91c1c' }}>{error}</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ padding: '20px', backgroundColor: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <div style={{ backgroundColor: '#8b5cf6', padding: '10px', borderRadius: '50%' }}>
          <Map size={24} color="white" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Historical Ride Playback</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>Ride ID: {id}</p>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Map Area (Mock) */}
        <div style={{ flex: 1, backgroundColor: '#e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
           <div style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'white', padding: '10px 15px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
             <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Controls</h3>
             <div style={{ display: 'flex', gap: '10px' }}>
               <button 
                 onClick={() => { setPlaybackIndex(0); setIsPlaying(true); }}
                 disabled={logs.length === 0}
                 style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
               >
                 Replay
               </button>
               <button 
                 onClick={() => setIsPlaying(!isPlaying)}
                 disabled={logs.length === 0}
                 style={{ padding: '8px 16px', backgroundColor: isPlaying ? '#f59e0b' : '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
               >
                 {isPlaying ? 'Pause' : 'Play'}
               </button>
             </div>
           </div>

           {logs.length > 0 && currentLog ? (
             <div style={{ textAlign: 'center' }}>
               <MapPin size={64} color="#8b5cf6" />
               <div style={{ marginTop: '10px', backgroundColor: '#1e293b', color: 'white', padding: '5px 10px', borderRadius: '4px', fontSize: '14px' }}>
                 Lat: {currentLog.latitude?.toFixed(5)}<br/>
                 Lng: {currentLog.longitude?.toFixed(5)}
               </div>
               <div style={{ marginTop: '10px', fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                 <Clock size={16} />
                 {new Date(currentLog.timestamp).toLocaleTimeString()}
               </div>
             </div>
           ) : (
             <div style={{ textAlign: 'center', color: '#64748b' }}>
                <Navigation size={48} color="#94a3b8" />
                <p>No location logs found for this ride.</p>
             </div>
           )}
        </div>

        {/* Timeline Panel */}
        <div style={{ width: '350px', backgroundColor: 'white', padding: '0', boxShadow: '-4px 0 15px rgba(0,0,0,0.05)', zIndex: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px 24px 10px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#0f172a' }}>Coordinate Log</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '5px 0 0 0' }}>{logs.length} data points recorded</p>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {logs.map((log, index) => (
              <div 
                key={index}
                onClick={() => setPlaybackIndex(index)}
                style={{
                  padding: '10px', 
                  marginBottom: '10px', 
                  borderRadius: '6px',
                  backgroundColor: index === playbackIndex ? '#ede9fe' : '#f8fafc',
                  border: index === playbackIndex ? '1px solid #8b5cf6' : '1px solid #e2e8f0',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: index === playbackIndex ? '#6d28d9' : '#334155' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {log.latitude?.toFixed(5)}, {log.longitude?.toFixed(5)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RidePlayback;
