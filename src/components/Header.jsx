import React from 'react';
import { LogOut, Bell, User } from 'lucide-react';
import './Layout.css';

const Header = ({ onLogout, currentUser }) => {
    const displayName = currentUser?.name || 'Admin';
    const displayEmail = currentUser?.email || 'admin@psnacet.edu.in';
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <header className="app-header">
            <div className="header-title">
                PSNA TIME TABLE
            </div>

            <div className="header-profile">
                <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', textTransform: 'capitalize' }}>{displayName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{displayEmail}</div>
                </div>

                <div className="avatar">{initial}</div>

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
