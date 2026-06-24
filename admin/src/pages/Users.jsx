import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../api';
import '../styles/Pages.css';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await api.get('/admin/users');
                setUsers(response.data);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    if (loading) {
        return (
            <div className="page-container empty-state">
                <Loader2 className="animate-spin" size={48} color="#f59e0b" />
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">User Management</h1>
            </div>

            <div className="panel table-panel">
                {users.length === 0 ? (
                    <div className="empty-state">No users recorded in database.</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.fullName}</td>
                                    <td>{user.email}</td>
                                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td><button className="text-btn">View</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Users;
