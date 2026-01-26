import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { generateClassTimetable, DAYS } from '../utils/TimetableGenerator';
import { Printer, Play, Calendar, Clock, Layers, Save, FileSpreadsheet, Download, X, Lock, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const getCleanLabCode = (c) => norm(c).replace(/_LAB|_\d+/g, '');
const isLabNode = (cell) => {
    if (!cell) return false;
    const type = String(cell.type || '').toUpperCase();
    const name = String(cell.name || '').toUpperCase();
    const code = String(cell.code || '').toUpperCase();
    if (type.includes('INTEGRATED') || name.includes('INTEGRATED') || name.includes('GRAPHICS')) return true;
    if (type.includes('LAB') || type.includes('PRACTICAL') || type.includes('LABORATORY') || type.includes('WORKSHOP') || type.includes('PROJECT')) return true;
    if (name.includes('LAB') || name.includes('PRACTICAL') || code.includes('LAB') || name.includes('PROJECT')) return true;
    return false;
};

const Timetable = () => {
    const { subjects, teachers, schedule, updateSchedule, facultyAccounts, department } = useData();
    const [semester, setSemester] = useState('');
    const [grids, setGrids] = useState({});
    const [selectedSectionView, setSelectedSectionView] = useState('A');
    const [isGenerated, setIsGenerated] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const availableSemesters = Array.from(new Set(subjects.map(s => s.semester))).filter(Boolean).sort();

    useEffect(() => {
        const semesterList = Array.from(new Set(subjects.map(s => s.semester))).filter(Boolean).sort();
        if (semesterList.length > 0 && (!semester || !semesterList.includes(semester))) {
            setSemester(semesterList[0]);
        }
    }, [subjects, semester]);

    useEffect(() => {
        if (schedule && schedule[semester] && Object.keys(schedule[semester]).length > 0) {
            setGrids(schedule[semester]);
            setIsGenerated(true);
            const sections = Object.keys(schedule[semester]).sort();
            if (!sections.includes(selectedSectionView)) {
                setSelectedSectionView(sections[0]);
            }
        } else {
            setGrids({});
            setIsGenerated(false);
        }
    }, [semester, schedule]);

    const getSectionsForSemester = (sem) => {
        return Array.from(new Set(
            subjects.filter(s => s.semester === sem)
                .flatMap(s => teachers.filter(t => t.subjectCode === s.code).map(t => t.section))
        )).filter(Boolean).sort();
    };

    const handleGenerate = () => {
        if (!subjects || subjects.length === 0) return;
        setIsGenerating(true);
        setTimeout(() => {
            try {
                const sections = getSectionsForSemester(semester);
                const sectionsToGenerate = sections.length > 0 ? sections : ['A'];
                const newGrids = {};
                const globalReservedSlots = {};
                const globalLabUsage = {}; // Track [Day-LabCode] used across sections

                Object.keys(schedule).forEach(sem => {
                    if (sem === semester) return;
                    const semGrids = schedule[sem] || {};
                    Object.values(semGrids).forEach(grid => {
                        if (grid && Array.isArray(grid)) {
                            grid.forEach((dayRow, d) => {
                                dayRow.forEach((cell, s) => {
                                    if (cell) {
                                        const key = `${d}-${s}`;
                                        if (!globalReservedSlots[key]) globalReservedSlots[key] = new Set();
                                        if (cell.teacherName && cell.teacherName !== 'TBA') globalReservedSlots[key].add(cell.teacherName.toUpperCase());
                                        if (isLabNode(cell) && cell.isStart) globalReservedSlots[key].add('LAB_START');

                                        // Track existing labs for this semester logic if needed, 
                                        // but usually we strictly isolate by section generation order.
                                    }
                                });
                            });
                        }
                    });
                });

                let syncElectives = {};
                sectionsToGenerate.forEach(section => {
                    // 1. Map basic details first
                    const mappedSubjects = subjects.filter(s => s.semester === semester).map(sub => {
                        const teacher = teachers.find(t => t.subjectCode === sub.code && t.section === section);
                        return { ...sub, teacherName: teacher ? teacher.name : 'TBA' };
                    });

                    // 2. Group Electives
                    const finalSubjects = [];
                    const electiveGroups = {}; // Key -> [subjects]

                    mappedSubjects.forEach(sub => {
                        const nameUpper = sub.name.toUpperCase();
                        const isElective = (sub.type === 'Elective') || nameUpper.includes('ELECTIVE');

                        if (isElective) {
                            // Determine Group Key (e.g. "OPEN ELECTIVE - I", "PROFESSIONAL ELECTIVE - III")
                            // Capture Prefix (Group 1), Numeral (Group 2), Star (Group 3)
                            const match = nameUpper.match(/(OPEN|PROFESSIONAL|FREE|DEPT|DEPARTMENT)?[\s-]*ELECTIVE[\s-–—]*(I{1,3}|IV|V|VI|VII|VIII)\s*(\*?)/);

                            // Normalize key
                            // If Prefix exists, include it. e.g. "OPEN ELECTIVE - III"
                            // If no prefix, just "ELECTIVE - III"
                            const prefix = match && match[1] ? match[1] + ' ' : '';
                            const numeral = match ? match[2] : '';
                            const star = match ? match[3] || '' : '';

                            const groupKey = match ? `${prefix}ELECTIVE - ${numeral}${star}` : (sub.type === 'Elective' ? 'GeneralElective' : null);

                            if (groupKey) {
                                if (!electiveGroups[groupKey]) electiveGroups[groupKey] = [];
                                electiveGroups[groupKey].push(sub);
                            } else {
                                finalSubjects.push(sub); // Treat as standalone if no clear grouping
                            }
                        } else {
                            finalSubjects.push(sub);
                        }
                    });

                    // 3. Merge Groups
                    Object.values(electiveGroups).forEach(group => {
                        if (group.length === 1) {
                            finalSubjects.push(group[0]);
                        } else if (group.length > 1) {
                            // Create Combo Subject
                            const merged = { ...group[0] };
                            merged.code = group.map(s => s.code).join(' / ');
                            // merged.name = group.map(s => s.name).join(' / '); // Names might get too long, maybe rely on Code
                            merged.teacherName = group.map(s => s.teacherName).join('/');
                            merged.credit = Math.max(...group.map(s => parseInt(s.credit) || 0));
                            merged.satCount = Math.max(...group.map(s => parseInt(s.satCount) || 0));

                            // Ensure it's treated as explicit elective
                            merged.type = 'Elective';

                            finalSubjects.push(merged);
                        }
                    });

                    const sectionSubjects = finalSubjects;

                    // Pass globalLabUsage to generator
                    let sectionGrid = generateClassTimetable(semester, section, sectionSubjects, globalReservedSlots, syncElectives, false, globalLabUsage);
                    if (!sectionGrid) sectionGrid = generateClassTimetable(semester, section, sectionSubjects, globalReservedSlots, syncElectives, true, globalLabUsage);

                    if (sectionGrid) {
                        newGrids[section] = sectionGrid;
                        sectionGrid.forEach((dayRow, d) => {
                            dayRow.forEach((cell, s) => {
                                if (cell) {
                                    const key = `${d}-${s}`;
                                    if (!globalReservedSlots[key]) globalReservedSlots[key] = new Set();
                                    if (cell.teacherName && cell.teacherName !== 'TBA') globalReservedSlots[key].add(cell.teacherName.toUpperCase());
                                    if (isLabNode(cell) && cell.isStart) globalReservedSlots[key].add('LAB_START');

                                    // Update Global Lab Usage for next sections
                                    if (cell.isLab) {
                                        globalLabUsage[`${d}-${cell.code}`] = true;
                                    }
                                }
                            });
                        });
                    }
                });

                if (Object.keys(newGrids).length > 0) {
                    updateSchedule(semester, newGrids);
                    setGrids(newGrids);
                    setIsGenerated(true);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsGenerating(false);
            }
        }, 500);
    };

    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [isSemDropdownOpen, setIsSemDropdownOpen] = useState(false);
    const dropdownRef = React.useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsSemDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCellClick = (dIdx, sIdx, cell) => {
        setEditingCell({ day: dIdx, slot: sIdx, section: selectedSectionView, cell });
        setEditValue(cell ? cell.code : '');
    };

    const handleSaveEdit = () => {
        if (!editingCell) return;
        const { day, slot, section } = editingCell;
        const newGrids = { ...grids };
        if (editValue === '' || editValue.toUpperCase() === 'FREE') {
            newGrids[section][day][slot] = null;
        } else {
            const sub = subjects.find(s => s.code === editValue && s.semester === semester);
            const teacher = teachers.find(t => t.subjectCode === editValue && t.section === section);
            if (sub) {
                newGrids[section][day][slot] = {
                    ...sub, teacherName: teacher ? teacher.name : 'TBA', duration: 1, isStart: true
                };
            }
        }
        updateSchedule(semester, newGrids);
        setGrids(newGrids);
        setEditingCell(null);
    };

    const handleExportExcel = () => {
        if (!grids[selectedSectionView]) return;
        const currentGrid = grids[selectedSectionView];
        const rows = [
            ['PSNA COLLEGE OF ENGINEERING AND TECHNOLOGY'],
            ['DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING'],
            [`CLASS TIME TABLE - SEMESTER ${semester} - SECTION ${selectedSectionView}`],
            [''],
            ['DAY', 'P1', 'P2', 'BRK', 'P3', 'P4', 'LUN', 'P5', 'P6', 'P7']
        ];
        DAYS.forEach((day, dIdx) => {
            const row = [day];
            currentGrid[dIdx].forEach((cell, sIdx) => {
                row.push(cell ? `${cell.code} (${cell.teacherName})` : '');
                if (sIdx === 1) row.push('BREAK');
                if (sIdx === 3) row.push('LUNCH');
            });
            rows.push(row);
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Timetable");
        XLSX.writeFile(wb, `Timetable_${semester}_${selectedSectionView}.xlsx`);
    };

    const handleExportWord = () => {
        // We can use the existing print-preview HTML content for Word
        const printContent = document.querySelector('.print-container');
        if (!printContent) return;

        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'>" +
            "<head><meta charset='utf-8'><style>" +
            "table { border-collapse: collapse; width: 100%; } " +
            "th, td { border: 1px solid black; padding: 5px; text-align: center; } " +
            ".print-header { text-align: center; border-bottom: 2px solid black; } " +
            "</style></head><body>";
        const footer = "</body></html>";
        const html = header + printContent.innerHTML + footer;

        const blob = new Blob(['\ufeff', html], {
            type: 'application/msword'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Timetable_${semester}_${selectedSectionView}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="timetable-page">
            <style>{`
                .timetable-page { 
                    padding: 1.5rem 2.5rem; 
                    background: #f1f5f9; 
                    min-height: 100vh;
                }

                .header-card { 
                    background: #0f172a; 
                    border-radius: 20px; 
                    padding: 1.25rem 2.5rem; 
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between; 
                    margin-bottom: 2rem; 
                    color: white; 
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                    overflow: hidden;
                    z-index: 1;
                }

                .header-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 0;
                    height: 100%;
                    background: linear-gradient(90deg, rgba(56, 189, 248, 0.15), rgba(56, 189, 248, 0.05));
                    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: -1;
                }

                .header-card:hover::before {
                    width: 100%;
                }
                
                .header-info { display: flex; align-items: center; gap: 1.25rem; z-index: 2; }
                
                .header-icon { 
                    background: linear-gradient(135deg, #4f46e5, #8b5cf6); 
                    padding: 0.8rem; 
                    border-radius: 12px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); 
                    transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    z-index: 2;
                }

                .header-card:hover .header-icon {
                    transform: rotate(12deg) scale(1.1);
                }
                
                .header-text h2 { margin: 0; font-weight: 800; font-size: 1.4rem; letter-spacing: -0.01em; }
                .header-text p { margin: 2px 0 0; font-size: 0.75rem; opacity: 0.6; font-weight: 500; }
                
                .header-actions { display: flex; align-items: center; gap: 0.75rem; z-index: 2; }
                
                .btn-gen { 
                    background: #3b82f6; 
                    color: white; 
                    border: none; 
                    padding: 0.6rem 1.4rem; 
                    border-radius: 10px; 
                    font-weight: 800; 
                    font-size: 0.75rem; 
                    display: flex; 
                    align-items: center; 
                    gap: 8px; 
                    cursor: pointer; 
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .btn-gen:hover { 
                    background: #2563eb; 
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                }

                .btn-gen:active { transform: translateY(0); }

                .icon-btn { 
                    background: white; 
                    border: none; 
                    padding: 0.65rem; 
                    border-radius: 10px; 
                    color: #0f172a; 
                    cursor: pointer; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    transition: all 0.2s;
                }

                .icon-btn:hover { background: #f1f5f9; transform: scale(1.1); }

                .btn-print {
                    background: white;
                    color: #0f172a;
                    border: none;
                    padding: 0.6rem 1.2rem;
                    border-radius: 10px;
                    font-weight: 800;
                    font-size: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-print:hover { background: #f8fafc; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

                /* Section Tabs - PILLS */
                .tabs-container { display: flex; gap: 10px; margin-bottom: 2rem; animation: fadeIn 0.8s ease-out; }
                
                .tab-btn { 
                    background: white; 
                    border: none; 
                    color: #64748b; 
                    padding: 0.5rem 1.6rem; 
                    border-radius: 50px; 
                    font-weight: 800; 
                    font-size: 0.75rem; 
                    cursor: pointer; 
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .tab-btn.active { 
                    background: #3b82f6; 
                    color: white; 
                    box-shadow: 0 8px 15px rgba(59, 130, 246, 0.3); 
                    transform: scale(1.05);
                }

                /* Timetable Grid */
                .table-glass { 
                    background: white; 
                    border-radius: 24px; 
                    padding: 2.5rem; 
                    box-shadow: 0 4px 25px rgba(0,0,0,0.02); 
                    border: 1px solid #eef2f6; 
                    animation: fadeIn 1s ease-out;
                }
                
                .grid-table { 
                    width: 100%; 
                    border-collapse: separate; 
                    border-spacing: 0; 
                    table-layout: fixed;
                }
                
                .grid-table th { 
                    padding: 0 0.5rem 1.5rem 0.5rem; 
                    color: #94a3b8; 
                    font-size: 0.65rem; 
                    font-weight: 900; 
                    text-transform: uppercase; 
                    letter-spacing: 0.1em; 
                    text-align: center; 
                }
                
                .grid-table th span { 
                    font-size: 0.55rem; 
                    font-weight: 700; 
                    opacity: 0.5; 
                    display: block; 
                    margin-top: 4px; 
                }
                
                .grid-table tbody tr {
                    vertical-align: top;
                }
                
                .day-label { 
                    font-weight: 900; 
                    color: #1e293b; 
                    font-size: 1rem; 
                    width: 110px; 
                    text-align: left;
                    padding-top: 32px;
                }
                
                .cell-container { 
                    padding: 10px; 
                    height: auto;
                }
                
                .subject-card { 
                    min-height: 85px; 
                    width: 100%;
                    max-width: 140px;
                    margin: 0 auto;
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    justify-content: center; 
                    cursor: pointer; 
                    position: relative;
                    border-radius: 18px;
                    background: #ffffff;
                    border: 1.5px solid #f8fafc;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    animation: scaleUp 0.4s ease-out backwards;
                }

                .subject-card:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 12px 24px rgba(0,0,0,0.08); border-color: #e2e8f0; }
                
                .theory-code { 
                    font-weight: 900; 
                    font-size: 1.2rem; 
                    color: #4f46e5; 
                    letter-spacing: -0.01em;
                }
                
                .lab-box { 
                    background: #f0fdf4; 
                    border-color: #dcfce7; 
                }
                
                .lab-locked {
                    border: 2px dashed #22c55e;
                    background: #ffffff;
                }
                
                .lab-code { 
                    font-weight: 900; 
                    font-size: 1.15rem; 
                    color: #166534; 
                }
                
                .lab-subtext { 
                    font-size: 0.55rem; 
                    color: #22c55e; 
                    font-weight: 900; 
                    margin-top: 2px; 
                }

                .lock-icon {
                    position: absolute;
                    top: 10px;
                    right: 12px;
                    opacity: 0.5;
                    color: #22c55e;
                }
                
                .divider-col { 
                    width: 50px; 
                    border: none; 
                    padding-top: 32px;
                }
                
                .vertical-label { 
                    writing-mode: vertical-rl; 
                    transform: rotate(180deg); 
                    font-weight: 900; 
                    font-size: 0.55rem; 
                    color: #94a3b8; 
                    height: 85px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    letter-spacing: 0.3em; 
                    opacity: 0.3; 
                }
                
                .action-icon { opacity: 0.1; font-weight: 900; font-size: 1.5rem; }

                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(4px);
                    z-index: 9999;
                    display: flex; align-items: center; justify-content: center;
                }
                .modal-box {
                    background: white; width: 90%; max-width: 500px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    animation: modalSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes modalSlide {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                /* PRINT STYLES */
                .print-container { display: none; font-family: 'Times New Roman', serif; color: black; }

                @media print {
                    .timetable-page { padding: 0; background: white; }
                    .header-card, .tabs-container, .modal-overlay, .table-glass, .btn-print, .header-actions, .header-info { display: none !important; }
                    .print-container { display: block !important; width: 100%; }
                    
                    @page { margin: 0.5cm; size: landscape; }
                    
                    .print-header { text-align: center; margin-bottom: 5px; border-bottom: 2px solid black; padding-bottom: 5px; }
                    .print-header h1 { font-size: 16pt; font-weight: bold; margin: 0; text-transform: uppercase; }
                    .print-header h2 { font-size: 11pt; font-weight: normal; margin: 0; font-style: italic; }
                    .print-header h3 { font-size: 12pt; font-weight: bold; margin: 5px 0 0 0; text-decoration: underline; }
                    
                    .meta-grid { display: flex; justify-content: space-between; font-weight: bold; font-size: 10pt; margin: 5px 0; }
                    
                    .print-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    .print-table th, .print-table td { border: 1px solid black; padding: 4px; text-align: center; font-size: 10pt; vertical-align: middle; }
                    .print-table th { background: #eee !important; -webkit-print-color-adjust: exact; }
                    .print-table td { height: 45px; }

                    .print-footer-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
                    .print-footer-table th, .print-footer-table td { border: 1px solid black; padding: 4px; text-align: left; }
                    .print-footer-table th { text-align: center; background: #eee !important; -webkit-print-color-adjust: exact; }
                }
            `}</style>

            <div className="header-card">
                <div className="header-info">
                    <div className="header-icon">
                        <Layers size={28} color="white" />
                    </div>
                    <div className="header-text">
                        <h2>Smart Timetable</h2>
                    </div>
                </div>
                <div className="header-actions">
                    <div className="custom-select-container" ref={dropdownRef}>
                        <div
                            className={`custom-select-trigger ${isSemDropdownOpen ? 'active' : ''}`}
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}
                            onClick={() => setIsSemDropdownOpen(!isSemDropdownOpen)}
                        >
                            <Calendar size={18} color="rgba(255,255,255,0.7)" style={{ marginRight: '8px' }} />
                            <span>{semester || 'Select Sem'}</span>
                            <Layers size={14} style={{ opacity: 0.5, transform: isSemDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', marginLeft: '8px' }} />
                        </div>
                        {isSemDropdownOpen && (
                            <div className="custom-select-menu">
                                {availableSemesters.map(s => (
                                    <div
                                        key={s}
                                        className={`custom-select-item ${semester === s ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSemester(s);
                                            setIsSemDropdownOpen(false);
                                        }}
                                    >
                                        {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button className="btn-gen" onClick={handleGenerate} disabled={isGenerating}>
                        <Play size={16} fill="white" /> {isGenerating ? 'GENERATING...' : 'Generate Schedule'}
                    </button>
                    <button className="icon-btn" title="Download Word" onClick={handleExportWord}><Download size={20} /></button>
                    <button className="icon-btn" title="Download Excel" onClick={handleExportExcel}><FileSpreadsheet size={20} /></button>
                    <button className="btn-print" onClick={() => window.print()}><Printer size={18} /> Print Official</button>
                </div>
            </div>

            <div className="tabs-container">
                {getSectionsForSemester(semester).map(sec => (
                    <button
                        key={sec}
                        className={`tab-btn ${selectedSectionView === sec ? 'active' : ''}`}
                        onClick={() => setSelectedSectionView(sec)}
                    >
                        Section {sec}
                    </button>
                ))}
            </div>

            {grids[selectedSectionView] ? (
                <div className="table-glass">
                    <table className="grid-table">
                        <thead>
                            <tr>
                                <th style={{ width: '110px', textAlign: 'left' }}>DAY</th>
                                <th>P1<span>08:45-09:40</span></th>
                                <th>P2<span>09:40-10:35</span></th>
                                <th className="divider-col">
                                    <div className="vertical-label" style={{ height: '40px', opacity: 0.5, fontSize: '0.5rem' }}>BREAK</div>
                                </th>
                                <th>P3<span>10:55-11:45</span></th>
                                <th>P4<span>11:45-12:35</span></th>
                                <th className="divider-col">
                                    <div className="vertical-label" style={{ height: '40px', opacity: 0.5, fontSize: '0.5rem' }}>LUNCH</div>
                                </th>
                                <th>P5<span>01:45-02:35</span></th>
                                <th>P6<span>02:35-03:25</span></th>
                                <th>P7<span>03:25-04:15</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map((day, dIdx) => (
                                <tr key={day}>
                                    <td className="day-label">{day}</td>
                                    {grids[selectedSectionView][dIdx].map((cell, sIdx) => {
                                        const results = [];
                                        const isLab = isLabNode(cell);
                                        const isInt = cell && (String(cell.type || '').toUpperCase().includes('INTEGRATED') || String(cell.name || '').toUpperCase().includes('INTEGRATED') || String(cell.name || '').toUpperCase().includes('GRAPHICS'));

                                        // Differentiate Integrated Lab vs Integrated Theory
                                        // Integrated Lab slots have cell.isLab = true from the generator
                                        const isIntLab = isInt && cell && cell.isLab;
                                        const isNormalLab = isLab && !isInt;
                                        const shouldShowGreen = isNormalLab || isIntLab;

                                        const isActuallyLab = isLab && !isInt; // For dashed borders logic (only true labs)
                                        const showDashed = isActuallyLab && cell && cell.isFixedFromWord;

                                        results.push(
                                            <td key={`${dIdx}-${sIdx}`} className="cell-container">
                                                <div
                                                    className={`subject-card ${shouldShowGreen ? 'lab-box' : ''} ${showDashed ? 'lab-locked' : ''}`}
                                                    onClick={() => handleCellClick(dIdx, sIdx, cell)}
                                                >
                                                    {cell ? (
                                                        <>
                                                            {cell.isFixedFromWord && <Lock className="lock-icon" size={12} style={{ color: shouldShowGreen ? '#15803d' : '#4f46e5', opacity: 0.6 }} />}
                                                            <div
                                                                className={shouldShowGreen ? 'lab-code' : 'theory-code'}
                                                                style={cell.code.includes('/') ? { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', lineHeight: '1.1', padding: '4px 0' } : {}}
                                                            >
                                                                {cell.code.includes('/') ? cell.code.split('/').map((c, i) => <div key={i}>{c.trim()}</div>) : cell.code}
                                                            </div>
                                                            {isLab && (
                                                                <div className="lab-subtext" style={isInt ? { color: shouldShowGreen ? '#15803d' : '#6366f1' } : {}}>
                                                                    {isInt ? (shouldShowGreen ? '(INT_LAB)' : '(INT.)') : '(LAB)'}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : <div className="action-icon">+</div>}
                                                </div>
                                            </td>
                                        );
                                        if (sIdx === 1) results.push(<td key={`brk-${dIdx}`} className="divider-col"><div className="vertical-label">BREAK</div></td>);
                                        if (sIdx === 3) results.push(<td key={`lun-${dIdx}`} className="divider-col"><div className="vertical-label">LUNCH</div></td>);
                                        return results;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '10rem 0', background: 'white', borderRadius: '28px', border: '1px solid #f1f5f9' }}>
                    <h3 style={{ color: '#94a3b8', fontWeight: 900, fontSize: '1.2rem' }}>No Schedule Generated for Section {selectedSectionView}</h3>
                    <p style={{ color: '#cbd5e1', fontWeight: 600, marginTop: '0.5rem' }}>Change the semester or click Generate to start</p>
                </div>
            )}

            {editingCell && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ borderRadius: '28px', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontWeight: 900, margin: 0, fontSize: '1.4rem' }}>Edit Schedule</h3>
                            <button onClick={() => setEditingCell(null)} style={{ background: '#f8fafc', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '10px' }}><X size={20} /></button>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem', fontWeight: 700 }}>Updating <b>{DAYS[editingCell.day]}</b> Period <b>{editingCell.slot + 1}</b></p>
                        <select
                            className="input-field"
                            style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '2px solid #f1f5f9', fontWeight: 800, fontSize: '1rem', outline: 'none', appearance: 'none', background: '#f8fafc' }}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                        >
                            <option value="">Select Subject...</option>
                            <option value="FREE">-- Free Period --</option>
                            {subjects.filter(s => s.semester === semester).map(sub => (
                                <option key={sub.code} value={sub.code}>
                                    {sub.code} - {sub.name}
                                </option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '2.5rem' }}>
                            <button className="tab-btn" onClick={() => setEditingCell(null)} style={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>Cancel</button>
                            <button className="tab-btn active" onClick={handleSaveEdit} style={{ padding: '0.6rem 2.5rem' }}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT OFFICIAL VIEW */}
            <div className="print-container">
                {grids[selectedSectionView] && (() => {
                    const currentGrid = grids[selectedSectionView];
                    // Gather Unique Subjects
                    const usedCodes = new Set();
                    currentGrid.flat().forEach(c => {
                        if (c) {
                            if (c.code.includes('/')) c.code.split('/').forEach(p => usedCodes.add(p.trim()));
                            else usedCodes.add(c.code);
                        }
                    });
                    const uniqueSubjectList = Array.from(usedCodes).sort().map(code => {
                        const sub = subjects.find(s => s.code === code && s.semester === semester);
                        const teach = teachers.find(t => t.subjectCode === code && t.section === selectedSectionView);
                        return {
                            code,
                            name: sub ? sub.name : 'Unknown',
                            acronym: sub ? sub.name.split(' ').map(w => w[0]).join('').substring(0, 4).toUpperCase() : '',
                            staff: teach ? teach.name : 'TBA',
                            dept: teach ? (teach.dept || 'CSE') : 'CSE',
                            hours: sub ? `${sub.credit}` : '-'  // Simplified to Credit
                        };
                    });

                    const getInitials = (name) => {
                        if (!name || name === 'TBA') return '';
                        // If Name is "Dr. A. Smith", return "AS"
                        // Remove Dr/Mr/Mrs etc
                        const clean = name.replace(/Dr\.|Mr\.|Mrs\.|Prof\./g, '').trim();
                        // Take 1st letter of each part
                        return clean.split(/[\s\.]+/).map(n => n[0]).join('').toUpperCase();
                    };

                    const renderPrintCell = (cell) => {
                        if (!cell) return '';
                        if (cell.code.includes('/')) {
                            const codes = cell.code.split('/');
                            const teachers = (cell.teacherName || '').split('/');
                            return codes.map((c, i) => (
                                <div key={i} style={{ borderBottom: i < codes.length - 1 ? '1px solid black' : 'none', padding: '2px', minHeight: '20px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>{c.trim()}</div>
                                    <div style={{ fontSize: '9pt' }}>{getInitials(teachers[i])}</div>
                                </div>
                            ));
                        }
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>{cell.code}</div>
                                <div style={{ fontSize: '9pt' }}>{getInitials(cell.teacherName)}</div>
                            </div>
                        );
                    };

                    // Calc Year & Sem
                    const semNum = parseInt(semester.replace(/\D/g, '')) || 1;
                    const year = Math.ceil(semNum / 2);
                    const yearRoman = ['I', 'II', 'III', 'IV'][year - 1] || 'I';

                    return (
                        <>
                            <div className="print-header">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '24px' }}>P</div> {/* Placeholder Logo */}
                                    <div>
                                        <h1>PSNA COLLEGE OF ENGINEERING AND TECHNOLOGY</h1>
                                        <h2>(An Autonomous Institution, Affiliated to Anna University, Chennai)</h2>
                                    </div>
                                </div>
                                <h3>CLASS TIME TABLE</h3>
                            </div>

                            <div className="meta-grid">
                                <div>Dept: {department || 'CSE'}</div>
                                <div style={{ textAlign: 'center' }}>
                                    Academic Year: 2025-2026 {semNum % 2 !== 0 ? 'ODD' : 'EVEN'}<br />
                                    Semester : {semester}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    Course: B.E<br />
                                    Year & Sec: {yearRoman} - {selectedSectionView}
                                </div>
                            </div>

                            <table className="print-table">
                                <thead>
                                    <tr>
                                        <th rowSpan={2} style={{ width: '40px' }}>Day</th>
                                        <th>8:45</th>
                                        <th>9:40</th>
                                        <th rowSpan={2} style={{ width: '20px', fontSize: '8pt', padding: 0 }}>
                                            <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', width: '100%', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>BREAK</div>
                                        </th>
                                        <th>10:55</th>
                                        <th>11:45</th>
                                        <th rowSpan={2} style={{ width: '30px', fontSize: '8pt', padding: 0 }}>
                                            <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', width: '100%', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LUNCH BREAK</div>
                                        </th>
                                        <th>01:45</th>
                                        <th>02:35</th>
                                        <th>03:25</th>
                                    </tr>
                                    <tr>
                                        <th>9:40</th>
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
                                        <tr key={dIdx}>
                                            <td style={{ fontWeight: 'bold' }}>{day.substring(0, 2)}</td>

                                            {/* P1, P2 */}
                                            {[0, 1].map(s => <td key={`p-${s}`} style={{ height: '50px' }}>{renderPrintCell(currentGrid[dIdx][s])}</td>)}

                                            {/* Morning Break */}
                                            {dIdx === 0 && <td rowSpan={6} style={{ background: '#f0f0f0', fontSize: '8pt', textAlign: 'center' }}>10:35<br />|<br />10:55</td>}

                                            {/* P3, P4 */}
                                            {[2, 3].map(s => <td key={`p-${s}`}>{renderPrintCell(currentGrid[dIdx][s])}</td>)}

                                            {/* Lunch Break */}
                                            {dIdx === 0 && <td rowSpan={6} style={{ background: '#f0f0f0', fontSize: '8pt', textAlign: 'center' }}>12:35<br />|<br />01:45</td>}

                                            {/* P5, P6, P7 */}
                                            {[4, 5, 6].map(s => <td key={`p-${s}`}>{renderPrintCell(currentGrid[dIdx][s])}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <table className="print-footer-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>Sl.No</th>
                                        <th>Sub Code</th>
                                        <th>Subject Name</th>
                                        <th style={{ width: '50px' }}>Hours</th>
                                        <th>Faculty Name</th>
                                        <th style={{ width: '60px' }}>Dept</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uniqueSubjectList.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                            <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{item.code}</td>
                                            <td>{item.name}</td>
                                            <td style={{ textAlign: 'center' }}>{item.hours}</td>
                                            <td>{item.staff}</td>
                                            <td style={{ textAlign: 'center' }}>{item.dept}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', padding: '0 50px', fontWeight: 'bold', fontSize: '10pt' }}>
                                <div>Timetable Coordinator</div>
                                <div>HOD/CSE</div>
                                <div>Principal</div>
                            </div>
                        </>
                    );
                })()}
            </div>

        </div>
    );
};
export default Timetable;