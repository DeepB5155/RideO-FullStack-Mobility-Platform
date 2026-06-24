import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../api';
import '../styles/Pages.css';

const Drivers = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDrivers = async () => {
            try {
                const response = await api.get('/admin/drivers');
                setDrivers(response.data);
            } catch (error) {
                console.error("Error fetching drivers:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDrivers();
    }, []);

    if (loading) {
        return (
            <div className="page-container empty-state">
                <Loader2 className="animate-spin" size={48} color="#10b981" />
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Driver Fleet</h1>
                <div className="header-actions">
                    <input type="text" className="search-input" placeholder="Search drivers..." />
                    <button className="primary-btn">Onboard Driver</button>
                </div>
            </div>

            <div className="panel table-panel">
                {drivers.length === 0 ? (
                    <div className="empty-state">No drivers recorded in database.</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Driver Name</th>
                                <th>Vehicle</th>
                                <th>License</th>
                                <th>Rating</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drivers.map(driver => (
                                <tr key={driver.id}>
                                    <td>{driver.user ? driver.user.fullName : 'Unknown User'}</td>
                                    <td>{driver.vehicleType || 'Not assigned'}</td>
                                    <td>{driver.licenseNumber}</td>
                                    <td>{driver.rating.toFixed(1)} ★</td>
                                    <td>
                                        <span className={`badge ${driver.isAvailable ? 'success' : 'neutral'}`}>
                                            {driver.isAvailable ? 'Online' : 'Offline'}
                                        </span>
                                    </td>
                                    <td><button className="text-btn">View Profile</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Drivers;
