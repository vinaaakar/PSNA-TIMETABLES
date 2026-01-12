import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { generateClassTimetable } from '../utils/TimetableGenerator';
import { Plus, Search, Edit2, Trash2, Sparkles, Zap } from 'lucide-react';

const TimetablePage = () => {
    const { classes, teachers, subjects, schedule, setSchedule } = useData();
    const [selectedSemester, setSelectedSemester] = useState('');
    const [activeTab, setActiveTab] = useState('A');
    const [viewMode, setViewMode] = useState('editor'); // 'editor' or 'print'

    // Dynamic dropdown based on data
    const semesterList = Array.from(new Set([
        ...['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'],
        ...teachers.map(t => t.semester)
    ])).filter(Boolean).sort((a, b) => {
        // Custom sort to keep Romans first then ME
        const order = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
        const aIdx = order.indexOf(a.split(' ')[0]);
        const bIdx = order.indexOf(b.split(' ')[0]);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.localeCompare(b);
    });

    const sectionList = Array.from(new Set(
        teachers.filter(t => t.semester === selectedSemester)
            .map(t => {
                const match = String(t.assignedClass).match(/Section ([A-Z0-9]+)/i);
                return match ? match[1].toUpperCase() : String(t.assignedClass);
            })
    )).filter(Boolean).sort();

    useEffect(() => {
        if (sectionList.length > 0 && !sectionList.includes(activeTab)) {
            setActiveTab(sectionList[0]);
        }
    }, [selectedSemester, sectionList]);

    const handleGenerate = () => {
        // Wrapper not needed if button is in child, but good for future hoisting
    };

    return (
        <div style={{ padding: '0 0 2rem 0' }}>
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Timetable Management</h1>
                    <p style={{ color: 'var(--text-light)' }}>Create and manage weekly schedules.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <select
                        className="input-field"
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        style={{ minWidth: '180px' }}
                    >
                        <option value="">Select Semester...</option>
                        {semesterList.map(s => (
                            <option key={s} value={s}>Semester {s}</option>
                        ))}
                    </select>

                    <button
                        className={`btn ${viewMode === 'print' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setViewMode(viewMode === 'editor' ? 'print' : 'editor')}
                    >
                        {viewMode === 'editor' ? 'Print View' : 'Editor View'}
                    </button>
                </div>
            </div>

            {!selectedSemester ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                    <p style={{ color: 'var(--text-light)', fontSize: '1.1rem' }}>Please select a Semester to view the timetable.</p>
                </div>
            ) : (
                <div style={{ background: 'var(--card-bg)', borderRadius: '12px', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
                    {/* Section Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#f8fafc', flexWrap: 'wrap' }}>
                        {sectionList.map(section => (
                            <button
                                key={section}
                                onClick={() => setActiveTab(section)}
                                style={{
                                    padding: '1rem 1.5rem',
                                    fontWeight: '600',
                                    color: activeTab === section ? 'var(--primary)' : 'var(--text-light)',
                                    borderBottom: activeTab === section ? '2px solid var(--primary)' : 'none',
                                    background: activeTab === section ? '#fff' : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Section {section}
                            </button>
                        ))}
                    </div>

                    {/* View Content */}
                    {viewMode === 'editor' ? (
                        <TimetableEditor
                            selectedSemester={selectedSemester}
                            activeSection={activeTab}
                            schedule={schedule}
                            setSchedule={setSchedule}
                            sectionList={sectionList}
                        />
                    ) : (
                        <PrintView
                            selectedSemester={selectedSemester}
                            activeSection={activeTab}
                            schedule={schedule}
                            subjects={subjects}
                            teachers={teachers}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

const TimetableEditor = ({ selectedSemester, activeSection, schedule, setSchedule, sectionList }) => {
    // Destructure updateTeachers to persist assignments
    const { subjects, teachers, updateTeachers } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedAlternatives, setSelectedAlternatives] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState('');

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const times = [
        '08:45 - 09:40', '09:40 - 10:35', '10:55 - 11:45',
        '11:45 - 12:35', '13:45 - 14:35', '14:35 - 15:25', '15:25 - 16:15'
    ];

    const getCellKey = (day, time) => `Sem${selectedSemester}-S${activeSection}-${day}-${time}`;

    const handleCellClick = (day, time) => {
        setSelectedCell({ day, time });
        const key = getCellKey(day, time);
        const data = schedule[key];
        setSelectedSubject(data ? data.subject : '');
        setSelectedAlternatives(data?.alternatives || []);
        setSelectedRoom(data ? data.room : '');
        setIsModalOpen(true);
    };

    const handleSaveCell = () => {
        if (selectedCell) {
            const key = getCellKey(selectedCell.day, selectedCell.time);
            const newSchedule = { ...schedule };

            if (selectedSubject) {
                const sub = subjects.find(s => s.code === selectedSubject.split(' - ')[0]) || { name: selectedSubject, code: 'MANUAL' };
                newSchedule[key] = {
                    ...sub,
                    subject: selectedSubject,
                    alternatives: selectedAlternatives.filter(a => a), // only saved filled ones
                    room: selectedRoom
                };
            } else {
                delete newSchedule[key];
            }

            setSchedule(newSchedule);
        }
        setIsModalOpen(false);
    };

    // --- Auto Generator ---
    const generateSchedule = () => {
        // 1. Identify relevant subjects for this Class (Semester X - Section Y)
        const currentSectionLabel = `Section ${activeSection}`;
        const currentClassId = `Sem ${selectedSemester} - ${currentSectionLabel}`;

        let classTeachers = teachers.filter(t =>
            (t.assignedClass && String(t.assignedClass).includes(currentSectionLabel)) &&
            t.semester === selectedSemester
        );
        let usedAllSubjects = false;

        if (classTeachers.length === 0) {
            alert(`No teachers or subjects are assigned to ${currentClassId}.\n\nPlease go to the 'Allocations' page to assign faculty to this section before generating.`);
            return;
        }

        // 2. Prepare Assignments List for Generator
        let assignments = [];

        if (usedAllSubjects) {
            const subToUse = subjects.slice(0, 8);
            assignments = subToUse.map(s => ({
                subject: { ...s, id: s.id || s.code },
                teacher: { id: 'simulate', name: 'TBD' },
                periodsPerWeek: parseInt(s.periodsPerWeek) || 4,
                type: s.type,
                isIntegrated: s.isIntegrated
            }));
        } else {
            classTeachers.forEach(t => {
                const extractCode = (str) => {
                    if (!str) return '';
                    const s = String(str);
                    const parts = s.split(' - ');
                    return parts.length > 0 ? parts[0].trim() : s.trim();
                };
                const rawSub = String(t.subject || '');
                const teacherSubjectCode = extractCode(rawSub);
                const isLabHint = rawSub.includes('[Lab]');

                // Robust Find: Match code AND type
                const subjectData = subjects.find(s => {
                    const codeMatch = (s.code && String(s.code) === teacherSubjectCode);
                    const typeMatch = isLabHint ? s.type === 'Lab' : s.type !== 'Lab';
                    return codeMatch && typeMatch;
                }) || subjects.find(s =>
                    (s.code && String(s.code) === teacherSubjectCode) ||
                    (s.name && String(s.name) === String(t.subject))
                );

                if (subjectData) {
                    assignments.push({
                        subject: { ...subjectData, id: subjectData.id },
                        teacher: { id: t.id, name: t.name },
                        periodsPerWeek: parseInt(subjectData.periodsPerWeek) || 4,
                        type: subjectData.type,
                        isIntegrated: subjectData.type === 'Lab' && subjects.some(s => s.code === subjectData.code && s.type !== 'Lab')
                    });
                }
            });
        }

        if (assignments.length === 0) {
            alert(`Could not find valid subjects for the ${classTeachers.length} teachers assigned to ${currentClassId}.\n\nEnsure that the subject codes in your 'Teachers' list exactly match the codes in your 'Subjects' catalog.`);
            return;
        }

        // 3. Call Generator
        // Clean current class from schedule first so it doesn't clash with its own old slots
        const cleanedSchedule = { ...schedule };
        Object.keys(cleanedSchedule).forEach(k => {
            if (k.startsWith(`Sem${selectedSemester}-S${activeSection}-`)) {
                delete cleanedSchedule[k];
            }
        });

        const { schedule: newClassSchedule, errors } = generateClassTimetable(
            currentClassId,
            assignments,
            cleanedSchedule
        );

        if (errors.length > 0) {
            console.warn("Generation Warnings:", errors);
        }

        // 4. Verify Success (Silent)
        const generatedCount = Object.keys(newClassSchedule).length;
        console.log(`Generated ${generatedCount} periods for ${currentClassId}`);

        // 5. Merge
        const finalMerged = { ...cleanedSchedule, ...newClassSchedule };
        setSchedule(finalMerged);
    };

    // --- NEW: AI MASTER GENERATOR (FULL SEMESTER) ---
    const generateAllSections = () => {
        let currentFullSchedule = { ...schedule };
        // ONLY process sections that officially exist in the 'Classes' database
        const sectionsToProcess = sectionList;
        let totalPlaced = 0;

        // HARD FLUSH: Remove ALL existing data for this semester before building
        // This permanently deletes any 'ghost' data from sections that might have been removed
        Object.keys(currentFullSchedule).forEach(k => {
            if (k.startsWith(`Sem${selectedSemester}-S`)) {
                delete currentFullSchedule[k];
            }
        });

        if (sectionsToProcess.length === 0) {
            setSchedule(currentFullSchedule);
            alert("No classes found to generate for this semester.");
            return;
        }

        sectionsToProcess.forEach(sectionLabel => {
            const currentSectionLabel = `Section ${sectionLabel}`;
            const currentClassId = `Sem ${selectedSemester} - ${currentSectionLabel}`;

            let classTeachers = teachers.filter(t => {
                const assigned = String(t.assignedClass || '').toLowerCase();
                const target = String(sectionLabel).toLowerCase();
                const targetFull = `section ${target}`;
                return (assigned === target || assigned === targetFull || assigned.includes(targetFull)) &&
                    String(t.semester) === String(selectedSemester);
            });

            if (classTeachers.length === 0) return;

            let assignments = [];
            classTeachers.forEach(t => {
                const rawSub = String(t.subject || '');
                const teacherSubjectCode = rawSub.split(' - ')[0].trim().toLowerCase();
                const isLabHint = rawSub.includes('[Lab]');

                // Robust Find: Try exact code + type match, then falls back
                const subjectData = subjects.find(s => {
                    const sCode = String(s.code || '').toLowerCase();
                    const codeMatch = sCode === teacherSubjectCode || rawSub.toLowerCase().includes(sCode);
                    const typeMatch = isLabHint ? s.type === 'Lab' : s.type !== 'Lab';
                    return codeMatch && typeMatch;
                }) || subjects.find(s => {
                    const sCode = String(s.code || '').toLowerCase();
                    const sName = String(s.name || '').toLowerCase();
                    return sCode === teacherSubjectCode ||
                        rawSub.toLowerCase().includes(sCode) ||
                        rawSub.toLowerCase().includes(sName);
                });

                if (subjectData) {
                    assignments.push({
                        id: `T-${t.id}-${sectionLabel}`,
                        subject: { ...subjectData, id: subjectData.id },
                        teacher: { id: t.id, name: t.name },
                        periodsPerWeek: parseInt(subjectData.periodsPerWeek) || 4,
                        type: subjectData.type,
                        isIntegrated: subjectData.type === 'Lab' && subjects.some(s => s.code === subjectData.code && s.type !== 'Lab')
                    });
                }
            });

            if (assignments.length > 0) {
                const { schedule: newClassSchedule } = generateClassTimetable(
                    currentClassId,
                    assignments,
                    currentFullSchedule
                );

                totalPlaced += Object.keys(newClassSchedule).length;
                currentFullSchedule = { ...currentFullSchedule, ...newClassSchedule };
            }
        });

        setSchedule(currentFullSchedule);
        alert(`SUCCESS: Created timetables for all ${sectionsToProcess.length} classes (${totalPlaced} periods allocated).`);
    };

    return (
        <div className="p-4" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', gap: '1rem' }}>
                <button
                    className="btn btn-primary"
                    onClick={generateAllSections}
                    style={{
                        background: 'linear-gradient(135deg, #0f172a, #334155)',
                        border: '1px solid #475569',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Sparkles size={18} style={{ color: '#fbbf24' }} />
                    Create for All Classes
                </button>
                <button
                    className="btn btn-primary"
                    onClick={generateSchedule}
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Zap size={18} />
                    Auto-Generate Section {activeSection}
                </button>
            </div>

            <div className="timetable-container" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>Day</th>
                            {times.map(t => (
                                <th key={t} style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: '600', minWidth: '120px' }}>
                                    {t}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(day => (
                            <tr key={day} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '1rem', fontWeight: '500', color: '#334155', background: '#fff' }}>{day}</td>
                                {times.map(time => {
                                    const key = getCellKey(day, time);
                                    const cellData = schedule[key];
                                    return (
                                        <td
                                            key={time}
                                            onClick={() => handleCellClick(day, time)}
                                            style={{
                                                padding: '0.5rem',
                                                borderLeft: '1px solid #f1f5f9',
                                                cursor: 'pointer',
                                                background: cellData ? (cellData.type === 'Lab' ? '#eff6ff' : '#fff') : '#fff',
                                                transition: 'all 0.2s'
                                            }}
                                            className="hover:bg-slate-50"
                                        >
                                            {cellData ? (
                                                <div style={{
                                                    fontSize: '0.85rem',
                                                    height: '85px',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    margin: '-0.5rem',
                                                    background: cellData.type === 'Lab' ? '#eff6ff' : '#fff'
                                                }}>
                                                    {cellData.alternatives && cellData.alternatives.length > 0 ? (
                                                        <>
                                                            {/* Diagonal Line - Only for Alternatives */}
                                                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                                                                <line x1="0" y1="0" x2="100%" y2="100%" stroke="#000" strokeWidth="1.5" />
                                                            </svg>

                                                            {/* Top Left: Primary */}
                                                            <div style={{ position: 'absolute', top: '6px', left: '8px', textAlign: 'left', width: '75%', zIndex: 2 }}>
                                                                <div style={{ fontWeight: '900', color: cellData.type === 'Lab' ? '#2563eb' : '#000', fontSize: '0.85rem', lineHeight: 1 }}>
                                                                    {cellData.code}
                                                                </div>
                                                                <div style={{ fontSize: '0.6rem', color: '#475569', fontWeight: '700', marginTop: '1px' }}>
                                                                    {cellData.teacherName || 'Staff'}
                                                                </div>
                                                            </div>

                                                            {/* Bottom Right: Alternative */}
                                                            <div style={{ position: 'absolute', bottom: '6px', right: '8px', textAlign: 'right', width: '75%', zIndex: 2 }}>
                                                                <div style={{ fontWeight: '900', color: '#6366f1', fontSize: '0.85rem', lineHeight: 1 }}>
                                                                    {typeof cellData.alternatives[0] === 'object' ? cellData.alternatives[0].code : (String(cellData.alternatives[0]).includes(' - ') ? String(cellData.alternatives[0]).split(' - ')[0] : String(cellData.alternatives[0]))}
                                                                </div>
                                                                <div style={{ fontSize: '0.6rem', color: '#475569', fontWeight: '700', marginTop: '1px' }}>
                                                                    {typeof cellData.alternatives[0] === 'object' ? cellData.alternatives[0].teacherName : 'Staff'}
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        /* Standard View - No Diagonal Line */
                                                        <div style={{ padding: '8px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                            <div style={{ fontWeight: '900', color: cellData.type === 'Lab' ? '#2563eb' : '#000', fontSize: '0.9rem' }}>
                                                                {cellData.code}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.2', margin: '2px 0' }}>
                                                                {cellData.name}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                                                <div style={{ fontSize: '0.7rem', color: '#1e293b', fontWeight: '700' }}>
                                                                    {cellData.teacherName}
                                                                </div>
                                                                {cellData.room && (
                                                                    <div style={{ fontSize: '0.65rem', color: '#059669', background: '#ecfdf5', padding: '0px 4px', borderRadius: '3px', fontWeight: '700', border: '1px solid #d1fae5' }}>
                                                                        {cellData.room}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                                    +
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>


            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Edit Slot</h3>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Subject</label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            >
                                <option value="">(Free Period)</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={`${s.code} - ${s.name}`}>
                                        {s.code} - {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <label style={{ fontWeight: '600', color: '#475569' }}>Alternative Subjects</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Count:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="5"
                                        value={selectedAlternatives.length}
                                        onChange={(e) => {
                                            const count = parseInt(e.target.value) || 0;
                                            const newAlts = [...selectedAlternatives];
                                            if (count > newAlts.length) {
                                                const diff = count - newAlts.length;
                                                for (let i = 0; i < diff; i++) newAlts.push('');
                                            } else {
                                                newAlts.length = Math.max(0, count);
                                            }
                                            setSelectedAlternatives(newAlts);
                                        }}
                                        style={{ width: '50px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                    />
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                                        onClick={() => setSelectedAlternatives([...selectedAlternatives, ''])}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {selectedAlternatives.map((alt, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <select
                                        value={alt}
                                        onChange={(e) => {
                                            const newAlts = [...selectedAlternatives];
                                            newAlts[idx] = e.target.value;
                                            setSelectedAlternatives(newAlts);
                                        }}
                                        style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                    >
                                        <option value="">(Select Subject)</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={`${s.code} - ${s.name}`}>
                                                {s.code} - {s.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setSelectedAlternatives(selectedAlternatives.filter((_, i) => i !== idx))}
                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Room / Venue (Optional)</label>
                            <input
                                type="text"
                                value={selectedRoom}
                                onChange={(e) => setSelectedRoom(e.target.value)}
                                placeholder="e.g. Seminar Hall, CS Lab 1"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button onClick={() => setIsModalOpen(false)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>Cancel</button>
                            <button onClick={handleSaveCell} className="btn btn-primary">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Print View Sub-Component
const PrintView = ({ selectedSemester, activeSection, schedule, subjects, teachers }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayShort = { 'Monday': 'Mo', 'Tuesday': 'Tu', 'Wednesday': 'We', 'Thursday': 'Th', 'Friday': 'Fr', 'Saturday': 'Sa' };

    const timeHeaders = [
        { start: '08:45', end: '09:40' },
        { start: '09:40', end: '10:35' },
        { start: '10:55', end: '11:45' },
        { start: '11:45', end: '12:35' },
        { start: '13:45', end: '14:35' },
        { start: '14:35', end: '15:25' },
        { start: '15:25', end: '16:15' }
    ];

    const getCellKey = (day, timeRange) => `Sem${selectedSemester}-S${activeSection}-${day}-${timeRange.start} - ${timeRange.end}`;

    // Collect data for the Legend Table (Only for this specific class)
    const getLegendData = () => {
        const legend = [];
        const seen = new Set();
        const classPrefix = `Sem${selectedSemester}-S${activeSection}-`;

        // Only include subjects actually present in the CURRENT CLASS schedule
        Object.entries(schedule).forEach(([key, cell]) => {
            if (!cell || !key.startsWith(classPrefix)) return;

            const codes = [cell.code, ...(cell.alternatives || []).map(alt => typeof alt === 'object' ? alt.code : String(alt).split(' - ')[0])];
            codes.forEach(code => {
                if (code && !seen.has(code)) {
                    seen.add(code);
                    const subData = subjects.find(s => s.code === code);
                    const teacherData = teachers.find(t =>
                        t.subject?.includes(code) &&
                        t.assignedClass?.includes(activeSection) &&
                        t.semester === selectedSemester
                    );

                    const subName = subData?.name || '---';
                    let acronym = code.replace(/[0-9]/g, '');
                    const parenMatch = subName.match(/\(([^)]+)\)/);
                    if (parenMatch) acronym = parenMatch[1];

                    legend.push({
                        code: code,
                        name: subName.replace(/\([^)]+\)/, '').trim(),
                        acronym: acronym,
                        hoursW: subData?.periodsPerWeek || '3',
                        hoursS: subData?.type === 'Lab' ? '0' : '1',
                        faculty: teacherData?.name || 'Staff',
                        dept: teacherData?.department || 'CSE'
                    });
                }
            });
        });
        return legend.sort((a, b) => a.code.localeCompare(b.code));
    };

    const legendData = getLegendData();

    // Group concurrent periods for merging
    const getMergedSchedule = () => {
        const merged = {};
        days.forEach(day => {
            merged[day] = [];
            let i = 0;
            while (i < timeHeaders.length) {
                const cell = schedule[getCellKey(day, timeHeaders[i])];
                if (!cell) {
                    merged[day].push({ cell: null, span: 1 });
                    i++;
                    continue;
                }

                let span = 1;
                // Check next periods for same subject/code (only merge if it's the exact same cell data)
                while (i + span < timeHeaders.length) {
                    const nextCell = schedule[getCellKey(day, timeHeaders[i + span])];
                    // Criteria for merging: same code, same teacher, and must be on either side of lunch break (i=3 is period 4)
                    // Rule: Cannot merge across Lunch Break (period 4 ending @ 12:35)
                    if (i + span === 4) break;

                    if (nextCell && nextCell.code === cell.code) {
                        span++;
                    } else {
                        break;
                    }
                }
                merged[day].push({ cell, span });
                i += span;
            }
        });
        return merged;
    };

    const mergedSchedule = getMergedSchedule();

    return (
        <div className="timetable-container">
            <div style={{ padding: '2rem', background: 'white', color: 'black', fontFamily: '"Times New Roman", Times, serif', minWidth: '1000px' }} id="print-area">
                {/* Main Title Header */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0' }}>PSNA COLLEGE OF ENGINEERING AND TECHNOLOGY</h1>
                    <p style={{ fontSize: '13px', fontStyle: 'italic', margin: '2px 0' }}>(An Autonomous Institution, Affiliated to Anna University, Chennai)</p>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '10px 0', textDecoration: 'underline' }}>CLASS TIME TABLE</h2>
                </div>

                {/* Metadata Rows */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '5px', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', width: '100%' }}>
                    <div>Dept.: CSE</div>
                    <div style={{ textAlign: 'center' }}>Academic Year: 2025-2026 {['I', 'III', 'V', 'VII'].includes(selectedSemester) ? 'ODD' : 'EVEN'}</div>
                    <div style={{ textAlign: 'right' }}>Course: B.E</div>

                    <div>
                        Year & Sec.: {(() => {
                            const semToYear = { 'I': 'I', 'II': 'I', 'III': 'II', 'IV': 'II', 'V': 'III', 'VI': 'III', 'VII': 'IV', 'VIII': 'IV' };
                            return semToYear[selectedSemester] || '---';
                        })()}-{activeSection}
                    </div>
                    <div style={{ textAlign: 'center' }}>Semester: {selectedSemester}</div>
                    <div style={{ textAlign: 'right' }}>Hall No :</div>
                </div>

                {/* Timetable Grid */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid black', marginBottom: '1.5rem' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid black', width: '50px', height: '40px' }}></th>
                            {timeHeaders.map((t, i) => (
                                <React.Fragment key={i}>
                                    <th style={{ border: '1px solid black', padding: '4px', fontSize: '13px' }}>
                                        <div style={{ borderBottom: '1px solid black', paddingBottom: '2px' }}>{t.start}</div>
                                        <div style={{ paddingTop: '2px' }}>{t.end}</div>
                                    </th>
                                    {i === 3 && (
                                        <th style={{ border: '1px solid black', width: '40px', fontSize: '12px', background: '#fff' }}>
                                            BREAK
                                        </th>
                                    )}
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map((day, dIdx) => (
                            <tr key={day} style={{ height: '55px' }}>
                                <td style={{ border: '1px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>{dayShort[day]}</td>
                                {mergedSchedule[day].map((item, idx) => {
                                    // Calculate logical period index to insert lunch break
                                    let currentPeriodIndex = 0;
                                    for (let p = 0; p < idx; p++) currentPeriodIndex += mergedSchedule[day][p].span;

                                    return (
                                        <React.Fragment key={idx}>
                                            <td
                                                colSpan={item.span}
                                                style={{
                                                    border: '1px solid black',
                                                    padding: '4px',
                                                    textAlign: 'center',
                                                    verticalAlign: 'middle',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                {item.cell ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
                                                        {item.cell.alternatives && item.cell.alternatives.length > 0 ? (
                                                            <div style={{ border: 'none' }}>
                                                                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{item.cell.code}</div>
                                                                <div style={{ borderTop: '0.5px solid black', margin: '4px 0' }}></div>
                                                                {item.cell.alternatives.map((alt, aIdx) => (
                                                                    <React.Fragment key={aIdx}>
                                                                        <div style={{ fontWeight: 'bold' }}>{typeof alt === 'object' ? alt.code : String(alt).split(' - ')[0]}</div>
                                                                        {aIdx < item.cell.alternatives.length - 1 && <div style={{ borderTop: '0.5px solid black', margin: '4px 0' }}></div>}
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.cell.code}</div>
                                                                <div style={{ fontSize: '10px', marginTop: '2px', fontWeight: 'normal' }}>
                                                                    {item.cell.teacherName ? (item.cell.teacherName.split(' ').map(n => n[0]).join('') || 'Staff') : 'Staff'}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : ''}
                                            </td>
                                            {/* Insert Lunch Break vertical bar in the Mo row ONLY, spanning 6 rows */}
                                            {currentPeriodIndex + item.span === 4 && dIdx === 0 && (
                                                <td style={{ border: '1px solid black', width: '40px', fontSize: '12px', background: '#fff' }} rowSpan={6}>
                                                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '10px 0', letterSpacing: '2px', fontWeight: 'bold' }}>LUNCH BREAK</div>
                                                </td>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Subject-Faculty Legend */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ background: '#fff' }}>
                            <th style={{ border: '1px solid black', padding: '5px' }}>Sl. No</th>
                            <th style={{ border: '1px solid black', padding: '5px' }}>Sub Code</th>
                            <th style={{ border: '1px solid black', padding: '5px' }}>Sub. Acronym</th>
                            <th style={{ border: '1px solid black', padding: '5px', width: '30%' }}>Subject Name</th>
                            <th style={{ border: '1px solid black', padding: '2px' }} colSpan={2}>Hours<br />W | S</th>
                            <th style={{ border: '1px solid black', padding: '5px', width: '25%' }}>Faculty Name</th>
                            <th style={{ border: '1px solid black', padding: '5px' }}>Dept.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {legendData.map((item, idx) => (
                            <tr key={idx} style={{ height: '22px' }}>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{idx + 1}.</td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{item.code}</td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{item.acronym}</td>
                                <td style={{ border: '1px solid black', padding: '6px' }}>{item.name}</td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', width: '25px' }}>{item.hoursW}</td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', width: '25px' }}>{item.hoursS || '1'}</td>
                                <td style={{ border: '1px solid black', padding: '4px' }}>{item.faculty}</td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{item.dept}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TimetablePage;
