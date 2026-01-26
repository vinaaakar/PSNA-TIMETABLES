import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Check, X, Edit2, Columns, UserPlus, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import DataImporter from '../components/DataImporter';
import Modal from '../components/Modal';

const Allocations = () => {
    const { subjects, teachers, updateTeachers, addTeachers, deleteTeacher, clearTeachers } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);

    // Grid State: Subject ID -> Section ID -> Assignment Object
    const [grid, setGrid] = useState({});
    const [semesterFilter, setSemesterFilter] = useState('');
    const sections = ['A', 'B', 'C', 'D', 'E'];

    // Dynamic Semesters for Filter
    const semesters = Array.from(new Set([
        ...['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'],
        ...subjects.map(s => s.semester)
    ])).filter(Boolean).sort((a, b) => {
        const order = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
        const aIdx = order.indexOf(a.split(' ')[0]);
        const bIdx = order.indexOf(b.split(' ')[0]);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.localeCompare(b);
    });

    // Distinct Teachers (Faculty List)
    const distinctTeachers = Array.from(new Map(teachers.map(t => [t.name, t])).values())
        .map(t => ({ id: t.id, name: t.name, department: t.department }));

    // Group assignments by Subject and Section
    useEffect(() => {
        const newGrid = {};
        teachers.forEach(t => {
            if (!t.subject || !t.assignedClass) return;

            // Clean subject string for matching
            const tSub = String(t.subject).trim().toLowerCase();
            const tCode = tSub.split(' - ')[0].trim();

            const subjectMatch = subjects.find(s => {
                const sCode = String(s.code).trim().toLowerCase();
                const sName = String(s.name).trim().toLowerCase();
                return tCode === sCode || tSub.includes(sCode) || tSub.includes(sName);
            });

            if (!subjectMatch) return;

            if (!newGrid[subjectMatch.id]) newGrid[subjectMatch.id] = {};

            const secMatch = t.assignedClass.match(/Section ([A-F])/i) || t.assignedClass.match(/^([A-F])$/i);
            if (secMatch) {
                const secId = (secMatch[1] || secMatch[0]).toUpperCase();
                newGrid[subjectMatch.id][secId] = t;
            }
        });
        setGrid(newGrid);
    }, [teachers, subjects]);

    const handleTeacherChange = (subjectId, sectionId, teacherId) => {
        const subject = subjects.find(s => s.id === subjectId);
        const existingAssignment = grid[subjectId]?.[sectionId];

        if (!teacherId) {
            // Delete assignment
            if (existingAssignment) {
                deleteTeacher(existingAssignment.id);
            }
            return;
        }

        const selectedTeacherTemplate = distinctTeachers.find(t => t.id === teacherId);

        if (existingAssignment) {
            // Update existing
            updateTeachers([{
                ...existingAssignment,
                name: selectedTeacherTemplate.name,
                department: selectedTeacherTemplate.department,
                semester: subject.semester // Sync semester
            }]);
        } else {
            // Add new
            addTeachers([{
                name: selectedTeacherTemplate.name,
                department: selectedTeacherTemplate.department,
                subject: `${subject.code} - ${subject.name}`,
                semester: subject.semester,
                assignedClass: `Section ${sectionId}`
            }]);
        }
    };


    const [typeFilter, setTypeFilter] = useState('All');

    const filteredSubjects = subjects.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSemester = !semesterFilter || s.semester === semesterFilter;
        const matchesType = typeFilter === 'All' || s.type === typeFilter;
        return matchesSearch && matchesSemester && matchesType;
    });

    return (
        <div className="allocation-layout" style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
            <div className="allocation-main">
                <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2.25rem', fontWeight: '900', letterSpacing: '-0.025em', color: '#0f172a' }}>Subject Allocation</h1>
                        <p style={{ color: '#64748b', fontSize: '1rem' }}>Manage faculty assignments for the academic catalog ({filteredSubjects.length} subjects found).</p>
                    </div>
                </div>

                <div className="toolbar" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: '#fff', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search by code or subject name..."
                            className="input-field"
                            style={{ paddingLeft: '38px', width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '0.9rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                        <select
                            className="input-field"
                            style={{ padding: '0 12px', height: '42px', width: '140px', borderRadius: '8px', border: '1px solid #f1f5f9', background: semesterFilter === '' ? '#f8fafc' : '#fff', fontSize: '0.85rem', fontWeight: '600' }}
                            value={semesterFilter}
                            onChange={(e) => setSemesterFilter(e.target.value)}
                        >
                            <option value="">Semesters</option>
                            {semesters.map(s => <option key={s} value={s}>Sem {s}</option>)}
                        </select>
                        <select
                            className="input-field"
                            style={{ padding: '0 12px', height: '42px', width: '140px', borderRadius: '8px', border: '1px solid #f1f5f9', background: typeFilter === 'All' ? '#f8fafc' : '#fff', fontSize: '0.85rem', fontWeight: '600' }}
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="All">All Types</option>
                            <option value="Lecture">Lecture</option>
                            <option value="Lab">Lab</option>
                        </select>
                    </div>
                </div>

                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table style={{ minWidth: '800px' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Sem</th>
                                <th style={{ width: '100px' }}>Code</th>
                                <th style={{ width: '250px' }}>Subject Name</th>
                                {sections.map(s => (
                                    <th key={s} style={{ textAlign: 'center', width: '120px' }}>Section {s}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSubjects.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
                                        No subjects found. Add subjects first.
                                    </td>
                                </tr>
                            ) : (
                                filteredSubjects.map(subject => (
                                    <tr key={subject.id}>
                                        <td>
                                            <span className="badge badge-outline">{subject.semester || '-'}</span>
                                        </td>
                                        <td>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{subject.code}</span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{subject.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                                {subject.type} • {subject.credits} Credits
                                            </div>
                                        </td>
                                        {sections.map(section => {
                                            const assignment = grid[subject.id]?.[section];
                                            return (
                                                <td key={section} style={{ padding: '0.5rem' }}>
                                                    <select
                                                        className="form-select"
                                                        style={{
                                                            width: '100%',
                                                            fontSize: '0.8rem',
                                                            borderColor: assignment ? 'var(--primary-light)' : '#e2e8f0',
                                                            padding: '4px 8px',
                                                            background: assignment ? '#eff6ff' : '#fff'
                                                        }}
                                                        value={assignment ? (distinctTeachers.find(t => t.name === assignment.name)?.id || '') : ''}
                                                        onChange={(e) => handleTeacherChange(subject.id, section, e.target.value)}
                                                    >
                                                        <option value="">- Vacant -</option>
                                                        {distinctTeachers.map(t => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Workload Summary (Image 1 style) */}
            <div style={{ position: 'sticky', top: '1.5rem', height: 'fit-content' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#0f172a' }}>
                        <Users size={22} style={{ color: '#2563eb' }} /> Faculty Workload
                    </h3>
                    <div style={{ maxHeight: '72vh', overflowY: 'auto', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.7rem' }}>Name</th>
                                    <th style={{ textAlign: 'center', padding: '12px 16px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.7rem' }}>Load Index</th>
                                </tr>
                            </thead>
                            <tbody>
                                {distinctTeachers.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No faculty data available.</td>
                                    </tr>
                                ) : (
                                    distinctTeachers.map((t, idx) => {
                                        const loadCount = teachers.filter(a => a.name === t.name).length;
                                        return (
                                            <tr key={t.id} style={{ transition: 'background 0.2s' }}>
                                                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                                    <div style={{ fontWeight: '700', color: '#334155' }}>
                                                        {t.name}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        minWidth: '32px',
                                                        height: '32px',
                                                        background: '#eff6ff',
                                                        color: '#2563eb',
                                                        borderRadius: '10px',
                                                        fontWeight: '900',
                                                        fontSize: '0.85rem',
                                                        border: '1px solid #dbeafe'
                                                    }}>
                                                        {loadCount}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <DataImporter />
        </div >
    );
};

export default Allocations;
