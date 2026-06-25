import React, { useState, useEffect } from 'react';
import { Search, Filter, ShieldAlert, ShieldCheck, Eye, Loader2, X, AlertTriangle } from 'lucide-react';
import api from '../api';
import '../styles/Pages.css';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // Modal state
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/users', { params: { search: searchTerm, status: statusFilter } });
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [searchTerm, statusFilter]);

    const handleToggleBlock = async (userId) => {
        if (!window.confirm("Are you sure you want to toggle the block status for this user?")) return;
        try {
            await api.post(`/admin/users/${userId}/toggle-block`);
            fetchUsers();
            if (selectedUserId === userId) {
                fetchUserDetails(userId);
            }
        } catch (err) {
            alert("Failed to update user status");
        }
    };

    const fetchUserDetails = async (userId) => {
        try {
            setModalLoading(true);
            setSelectedUserId(userId);
            const res = await api.get(`/admin/users/${userId}`);
            setUserDetails(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setSelectedUserId(null);
        setUserDetails(null);
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">Monitor and moderate passenger accounts.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                        <input 
                            type="text" 
                            placeholder="Search name or email..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 10px 8px 35px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '250px' }}
                        />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Filter size={18} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: '8px 10px 8px 35px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer' }}
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="blocked">Blocked</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-container">
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Joined</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} style={{ backgroundColor: user.isBlocked ? '#fef2f2' : 'transparent' }}>
                                    <td><strong>{user.fullName}</strong></td>
                                    <td>{user.email}</td>
                                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td><span className={`status-badge ${user.role.toLowerCase()}`}>{user.role}</span></td>
                                    <td>
                                        {user.isBlocked ? (
                                            <span style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}><ShieldAlert size={14}/> Blocked</span>
                                        ) : (
                                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}><ShieldCheck size={14}/> Active</span>
                                        )}
                                    </td>
                                    <td style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => fetchUserDetails(user.id)} className="action-btn view-btn" title="View Profile">
                                            <Eye size={16} /> Details
                                        </button>
                                        <button onClick={() => handleToggleBlock(user.id)} className={`action-btn ${user.isBlocked ? 'approve-btn' : 'reject-btn'}`} title={user.isBlocked ? "Unblock User" : "Block User"}>
                                            {user.isBlocked ? "Unblock" : "Block"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>No users found matching filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Detailed Profile Modal */}
            {selectedUserId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '800px', maxWidth: '90vw' }}>
                        <div className="modal-header">
                            <h2>User Profile</h2>
                            <button onClick={closeModal} className="icon-btn"><X /></button>
                        </div>
                        
                        {modalLoading || !userDetails ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                
                                {/* Header Info */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>{userDetails.user.fullName}</h3>
                                        <p style={{ margin: '0', color: '#64748b' }}>{userDetails.user.email} | {userDetails.user.phoneNumber || 'No phone'}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>★ {userDetails.user.averageRating.toFixed(1)}</div>
                                        <span className={`status-badge ${userDetails.user.isBlocked ? 'rejected' : 'approved'}`}>
                                            {userDetails.user.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                                        </span>
                                    </div>
                                </div>

                                {/* Complaints Section */}
                                {userDetails.complaints.length > 0 && (
                                    <div>
                                        <h4 style={{ margin: '0 0 10px 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <AlertTriangle size={18} /> Complaints Against User
                                        </h4>
                                        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px' }}>
                                            {userDetails.complaints.map(c => (
                                                <div key={c.id} style={{ padding: '8px', borderBottom: '1px solid #fca5a5' }}>
                                                    <strong>[{c.status}]</strong> {c.Description} 
                                                    <div style={{ fontSize: '12px', color: '#dc2626' }}>Reported on: {new Date(c.createdAt).toLocaleDateString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Recent Bookings */}
                                <div>
                                    <h4 style={{ margin: '0 0 10px 0' }}>Recent Ride Bookings (Max 10)</h4>
                                    {userDetails.recentBookings.length === 0 ? (
                                        <p style={{ color: '#64748b' }}>No booking history.</p>
                                    ) : (
                                        <table className="data-table" style={{ fontSize: '14px' }}>
                                            <thead>
                                                <tr>
                                                    <th>Driver</th>
                                                    <th>Date/Time</th>
                                                    <th>Seats</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {userDetails.recentBookings.map(b => (
                                                    <tr key={b.id}>
                                                        <td>{b.driverName}</td>
                                                        <td>{new Date(b.startTime).toLocaleString()}</td>
                                                        <td>{b.seatsBooked}</td>
                                                        <td><span className={`status-badge ${b.status.toLowerCase()}`}>{b.status}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
