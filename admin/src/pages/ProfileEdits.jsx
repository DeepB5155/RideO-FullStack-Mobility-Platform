import React, { useState, useEffect } from 'react';
import api from '../api';
import { User, Mail, Phone, Calendar, Check, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import '../styles/Pages.css';
import './ProfileEdits.css';

const API_URL = 'http://localhost:5248/api/admin';

const ProfileEdits = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/admin/profile-edits/pending');
      setRequests(res.data);
    } catch (error) {
      console.error('Error fetching profile edits:', error);
      alert('Failed to load profile edit requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/admin/profile-edits/${id}/approve`);
      alert('Profile edit approved!');
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Approve error:', error);
      alert('Failed to approve profile edit');
    }
  };

  const openRejectModal = (id) => {
    setSelectedRequestId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    try {
      await api.post(`/admin/profile-edits/${selectedRequestId}/reject`, { reason: rejectReason });
      alert('Profile edit rejected');
      setRequests(prev => prev.filter(r => r.id !== selectedRequestId));
      setRejectModalOpen(false);
    } catch (error) {
      console.error('Reject error:', error);
      alert('Failed to reject profile edit');
    }
  };

  if (loading) {
    return <div className="loading-state">Loading...</div>;
  }

  return (
    <div className="profile-edits-page">
      <div className="page-header">
        <h1>Driver Profile Edits</h1>
        <p>Review and approve pending driver profile changes</p>
      </div>

      <div className="requests-table-container">
        {requests.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={48} color="#00a884" />
            <p>No pending profile edits.</p>
          </div>
        ) : (
          <table className="requests-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Current Details</th>
                <th>Requested Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id}>
                  <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td className="details-col current-details">
                    <div><strong>Name:</strong> {req.currentFullName}</div>
                    <div><strong>Phone:</strong> {req.currentPhoneNumber}</div>
                    <div><strong>Email:</strong> {req.currentEmail}</div>
                  </td>
                  <td className="details-col requested-details">
                    <div className={req.currentFullName !== req.requestedFullName ? 'highlight-change' : ''}>
                      <strong>Name:</strong> {req.requestedFullName || req.currentFullName}
                    </div>
                    <div className={req.currentPhoneNumber !== req.requestedPhoneNumber ? 'highlight-change' : ''}>
                      <strong>Phone:</strong> {req.requestedPhoneNumber || req.currentPhoneNumber}
                    </div>
                    <div className={req.currentEmail !== req.requestedEmail ? 'highlight-change' : ''}>
                      <strong>Email:</strong> {req.requestedEmail || req.currentEmail}
                    </div>
                  </td>
                  <td className="actions-col">
                    <button className="action-btn approve" onClick={() => handleApprove(req.id)}>Approve</button>
                    <button className="action-btn reject" onClick={() => openRejectModal(req.id)}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rejectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Reject Profile Edit</h2>
            <p>Please provide a reason for rejecting this update:</p>
            <textarea 
              className="reject-textarea"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="E.g., The provided name does not match your document..."
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setRejectModalOpen(false)}>Cancel</button>
              <button 
                className="modal-btn confirm" 
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim()}
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileEdits;
