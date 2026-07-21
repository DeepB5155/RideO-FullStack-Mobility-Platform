import axios from "axios";
import { TokenHelper } from "./utils/tokenHelper";

// Connect to the .NET backend API
// Note: Depending on launchSettings.json, the port is 5248 or 7078. 
// We use localhost:5248 as defined in http configuration over standard HTTP for dev.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5248/api",
    headers: {
        "Content-Type": "application/json"
    }
});

api.interceptors.request.use(
    (config) => {
        const token = TokenHelper.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            TokenHelper.clearTokens();
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default api;

