import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import './Layout.css';
import TemplateFab from './TemplateFab';

const Layout = ({ children, onLogout, userRole, currentUser }) => {
    return (
        <div className="app-layout">
            <Header onLogout={onLogout} currentUser={currentUser} />
            <div className="app-body">
                <Sidebar userRole={userRole} />
                <main className="app-main">
                    {children}
                </main>
            </div>
            <TemplateFab />
        </div>
    );
};

export default Layout;