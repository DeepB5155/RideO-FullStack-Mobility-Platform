import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, FileSearch } from 'lucide-react';
import './Drivers.css'; // Reuse table styles

const KYCManagement = () => {
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPendingKYC = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('http://localhost:5248/api/admin/kyc-pending', {
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
  }, []);

  const viewDetails = async (driverId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`http://localhost:5248/api/admin/kyc/${driverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedDriver(res.data);
    } catch (err) {
      console.error('Failed to fetch driver details', err);
    }
  };

  const handleApprove = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`http://localhost:5248/api/admin/kyc/${selectedDriver.driver.id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedDriver(null);
      fetchPendingKYC();
    } catch (err) {
      console.error('Failed to approve', err);
    }
  };

  const handleReject = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`http://localhost:5248/api/admin/kyc/${selectedDriver.driver.id}/reject`, "Invalid documents", {
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

  if (loading) return <div className="page-container"><h2>Loading KYC requests...</h2></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Driver KYC Verification</h1>
        <p>Review and approve pending driver applications</p>
      </div>

      {!selectedDriver ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>Email</th>
                <th>License Number</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingDrivers.map((d) => (
                <tr key={d.id}>
                  <td>{d.user.fullName}</td>
                  <td>{d.user.email}</td>
                  <td>{d.licenseNumber}</td>
                  <td><span className="status-badge pending">Pending</span></td>
                  <td>
                    <button className="action-btn view" onClick={() => viewDetails(d.id)}>
                      <FileSearch size={16} /> Review
                    </button>
                  </td>
                </tr>
              ))}
              {pendingDrivers.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No pending KYC requests</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="kyc-details-card" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <button onClick={() => setSelectedDriver(null)} style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer' }}>&larr; Back to List</button>
          
          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ flex: 1 }}>
              <h3>Personal Info</h3>
              <p><strong>Name:</strong> {selectedDriver.user.fullName}</p>
              <p><strong>Email:</strong> {selectedDriver.user.email}</p>
              <p><strong>Phone:</strong> {selectedDriver.user.phoneNumber}</p>
              <p><strong>License:</strong> {selectedDriver.driver.licenseNumber}</p>
              
              <h3 style={{ marginTop: '20px' }}>Vehicle Info</h3>
              {selectedDriver.vehicle ? (
                <>
                  <p><strong>Make & Model:</strong> {selectedDriver.vehicle.make} {selectedDriver.vehicle.model} ({selectedDriver.vehicle.year})</p>
                  <p><strong>Color:</strong> {selectedDriver.vehicle.color}</p>
                  <p><strong>Plate:</strong> {selectedDriver.vehicle.licensePlate}</p>
                  <p><strong>Seats:</strong> {selectedDriver.vehicle.totalSeats}</p>
                </>
              ) : <p>No vehicle data</p>}
            </div>

            <div style={{ flex: 2 }}>
              <h3>Documents</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {selectedDriver.documents.map(doc => (
                  <div key={doc.id} style={{ border: '1px solid #eee', padding: '10px' }}>
                    <p><strong>{doc.documentType}</strong></p>
                    <img 
                      src={`http://localhost:5248${doc.documentUrl}`} 
                      alt={doc.documentType} 
                      style={{ width: '100%', height: '200px', objectFit: 'cover', backgroundColor: '#f4f4f4' }} 
                      onError={(e) => { e.target.onerror = null; e.target.src="https://via.placeholder.com/300?text=No+Image+Available" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <button 
              onClick={handleReject}
              style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <XCircle size={18} /> Reject Application
            </button>
            <button 
              onClick={handleApprove}
              style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} /> Approve Driver
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCManagement;
