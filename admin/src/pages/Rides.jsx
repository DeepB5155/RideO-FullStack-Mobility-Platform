import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../api';
import '../styles/Pages.css';

const Rides = () => {
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRides = async () => {
            try {
                const response = await api.get('/admin/rides');
                setRides(response.data);
            } catch (error) {
                console.error("Error fetching rides:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRides();
    }, []);

    const getStatusClass = (status) => {
        switch(status?.toLowerCase()) {
            case 'completed': return 'success';
            case 'requested': return 'warning';
            case 'ongoing': return 'info';
            case 'cancelled': return 'neutral';
            default: return 'neutral';
        }
    };

    if (loading) {
        return (
            <div className="page-container empty-state">
                <Loader2 className="animate-spin" size={48} color="#3b82f6" />
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Active & Completed Rides</h1>
            </div>

            <div className="panel table-panel">
                {rides.length === 0 ? (
                    <div className="empty-state">No rides found in database.</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Pickup</th>
                                <th>Dropoff</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Fare</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rides.map(ride => (
                                <tr key={ride.id}>
                                    <td>{ride.pickupLocation}</td>
                                    <td>{ride.dropoffLocation}</td>
                                    <td>{new Date(ride.requestedAt).toLocaleString()}</td>
                                    <td><span className={`badge ${getStatusClass(ride.status)}`}>{ride.status}</span></td>
                                    <td>{ride.fare != null ? `$${ride.fare.toFixed(2)}` : '--'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Rides;
