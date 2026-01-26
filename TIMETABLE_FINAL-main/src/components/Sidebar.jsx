import React from 'react';
import { LayoutDashboard, Calendar, Users, BookOpen, GraduationCap, Building2, Settings, Columns } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Calendar, label: 'Timetable', path: '/timetable' },
        { icon: Columns, label: 'Allocations', path: '/allocations' },
        { icon: Users, label: 'Teachers', path: '/teachers' },
        { icon: BookOpen, label: 'Subjects', path: '/subjects' },
    ];

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="logo-container">
                <div className="logo-icon">PT</div>
                <h1 className="logo-text">PSNA TIMETABLE</h1>
            </div>

            <nav className="nav-menu">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="nav-item">
                    <Settings size={20} />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
