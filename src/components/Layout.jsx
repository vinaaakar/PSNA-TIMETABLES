import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

import Modal from './Modal';
import { Upload } from 'lucide-react';
import './Layout.css';

const Layout = ({ children, onLogout, userRole, currentUser }) => {
    const [isImportOpen, setImportOpen] = useState(false);
    return (
        <div className="app-layout">
            <Header onLogout={onLogout} currentUser={currentUser} />
            <div className="app-body">
                <Sidebar userRole={userRole} />
                <main className="app-main">
                    {children}
                </main>
            </div>
            {/* Global Floating Import Button Removed */}

        </div>
    );
};
export default Layout;