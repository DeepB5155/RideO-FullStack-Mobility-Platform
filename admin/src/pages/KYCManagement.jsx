import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, FileSearch } from 'lucide-react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import '../styles/Pages.css';

const KYCManagement = () => {
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchPendingKYC = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/kyc-pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingDrivers(res.data);
    } catch (err) {
      console.error('Failed to fetch pending KYC', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingKYC();

    let connection;
    const setupSignalR = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        const hubUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '/rideHub') || 'http://localhost:5248/rideHub';
        
        connection = new HubConnectionBuilder()
          .withUrl(hubUrl, { accessTokenFactory: () => token })
          .withAutomaticReconnect()
          .build();

        connection.on("KYCSubmitted", () => {
          console.log("New KYC submitted, refreshing list...");
          fetchPendingKYC();
        });

        await connection.start();
        await connection.invoke("JoinAdminMonitors");
      } catch (err) {
        console.error("SignalR KYC Connection Error", err);
      }
    };

    setupSignalR();

    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, []);

  const viewDetails = async (driverId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/kyc/${driverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedDriver(res.data);
      setRejectionReason(''); // Reset reason on select
    } catch (err) {
      console.error('Failed to fetch driver details', err);
    }
  };

  const handleApprove = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/kyc/${selectedDriver?.driver?.id || selectedDriver?.id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedDriver(null);
      fetchPendingKYC();
    } catch (err) {
      console.error('Failed to approve', err);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejecting the KYC.');
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/kyc/${selectedDriver?.driver?.id || selectedDriver?.id}/reject`, JSON.stringify(rejectionReason), {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setSelectedDriver(null);
      fetchPendingKYC();
    } catch (err) {
      console.error('Failed to reject', err);
    }
  };

  if (loading) return <div className="page-container"><h2 style={{ color: 'var(--text-main)' }}>Loading KYC requests...</h2></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Driver KYC Verification</h1>
          <p className="page-subtitle">Review and approve pending driver applications</p>
        </div>
      </div>

      {!selectedDriver ? (
        <div className="table-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>Email</th>
                <th>License Number</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingDrivers.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.user?.fullName || 'Unknown'}</strong></td>
                  <td>{d.user?.email || 'N/A'}</td>
                  <td>{d.licenseNumber}</td>
                  <td>{d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : 'N/A'}</td>
                  <td><span className="badge badge-warning">Pending</span></td>
                  <td>
                    <button className="text-btn" onClick={() => viewDetails(d.id)} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <FileSearch size={16} /> Review
                    </button>
                  </td>
                </tr>
              ))}
              {pendingDrivers.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No pending KYC requests</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel">
          <button className="text-btn" onClick={() => setSelectedDriver(null)} style={{ marginBottom: '20px' }}>&larr; Back to List</button>
          
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px', marginBottom: '0' }}>
            <div>
              <h3 className="section-title">Personal Info</h3>
              <div style={{ color: 'var(--text-main)', marginBottom: '30px' }}>
                <p><strong>Name:</strong> {selectedDriver.user?.fullName || 'Unknown'}</p>
                <p><strong>Email:</strong> {selectedDriver.user?.email || 'N/A'}</p>
                <p><strong>Phone:</strong> {selectedDriver.user?.phoneNumber || 'N/A'}</p>
                <p><strong>License:</strong> {selectedDriver.driver?.licenseNumber || 'N/A'}</p>
              </div>
              
              <h3 className="section-title">Vehicle Info</h3>
              <div style={{ color: 'var(--text-main)' }}>
                {selectedDriver.vehicle ? (
                  <>
                    <p><strong>Make & Model:</strong> {selectedDriver.vehicle.make} {selectedDriver.vehicle.model} ({selectedDriver.vehicle.year})</p>
                    <p><strong>Color:</strong> {selectedDriver.vehicle.color}</p>
                    <p><strong>Plate:</strong> {selectedDriver.vehicle.licensePlate}</p>
                    <p><strong>Seats:</strong> {selectedDriver.vehicle.totalSeats}</p>
                  </>
                ) : <p style={{ color: 'var(--text-muted)' }}>No vehicle data</p>}
              </div>
            </div>

            <div>
              <h3 className="section-title">Documents</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {selectedDriver.documents?.map(doc => (
                  <div key={doc.id} style={{ border: '1px solid var(--surface-border)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', fontWeight: 'bold' }}>{doc.documentType}</p>
                    <img 
                      src={doc.documentUrl.startsWith('http') ? doc.documentUrl : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '')}${doc.documentUrl}`} 
                      alt={doc.documentType} 
                      style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-color)' }} 
                      onError={(e) => { 
                        const fallback = "https://placehold.co/300x200/png?text=No+Image";
                        if (e.target.src !== fallback) {
                          e.target.src = fallback;
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px', borderTop: '1px solid var(--surface-border)', paddingTop: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Rejection Reason (Required for Rejecting)</label>
              <textarea 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Type the reason why the KYC documents are being rejected..."
                style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--outline)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleReject}
                className="danger-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={18} /> Reject Application
              </button>
              <button 
                onClick={handleApprove}
                className="primary-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--success)' }}>
                <CheckCircle size={18} /> Approve Driver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCManagement;
