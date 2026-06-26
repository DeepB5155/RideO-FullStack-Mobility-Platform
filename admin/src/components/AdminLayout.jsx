import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Car, MapPin, ShieldCheck, ShieldAlert, Menu, X, LogOut, Navigation } from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import { useNavigate } from 'react-router-dom';
import './AdminLayout.css';

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sosAlert, setSosAlert] = useState(null);
    const navigate = useNavigate();

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    useEffect(() => {
        let hubConnection;
        const connectSignalR = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                hubConnection = new signalR.HubConnectionBuilder()
                    .withUrl(import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5248/ridehub', {
                        accessTokenFactory: () => token || ''
                    })
                    .withAutomaticReconnect()
                    .build();

                hubConnection.on('EmergencySOS', (alertData) => {
                    setSosAlert(alertData);
                    // Play a loud sound
                    const audio = new Audio('/sos-alarm.mp3'); // Mock audio file
                    audio.play().catch(e => console.log('Audio play blocked:', e));
                });

                await hubConnection.start();
                await hubConnection.invoke('JoinAdminMonitors');
                console.log('AdminLayout connected to RideHub for SOS alerts');
            } catch (err) {
                console.error('SignalR AdminLayout Connection Error: ', err);
            }
        };

        connectSignalR();

        return () => {
            if (hubConnection) hubConnection.stop();
        };
    }, []);

    const menuItems = [
        { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
        { name: 'All Rides', icon: <Car size={20} />, path: '/rides' },
        { name: 'Bookings', icon: <MapPin size={20} />, path: '/bookings' },
        { name: 'Live Map', icon: <Navigation size={20} />, path: '/live' },
        { name: 'Users', icon: <Users size={20} />, path: '/users' },
        { name: 'Drivers', icon: <Car size={20} />, path: '/drivers' },
        { name: 'KYC Auth', icon: <ShieldCheck size={20} />, path: '/kyc' },
        { name: 'Complaints', icon: <ShieldAlert size={20} />, path: '/complaints' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('adminAuth');
        localStorage.removeItem('adminToken');
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
