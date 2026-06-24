import axios from 'axios';

// Connect to the .NET backend API
// Note: Depending on launchSettings.json, the port is 5248 or 7078. 
// We use localhost:5248 as defined in http configuration over standard HTTP for dev.
const api = axios.create({
    baseURL: 'http://localhost:5248/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

export default api;
