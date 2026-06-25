import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Car, MapPin, ShieldCheck, Menu, X, LogOut, Navigation } from 'lucide-react';
import './AdminLayout.css';

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    const menuItems = [
        { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
        { name: 'All Rides', icon: <Car size={20} />, path: '/rides' },
        { name: 'Live Map', icon: <Navigation size={20} />, path: '/live' },
        { name: 'Users', icon: <Users size={20} />, path: '/users' },
        { name: 'Drivers', icon: <Car size={20} />, path: '/drivers' },
        { name: 'KYC Auth', icon: <ShieldCheck size={20} />, path: '/kyc' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('adminAuth');
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
        </div>
    );
};

export default AdminLayout;
