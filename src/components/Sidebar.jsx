import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, BookOpen, Layers, FileSpreadsheet, FileText } from 'lucide-react';
import './Layout.css';
const Sidebar = ({ userRole }) => {
    const location = useLocation();
    const navItems = userRole === 'faculty'
        ? [
            { path: '/', icon: LayoutDashboard, label: 'My Timetable' }
        ]
        : [
            { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { path: '/timetable', icon: Calendar, label: 'Timetable' },
            { path: '/allocations', icon: Layers, label: 'Allocations' },
            { path: '/teachers', icon: Users, label: 'Teachers' },
            { path: '/subjects', icon: BookOpen, label: 'Subjects' },
            { path: '/excel-preview', icon: FileSpreadsheet, label: 'Excel Preview' },
            { path: '/word-preview', icon: FileText, label: 'Word Preview' },
        ];
    return (
        <aside className="app-sidebar">
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'white', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="PSNA Logo" style={{ height: '32px', width: 'auto' }} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.05em' }}>PSNA</span>
                </div>
            </div>
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};
export default Sidebar;