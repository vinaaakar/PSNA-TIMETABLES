import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, Filter } from 'lucide-react';
const Allocations = () => {
    const { subjects, teachers } = useData();
    const [search, setSearch] = useState('');
    const [filterSem, setFilterSem] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [openDropdown, setOpenDropdown] = useState(null); // 'sem' or 'type'
    const dropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenDropdown(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredSubjects = subjects.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.code.toLowerCase().includes(search.toLowerCase());
        const matchesSem = filterSem === 'All' || s.semester === filterSem;
        let type = s.type || 'Lecture';
        // Priority detection for Electives based on name pattern
        if (/-\s*(I|II|III|IV)\s*\*?\s*$/i.test(s.name) || s.name.toUpperCase().includes('ELECTIVE')) {
            type = 'Elective';
        } else if (!s.type && (s.code.includes('LAB') || s.name.toUpperCase().includes('LABORATORY') || s.name.toUpperCase().includes('PRACTICAL'))) {
            type = 'Lab';
        }
        const matchesType = filterType === 'All' || type === filterType;
        return matchesSearch && matchesSem && matchesType;
    });

    const getTeacher = (subjectCode, section) => {
        const assign = teachers.find(t => t.subjectCode === subjectCode && t.section === section);
        return assign ? assign.name : '-';
    };

    const uniqueSections = Array.from(new Set(teachers.map(t => t.section).filter(Boolean))).sort();
    const displaySections = uniqueSections.length > 0 ? uniqueSections : ['A', 'B', 'C', 'D'];
    const uniqueSems = Array.from(new Set(subjects.map(s => s.semester))).sort();

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Allocations</h1>
                    <p style={{ color: 'var(--text-light)' }}>Manage subject-teacher distributions</p>
                </div>
            </div>
            <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="filter-bar" ref={dropdownRef}>
                    <div className="search-wrapper">
                        <Search size={18} />
                        <input
                            className="elegant-input"
                            placeholder="Search allocations by name or code..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <Filter size={18} color="#94a3b8" />

                        {/* Semester Dropdown */}
                        <div className="custom-select-container">
                            <div
                                className={`custom-select-trigger ${openDropdown === 'sem' ? 'active' : ''}`}
                                onClick={() => setOpenDropdown(openDropdown === 'sem' ? null : 'sem')}
                            >
                                <span>{filterSem === 'All' ? 'All Semesters' : `Sem ${filterSem}`}</span>
                                <Search size={14} style={{ transform: openDropdown === 'sem' ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', opacity: 0.5 }} />
                            </div>
                            {openDropdown === 'sem' && (
                                <div className="custom-select-menu">
                                    <div className={`custom-select-item ${filterSem === 'All' ? 'selected' : ''}`} onClick={() => { setFilterSem('All'); setOpenDropdown(null); }}>All Semesters</div>
                                    {uniqueSems.map(s => (
                                        <div key={s} className={`custom-select-item ${filterSem === s ? 'selected' : ''}`} onClick={() => { setFilterSem(s); setOpenDropdown(null); }}>Sem {s}</div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Type Dropdown */}
                        <div className="custom-select-container">
                            <div
                                className={`custom-select-trigger ${openDropdown === 'type' ? 'active' : ''}`}
                                onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                            >
                                <span>{filterType === 'All' ? 'All Types' : filterType}</span>
                                <Search size={14} style={{ transform: openDropdown === 'type' ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', opacity: 0.5 }} />
                            </div>
                            {openDropdown === 'type' && (
                                <div className="custom-select-menu">
                                    {['All', 'Lecture', 'Lab', 'Elective'].map(t => (
                                        <div key={t} className={`custom-select-item ${filterType === t ? 'selected' : ''}`} onClick={() => { setFilterType(t); setOpenDropdown(null); }}>{t === 'All' ? 'All Types' : t}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="table-container" style={{ borderRadius: 0, border: 'none', borderTop: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '80px' }}>Sem</th>
                                <th style={{ width: '100px' }}>Code</th>
                                <th style={{ minWidth: '200px' }}>Subject Name</th>
                                {displaySections.map(sec => <th key={sec} style={{ textAlign: 'center', width: '150px' }}>Sec {sec}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSubjects.map(sub => (
                                <tr key={sub.id}>
                                    <td style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>{sub.semester}</td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{sub.code}</td>
                                    <td>
                                        {sub.name}
                                        {(sub.code.includes('-') || sub.code.endsWith('*')) && <span className="badge badge-warning" style={{ marginLeft: '8px' }}>ELE</span>}
                                        {sub.type === 'Lab' && <span className="badge badge-info" style={{ marginLeft: '8px' }}>LAB</span>}
                                    </td>
                                    {displaySections.map(sec => (
                                        <td key={sec} style={{ textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: getTeacher(sub.code, sec) !== '-' ? '#eff6ff' : 'transparent',
                                                color: getTeacher(sub.code, sec) !== '-' ? '#1d4ed8' : '#cbd5e1',
                                                fontWeight: '600',
                                                fontSize: '0.85rem',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {getTeacher(sub.code, sec)}
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {filteredSubjects.length === 0 && <tr><td colSpan={3 + displaySections.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>No matching records found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
export default Allocations;