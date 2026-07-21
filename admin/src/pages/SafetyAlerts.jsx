import { useState, useEffect, useContext } from 'react';
import api from '../api';
import { AlertTriangle, MapPin, CheckCircle, Clock } from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import './SafetyAlerts.css';
import { TokenHelper } from '../utils/tokenHelper';
import { SignalRContext } from '../context/SignalRContext';

const SafetyAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { connection } = useContext(SignalRContext);

    const fetchAlerts = async () => {
        try {
            const res = await api.get('/emergency/sos');
            setAlerts(res.data);
        } catch (error) {
            console.error('Failed to fetch SOS alerts', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
        let cleanupSignalR;

        if (connection) {
            const handleEmergencySOS = () => {
                fetchAlerts(); // Refresh list on new SOS
            };

            connection.on('EmergencySOS', handleEmergencySOS);
            connection.invoke('JoinAdminMonitors').catch(console.error);

            cleanupSignalR = () => {
                connection.off('EmergencySOS', handleEmergencySOS);
            };
        }

        return () => {
            if (cleanupSignalR) cleanupSignalR();
        };
    }, [connection]);

    const handleResolve = async (id) => {
        if (!window.confirm("Are you sure you want to mark this SOS as resolved?")) return;
        
        try {
            await api.put(`/emergency/sos/${id}/resolve`);
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
