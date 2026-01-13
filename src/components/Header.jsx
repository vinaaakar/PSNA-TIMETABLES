import React from 'react';
import { LogOut, Bell, User } from 'lucide-react';
import './Layout.css';

const Header = ({ onLogout }) => {
    return (
        <header className="app-header">
            <div className="header-title">
                PSNA TIME TABLE
            </div>

            <div className="header-profile">
                <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>Admin</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>admin@example.com</div>
                </div>

                <div className="avatar">A</div>

                <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem' }}></div>

                <button
                    onClick={onLogout}
                    className="btn-outline"
                    style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-light)' }}
                    title="Logout"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
};

export default Header;
