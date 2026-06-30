import React, { useState, useEffect } from 'react';
import { 
    Users, Car, MapPin, IndianRupee, Loader2, FileCheck, FileX, AlertTriangle, Clock, 
    CalendarCheck, Route as RouteIcon, Navigation 
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

    if (loading || !data) {
        return (
            <div className="page-container empty-state">
                <Loader2 className="animate-spin" size={48} color="#3b82f6" />
                <p style={{marginTop: '16px'}}>Loading comprehensive dashboard data...</p>
            </div>
        );
    }

    const m = data.metrics;
    const activity = data.recentActivity;

    const rideStatusData = [
        { name: 'Active', value: m.activeRides, color: '#3b82f6' },
        { name: 'Published', value: m.publishedRides, color: '#f59e0b' },
        { name: 'Completed', value: m.completedRides, color: '#10b981' },
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Command Center</h1>
                <p className="page-subtitle">Real-time comprehensive statistics from the RideO platform.</p>
            </div>

            {/* Top Metric Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <MetricCard title="Total Users" value={m.totalUsers} icon={<Users size={24} color="#f59e0b" />} />
                <MetricCard title="Total Drivers" value={m.totalDrivers} icon={<Car size={24} color="#3b82f6" />} />
                <MetricCard title="Today's Bookings" value={m.todayBookings} icon={<CalendarCheck size={24} color="#10b981" />} />
                <MetricCard title="Total Revenue" value={`₹${m.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={<IndianRupee size={24} color="#8b5cf6" />} />
            </div>

            {/* Secondary Metric Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <MetricCard title="Approved Drivers" value={m.approvedDrivers} icon={<FileCheck size={24} color="#10b981" />} />
                <MetricCard title="Pending KYC" value={m.pendingKYC} icon={<FileX size={24} color="#ef4444" />} trend={m.pendingKYC > 0 ? 'Requires Action' : 'All Clear'} />
                <MetricCard title="Active Rides" value={m.activeRides} icon={<Navigation size={24} color="#3b82f6" />} />
                <MetricCard title="Open Complaints" value={m.openComplaints} icon={<AlertTriangle size={24} color="#ef4444" />} trend={m.openComplaints > 0 ? 'Urgent' : 'All Clear'} />
            </div>

            {/* Middle Section: Chart & Live Map */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '30px' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 15px 0' }}>Ride Status Distribution</h3>
                    <div style={{ flex: 1, minHeight: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={rideStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                                    {rideStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--surface-border)', color: 'var(--text-main)' }} />
                                <Legend wrapperStyle={{ color: 'var(--text-main)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ padding: '0', overflow: 'hidden', height: '320px' }}>
                    <LiveMap />
                </div>
            </div>

            {/* Bottom Section: Recent Activity Feeds */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                
                {/* Recent Rides */}
                <div className="card">
                    <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RouteIcon size={18} color="var(--primary)" /> Recent Rides
                    </h3>
                    {activity.recentRides.length === 0 ? <p style={{color: '#94a3b8'}}>No rides yet.</p> : activity.recentRides.map(r => (
                        <div key={r.id} style={{ borderBottom: '1px solid var(--surface-border)', padding: '10px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong>{r.driverName}</strong>
                                <span className={`badge ${r.status === 'Completed' ? 'badge-success' : 'badge-primary'}`}>{r.status}</span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{r.startLocation} &rarr; {r.endLocation}</div>
                        </div>
                    ))}
                </div>

                {/* Recent Bookings */}
                <div className="card">
                    <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} color="var(--warning)" /> Recent Bookings
                    </h3>
                    {activity.recentBookings.length === 0 ? <p style={{color: '#94a3b8'}}>No bookings yet.</p> : activity.recentBookings.map(b => (
                        <div key={b.id} style={{ borderBottom: '1px solid var(--surface-border)', padding: '10px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong>{b.userName}</strong>
                                <span className={`badge ${b.status === 'Completed' ? 'badge-success' : (b.status === 'Cancelled' ? 'badge-danger' : 'badge-warning')}`}>{b.status}</span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Seats: {b.seatsBooked}</div>
                        </div>
                    ))}
                </div>

                {/* Pending KYC Requests */}
                <div className="card">
                    <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileX size={18} color="#ef4444" /> Pending KYC
                    </h3>
                    {activity.recentKyc.length === 0 ? <p style={{color: '#94a3b8'}}>No pending approvals.</p> : activity.recentKyc.map(k => (
                        <div key={k.id} style={{ borderBottom: '1px solid var(--surface-border)', padding: '10px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong>{k.userName}</strong>
                                <span className="badge badge-danger">Review</span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>License: {k.licenseNumber}</div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

const MetricCard = ({ title, value, icon, trend }) => (
    <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>{title}</span>
            <div style={{ padding: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>{icon}</div>
        </div>
        <div>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>{value}</h2>
            {trend && <span style={{ fontSize: '0.85rem', fontWeight: '600', marginTop: '5px', display: 'block', color: trend === 'Requires Action' || trend === 'Urgent' ? 'var(--danger)' : 'var(--success)' }}>{trend}</span>}
        </div>
    </div>
);

export default Dashboard;
