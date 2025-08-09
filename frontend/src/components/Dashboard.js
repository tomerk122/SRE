import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="dashboard">
            <div className="user-info">
                <h2>Welcome to your Dashboard!</h2>
                <div className="user-details">
                    <p><strong>ID:</strong> {user?.id}</p>
                    <p><strong>Username:</strong> {user?.username}</p>
                    <p><strong>Email:</strong> {user?.email}</p>
                    <p><strong>Member since:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>

                <button
                    onClick={handleLogout}
                    className="btn logout-btn"
                >
                    Logout
                </button>
            </div>

            <div className="user-info">
                <h3>Application Status</h3>
                <div className="user-details">
                    <p><strong>Authentication:</strong> ✅ Active</p>
                    <p><strong>Database:</strong> ✅ Connected to TiDB</p>
                    <p><strong>Logging:</strong> ✅ log4js enabled</p>
                    <p><strong>Message Queue:</strong> ✅ Kafka integrated</p>
                    <p><strong>Monitoring:</strong> ✅ CDC enabled</p>
                </div>
            </div>

            <div className="user-info">
                <h3>System Information</h3>
                <div className="user-details">
                    <p><strong>Frontend:</strong> React Application</p>
                    <p><strong>Backend:</strong> Node.js + Express</p>
                    <p><strong>Database:</strong> TiDB</p>
                    <p><strong>Message Broker:</strong> Apache Kafka</p>
                    <p><strong>Containerization:</strong> Docker + Docker Compose</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
