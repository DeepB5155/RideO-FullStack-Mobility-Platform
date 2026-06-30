import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, MapPin, CheckCircle, Clock } from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import './SafetyAlerts.css';

const SafetyAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('http://localhost:5248/api/emergency/sos', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAlerts(res.data);
        } catch (error) {
            console.error('Failed to fetch SOS alerts', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();

        // Listen for real-time SignalR updates
        let hubConnection;
        const setupSignalR = async () => {
            const token = localStorage.getItem('adminToken');
            hubConnection = new signalR.HubConnectionBuilder()
                .withUrl('http://localhost:5248/ridehub', {
                    accessTokenFactory: () => token || ''
                })
                .withAutomaticReconnect()
                .build();

            hubConnection.on('EmergencySOS', () => {
                fetchAlerts(); // Refresh list on new SOS
            });

            try {
                await hubConnection.start();
                await hubConnection.invoke('JoinAdminMonitors');
            } catch (e) {
                console.log('SignalR connection error for SafetyAlerts', e);
            }
        };

        setupSignalR();

        return () => {
            if (hubConnection) hubConnection.stop();
        };
    }, []);

    const handleResolve = async (id) => {
        if (!window.confirm("Are you sure you want to mark this SOS as resolved?")) return;
        
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`http://localhost:5248/api/emergency/sos/${id}/resolve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAlerts(); // Refresh
        } catch (error) {
            console.error('Failed to resolve SOS', error);
            alert('Failed to resolve SOS');
        }
    };

    if (loading) return <div className="loading">Loading Safety Alerts...</div>;

    return (
        <div className="safety-alerts-container">
            <header className="page-header">
                <div className="header-title">
                    <AlertTriangle className="icon-danger" size={32} />
                    <h1>Safety Alerts</h1>
                </div>
                <p>Monitor and resolve active SOS emergencies triggered during rides.</p>
            </header>

            <div className="alerts-list">
                {alerts.length === 0 ? (
                    <div className="empty-state">
                        <CheckCircle size={48} color="#10b981" />
                        <h3>No Active Alerts</h3>
                        <p>All rides are proceeding safely.</p>
                    </div>
                ) : (
                    alerts.map(alert => (
                        <div key={alert.id} className={`alert-card ${alert.status === 'Open' ? 'active-alert' : 'resolved-alert'}`}>
                            <div className="alert-header">
                                <div className="alert-title">
                                    <AlertTriangle size={24} color={alert.status === 'Open' ? '#ef4444' : '#64748b'} />
                                    <h2>SOS from {alert.triggeredBy}</h2>
                                    <span className={`status-badge ${alert.status.toLowerCase()}`}>{alert.status}</span>
                                </div>
                                <span className="alert-time">
                                    <Clock size={16} /> {new Date(alert.createdAt).toLocaleString()}
                                </span>
                            </div>
                            
                            <div className="alert-body">
                                <div className="detail-row">
                                    <span className="label">Booking ID:</span>
                                    <span className="value">{alert.bookingId}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label"><MapPin size={16} /> Location:</span>
                                    <span className="value font-mono">
                                        {alert.latitude ? `${alert.latitude}, ${alert.longitude}` : 'Location Unavailable'}
                                    </span>
                                </div>
                                {alert.status === 'Resolved' && (
                                    <div className="detail-row">
                                        <span className="label">Resolved At:</span>
                                        <span className="value">{new Date(alert.resolvedAt).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {alert.status === 'Open' && (
                                <div className="alert-actions">
                                    <button 
                                        className="btn btn-resolve"
                                        onClick={() => handleResolve(alert.id)}
                                    >
                                        Mark as Resolved
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SafetyAlerts;
