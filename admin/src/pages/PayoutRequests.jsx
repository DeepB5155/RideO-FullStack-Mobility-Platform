import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import './PayoutRequests.css'; // Optional, but let's just use inline or simple styles for now. I'll stick to basic JSX with standard classes if they exist, or just inline. Actually, let's use inline for simplicity.

const PayoutRequests = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/payout/pending');
      setPayouts(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching payouts', err);
      setError('Failed to fetch pending payouts.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this payout?`)) return;
    
    try {
      await axiosInstance.put(`/payout/${id}/status`, { status });
      // Remove from list after successful action
      setPayouts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(`Error updating payout status to ${status}`, err);
      alert(`Failed to ${status.toLowerCase()} payout.`);
    }
  };

  if (loading) return <div className="payout-container"><h2>Loading pending payouts...</h2></div>;

  return (
    <div className="payout-container" style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Pending Driver Payouts</h1>
      
      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

      {payouts.length === 0 ? (
        <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          No pending payout requests at this time.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f1f1', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Date Requested</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Driver Name</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Amount ($)</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{new Date(p.requestedAt).toLocaleString()}</td>
                <td style={{ padding: '12px' }}>{p.driverName || 'Unknown Driver'}</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.amount.toFixed(2)}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button 
                    onClick={() => handleUpdateStatus(p.id, 'Approved')}
                    style={{ 
                      backgroundColor: '#28a745', 
                      color: '#fff', 
                      border: 'none', 
                      padding: '8px 12px', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      marginRight: '8px'
                    }}
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(p.id, 'Rejected')}
                    style={{ 
                      backgroundColor: '#dc3545', 
                      color: '#fff', 
                      border: 'none', 
                      padding: '8px 12px', 
                      borderRadius: '4px', 
                      cursor: 'pointer'
                    }}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PayoutRequests;
