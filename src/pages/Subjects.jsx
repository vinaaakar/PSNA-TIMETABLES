import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, Plus, Filter, Trash2, Save } from 'lucide-react';
import Modal from '../components/Modal';
const Subjects = () => {
    const { subjects, addSubjects, deleteSubjects, clearSubjects } = useData();
    const [search, setSearch] = useState('');
    const [filterSem, setFilterSem] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newSubject, setNewSubject] = useState({ code: '', name: '', semester: 'I', credit: 3, type: 'Lecture' });
    const handleAddSubject = () => {
        if (!newSubject.code || !newSubject.name) return;
        addSubjects([{ ...newSubject, id: Date.now().toString() }]);
        setIsAddOpen(false);
        setNewSubject({ code: '', name: '', semester: 'I', credit: 3, type: 'Lecture' });
    };
    const filtered = subjects.filter(s => {
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
    const uniqueSems = Array.from(new Set(subjects.map(s => s.semester))).sort();
    const [openDropdown, setOpenDropdown] = useState(null); // 'sem' or 'type'
    const dropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenDropdown(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Subjects</h1>
                    <p style={{ color: 'var(--text-light)' }}>View and edit course details</p>
                </div>
                <div>
                    <button className="btn btn-danger" onClick={() => {
                        if (window.confirm('Are you sure you want to delete ALL subjects? This cannot be undone.')) clearSubjects();
                    }} style={{ color: 'white', marginRight: '1rem' }}>
                        <Trash2 size={18} /> Delete All
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
                        <Plus size={18} /> Add Subject
                    </button>
                </div>
            </div>
            <div className="card" style={{ padding: '0' }}>
                <div className="filter-bar" ref={dropdownRef}>
                    <div className="search-wrapper">
                        <Search size={18} />
                        <input
                            className="elegant-input"
                            placeholder="Search subjects by name or code..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <Filter size={18} color="#94a3b8" />

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
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Semester</th>
                                <th>Code</th>
                                <th>Subject Name</th>
                                <th>Type</th>
                                <th>Weekday</th>
                                <th>Saturday</th>
                                <th>Total Hrs</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontWeight: 'bold' }}>{s.semester}</td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{s.code}</td>
                                    <td>{s.name}</td>
                                    <td>
                                        {s.type === 'Integrated Theory' ?
                                            <span className="badge" style={{ backgroundColor: '#8b5cf6', color: 'white' }}>Integrated Theory</span> :
                                            s.type === 'Integrated Lab' ?
                                                <span className="badge" style={{ backgroundColor: '#6d28d9', color: 'white' }}>Integrated Lab</span> :
                                                (s.type === 'Lab' || s.code.includes('LAB') || s.name.toUpperCase().includes('LABORATORY') || s.name.toUpperCase().includes('PRACTICAL')) ?
                                                    <span className="badge badge-info">Lab</span> :
                                                    <span className="badge badge-success">Lecture</span>
                                        }
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#64748b' }}>{s.credit || 0}</td>
                                    <td style={{ textAlign: 'center', color: s.satCount > 0 ? 'var(--primary)' : '#cbd5e1', fontWeight: s.satCount > 0 ? '700' : '400' }}>{s.satCount || 0}</td>
                                    <td style={{ fontWeight: '600' }}>{(parseInt(s.credit) || 0) + (parseInt(s.satCount) || 0)}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            className="btn-outline"
                                            style={{ border: 'none', color: 'var(--text-light)', padding: '4px', cursor: 'pointer' }}
                                            onClick={() => {
                                                if (window.confirm('Delete this subject?')) deleteSubjects(s.id);
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No subjects found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Subject">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Semester</label>
                        <select className="input-field" value={newSubject.semester} onChange={e => setNewSubject({ ...newSubject, semester: e.target.value })} style={{ width: '100%' }}>
                            {Array.from(new Set([...uniqueSems, 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'])).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Subject Code</label>
                        <input className="input-field" style={{ width: '100%' }} value={newSubject.code} onChange={e => setNewSubject({ ...newSubject, code: e.target.value })} placeholder="e.g. CS2201" />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Subject Name</label>
                        <input className="input-field" style={{ width: '100%' }} value={newSubject.name} onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} placeholder="e.g. Data Structures" />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Type</label>
                        <select className="input-field" value={newSubject.type} onChange={e => setNewSubject({ ...newSubject, type: e.target.value })} style={{ width: '100%' }}>
                            <option value="Lecture">Lecture</option>
                            <option value="Lab">Lab</option>
                            <option value="Integrated Theory">Integrated Theory</option>
                            <option value="Integrated Lab">Integrated Lab</option>
                            <option value="Elective">Elective</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Credits / Hours</label>
                        <input type="number" className="input-field" style={{ width: '100%' }} value={newSubject.credit} onChange={e => setNewSubject({ ...newSubject, credit: parseInt(e.target.value) || 0 })} />
                    </div>
                    <button className="btn btn-primary" onClick={handleAddSubject} style={{ marginTop: '0.5rem' }}>
                        <Save size={18} style={{ marginRight: 8 }} /> Save Subject
                    </button>
                </div>
            </Modal>
        </div>
    );
};
export default Subjects;