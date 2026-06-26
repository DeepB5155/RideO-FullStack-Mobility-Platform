import axios from 'axios';

// Connect to the .NET backend API
// Note: Depending on launchSettings.json, the port is 5248 or 7078. 
// We use localhost:5248 as defined in http configuration over standard HTTP for dev.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5248/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
