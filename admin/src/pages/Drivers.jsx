import React, { useState, useEffect, useContext } from 'react';
import { Search, Filter, ShieldAlert, ShieldCheck, Eye, Loader2, X, Car, DollarSign } from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import api from '../api';
import '../styles/Pages.css';
import { TokenHelper } from '../utils/tokenHelper';
import { SignalRContext } from '../context/SignalRContext';

const Drivers = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // Modal state
    const [selectedDriverId, setSelectedDriverId] = useState(null);
    const [driverDetails, setDriverDetails] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const { connection } = useContext(SignalRContext);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/drivers', { params: { search: searchTerm, status: statusFilter } });
            setDrivers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        let cleanupSignalR;

        if (connection) {
            const handleDriverStatusChanged = (driverId, isAvailable) => {
                setDrivers(prevDrivers => 
                    prevDrivers.map(d => 
                        d.id === driverId ? { ...d, isAvailable } : d
                    )
                );
                setDriverDetails(prevDetails => {
                    if (prevDetails && prevDetails.driver && prevDetails.driver.id === driverId) {
                        return { ...prevDetails, driver: { ...prevDetails.driver, isAvailable } };
                    }
                    return prevDetails;
                });
            };

            connection.on('DriverStatusChanged', handleDriverStatusChanged);
            connection.invoke('JoinAdminMonitors').catch(console.error);

            cleanupSignalR = () => {
                connection.off('DriverStatusChanged', handleDriverStatusChanged);
            };
        }

        return () => {
            if (cleanupSignalR) cleanupSignalR();
        };
    }, [connection]);

    const handleToggleSuspend = async (driverId) => {
        if (!window.confirm("Are you sure you want to toggle the suspension status for this driver?")) return;
        try {
            await api.post(`/admin/drivers/${driverId}/toggle-suspend`);
            fetchDrivers();
            if (selectedDriverId === driverId) {
                fetchDriverDetails(driverId);
            }
        } catch (err) {
            alert("Failed to update driver status");
        }
    };

    const fetchDriverDetails = async (driverId) => {
        try {
            setModalLoading(true);
            setSelectedDriverId(driverId);
            const res = await api.get(`/admin/kyc/${driverId}`);
            setDriverDetails(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setSelectedDriverId(null);
        setDriverDetails(null);
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="page-title">Driver Management</h1>
                    <p className="page-subtitle">Monitor drivers, vehicles, and routing privileges.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                        <input 
                            type="text" 
                            placeholder="Search name or license..." 
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
                            <option value="verified">Verified (KYC Approved)</option>
                            <option value="unverified">Unverified</option>
                            <option value="suspended">Suspended</option>
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
                                <th>License Number</th>
                                <th>Vehicle Type</th>
                                <th>Live Status</th>
                                <th>KYC Status</th>
                                <th>Account Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drivers.map(driver => (
                                <tr key={driver.id} style={{ backgroundColor: driver.isSuspended ? 'rgba(239, 68, 68, 0.15)' : 'transparent' }}>
                                    <td><strong>{driver.user.fullName}</strong></td>
                                    <td>{driver.licenseNumber}</td>
                                    <td>{driver.vehicleType || 'Not set'}</td>
                                    <td>
                                        <span className={`status-badge ${driver.isAvailable ? 'approved' : ''}`} style={!driver.isAvailable ? { backgroundColor: '#e2e8f0', color: '#64748b' } : {}}>
                                            {driver.isAvailable ? 'LIVE' : 'OFFLINE'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${driver.isVerified ? 'approved' : 'pending'}`}>
                                            {driver.isVerified ? 'Verified' : 'Pending'}
                                        </span>
                                    </td>
                                    <td>
                                        {driver.isSuspended ? (
                                            <span style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}><ShieldAlert size={14}/> Suspended</span>
                                        ) : (
                                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}><ShieldCheck size={14}/> Active</span>
                                        )}
                                    </td>
                                    <td style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => fetchDriverDetails(driver.id)} className="action-btn view-btn" title="View Profile">
                                            <Eye size={16} /> Details
                                        </button>
                                        <button onClick={() => handleToggleSuspend(driver.id)} className={`action-btn ${driver.isSuspended ? 'approve-btn' : 'reject-btn'}`} title={driver.isSuspended ? "Unsuspend Driver" : "Suspend Driver"}>
                                            {driver.isSuspended ? "Unsuspend" : "Suspend"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {drivers.length === 0 && (
                                <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>No drivers found matching filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Detailed Profile Modal */}
            {selectedDriverId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '850px', maxWidth: '90vw' }}>
                        <div className="modal-header">
                            <h2>Driver Profile</h2>
                            <button onClick={closeModal} className="icon-btn"><X /></button>
                        </div>
                        
                        {modalLoading || !driverDetails ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                
                                {/* Header Info */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>{driverDetails.user.fullName}</h3>
                                        <p style={{ margin: '0 0 5px 0', color: '#64748b' }}>{driverDetails.user.email} | {driverDetails.user.phoneNumber || 'No phone'}</p>
                                        <p style={{ margin: '0', color: '#64748b' }}>License: <strong>{driverDetails.driver.licenseNumber}</strong></p>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>★ {driverDetails.driver.rating.toFixed(1)}</div>
                                        <span className={`status-badge ${driverDetails.driver.isAvailable ? 'approved' : ''}`} style={!driverDetails.driver.isAvailable ? { backgroundColor: '#e2e8f0', color: '#64748b' } : {}}>
                                            {driverDetails.driver.isAvailable ? 'LIVE' : 'OFFLINE'}
                                        </span>
                                        <span className={`status-badge ${driverDetails.driver.isSuspended ? 'rejected' : 'approved'}`}>
                                            {driverDetails.driver.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                                        </span>
                                        <span className={`status-badge ${driverDetails.driver.isVerified ? 'approved' : 'pending'}`}>
                                            {driverDetails.driver.isVerified ? 'KYC VERIFIED' : 'KYC PENDING'}
                                        </span>
                                    </div>
                                </div>

                                {/* Dual Grid: Vehicle & Wallet */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px' }}>
                                        <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px' }}><Car size={16}/> Vehicle Details</h4>
                                        {driverDetails.vehicle ? (
                                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569' }}>
                                                <li>Make: <strong>{driverDetails.vehicle.make}</strong></li>
                                                <li>Model: <strong>{driverDetails.vehicle.model} ({driverDetails.vehicle.year})</strong></li>
                                                <li>Plate: <strong>{driverDetails.vehicle.licensePlate}</strong></li>
                                                <li>Color: <strong>{driverDetails.vehicle.color}</strong></li>
                                                <li>Seats: <strong>{driverDetails.vehicle.totalSeats}</strong></li>
                                            </ul>
                                        ) : (
                                            <p style={{ color: '#94a3b8' }}>No vehicle registered.</p>
                                        )}
                                    </div>
                                    
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px' }}>
                                        <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px' }}><DollarSign size={16}/> Wallet Balance</h4>
                                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                                            ${driverDetails.driver.balance.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Published Routes */}
                                <div>
                                    <h4 style={{ margin: '0 0 10px 0' }}>Recent Published Routes (Max 10)</h4>
                                    {driverDetails.recentRoutes && driverDetails.recentRoutes.length === 0 ? (
                                        <p style={{ color: '#64748b' }}>No routes published.</p>
                                    ) : (
                                        <table className="data-table" style={{ fontSize: '14px' }}>
                                            <thead>
                                                <tr>
                                                    <th>Start Location</th>
                                                    <th>End Location</th>
                                                    <th>Start Time</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {driverDetails.recentRoutes && driverDetails.recentRoutes.map(r => (
                                                    <tr key={r.id}>
                                                        <td>{r.startLocation}</td>
                                                        <td>{r.endLocation}</td>
                                                        <td>{new Date(r.startTime).toLocaleString()}</td>
                                                        <td><span className={`status-badge ${r.status.toLowerCase()}`}>{r.status}</span></td>
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

export default Drivers;
