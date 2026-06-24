import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Rides from './pages/Rides';
import Users from './pages/Users';
import Drivers from './pages/Drivers';
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
          <Route path="users" element={<Users />} />
          <Route path="drivers" element={<Drivers />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
