import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import DataImporter from './DataImporter';
import Modal from './Modal';
import { Upload } from 'lucide-react';
import './Layout.css';

const Layout = ({ children, onLogout }) => {
    const [isImportOpen, setImportOpen] = useState(false);
    return (
        <div className="app-layout">
            <Header onLogout={onLogout} />
            <div className="app-body">
                <Sidebar />
                <main className="app-main">
                    {children}
                </main>
            </div>
            {/* Global Floating Import Button */}
            <button
                onClick={() => setImportOpen(true)}
                className="import-fab no-print"
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    borderRadius: '50%',
                    width: '64px',
                    height: '64px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                title="Import Excel Data"
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px' }}>
                    <Upload size={24} style={{ marginBottom: 2 }} />
                    <span>Import</span>
                </div>
            </button>
            <Modal isOpen={isImportOpen} onClose={() => setImportOpen(false)} title="Import Allocation Matrix">
                <DataImporter />
            </Modal>
        </div>
    );
};
export default Layout;