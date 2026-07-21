import { useState, useEffect, useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Car, MapPin, ShieldCheck, ShieldAlert, Menu, X, LogOut, Navigation, AlertTriangle, UserCog } from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { TokenHelper } from '../utils/tokenHelper';
import { SignalRContext } from '../context/SignalRContext';
import './AdminLayout.css';

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sosAlert, setSosAlert] = useState(null);
    const [sosCount, setSosCount] = useState(0);
    const [kycCount, setKycCount] = useState(0);
    const [profileEditsCount, setProfileEditsCount] = useState(0);
    const navigate = useNavigate();
    const { connection } = useContext(SignalRContext);

    const fetchSosCount = async () => {
        try {
            const res = await api.get('/emergency/sos');
            const openAlerts = res.data.filter(a => a.status === 'Open');
            setSosCount(openAlerts.length);
        } catch (error) {
            console.error('Failed to fetch SOS count', error);
        }
    };

    const fetchKycCount = async () => {
        try {
            const res = await api.get('/admin/kyc-pending');
            setKycCount(res.data.length);
        } catch (error) {
            console.error('Failed to fetch KYC count', error);
        }
    };

    const fetchProfileEditsCount = async () => {
        try {
            const res = await api.get('/admin/profile-edits/pending');
            setProfileEditsCount(res.data.length);
        } catch (error) {
            console.error('Failed to fetch profile edits count', error);
        }
    };

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    useEffect(() => {
        let cleanupSignalR;

        if (connection) {
            const handleEmergencySOS = (alertData) => {
                setSosAlert(alertData);
                setSosCount(prev => prev + 1);
                // Play a loud sound
                const audio = new Audio('/sos-alarm.mp3'); // Mock audio file
                audio.play().catch(e => console.log('Audio play blocked:', e));
            };

            const handleKYCSubmitted = () => setKycCount(prev => prev + 1);
            const handleKYCProcessed = () => setKycCount(prev => Math.max(0, prev - 1));
            const handleProfileEditSubmitted = () => setProfileEditsCount(prev => prev + 1);
            const handleProfileUpdateProcessed = () => setProfileEditsCount(prev => Math.max(0, prev - 1));

            connection.on('EmergencySOS', handleEmergencySOS);
            connection.on('KYCSubmitted', handleKYCSubmitted);
            connection.on('KYCProcessed', handleKYCProcessed);
            connection.on('ProfileEditSubmitted', handleProfileEditSubmitted);
            connection.on('ProfileUpdateProcessed', handleProfileUpdateProcessed);

            connection.invoke('JoinAdminMonitors').catch(console.error);

            cleanupSignalR = () => {
                connection.off('EmergencySOS', handleEmergencySOS);
                connection.off('KYCSubmitted', handleKYCSubmitted);
                connection.off('KYCProcessed', handleKYCProcessed);
                connection.off('ProfileEditSubmitted', handleProfileEditSubmitted);
                connection.off('ProfileUpdateProcessed', handleProfileUpdateProcessed);
                connection.invoke('LeaveAdminMonitors').catch(console.error);
            };
        }

        fetchSosCount();
        fetchKycCount();
        fetchProfileEditsCount();

        return () => {
            if (cleanupSignalR) cleanupSignalR();
        };
    }, [connection]);

    const menuItems = [
        { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
        { name: 'All Rides', icon: <Car size={20} />, path: '/rides' },
        { name: 'Bookings', icon: <MapPin size={20} />, path: '/bookings' },
        { name: 'Live Map', icon: <Navigation size={20} />, path: '/live' },
        { name: 'Users', icon: <Users size={20} />, path: '/users' },
        { name: 'Drivers', icon: <Car size={20} />, path: '/drivers' },
        { name: 'Payouts', icon: <LayoutDashboard size={20} />, path: '/payouts' },
        { name: 'KYC Auth', icon: <ShieldCheck size={20} />, path: '/kyc', badge: kycCount > 0 ? kycCount : null },
        { name: 'Profile Edits', icon: <UserCog size={20} />, path: '/profile-edits', badge: profileEditsCount > 0 ? profileEditsCount : null },
        { name: 'Complaints', icon: <ShieldAlert size={20} />, path: '/complaints' },
        { name: 'Safety Alerts', icon: <AlertTriangle size={20} />, path: '/safety-alerts', badge: sosCount > 0 ? sosCount : null },
    ];

    const handleLogout = () => {
        TokenHelper.clearTokens();
        window.location.href = '/login';
    };

    return (
        <div className="admin-container">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Ride<span>O</span> Admin</h2>
                    <button className="close-btn" onClick={toggleSidebar}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            {item.icon}
                            <span>{item.name}</span>
                            {item.badge && <span className="nav-badge">{item.badge}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="nav-item logout" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="topbar">
                    <button className="menu-btn" onClick={toggleSidebar}>
                        <Menu size={24} />
                    </button>
                    <div className="topbar-actions">
                        <div className="admin-profile">
                            <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Admin" />
                            <span>Admin</span>
                        </div>
                    </div>
                </header>
                
                <div className="content-area">
                    <Outlet />
                </div>
            </main>

            {/* Global SOS Alert Modal */}
            {sosAlert && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(239, 68, 68, 0.95)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'white', animation: 'flash 1s infinite alternate' }}>
                    <ShieldAlert size={120} color="white" style={{ marginBottom: '20px' }} />
                    <h1 style={{ fontSize: '4rem', margin: 0, textTransform: 'uppercase', letterSpacing: '5px' }}>EMERGENCY SOS</h1>
                    <p style={{ fontSize: '1.5rem', marginBottom: '30px' }}>Triggered by: {sosAlert.TriggeredBy} ({sosAlert.Role})</p>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <button 
                            onClick={() => {
                                setSosAlert(null);
                                navigate('/complaints');
                            }}
                            style={{ padding: '15px 30px', fontSize: '1.2rem', backgroundColor: 'white', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            VIEW DETAILS
                        </button>
                        <button 
                            onClick={() => setSosAlert(null)}
                            style={{ padding: '15px 30px', fontSize: '1.2rem', backgroundColor: 'transparent', color: 'white', border: '2px solid white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            DISMISS
                        </button>
                    </div>
                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes flash {
                            from { background-color: rgba(239, 68, 68, 0.95); }
                            to { background-color: rgba(185, 28, 28, 0.95); }
                        }
                    `}} />
                </div>
            )}
        </div>
    );
};

export default AdminLayout;
