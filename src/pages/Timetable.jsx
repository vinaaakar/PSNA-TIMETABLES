import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { generateClassTimetable, DAYS } from '../utils/TimetableGenerator';
import { Printer, Play, Calendar, Clock, Layers } from 'lucide-react'; ``
const Timetable = () => {
    const { subjects, teachers, schedule, updateSchedule } = useData();
    const [semester, setSemester] = useState('IV');
    const [grids, setGrids] = useState({});
    const [selectedSectionView, setSelectedSectionView] = useState('A');
    const [isGenerated, setIsGenerated] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const availableSemesters = Array.from(new Set(subjects.map(s => s.semester))).sort();
    const getSectionsForSemester = (sem) => {
        return Array.from(new Set(
            subjects.filter(s => s.semester === sem)
                .flatMap(s => teachers.filter(t => t.subjectCode === s.code).map(t => t.section))
        )).filter(Boolean).sort();
    };
    const getYearFromSemester = (sem) => {
        const s = sem.toUpperCase();
        if (s === 'I' || s === 'II') return 'I';
        if (s === 'III' || s === 'IV') return 'II';
        if (s === 'V' || s === 'VI') return 'III';
        if (s === 'VII' || s === 'VIII') return 'IV';
        return sem;
    };
    React.useEffect(() => {
        if (availableSemesters.length > 0 && !availableSemesters.includes(semester)) {
            setSemester(availableSemesters[0]);
        }
    }, [subjects]);
    React.useEffect(() => {
        if (schedule[semester]) {
            setGrids(schedule[semester]);
            setIsGenerated(true);
            const sections = Object.keys(schedule[semester]);
            if (sections.length > 0 && !sections.includes(selectedSectionView)) {
                setSelectedSectionView(sections.sort()[0]);
            }
        } else {
            setGrids({});
            setIsGenerated(false);
        }
    }, [semester, schedule]);
    const handleGenerate = () => {
        if (!semester) return;
        setIsGenerating(true);
        setTimeout(() => {
            try {
                const sections = getSectionsForSemester(semester);
                const sectionsToGenerate = sections.length > 0 ? sections : ['A'];
                const newGrids = {};
                const sectionDiagnostics = {};
                let globalReservedSlots = {};
                Object.keys(schedule).forEach(sem => {
                    if (sem === semester) return;
                    const semGrids = schedule[sem];
                    Object.values(semGrids).forEach(grid => {
                        if (grid && Array.isArray(grid)) {
                            grid.forEach((dayRow, d) => {
                                dayRow.forEach((cell, s) => {
                                    if (cell) {
                                        const key = `${d}-${s}`;
                                        if (!globalReservedSlots[key]) globalReservedSlots[key] = new Set();

                                        // Reserve Lab Code globally to prevent simultaneous sessions across sections (Room Conflict)
                                        if (cell.type === 'LAB') {
                                            globalReservedSlots[key].add(`LAB_${cell.code}`);
                                        }

                                        if (cell.isElectiveGroup && cell.teacherNames) {
                                            cell.teacherNames.forEach(t => {
                                                const cleanT = String(t).trim().toUpperCase();
                                                if (cleanT && cleanT !== 'TBA') globalReservedSlots[key].add(t);
                                            });
                                        } else if (cell.teacherName) {
                                            const cleanT = String(cell.teacherName).trim().toUpperCase();
                                            if (cleanT && cleanT !== 'TBA') globalReservedSlots[key].add(cell.teacherName);
                                        }
                                    }
                                });
                            });
                        }
                    });
                });
                let syncElectives = {};
                let reservedLabDays = {};
                let globalLabLoad = [0, 0, 0, 0, 0, 0]; // Track number of labs on each day across sections

                const failedSections = [];
                const diagnoseSection = (section, subjects, globalReserved, reservedLabDays) => {
                    const issues = [];
                    const electiveGroups = {};
                    let nonElectiveCredits = 0;
                    let labCredits = 0;
                    let saturdayOnlyCredits = 0;
                    let weekdayCredits = 0;
                    subjects.forEach(sub => {
                        const isLab = sub.type === 'Lab' || sub.type === 'Practical' || sub.code.includes('LAB');
                        const isElec = sub.type === 'Elective' || sub.name.includes('Elective') || sub.name.includes('ELECTIVE');
                        if (isLab) {
                            labCredits += (parseInt(sub.credit) || 0);
                        }
                        if (isElec) {
                            const romanMatch = sub.name.match(/(I|II|III|IV)\s*(\*)?\s*$/i);
                            const romanNum = romanMatch ? romanMatch[1].toUpperCase() : 'GEN';
                            const hasStar = (romanMatch && romanMatch[2]) ? '*' : '';
                            const key = `${romanNum}${hasStar}`;
                            const cred = parseInt(sub.credit) || 0;
                            if (!electiveGroups[key]) electiveGroups[key] = { maxCredit: 0, count: 0 };
                            electiveGroups[key].maxCredit = Math.max(electiveGroups[key].maxCredit, cred);
                            electiveGroups[key].count++;
                        } else {
                            const cred = parseInt(sub.credit) || 0;
                            if (!isLab) {
                                nonElectiveCredits += cred;
                                const satCount = parseInt(sub.satCount) || 0;
                                if (satCount >= cred) saturdayOnlyCredits += cred;
                                else weekdayCredits += cred;
                            }
                        }
                    });
                    let electiveTotal = 0;
                    Object.entries(electiveGroups).forEach(([key, data]) => {
                        electiveTotal += data.maxCredit;
                    });
                    const effectiveTotal = nonElectiveCredits + labCredits + electiveTotal;
                    issues.push(`Load Analysis: Effective Total: ${effectiveTotal} hrs (Theory: ${nonElectiveCredits}, Lab: ${labCredits}, Elective Groups: ${electiveTotal})`);
                    if (effectiveTotal > 42) {
                        issues.push(`CRITICAL: Total required hours (${effectiveTotal}) exceed week capacity (42).`);
                    } else if ((weekdayCredits + electiveTotal + labCredits) > 35 && saturdayOnlyCredits === 0) {
                        issues.push(`WARNING: Weekday Load (${weekdayCredits + electiveTotal + labCredits}) exceeds Mon-Fri capacity (35). forcing all subjects to weekdays might be the cause.`);
                    }
                    if (Object.keys(electiveGroups).length > 0) {
                        const details = Object.entries(electiveGroups).map(([k, d]) => `${k}(${d.maxCredit}cr)`).join(', ');
                        issues.push(`Elective Groups: ${details}`);
                    }
                    const teachers = subjects.map(s => s.teacherName).filter(t => t && t !== 'TBA');
                    const distinctTeachers = [...new Set(teachers)];

                    distinctTeachers.forEach(tName => {
                        let blockedCount = 0;
                        const tNameUpper = tName.toUpperCase();
                        for (let d = 0; d < 6; d++) {
                            for (let s = 0; s < 7; s++) {
                                const key = `${d}-${s}`;
                                if (globalReserved[key] && globalReserved[key].has(tNameUpper)) {
                                    blockedCount++;
                                }
                            }
                        }
                        const required = subjects.filter(s => s.teacherName === tName).reduce((sum, s) => sum + (parseInt(s.credit) || 0), 0);
                        const freeSlots = 42 - blockedCount;
                        if (required > freeSlots) {
                            issues.push(`Teacher ${tName} has ${required} hrs needed but only ${freeSlots} slots free.`);
                        }
                    });
                    return issues;
                };
                sectionsToGenerate.forEach(section => {
                    const sectionSubjects = subjects.filter(s => s.semester === semester).map(sub => {
                        const teacher = teachers.find(t => t.subjectCode === sub.code && t.section === section);
                        return { ...sub, teacherName: teacher ? teacher.name : 'TBA' };
                    });
                    console.log(`Generating for Sem: ${semester} Section: ${section}, Subjects Found:`, sectionSubjects.map(s => s.code));

                    let sectionGrid = generateClassTimetable(semester, section, sectionSubjects, globalReservedSlots, syncElectives, false, 100000, reservedLabDays, globalLabLoad);
                    if (!sectionGrid) {
                        sectionGrid = generateClassTimetable(semester, section, sectionSubjects, globalReservedSlots, {}, false, 200000, reservedLabDays, globalLabLoad);
                    }
                    if (!sectionGrid) {
                        sectionGrid = generateClassTimetable(semester, section, sectionSubjects, globalReservedSlots, {}, true, 500000, reservedLabDays, globalLabLoad);
                    }

                    if (sectionGrid) {
                        newGrids[section] = sectionGrid;
                        sectionGrid.forEach((dayRow, d) => {
                            let dayHasLab = false;
                            dayRow.forEach((cell, s) => {
                                if (cell) {
                                    const key = `${d}-${s}`;
                                    if (!globalReservedSlots[key]) globalReservedSlots[key] = new Set();

                                    if (cell.type === 'LAB') {
                                        dayHasLab = true;
                                        if (!reservedLabDays[cell.code]) reservedLabDays[cell.code] = new Set();
                                        reservedLabDays[cell.code].add(d);
                                        // Reserve Lab Room
                                        globalReservedSlots[key].add(`LAB_${cell.code}`);
                                    }
                                    // ... existing update logic ...
                                    if (cell.isElectiveGroup && cell.teacherNames) {
                                        cell.teacherNames.forEach(t => {
                                            const cleanT = String(t).trim().toUpperCase();
                                            if (cleanT && cleanT !== 'TBA') globalReservedSlots[key].add(cleanT);
                                        });
                                        if (!syncElectives[cell.groupKey]) syncElectives[cell.groupKey] = [];
                                        if (!syncElectives[cell.groupKey].some(pos => pos.d === d && pos.s === s)) {
                                            syncElectives[cell.groupKey].push({ d, s });
                                        }
                                    } else if (cell.teacherName) {
                                        const cleanT = String(cell.teacherName).trim().toUpperCase();
                                        if (cleanT && cleanT !== 'TBA') globalReservedSlots[key].add(cleanT);
                                    }
                                }
                            });
                            if (dayHasLab) globalLabLoad[d]++;
                        });
                    } else {
                        failedSections.push(section);
                        sectionDiagnostics[section] = diagnoseSection(section, sectionSubjects, globalReservedSlots, reservedLabDays);
                    }
                });
                if (failedSections.length > 0) {
                    let msg = `Unable to generate schedule for Sections: ${failedSections.join(', ')}\n\n`;
                    failedSections.forEach(sec => {
                        const issues = sectionDiagnostics[sec];
                        if (issues && issues.length > 0) {
                            msg += `Section ${sec} Issues:\n- ${issues.join('\n- ')}\n`;
                        } else {
                            msg += `Section ${sec}: Constraints too strict (Try checking Lab durations or Elective alignment)\n`;
                        }
                    });
                    alert(msg);
                }
                if (Object.keys(newGrids).length > 0) {
                    updateSchedule(semester, newGrids);
                    setGrids(newGrids);
                    if (sectionsToGenerate.length > 0) setSelectedSectionView(sectionsToGenerate[0]);
                    setIsGenerated(true);
                }
            } catch (error) {
                console.error(error);
                alert("Error: " + error.message);
            } finally {
                setIsGenerating(false);
            }
        }, 10);
    };
    const currentLegend = isGenerated && grids[selectedSectionView] ? (() => {
        const usedCodes = new Set();
        grids[selectedSectionView].forEach(day => day.forEach(cell => {
            if (cell) {
                if (cell.type === 'ELECTIVE_GROUP') cell.alternatives.forEach(alt => usedCodes.add(alt.code));
                else usedCodes.add(cell.code);
            }
        }));
        return subjects.filter(s => s.semester === semester && usedCodes.has(s.code)).map(s => {
            const teacher = teachers.find(t => t.subjectCode === s.code && t.section === selectedSectionView);
            return { ...s, facultyName: teacher ? teacher.name : 'TBA' };
        });
    })() : [];
    return (
        <div className="timetable-container">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
                .timetable-container {
                    font-family: 'Outfit', sans-serif;
                    padding: 1.5rem;
                    background: #f1f5f9;
                    min-height: 100vh;
                }
                @media screen {
                    .screen-only { display: block; }
                    .print-only { display: none !important; }
                    .dashboard-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #1e293b;
                        padding: 1.5rem 2rem;
                        border-radius: 16px;
                        color: white;
                        margin-bottom: 2rem;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    }
                    .control-group {
                        display: flex;
                        gap: 1rem;
                        align-items: center;
                    }
                    .premium-select {
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 0.6rem 1rem;
                        border-radius: 10px;
                        font-weight: 600;
                        outline: none;
                        cursor: pointer;
                    }
                    .premium-select option {
                        background-color: #ffffff;
                        color: #1e293b;
                    }
                    .premium-select:focus {
                        background: rgba(255,255,255,0.25);
                        border-color: #3b82f6;
                    }
                    .btn-premium {
                        padding: 0.6rem 1.5rem;
                        border-radius: 10px;
                        font-weight: 800;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.2s;
                        cursor: pointer;
                        border: none;
                    }
                    .btn-generate { background: #3b82f6; color: white; }
                    .btn-generate:hover { background: #2563eb; transform: translateY(-2px); }
                    .btn-print { background: white; color: #1e293b; }
                    .btn-print:hover { background: #f8fafc; transform: translateY(-2px); }
                    .section-bar {
                        display: flex;
                        gap: 0.5rem;
                        margin-bottom: 1.5rem;
                    }
                    .section-tab {
                        padding: 0.6rem 1.5rem;
                        border-radius: 12px;
                        background: white;
                        color: #64748b;
                        font-weight: 800;
                        border: 1px solid #e2e8f0;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .section-tab.active {
                        background: #3b82f6;
                        color: white;
                        border-color: #3b82f6;
                        box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.5);
                    }
                    .timetable-glass-card {
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                        overflow: hidden;
                        border: 1px solid #e2e8f0;
                    }
                    .main-grid {
                        width: 100%;
                        border-collapse: separate;
                        border-spacing: 0;
                    }
                    .main-grid th {
                        padding: 1.2rem 0.5rem;
                        background: #f8fafc;
                        color: #64748b;
                        font-size: 0.7rem;
                        font-weight: 600;
                        text-align: center;
                        border-bottom: 1px solid #e2e8f0;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }
                    .main-grid td {
                        padding: 8px;
                        border-bottom: 1px solid #f1f5f9;
                        vertical-align: middle;
                        text-align: center;
                    }
                    .day-column {
                        background: #fff;
                        color: #1e293b;
                        font-weight: 800;
                        font-size: 0.95rem;
                        width: 120px;
                        border-right: 1px solid #f1f5f9;
                    }
                    .subject-box {
                        height: 95px;
                        border-radius: 14px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 0.5rem;
                        transition: all 0.2s;
                        background: #fff;
                    }
                    .box-regular {
                        color: #4338ca;
                        font-weight: 800;
                        font-size: 1.3rem;
                    }
                    .box-lab {
                        background: #f0fdf4;
                        border: 2px solid #bbf7d0;
                        color: #15803d;
                        font-weight: 800;
                        font-size: 1.3rem;
                    }
                    .box-elective {
                        background: #fffbeb;
                        border: 2px solid #fde68a;
                        color: #b45309;
                        font-weight: 800;
                        font-size: 1.1rem;
                    }
                    /* Strips for Break/Lunch */
                    .strip-cell {
                        width: 32px;
                        background: #f8fafc;
                        font-size: 0.65rem;
                        font-weight: 800;
                        color: #94a3b8;
                        writing-mode: vertical-rl;
                        transform: rotate(180deg);
                        text-align: center;
                        border-left: 1px solid #f1f5f9;
                        border-right: 1px solid #f1f5f9;
                    }
                }
                @media print {
                    .screen-only { display: none !important; }
                    .print-only { display: block !important; padding: 0; }
                    body { background: white !important; margin: 0; padding: 0; }
                    @page { size: landscape; margin: 3mm; }
                    .official-table { width: 100%; border-collapse: collapse; border: 1.2px solid black; }
                    .official-table th, .official-table td { border: 1px solid black; text-align: center; height: 26px; font-size: 9px; font-family: "Times New Roman", serif; padding: 1px; }
                    .official-table th { background: #f0f0f0 !important; font-weight: bold; }
                    .legend-table { width: 100%; border-collapse: collapse; margin-top: 5px; border: 1px solid black; font-family: "Times New Roman", serif; }
                    .legend-table th, .legend-table td { border: 1px solid black; padding: 2px; font-size: 8.5px; }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    .spin { animation: spin 1s linear infinite; }
                }
            `}</style>
            <div className="screen-only">
                <header className="dashboard-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: '#3b82f6', padding: '10px', borderRadius: '12px' }}>
                            <Layers color="white" size={24} />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Smart Timetable</h1>
                            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.85rem' }}>Management Dashboard</p>
                        </div>
                    </div>
                    <div className="control-group">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={18} />
                            <select className="premium-select" value={semester} onChange={e => setSemester(e.target.value)}>
                                {availableSemesters.map(s => <option key={s} value={s}>SEM {s}</option>)}
                            </select>
                        </div>
                        <button className="btn-premium btn-generate" onClick={handleGenerate} disabled={isGenerating} style={{ opacity: isGenerating ? 0.7 : 1, cursor: isGenerating ? 'wait' : 'pointer' }}>
                            {isGenerating ? <Clock size={18} className="spin" /> : <Play size={18} fill="currentColor" />}
                            {isGenerating ? ' Generating...' : ' Generate Schedule'}
                        </button>
                        <button className="btn-premium btn-print" onClick={() => window.print()} disabled={!isGenerated}>
                            <Printer size={18} /> Print Official
                        </button>
                    </div>
                </header>
                <div>
                    <div className="section-bar">
                        {(() => {
                            const dynSections = getSectionsForSemester(semester);
                            const sectionList = dynSections.length > 0 ? dynSections : (isGenerated ? Object.keys(grids).sort() : ['A']);
                            if (!sectionList.includes(selectedSectionView) && sectionList.length > 0) {
                            }
                            return sectionList.map(sec => (
                                <button
                                    key={sec}
                                    className={`section-tab ${selectedSectionView === sec ? 'active' : ''}`}
                                    onClick={() => setSelectedSectionView(sec)}
                                >
                                    Section {sec}
                                </button>
                            ));
                        })()}
                    </div>
                    {grids[selectedSectionView] ? (
                        <div className="timetable-glass-card">
                            <table className="main-grid">
                                <thead>
                                    <tr>
                                        <th style={{ width: '120px' }}>Day</th>
                                        <th>P1<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>08:45-09:40</span></th>
                                        <th>P2<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>09:40-10:35</span></th>
                                        <th className="strip-cell"></th>
                                        <th>P3<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>10:55-11:45</span></th>
                                        <th>P4<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>11:45-12:35</span></th>
                                        <th className="strip-cell"></th>
                                        <th>P5<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>01:45-02:35</span></th>
                                        <th>P6<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>02:35-03:25</span></th>
                                        <th>P7<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>03:25-04:15</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {DAYS.map((day, dIdx) => (
                                        <tr key={day}>
                                            <td className="day-column">{day}</td>
                                            {grids[selectedSectionView][dIdx].map((cell, sIdx) => {
                                                const items = [];
                                                items.push(
                                                    <td key={`${dIdx}-${sIdx}`}>
                                                        {cell ? (
                                                            <div className={`subject-box ${cell.type === 'LAB' ? 'box-lab' : (cell.type === 'ELECTIVE_GROUP' ? 'box-elective' : 'box-regular')}`}>
                                                                <div>
                                                                    {cell.type === 'ELECTIVE_GROUP' ? cell.alternatives.map(a => a.code).join(' / ') : cell.code}
                                                                </div>
                                                                {cell.type === 'LAB' && <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.7 }}>(LAB)</div>}
                                                            </div>
                                                        ) : (
                                                            <div className="subject-box" style={{ opacity: 0.2 }}>-</div>
                                                        )}
                                                    </td>
                                                );
                                                if (sIdx === 1) items.push(<td key={`break-${dIdx}`} className="strip-cell">BREAK</td>);
                                                if (sIdx === 3) items.push(<td key={`lunch-${dIdx}`} className="strip-cell">LUNCH</td>);
                                                return <React.Fragment key={`wrapper-${dIdx}-${sIdx}`}>{items}</React.Fragment>;
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ padding: '8rem 2rem', textAlign: 'center', background: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0', color: '#94a3b8' }}>
                            <Clock size={64} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
                            <h2 style={{ color: '#475569', fontWeight: 800 }}>Schedule Not Generated</h2>
                            <p>Section {selectedSectionView} has no timetable yet. Click 'Generate Schedule'.</p>
                        </div>
                    )}
                </div>
            </div>
            {/* PRINT VIEW (STRICT PSNA OFFICIAL) */}
            {isGenerated && grids[selectedSectionView] && (
                <div className="print-only">
                    <table style={{ width: '100%', marginBottom: 10 }}>
                        <tbody>
                            <tr>
                                <td style={{ width: 100 }}>
                                    <img src="/logo.png" alt="PSNA Logo" style={{ width: 70, height: 70, objectFit: 'contain' }} />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <h1 style={{ fontSize: 20, margin: 0 }}>PSNA COLLEGE OF ENGINEERING AND TECHNOLOGY</h1>
                                    <p style={{ fontSize: 11, margin: '2px 0', fontStyle: 'italic' }}>(An Autonomous Institution, Affiliated to Anna University, Chennai)</p>
                                    <h2 style={{ fontSize: 16, margin: '5px 0 0', textDecoration: 'underline' }}>CLASS TIME TABLE</h2>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <table style={{ width: '100%', marginBottom: 8, fontSize: 12, fontWeight: 'bold' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '40%' }}>Class Name: {getYearFromSemester(semester)} CSE - {selectedSectionView}</td>
                                <td style={{ width: '30%', textAlign: 'center' }}>Semester: {semester}</td>
                                <td style={{ width: '30%', textAlign: 'right' }}>Section: {selectedSectionView}</td>
                            </tr>
                        </tbody>
                    </table>
                    <table className="official-table">
                        <thead>
                            <tr>
                                <th rowSpan="2" style={{ width: 60 }}>Day</th>
                                <th>8:45</th>
                                <th>9:40</th>
                                <th rowSpan="2" style={{ width: 25, fontSize: '9px' }}>BREAK</th>
                                <th>10:55</th>
                                <th>11:45</th>
                                <th rowSpan="2" style={{ width: 25, fontSize: '9px' }}>LUNCH</th>
                                <th>01:45</th>
                                <th>02:35</th>
                                <th>03:25</th>
                            </tr>
                            <tr>
                                <th style={{ height: 26 }}>9:40</th>
                                <th>10:35</th>
                                <th>11:45</th>
                                <th>12:35</th>
                                <th>02:35</th>
                                <th>03:25</th>
                                <th>04:15</th>
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map((day, dIdx) => (
                                <tr key={day}>
                                    <td style={{ fontWeight: 'bold' }}>{day.substring(0, 3)}</td>
                                    {grids[selectedSectionView][dIdx].map((cell, sIdx) => {
                                        const cols = [];
                                        cols.push(
                                            <td key={sIdx}>
                                                {cell ? (
                                                    <div style={{ fontWeight: 'bold', fontSize: '10px' }}>
                                                        {cell.type === 'ELECTIVE_GROUP' ? cell.alternatives.map(a => a.code).join(' / ') : cell.code}
                                                        {cell.type === 'LAB' && <div style={{ fontSize: '8px' }}>(LAB)</div>}
                                                    </div>
                                                ) : ''}
                                            </td>
                                        );
                                        if (dIdx === 0) {
                                            if (sIdx === 1) cols.push(
                                                <td key="brk" rowSpan="6" style={{ verticalAlign: 'middle', padding: 0 }}>
                                                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '9px', fontWeight: 'bold' }}>
                                                        BREAK (10:35-10:55)
                                                    </div>
                                                </td>
                                            );
                                            if (sIdx === 3) cols.push(
                                                <td key="lch" rowSpan="6" style={{ verticalAlign: 'middle', padding: 0 }}>
                                                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '9px', fontWeight: 'bold' }}>
                                                        LUNCH BREAK (12:35-01:45)
                                                    </div>
                                                </td>
                                            );
                                        }
                                        return cols;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <table className="legend-table">
                        <thead>
                            <tr style={{ background: '#f0f0f0' }}>
                                <th style={{ width: 50 }}>Sl.No</th>
                                <th style={{ width: 120 }}>Subject Code</th>
                                <th>Subject Name</th>
                                <th style={{ width: 180 }}>Faculty Name</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentLegend.map((sub, idx) => (
                                <tr key={sub.code}>
                                    <td style={{ textAlign: 'center' }}>{idx + 1}.</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{sub.code}</td>
                                    <td>{sub.name}</td>
                                    <td>{sub.facultyName}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
export default Timetable;