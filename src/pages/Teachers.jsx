import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { useData } from '../context/DataContext';
import DataImporter from '../components/DataImporter';

const Teachers = () => {
    const { teachers, subjects, addTeacher, updateTeacher, deleteTeacher, clearTeachers } = useData();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTeacher, setCurrentTeacher] = useState({
        id: null,
        name: '',
        department: '',
        subject: '',
        assignedClass: '',
        semester: '',
        email: '',
        phone: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSem, setFilterSem] = useState('All');
    const [filterSec, setFilterSec] = useState('All');

    const filteredTeachers = (teachers || []).filter(t => {
        const matchesSearch = (t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.subject?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesSem = filterSem === 'All' || t.semester === filterSem;
        const matchesSec = filterSec === 'All' || t.assignedClass?.includes(filterSec);
        return matchesSearch && matchesSem && matchesSec;
    });

    const openAddModal = () => {
        setIsEditing(false);
        setCurrentTeacher({ id: null, name: '', department: '', subject: '', semester: '', assignedClass: '', email: '', phone: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (teacher) => {
        setIsEditing(true);
        setCurrentTeacher(teacher);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        // Removed confirmation alert as per request
        deleteTeacher(id);
    };

    const handleClearAll = () => {
        if (window.confirm('WARNING: This will delete ALL teachers. This action cannot be undone. Are you sure?')) {
            clearTeachers();
        }
    };

    const handleSaveTeacher = () => {
        if (isEditing) {
            updateTeacher(currentTeacher);
        } else {
            addTeacher(currentTeacher);
        }
        setIsModalOpen(false);
    };

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: '900', letterSpacing: '-0.025em', color: '#0f172a' }}>Teachers</h1>
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Manage faculty appointments and assignments ({filteredTeachers.length} shown).</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary" onClick={openAddModal} style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', fontWeight: '700', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <Plus size={18} style={{ marginRight: '0.5rem' }} />
                        Add Teacher
                    </button>
                    <button
                        className="btn btn-outline"
                        onClick={handleClearAll}
                        style={{ padding: '0.625rem', borderRadius: '10px', color: '#ef4444', borderColor: '#fee2e2', background: '#fff' }}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div className="toolbar" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: '#fff', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Search names or subjects..."
                        className="input-field"
                        style={{ paddingLeft: '38px', width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '0.9rem' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                        className="input-field"
                        style={{ padding: '0 12px', height: '42px', width: '140px', borderRadius: '8px', border: '1px solid #f1f5f9', background: filterSem === 'All' ? '#f8fafc' : '#fff', fontSize: '0.85rem', fontWeight: '600' }}
                        value={filterSem}
                        onChange={(e) => setFilterSem(e.target.value)}
                    >
                        <option value="All">All Semesters</option>
                        {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map(s => <option key={s} value={s}>Sem {s}</option>)}
                    </select>
                    <select
                        className="input-field"
                        style={{ padding: '0 12px', height: '42px', width: '140px', borderRadius: '8px', border: '1px solid #f1f5f9', background: filterSec === 'All' ? '#f8fafc' : '#fff', fontSize: '0.85rem', fontWeight: '600' }}
                        value={filterSec}
                        onChange={(e) => setFilterSec(e.target.value)}
                    >
                        <option value="All">All Sections</option>
                        {['A', 'B', 'C', 'D', 'E'].map(s => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Dept</th>
                            <th>Sem</th>
                            <th>Subject</th>
                            <th>Section</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTeachers.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
                                    {teachers.length === 0 ? "No teacher assignments found. Add one to get started." : "No faculty match your filters."}
                                </td>
                            </tr>
                        ) : (
                            filteredTeachers.map((teacher) => (
                                <tr key={teacher.id}>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{teacher.name}</div>
                                    </td>
                                    <td>
                                        <span className="badge badge-info">{teacher.department}</span>
                                    </td>
                                    <td>
                                        <span className="badge badge-outline">{teacher.semester || '-'}</span>
                                    </td>
                                    <td>
                                        {teacher.subject || '-'}
                                    </td>
                                    <td>
                                        {teacher.assignedClass || '-'}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => handleEdit(teacher)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(teacher.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? "Edit Teacher" : "Add New Teacher"}
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSaveTeacher}>{isEditing ? "Save Changes" : "Add Teacher"}</button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            type="text"
                            className="input-field w-full"
                            placeholder="e.g. Dr. Sarah Wilson"
                            value={currentTeacher.name}
                            onChange={(e) => setCurrentTeacher({ ...currentTeacher, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Department</label>
                        <input
                            type="text"
                            className="input-field w-full"
                            placeholder="e.g. Computer Science"
                            value={currentTeacher.department}
                            onChange={(e) => setCurrentTeacher({ ...currentTeacher, department: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Subject</label>
                        <select
                            className="input-field w-full"
                            value={currentTeacher.subject || ''}
                            onChange={(e) => setCurrentTeacher({ ...currentTeacher, subject: e.target.value })}
                        >
                            <option value="">Select a subject...</option>
                            {subjects.map(subject => (
                                <option key={subject.id} value={`${subject.code} - ${subject.name}`}>
                                    {subject.code} - {subject.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Semester</label>
                        <select
                            className="form-select"
                            value={currentTeacher.semester || ''}
                            onChange={(e) => setCurrentTeacher({ ...currentTeacher, semester: e.target.value })}
                        >
                            <option value="">Select Semester...</option>
                            {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map(s => (
                                <option key={s} value={s}>Semester {s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Section</label>
                        <select
                            className="form-select"
                            value={currentTeacher.assignedClass || ''}
                            onChange={(e) => setCurrentTeacher({ ...currentTeacher, assignedClass: e.target.value })}
                        >
                            <option value="">Select a section...</option>
                            {['Section A', 'Section B', 'Section C', 'Section D', 'Section E'].map(sec => (
                                <option key={sec} value={sec}>{sec}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Modal>
            <DataImporter />
        </div>
    );
};

export default Teachers;
