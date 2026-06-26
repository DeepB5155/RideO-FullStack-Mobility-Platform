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
import './App.css';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('adminAuth') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
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
          <Route path="complaints" element={<Complaints />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
