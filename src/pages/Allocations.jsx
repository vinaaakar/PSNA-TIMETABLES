import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, Filter } from 'lucide-react';
const Allocations = () => {
    const { subjects, teachers } = useData();
    const [search, setSearch] = useState('');
    const [filterSem, setFilterSem] = useState('All');
    const [filterType, setFilterType] = useState('All');
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
        return assign ? assign.name : '0';
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
                {/* Global Import Button used instead */}
            </div>
            <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: '#fff', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input className="input-field" style={{ width: '100%', paddingLeft: 40 }} placeholder="Search allocations..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Filter size={18} color="#94a3b8" />
                        <select className="form-select" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
                            <option value="All">All Semesters</option>
                            {uniqueSems.map(s => <option key={s} value={s}>Sem {s}</option>)}
                        </select>
                        <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="All">All Types</option>
                            <option value="Lecture">Lecture</option>
                            <option value="Lab">Lab</option>
                            <option value="Elective">Elective</option>
                        </select>
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