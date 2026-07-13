import React, { useState, useEffect } from 'react';
import api from '../api';
import './PayoutRequests.css';

const PayoutRequests = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [actionType, setActionType] = useState('');

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payout/pending');
      setPayouts(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching payouts', err);
      setError('Failed to fetch pending payouts.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (payout, action) => {
    setSelectedPayout(payout);
    setActionType(action);
    setModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedPayout || !actionType) return;
    
    try {
      await api.put(`/payout/${selectedPayout.id}/status`, { status: actionType });
      // Remove from list after successful action
      setPayouts((prev) => prev.filter((p) => p.id !== selectedPayout.id));
      setModalOpen(false);
    } catch (err) {
      console.error(`Error updating payout status to ${actionType}`, err);
      alert(`Failed to ${actionType.toLowerCase()} payout.`);
    }
  };

  if (loading) return <div className="payout-container"><div className="empty-state"><h2>Loading pending payouts...</h2></div></div>;

  return (
    <div className="payout-container">
      <div className="page-header">
        <h1>Pending Payout Requests</h1>
        <p>Review and process driver withdrawal requests</p>
      </div>
      
      {error && <div style={{ color: '#ef4444', marginBottom: '15px' }}>{error}</div>}

      {payouts.length === 0 ? (
        <div className="empty-state">
          No pending payout requests at this time.
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date Requested</th>
                <th>Driver Name</th>
                <th>Amount ($)</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.requestedAt).toLocaleString()}</td>
                  <td className="driver-name">{p.driverName || 'Unknown Driver'}</td>
                  <td className="amount-value">${(p.amount || 0).toFixed(2)}</td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn approve"
                      onClick={() => openModal(p, 'Approved')}
                    >
                      Approve
                    </button>
                    <button 
                      className="action-btn reject"
                      onClick={() => openModal(p, 'Rejected')}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      {modalOpen && selectedPayout && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirm Action</h2>
            <p>
              Are you sure you want to <strong>{actionType.toLowerCase()}</strong> the payout of 
              <span className="amount-value"> ${(selectedPayout.amount || 0).toFixed(2)}</span> for 
              <strong> {selectedPayout.driverName || 'Unknown Driver'}</strong>?
            </p>
            
            <div className="modal-actions">
              <button 
                className="modal-btn cancel"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-btn confirm"
                style={{ backgroundColor: actionType === 'Approved' ? '#10b981' : '#ef4444' }}
                onClick={handleUpdateStatus}
              >
                Yes, {actionType}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayoutRequests;

