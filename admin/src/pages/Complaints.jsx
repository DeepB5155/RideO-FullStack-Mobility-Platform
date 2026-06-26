import React, { useState, useEffect } from 'react';
import { ShieldAlert, Filter, Eye, Loader2, X, UserX, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import api from '../api';
import '../styles/Pages.css';

const Complaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    
    // Modal state
    const [selectedComplaintId, setSelectedComplaintId] = useState(null);
    const [complaintDetails, setComplaintDetails] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    
    // Action states
    const [adminNotes, setAdminNotes] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    
    // Chat audit state
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [loadingChat, setLoadingChat] = useState(false);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/complaints', { params: { status: statusFilter } });
            setComplaints(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, [statusFilter]);

    const fetchComplaintDetails = async (id) => {
        try {
            setModalLoading(true);
            setSelectedComplaintId(id);
            const res = await api.get(`/admin/complaints/${id}`);
            setComplaintDetails(res.data);
            setAdminNotes(res.data.complaint.adminNotes || '');
        } catch (err) {
            console.error(err);
        } finally {
            setModalLoading(false);
        }
    };

    const updateStatus = async (newStatus) => {
        if (!selectedComplaintId) return;
        try {
            setUpdatingStatus(true);
            await api.put(`/admin/complaints/${selectedComplaintId}/status`, { status: newStatus, adminNotes });
            fetchComplaintDetails(selectedComplaintId); // Refresh modal
            fetchComplaints(); // Refresh list
        } catch (err) {
            alert('Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const blockUser = async (userId) => {
        if (!window.confirm('Are you sure you want to block this user?')) return;
        try {
            await api.post(`/admin/users/${userId}/toggle-block`);
            alert('User blocked successfully.');
            fetchComplaintDetails(selectedComplaintId); // Refresh to show blocked status
        } catch (err) {
            alert('Failed to block user');
        }
    };

    const suspendDriver = async (userId) => {
        if (!window.confirm('Are you sure you want to suspend this driver? (You must use the driver endpoint, assuming reported user is a driver)')) return;
        
        // Note: The UI assumes the driver ID can be fetched, but the complaint links to User ID.
        // For MVP, we will try to block the underlying User account to be safe.
        blockUser(userId);
    };

    const fetchChatHistory = async (bookingId) => {
        try {
            setLoadingChat(true);
            setChatModalOpen(true);
            const res = await api.get(`/admin/chat/${bookingId}`);
            setChatHistory(res.data.messages);
        } catch (err) {
            console.error(err);
            alert('Failed to load chat history');
            setChatModalOpen(false);
        } finally {
            setLoadingChat(false);
        }
    };

    const closeModal = () => {
        setSelectedComplaintId(null);
        setComplaintDetails(null);
        setAdminNotes('');
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="page-title">Complaint Triage</h1>
                    <p className="page-subtitle">Review passenger and driver reports and take administrative action.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                        <Filter size={18} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: '8px 10px 8px 35px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer' }}
                        >
                            <option value="">All Complaints</option>
                            <option value="Open">Open</option>
                            <option value="In Review">In Review</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Rejected">Rejected</option>
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
                                <th>Subject</th>
                                <th>Reporter</th>
                                <th>Reported User</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {complaints.map(complaint => (
                                <tr key={complaint.id}>
                                    <td><strong>{complaint.subject}</strong></td>
                                    <td>{complaint.reporterName}</td>
                                    <td>{complaint.reportedName}</td>
                                    <td>{new Date(complaint.createdAt).toLocaleDateString()}</td>
                                    <td><span className={`status-badge ${complaint.status.toLowerCase().replace(' ', '-')}`}>{complaint.status}</span></td>
                                    <td>
                                        <button onClick={() => fetchComplaintDetails(complaint.id)} className="action-btn view-btn" title="Review Complaint">
                                            <ShieldAlert size={16} /> Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {complaints.length === 0 && (
                                <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>No complaints found.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Complaint Details Modal */}
            {selectedComplaintId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '800px', maxWidth: '90vw' }}>
                        <div className="modal-header" style={{ backgroundColor: '#fff1f2', borderBottom: '1px solid #fecdd3' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e11d48' }}><AlertTriangle size={24} /> Complaint Review</h2>
                            <button onClick={closeModal} className="icon-btn"><X /></button>
                        </div>
                        
                        {modalLoading || !complaintDetails ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                
                                {/* Status Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 5px 0' }}>{complaintDetails.complaint.subject}</h3>
                                        <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Submitted on {new Date(complaintDetails.complaint.createdAt).toLocaleString()}</p>
                                    </div>
                                    <span className={`status-badge ${complaintDetails.complaint.status.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '14px', padding: '6px 12px' }}>
                                        {complaintDetails.complaint.status.toUpperCase()}
                                    </span>
                                </div>

                                {/* Entities Involved */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                        <h4 style={{ margin: '0 0 10px 0', color: '#64748b' }}>Reported By</h4>
                                        <p style={{ margin: '0 0 5px 0' }}><strong>{complaintDetails.Reporter.fullName}</strong> ({complaintDetails.Reporter.role})</p>
                                        <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#475569' }}>{complaintDetails.Reporter.email}</p>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>{complaintDetails.Reporter.phoneNumber}</p>
                                    </div>
                                    <div style={{ padding: '15px', border: '1px solid #fecdd3', borderRadius: '8px', backgroundColor: '#fff1f2' }}>
                                        <h4 style={{ margin: '0 0 10px 0', color: '#e11d48' }}>Reported Offender</h4>
                                        <p style={{ margin: '0 0 5px 0' }}><strong>{complaintDetails.Reported.fullName}</strong> ({complaintDetails.Reported.role})</p>
                                        <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#475569' }}>{complaintDetails.Reported.email}</p>
                                        
                                        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: complaintDetails.Reported.isBlocked ? '#e11d48' : '#10b981' }}>
                                                {complaintDetails.Reported.isBlocked ? 'CURRENTLY BLOCKED' : 'ACCOUNT ACTIVE'}
                                            </span>
                                            <button 
                                                onClick={() => blockUser(complaintDetails.complaint.reportedUserId)} 
                                                className="action-btn" 
                                                style={{ backgroundColor: complaintDetails.Reported.isBlocked ? '#64748b' : '#ef4444', color: 'white', border: 'none', padding: '6px 12px' }}
                                            >
                                                <UserX size={14} style={{ marginRight: '5px' }} /> 
                                                {complaintDetails.Reported.isBlocked ? 'Unblock User' : 'Block User'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Complaint Description */}
                                <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#64748b' }}>Description</h4>
                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#334155' }}>
                                        {complaintDetails.complaint.description}
                                    </p>
                                </div>

                                {/* Admin Resolution */}
                                <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#64748b' }}>Admin Resolution Notes</h4>
                                    <textarea 
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Internal notes regarding how this complaint was handled..."
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '80px', marginBottom: '15px' }}
                                    />
                                    
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {complaintDetails.complaint.bookingId && (
                                            <button onClick={() => fetchChatHistory(complaintDetails.complaint.bookingId)} className="action-btn" style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', marginRight: 'auto' }}>
                                                <Eye size={16} /> Audit Chat Log
                                            </button>
                                        )}
                                        {complaintDetails.complaint.status !== 'In Review' && (
                                            <button onClick={() => updateStatus('In Review')} disabled={updatingStatus} className="action-btn" style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none' }}>
                                                <Clock size={16} /> Mark In Review
                                            </button>
                                        )}
                                        {complaintDetails.complaint.status !== 'Resolved' && (
                                            <button onClick={() => updateStatus('Resolved')} disabled={updatingStatus} className="action-btn" style={{ backgroundColor: '#10b981', color: 'white', border: 'none' }}>
                                                <CheckCircle size={16} /> Mark Resolved
                                            </button>
                                        )}
                                        {complaintDetails.complaint.status !== 'Rejected' && (
                                            <button onClick={() => updateStatus('Rejected')} disabled={updatingStatus} className="action-btn view-btn">
                                                <X size={16} /> Reject Report
                                            </button>
                                        )}
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Chat Audit Modal */}
            {chatModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-content" style={{ width: '500px', maxWidth: '90vw', height: '600px', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header" style={{ backgroundColor: '#f0f9ff', borderBottom: '1px solid #bae6fd' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', margin: 0, fontSize: '18px' }}>
                                <Eye size={20} /> Booking Chat Audit Log
                            </h2>
                            <button onClick={() => setChatModalOpen(false)} className="icon-btn"><X /></button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {loadingChat ? (
                                <div style={{ textAlign: 'center', marginTop: '50px' }}><Loader2 className="animate-spin" /> Loading logs...</div>
                            ) : chatHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>No chat messages found for this booking.</div>
                            ) : (
                                chatHistory.map((msg, index) => {
                                    const isDriver = msg.senderRole === 'Driver';
                                    return (
                                        <div key={index} style={{ 
                                            alignSelf: isDriver ? 'flex-start' : 'flex-end', 
                                            backgroundColor: isDriver ? 'white' : '#dbeafe', 
                                            border: '1px solid',
                                            borderColor: isDriver ? '#e2e8f0' : '#bfdbfe',
                                            padding: '10px 15px', 
                                            borderRadius: '8px', 
                                            maxWidth: '80%' 
                                        }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' }}>
                                                {msg.senderName} ({msg.senderRole})
                                            </div>
                                            <div style={{ color: '#0f172a', fontSize: '14px' }}>{msg.content}</div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                                                {new Date(msg.sentAt).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Complaints;
