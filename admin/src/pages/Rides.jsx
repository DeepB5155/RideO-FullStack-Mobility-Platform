import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, Loader2, X, AlertOctagon, Map, Users, Car, MapPin, PlayCircle } from 'lucide-react';
import api from '../api';
import '../styles/Pages.css';

const Rides = () => {
    const navigate = useNavigate();
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // Modal state
    const [selectedRideId, setSelectedRideId] = useState(null);
    const [rideDetails, setRideDetails] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    const fetchRides = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/routes', { params: { search: searchTerm, status: statusFilter } });
            setRides(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRides();
    }, [searchTerm, statusFilter]);

    const handleCancelRide = async (rideId) => {
        if (!window.confirm("WARNING: This will immediately CANCEL the ride and automatically cascade the cancellation to ALL passenger bookings. Are you absolutely sure?")) return;
        try {
            await api.post(`/admin/routes/${rideId}/cancel`);
            fetchRides();
            if (selectedRideId === rideId) {
                fetchRideDetails(rideId);
            }
        } catch (err) {
            alert(err.response?.data?.message || "Failed to cancel ride.");
        }
    };

    const fetchRideDetails = async (rideId) => {
        try {
            setModalLoading(true);
            setSelectedRideId(rideId);
            const res = await api.get(`/admin/routes/${rideId}`);
            setRideDetails(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setSelectedRideId(null);
        setRideDetails(null);
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="page-title">Ride Control</h1>
                    <p className="page-subtitle">Manage all driver-published routes globally.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                        <input 
                            type="text" 
                            className="search-input"
                            placeholder="Search location or driver..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 10px 8px 35px', width: '250px' }}
                        />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Filter size={18} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                        <select 
                            className="search-input"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: '8px 10px 8px 35px', cursor: 'pointer' }}
                        >
                            <option value="">All Statuses</option>
                            <option value="Published">Published</option>
                            <option value="Started">Started</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
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
                                <th>Driver</th>
                                <th>Route</th>
                                <th>Departure</th>
                                <th>Seats</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rides.map(ride => (
                                <tr key={ride.id}>
                                    <td><strong>{ride.driver.user.fullName}</strong></td>
                                    <td style={{ fontSize: '13px' }}>{ride.startLocation.split(',')[0]} &rarr; {ride.endLocation.split(',')[0]}</td>
                                    <td>{new Date(ride.startTime).toLocaleString()}</td>
                                    <td>{ride.availableSeats} Left</td>
                                    <td>₹{ride.pricePerSeat.toFixed(2)}</td>
                                    <td><span className={`status-badge ${ride.status.toLowerCase()}`}>{ride.status}</span></td>
                                    <td style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => fetchRideDetails(ride.id)} className="action-btn view-btn" title="View Profile">
                                            <Eye size={16} /> Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {rides.length === 0 && (
                                <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>No rides found.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Detailed Profile Modal */}
            {selectedRideId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '900px', maxWidth: '95vw' }}>
                        <div className="modal-header">
                            <h2>Route Details</h2>
                            <button onClick={closeModal} className="icon-btn"><X /></button>
                        </div>
                        
                        {modalLoading || !rideDetails ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                
                                {/* Header Info */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Map size={18} color="#3b82f6" /> {rideDetails.route.startLocation} &rarr; {rideDetails.route.endLocation}
                                        </h3>
                                        <p style={{ margin: '0 0 5px 0', color: '#475569' }}><strong>Driver:</strong> {rideDetails.route.driver.user.fullName}</p>
                                        <p style={{ margin: '0 0 5px 0', color: '#475569' }}><strong>Departure:</strong> {new Date(rideDetails.route.startTime).toLocaleString()}</p>
                                        <p style={{ margin: '0', color: '#475569' }}><strong>Vehicle:</strong> {rideDetails.route.vehicle ? `${rideDetails.route.vehicle.make} ${rideDetails.route.vehicle.model}` : 'Not Specified'}</p>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                        <span className={`status-badge ${rideDetails.route.status.toLowerCase()}`} style={{ fontSize: '14px', padding: '6px 12px' }}>
                                            {rideDetails.route.status.toUpperCase()}
                                        </span>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>₹{rideDetails.route.pricePerSeat.toFixed(2)} <span style={{fontSize: '14px', color: '#64748b'}}>/ seat</span></div>
                                        <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>{rideDetails.route.availableSeats} Seats Available</div>
                                        
                                        {(rideDetails.route.status !== 'Completed' && rideDetails.route.status !== 'Cancelled') && (
                                            <button 
                                                onClick={() => handleCancelRide(rideDetails.route.id)}
                                                style={{ marginTop: '10px', backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
                                            >
                                                <AlertOctagon size={16} /> Force Cancel Route
                                            </button>
                                        )}

                                        {rideDetails.route.status === 'Completed' && (
                                            <button 
                                                onClick={() => navigate(`/ride-playback/${rideDetails.route.id}`)}
                                                style={{ marginTop: '10px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
                                            >
                                                <PlayCircle size={16} /> View Ride Playback
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Passenger Bookings List */}
                                <div>
                                    <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} color="#8b5cf6" /> Associated Passenger Bookings</h4>
                                    {rideDetails.bookings.length === 0 ? (
                                        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>No passengers have booked this ride yet.</div>
                                    ) : (
                                        <table className="data-table" style={{ fontSize: '14px' }}>
                                            <thead>
                                                <tr>
                                                    <th>Passenger</th>
                                                    <th>Seats Booked</th>
                                                    <th>Booked At</th>
                                                    <th>Pickup / Dropoff</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rideDetails.bookings.map(b => (
                                                    <tr key={b.id} style={{ backgroundColor: b.status === 'Cancelled' ? '#fef2f2' : 'transparent' }}>
                                                        <td><strong>{b.user.fullName}</strong></td>
                                                        <td>{b.seatsBooked}</td>
                                                        <td>{new Date(b.bookedAt).toLocaleString()}</td>
                                                        <td style={{ fontSize: '12px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            <MapPin size={12} style={{marginRight: '4px'}}/> Route Segment
                                                        </td>
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

export default Rides;
