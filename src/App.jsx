import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Timetable from './pages/Timetable';
import Allocations from './pages/Allocations';
import Teachers from './pages/Teachers';
import Subjects from './pages/Subjects';
import Login from './pages/Login';
import FacultyDashboard from './pages/FacultyDashboard';
import { DataProvider } from './context/DataContext';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('isAuthenticated') === 'true';
    });

    const [userRole, setUserRole] = useState(() => {
        return localStorage.getItem('userRole') || 'admin';
    });

    const [currentUser, setCurrentUser] = useState(() => {
        const stored = localStorage.getItem('currentUser');
        return stored ? JSON.parse(stored) : null;
    });

    const handleLogin = (role = 'admin', userData = null) => {
        setIsAuthenticated(true);
        setUserRole(role);
        setCurrentUser(userData);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userRole', role);
        if (userData) {
            localStorage.setItem('currentUser', JSON.stringify(userData));
        } else {
            localStorage.removeItem('currentUser');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setUserRole('admin');
        setCurrentUser(null);
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userRole');
        localStorage.removeItem('currentUser');
    };

    return (
        <DataProvider>
            {!isAuthenticated ? (
                <Login onLogin={handleLogin} />
            ) : (
                <Layout onLogout={handleLogout} userRole={userRole}>
                    <Routes>
                        {userRole === 'admin' ? (
                            <>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/timetable" element={<Timetable />} />
                                <Route path="/allocations" element={<Allocations />} />
                                <Route path="/teachers" element={<Teachers />} />
                                <Route path="/subjects" element={<Subjects />} />
                            </>
                        ) : (
                            <>
                                <Route path="/" element={<FacultyDashboard facultyName={currentUser?.name || 'Faculty'} />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </>
                        )}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Layout>
            )}
        </DataProvider>
    );
}

export default App;
