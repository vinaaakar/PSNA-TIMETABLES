import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import * as XLSX from 'xlsx';
import { Upload, Save, FileSpreadsheet, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ExcelPreview.css';
import { v4 as uuidv4 } from 'uuid';

const ExcelPreview = () => {
    const { setSubjects, setTeachers, updateSchedule } = useData();
    const navigate = useNavigate();
    const [grid, setGrid] = useState(() => {
        const saved = sessionStorage.getItem('excel_preview_grid');
        return saved ? JSON.parse(saved) : [];
    });

    const [fileName, setFileName] = useState(() => {
        return sessionStorage.getItem('excel_preview_filename') || '';
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        setLoading(true);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            const rows = [];
            for (let R = 0; R <= range.e.r; ++R) {
                const row = [];
                for (let C = 0; C <= range.e.c; ++C) {
                    const cell = ws[XLSX.utils.encode_cell({ c: C, r: R })];
                    row.push(cell ? cell.v : '');
                }
                rows.push(row);
            }
            setGrid(rows);
            sessionStorage.setItem('excel_preview_grid', JSON.stringify(rows));
            sessionStorage.setItem('excel_preview_filename', file.name);
            setLoading(false);
        };
        reader.readAsBinaryString(file);
    };

    const processAndSave = () => {
        if (grid.length === 0) return;
        try {
            // STEP 1: WIPE CURRENT STATE COMPLETELY
            setSubjects([]);
            setTeachers([]);

            const rows = grid;
            let currentSem = 'General';
            let currentType = 'Lecture';
            const newSubjects = [];
            const newTeachers = [];
            const allAffectedSemesters = new Set();

            const safeInt = (val) => {
                if (val === undefined || val === null || val === '') return 0;
                let s = String(val).trim();
                const match = s.match(/(\d+)/);
                return match ? parseInt(match[0]) : 0;
            };

            const parseHeaders = (row, prevIndices) => {
                const h = row.map(cell => String(cell || '').trim().toUpperCase());
                let sections = [];
                // STRICT PSNA SECTION DETECTION: Only Allow A, B, C, D, E.
                // We stop scanning once we see "No of Section" or "Sub Hand"
                for (let idx = 0; idx < h.length; idx++) {
                    const val = h[idx];
                    if (val === 'A' || val === 'B' || val === 'C' || val === 'D' || val === 'E') {
                        sections.push({ idx, name: val });
                    }
                    if (val.includes('SECTION') || val.includes('DEPT') || val.includes('TUTOR')) {
                        // Once we hit metadata, stop looking for section headers to avoid Section G
                        break;
                    }
                }

                // FALLBACK: If this header row didn't have section labels (e.g. Practical block header), 
                // but we had them previously, assume alignment matches the previous block.
                if (sections.length === 0 && prevIndices && prevIndices.sections && prevIndices.sections.length > 0) {
                    sections = prevIndices.sections;
                }

                return {
                    codeIdx: h.findIndex(x => x === 'SUB.CODE' || x === 'SUB.COD'),
                    nameIdx: h.findIndex(x => x === 'SUBJECT NAME'),
                    weekdayIdx: 12, // Column M
                    satIdx: 13,     // Column N
                    sections: sections
                };
            };

            let currentIndices = null;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row) continue;
                const rowUpper = row.map(c => String(c || '').trim().toUpperCase());

                // 2. LITERAL SEMESTER DETECTION
                const semCell = row.find(c =>
                    /^(?:(?:[IXV\d]+)\s*ME\s*[A-Z]+)|(?:SEM\s*[IXV\d]+)|(?:SEMESTER\s*[IXV\d]+)$/i.test(String(c).trim())
                );
                if (semCell) {
                    let semText = String(semCell).trim().toUpperCase();
                    // Fix "SEM II CSE" -> "SEM II"
                    if (semText.includes('SEM')) {
                        const match = semText.match(/SEM\s+([IXV\d]+)/i);
                        if (match) semText = `SEM ${match[1]}`;
                    }
                    currentSem = semText;
                    allAffectedSemesters.add(currentSem);
                }

                const rowStr = rowUpper.join(' ');
                if (rowStr.includes('PRACTICAL')) currentType = 'Lab';
                else if (rowStr.includes('THEORY')) currentType = 'Lecture';

                // 3. HEADER ROW DETECTION
                if (rowUpper.some(c => c === 'SUB.CODE' || c === 'SUB.COD' || c === 'SUBJECT NAME')) {
                    currentIndices = parseHeaders(row, currentIndices);
                    continue;
                }

                if (!currentIndices) continue;

                // 4. SUBJECT DATA
                const colB = String(row[1] || '').trim();
                const colC = String(row[2] || '').trim();
                let code = '';
                let name = '';

                if (/^[A-Z]+\d+/.test(colB)) { code = colB; name = String(row[2] || '').trim(); }
                else if (/^[A-Z]+\d+/.test(colC)) { code = colC; name = String(row[3] || '').trim(); }

                if (!code || !name || name.toUpperCase().includes('TOTAL')) continue;

                let weekday = safeInt(row[12]);
                const sat = safeInt(row[13]);

                // Fallback: If Col M is empty, check Col H (index 7) which is common for Practical tables
                if (weekday === 0) {
                    const fallbackHours = safeInt(row[7]);
                    if (fallbackHours > 0) weekday = fallbackHours;
                }

                let finalType = (name.toUpperCase().includes('LAB') || name.toUpperCase().includes('PRACTICAL') || currentType === 'Lab') ? 'Lab' : 'Lecture';

                // We keep the Integrated logic for the generator but label them as standard for the UI as requested
                // finalType will stay as 'Lecture' or 'Lab' here for the Subjects page

                newSubjects.push({
                    id: uuidv4(),
                    code, name,
                    semester: currentSem,
                    credit: weekday,
                    satCount: sat,
                    type: finalType
                });

                // 5. TEACHER DATA (Locked to A-E columns only)
                currentIndices.sections.forEach(secObj => {
                    const tName = String(row[secObj.idx] || '').trim();
                    if (tName && isNaN(tName) && tName.length >= 2) {
                        const up = tName.toUpperCase();
                        if (!['YES', 'NO', 'STAFF', 'TUTOR', 'SUB'].some(k => up.includes(k))) {
                            newTeachers.push({
                                id: uuidv4(),
                                name: tName,
                                subjectCode: code,
                                section: secObj.name,
                                semester: currentSem
                            });
                        }
                    }
                });
            }

            // Sync states
            setSubjects(newSubjects);
            setTeachers(newTeachers);
            // RESET ALL SCHEDULES for affected semesters to force regeneration
            allAffectedSemesters.forEach(sem => updateSchedule(sem, {}));

            setMessage({ type: 'success', text: `Sync Complete: ${newSubjects.length} subjects found.` });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Import failed. Check Excel format.' });
        }
    };

    const getColumnLetter = (index) => {
        let letter = '';
        while (index >= 0) {
            letter = String.fromCharCode((index % 26) + 65) + letter;
            index = Math.floor(index / 26) - 1;
        }
        return letter;
    };

    return (
        <div className="excel-preview-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Excel Data Preview</h1>
                    <p>M=Weekday, N=Sat | Sections A-E Only</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-outline btn-rotate-icon" onClick={() => { setGrid([]); setFileName(''); sessionStorage.removeItem('excel_preview_grid'); }}>
                        <RefreshCw size={18} /> Reset
                    </button>
                    <button className="btn btn-primary" onClick={processAndSave}>
                        <Save size={18} /> Import Excel Data
                    </button>
                </div>
            </div>

            {message && (
                <div className={`alert-banner ${message.type}`} style={{
                    padding: '1.2rem', borderRadius: '12px', marginBottom: '1.5rem',
                    backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    color: message.type === 'success' ? '#166534' : '#991b1b',
                    border: `2px solid ${message.type === 'success' ? '#16a34a' : '#ef4444'}`,
                    fontWeight: 800
                }}>{message.text}</div>
            )}

            <div className="card excel-card">
                {!grid.length ? (
                    <div className="empty-state">
                        <FileSpreadsheet size={64} />
                        <label className="btn btn-primary mt-2" style={{ cursor: 'pointer' }}>
                            <Upload size={18} /> Select Excel File
                            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                    </div>
                ) : (
                    <div className="excel-table-container">
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th className="excel-row-header"></th>
                                    {grid[0]?.map((_, i) => <th key={i}>{getColumnLetter(i)}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {grid.slice(0, 300).map((row, rIdx) => (
                                    <tr key={rIdx}>
                                        <td className="excel-row-header">{rIdx + 1}</td>
                                        {row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
export default ExcelPreview;