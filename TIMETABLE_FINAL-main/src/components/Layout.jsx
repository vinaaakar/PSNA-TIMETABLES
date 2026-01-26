import React, { useState } from 'react';
import Sidebar from './Sidebar';
import './Layout.css';

import { LogOut, Menu, X } from 'lucide-react';

const Layout = ({ children, onLogout }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Overlay for mobile */}
            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            <main className="main-content">
                <header className="top-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="mobile-toggle" onClick={toggleSidebar}>
                            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <h2 className="page-title">College Timetable System</h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className="user-profile mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="avatar" style={{ background: 'var(--primary)', color: 'white' }}>A</div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Admin</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>admin@123</span>
                            </div>
                        </div>
                        <div className="mobile-hide" style={{ width: '1px', height: '24px', background: 'var(--border)' }}></div>
                        <button
                            onClick={onLogout}
                            className="btn-icon"
                            title="Sign Out"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-light)',
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--bg-body)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-light)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>
                <div className="content-scroll">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
