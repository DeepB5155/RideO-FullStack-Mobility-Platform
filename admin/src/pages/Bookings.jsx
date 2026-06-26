import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Loader2, X, CreditCard, User, MapPin } from 'lucide-react';
import api from '../api';
import '../styles/Pages.css';

const Bookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // Modal state
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [bookingDetails, setBookingDetails] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/bookings', { params: { search: searchTerm, status: statusFilter } });
            setBookings(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [searchTerm, statusFilter]);

    const fetchBookingDetails = async (bookingId) => {
        try {
            setModalLoading(true);
            setSelectedBookingId(bookingId);
            const res = await api.get(`/admin/bookings/${bookingId}`);
            setBookingDetails(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setSelectedBookingId(null);
        setBookingDetails(null);
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="page-title">Passenger Bookings</h1>
                    <p className="page-subtitle">Monitor and verify passenger bookings and payments.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                        <input 
                            type="text" 
                            placeholder="Search user or location..." 
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
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="Completed">Completed</option>
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
                                <th>Passenger</th>
                                <th>Route</th>
                                <th>Seats</th>
                                <th>Booked On</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map(booking => (
                                <tr key={booking.id} style={{ backgroundColor: booking.status === 'Cancelled' ? '#fef2f2' : 'transparent' }}>
                                    <td><strong>{booking.user.fullName}</strong></td>
                                    <td style={{ fontSize: '13px' }}>{booking.route.startLocation.split(',')[0]} &rarr; {booking.route.endLocation.split(',')[0]}</td>
                                    <td>{booking.seatsBooked}</td>
                                    <td>{new Date(booking.bookedAt).toLocaleString()}</td>
                                    <td><span className={`status-badge ${booking.status.toLowerCase()}`}>{booking.status}</span></td>
                                    <td style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => fetchBookingDetails(booking.id)} className="action-btn view-btn" title="View Details">
                                            <Eye size={16} /> Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {bookings.length === 0 && (
                                <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>No bookings found.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Detailed Profile Modal */}
            {selectedBookingId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '800px', maxWidth: '90vw' }}>
                        <div className="modal-header">
                            <h2>Booking Details</h2>
                            <button onClick={closeModal} className="icon-btn"><X /></button>
                        </div>
                        
                        {modalLoading || !bookingDetails ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                
                                {/* Header Info */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <User size={18} color="#3b82f6" /> {bookingDetails.booking.user.fullName}
                                        </h3>
                                        <p style={{ margin: '0 0 5px 0', color: '#475569' }}><strong>Email:</strong> {bookingDetails.booking.user.email}</p>
                                        <p style={{ margin: '0 0 5px 0', color: '#475569' }}><strong>Seats Booked:</strong> {bookingDetails.booking.seatsBooked}</p>
                                        <p style={{ margin: '0', color: '#475569' }}><strong>Booked On:</strong> {new Date(bookingDetails.booking.bookedAt).toLocaleString()}</p>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                        <span className={`status-badge ${bookingDetails.booking.status.toLowerCase()}`} style={{ fontSize: '14px', padding: '6px 12px' }}>
                                            {bookingDetails.booking.status.toUpperCase()}
                                        </span>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                                            ${(bookingDetails.booking.route.pricePerSeat * bookingDetails.booking.seatsBooked).toFixed(2)} Total
                                        </div>
                                    </div>
                                </div>

                                {/* Route Info */}
                                <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={18} color="#10b981" /> Route Information</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', color: '#475569', fontSize: '14px' }}>
                                        <div>
                                            <p style={{ margin: '0 0 5px 0' }}><strong>Driver:</strong> {bookingDetails.booking.route.driver.user.fullName}</p>
                                            <p style={{ margin: '0 0 5px 0' }}><strong>Route Status:</strong> <span className={`status-badge ${bookingDetails.booking.route.status.toLowerCase()}`} style={{ fontSize: '11px' }}>{bookingDetails.booking.route.status}</span></p>
                                        </div>
                                        <div>
                                            <p style={{ margin: '0 0 5px 0' }}><strong>Start:</strong> {bookingDetails.booking.route.startLocation}</p>
                                            <p style={{ margin: '0 0 5px 0' }}><strong>End:</strong> {bookingDetails.booking.route.endLocation}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Info */}
                                <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: bookingDetails.payment ? '#f0fdf4' : '#f8fafc' }}>
                                    <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><CreditCard size={18} color={bookingDetails.payment ? "#10b981" : "#64748b"} /> Payment Information</h4>
                                    {bookingDetails.payment ? (
                                        <div style={{ color: '#475569', fontSize: '14px' }}>
                                            <p style={{ margin: '0 0 5px 0' }}><strong>Transaction ID:</strong> {bookingDetails.payment.transactionId}</p>
                                            <p style={{ margin: '0 0 5px 0' }}><strong>Amount:</strong> ${bookingDetails.payment.amount.toFixed(2)}</p>
                                            <p style={{ margin: '0 0 5px 0' }}><strong>Method:</strong> {bookingDetails.payment.paymentMethod}</p>
                                            <p style={{ margin: '0 0 5px 0' }}><strong>Status:</strong> <span className={`status-badge ${bookingDetails.payment.status.toLowerCase()}`} style={{ fontSize: '11px' }}>{bookingDetails.payment.status}</span></p>
                                            <p style={{ margin: '0' }}><strong>Paid At:</strong> {new Date(bookingDetails.payment.createdAt).toLocaleString()}</p>
                                        </div>
                                    ) : (
                                        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>No payment record found for this booking (Pending payment or cash on delivery).</p>
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

export default Bookings;
