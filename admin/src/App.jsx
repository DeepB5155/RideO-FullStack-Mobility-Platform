import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Rides from './pages/Rides';
import Bookings from './pages/Bookings';
import Users from './pages/Users';
import Drivers from './pages/Drivers';
import KYCManagement from './pages/KYCManagement';
import LiveRides from './pages/LiveRides';
import Complaints from './pages/Complaints';
import LiveTracking from './pages/LiveTracking';
import RidePlayback from './pages/RidePlayback';
import SafetyAlerts from './pages/SafetyAlerts';
import PayoutRequests from './pages/PayoutRequests';
import ProfileEdits from './pages/ProfileEdits';
import './App.css';

import { SignalRProvider } from './context/SignalRContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading, error } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '20px' }}>Loading session...</div>;
  }

  if (error) {
    return <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h2 style={{ color: 'red' }}>Access Denied</h2>
      <p>{error}</p>
      <a href="/login" style={{ marginTop: '20px', padding: '10px 20px', background: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>Return to Login</a>
    </div>;
  }

  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <SignalRProvider>
        <Router>
          <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/track/:trackingId" element={<LiveTracking />} />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="rides" element={<Rides />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="live" element={<LiveRides />} />
          <Route path="users" element={<Users />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="kyc" element={<KYCManagement />} />
          <Route path="profile-edits" element={<ProfileEdits />} />
          <Route path="payouts" element={<PayoutRequests />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="safety-alerts" element={<SafetyAlerts />} />
          <Route path="ride-playback/:id" element={<RidePlayback />} />
          </Route>
          </Routes>
        </Router>
      </SignalRProvider>
    </AuthProvider>
  );
}

export default App;
