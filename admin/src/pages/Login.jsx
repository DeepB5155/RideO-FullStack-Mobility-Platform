import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import '../styles/Pages.css';
import '../styles/Login.css';

const Login = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(
        localStorage.getItem('adminAuth') === 'true'
    );

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleLogin = (e) => {
        e.preventDefault();
        
        if (credentials.username === 'admin' && credentials.password === 'admin123') {
            localStorage.setItem('adminAuth', 'true');
            window.location.href = '/'; 
        } else {
            setError('Invalid credentials. Hint: admin / admin123');
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-card panel">
                <div className="login-header">
                    <h2>Ride<span>O</span> Admin Login</h2>
                    <p>Secure portal access</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    {error && <div className="error-badge badge warning">{error}</div>}
                    
                    <div className="input-group">
                        <User size={20} className="input-icon" />
                        <input
                            type="text"
                            placeholder="Admin Username"
                            className="search-input"
                            value={credentials.username}
                            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                        />
                    </div>
                    
                    <div className="input-group">
                        <Lock size={20} className="input-icon" />
                        <input
                            type="password"
                            placeholder="Password"
                            className="search-input"
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="primary-btn login-btn">Sign In</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
