import { useState, useEffect } from 'react';
import { Users, Car, MapPin, DollarSign, Loader2 } from 'lucide-react';
import api from '../api';
import LiveMap from '../components/LiveMap';
import '../styles/Pages.css';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/admin/dashboard');
                setData(response.data);
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="page-container empty-state">
                <Loader2 className="animate-spin" size={48} color="#3b82f6" />
                <p style={{marginTop: '16px'}}>Loading dashboard data...</p>
            </div>
        );
    }

    const stats = [
        { title: 'Total Rides', value: data?.totalRides || 0, icon: <MapPin size={24} color="#3b82f6" />, trend: 'Live' },
        { title: 'Active Drivers', value: data?.activeDrivers || 0, icon: <Car size={24} color="#10b981" />, trend: 'Live' },
        { title: 'Registered Users', value: data?.registeredUsers || 0, icon: <Users size={24} color="#f59e0b" />, trend: 'Live' },
        { title: 'Revenue', value: `$${(data?.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <DollarSign size={24} color="#8b5cf6" />, trend: 'Total' },
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Dashboard Overview</h1>
                <p className="page-subtitle">Real-time statistics from the RideO platform.</p>
            </div>

            <div className="stats-grid">
                {stats.map((stat, idx) => (
                    <div className="stat-card" key={idx}>
                        <div className="stat-header">
                            <span className="stat-title">{stat.title}</span>
                            <div className="stat-icon-wrapper">{stat.icon}</div>
                        </div>
                        <div className="stat-body">
                            <h2 className="stat-value">{stat.value}</h2>
                            <span className="stat-trend">{stat.trend}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="recent-activity-section">
                <h2 className="section-title">Live Driver Map</h2>
                <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
                    <LiveMap /> 
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
