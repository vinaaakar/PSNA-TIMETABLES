import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, Filter, Plus, Trash2, Save } from 'lucide-react';
import Modal from '../components/Modal';
const Teachers = () => {
    const { teachers, addTeachers, deleteTeachers, clearTeachers, addFacultyAccounts } = useData();
    const [search, setSearch] = useState('');
    const [filterSem, setFilterSem] = useState('All');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newTeacher, setNewTeacher] = useState({
        name: '',
        dept: 'CSE',
        semester: 'I',
        subjectCode: '',
        subjectName: '',
        section: 'A'
    });
    const handleAddTeacher = () => {
        if (!newTeacher.name || !newTeacher.subjectCode) return;
        addTeachers([{ ...newTeacher, id: Date.now().toString() }]);
        const nameParts = newTeacher.name.trim().split(/\s+/);
        const lastNameRaw = nameParts[nameParts.length - 1];
        const handle = lastNameRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
        addFacultyAccounts([{
            id: Date.now().toString() + '_acc',
            name: newTeacher.name,
            email: `${handle}@psnacet.edu.in`,
            password: handle,
            dept: newTeacher.dept
        }]);
        alert(`Faculty Account Created!\n\nEmail: ${handle}@psnacet.edu.in\nPassword: ${handle}`);
        setIsAddOpen(false);
        setNewTeacher({ name: '', dept: 'CSE', semester: 'I', subjectCode: '', subjectName: '', section: 'A' });
    };
    const filtered = teachers.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
            (t.subjectName && t.subjectName.toLowerCase().includes(search.toLowerCase()));
        const matchesSem = filterSem === 'All' || t.semester === filterSem;
        return matchesSearch && matchesSem;
    });
    const uniqueSems = Array.from(new Set(teachers.map(t => t.semester).filter(Boolean))).sort();
    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Teachers</h1>
                    <p style={{ color: 'var(--text-light)' }}>Faculty allocations and details</p>
                </div>
                <div>
                    <button className="btn btn-danger" onClick={() => {
                        if (window.confirm('Are you sure you want to delete ALL teacher allocations? This cannot be undone.')) clearTeachers();
                    }} style={{ backgroundColor: 'var(--danger)', color: 'white', border: 'none', marginRight: '1rem' }}>
                        <Trash2 size={18} style={{ marginRight: 8 }} /> Delete All
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
                        <Plus size={18} style={{ marginRight: 8 }} /> Add Teacher
                    </button>
                </div>
            </div>
            <div className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                <div className="filter-bar">
                    <div className="search-wrapper">
                        <Search size={18} />
                        <input
                            className="elegant-input"
                            placeholder="Search faculty by name or subject..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <Filter size={18} color="#94a3b8" />
                        <select className="elegant-select" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
                            <option value="All">All Semesters</option>
                            {uniqueSems.map(s => <option key={s} value={s}>Sem {s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Department</th>
                                <th>Semester</th>
                                <th>Subject</th>
                                <th>Section</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((t, idx) => (
                                <tr key={t.id || idx}>
                                    <td style={{ fontWeight: '500' }}>{t.name}</td>
                                    <td><span className="badge badge-info">{t.dept || 'General'}</span></td>
                                    <td>Sem {t.semester}</td>
                                    <td>
                                        <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t.subjectCode}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{t.subjectName}</div>
                                    </td>
                                    <td><span className="badge badge-outline">Section {t.section}</span></td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            className="btn-outline"
                                            style={{ border: 'none', color: 'var(--danger)', padding: '4px', cursor: 'pointer' }}
                                            onClick={() => {
                                                if (window.confirm('Delete this teacher allocation?')) deleteTeachers(t.id);
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No records found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Teacher Allocation">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Faculty Name</label>
                        <input className="input-field" style={{ width: '100%' }} value={newTeacher.name} onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })} placeholder="e.g. Dr. A. Smith" />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Department</label>
                        <input className="input-field" style={{ width: '100%' }} value={newTeacher.dept} onChange={e => setNewTeacher({ ...newTeacher, dept: e.target.value })} placeholder="e.g. CSE" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Semester</label>
                            <select className="input-field" style={{ width: '100%' }} value={newTeacher.semester} onChange={e => setNewTeacher({ ...newTeacher, semester: e.target.value })}>
                                {Array.from(new Set([...uniqueSems, 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'])).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Section</label>
                            <select className="input-field" style={{ width: '100%' }} value={newTeacher.section} onChange={e => setNewTeacher({ ...newTeacher, section: e.target.value })}>
                                {['A', 'B', 'C', 'D', 'E', 'F'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Subject Code</label>
                        <input className="input-field" style={{ width: '100%' }} value={newTeacher.subjectCode} onChange={e => setNewTeacher({ ...newTeacher, subjectCode: e.target.value })} placeholder="e.g. CS123" />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Subject Name</label>
                        <input className="input-field" style={{ width: '100%' }} value={newTeacher.subjectName} onChange={e => setNewTeacher({ ...newTeacher, subjectName: e.target.value })} placeholder="e.g. Data Structures" />
                    </div>
                    <button className="btn btn-primary" onClick={handleAddTeacher} style={{ marginTop: '0.5rem' }}>
                        <Save size={18} style={{ marginRight: 8 }} /> Save Allocation
                    </button>
                </div>
            </Modal>
        </div>
    );
};
export default Teachers;