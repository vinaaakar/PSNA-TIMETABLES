import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import * as mammoth from 'mammoth';
import { Upload, Save, FileText, AlertCircle, RefreshCw, Lock, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ExcelPreview.css';
import { v4 as uuidv4 } from 'uuid';
const WordPreview = () => {
    const { subjects, setSubjects, setPreemptiveConstraints, setDepartment } = useData();
    const navigate = useNavigate();
    const [wordGrid, setWordGrid] = useState(() => {
        const saved = sessionStorage.getItem('word_preview_grid');
        return saved ? JSON.parse(saved) : [];
    });
    const [fileName, setFileName] = useState(() => {
        return sessionStorage.getItem('word_preview_filename') || '';
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [extractedConstraints, setExtractedConstraints] = useState([]);
    useEffect(() => {
        sessionStorage.setItem('word_preview_grid', JSON.stringify(wordGrid));
        if (wordGrid.length > 0) analyzeConstraints();
    }, [wordGrid]);
    useEffect(() => {
        sessionStorage.setItem('word_preview_filename', fileName);
    }, [fileName]);
    const handleReset = () => {
        setWordGrid([]);
        setFileName('');
        setExtractedConstraints([]);
        sessionStorage.removeItem('word_preview_grid');
        sessionStorage.removeItem('word_preview_filename');
        setMessage(null);
    };
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        setLoading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
                .then(result => {
                    const html = result.value;
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    if (doc.body.children.length > 0) {
                        const allRows = [];
                        let lastContextInfo = '';
                        Array.from(doc.body.children).forEach(node => {
                            if (node.tagName === 'P' || node.tagName === 'H1' || node.tagName === 'H2' || node.tagName === 'H3') {
                                const text = node.innerText?.trim() || node.textContent?.trim() || '';
                                if (text.length > 0 && (
                                    text.includes('Venue') ||
                                    text.includes('Course') ||
                                    text.includes('Laboratory') ||
                                    text.includes('Department') ||
                                    text.includes('Floor')
                                )) {
                                    lastContextInfo = text;
                                }
                            }
                            if (node.tagName === 'TABLE') {
                                if (allRows.length > 0) allRows.push([]);
                                const rows = node.querySelectorAll('tr');
                                const occupied = {};
                                const dataGrid = [];
                                rows.forEach((tr, rIdx) => {
                                    if (!dataGrid[rIdx]) dataGrid[rIdx] = [];
                                    const cells = tr.querySelectorAll('td, th');
                                    let cIdx = 0;
                                    cells.forEach(cell => {
                                        while (occupied[`${rIdx},${cIdx}`]) cIdx++;
                                        const text = cell.innerText.trim();
                                        const colSpan = parseInt(cell.getAttribute('colspan') || '1');
                                        const rowSpan = parseInt(cell.getAttribute('rowspan') || '1');
                                        for (let r = 0; r < rowSpan; r++) {
                                            for (let c = 0; c < colSpan; c++) {
                                                const targetR = rIdx + r;
                                                const targetC = cIdx + c;
                                                if (!dataGrid[targetR]) dataGrid[targetR] = [];
                                                dataGrid[targetR][targetC] = {
                                                    text,
                                                    rowSpan: (r === 0 && c === 0) ? rowSpan : 1,
                                                    colSpan: (r === 0 && c === 0) ? colSpan : 1,
                                                    isVisible: (r === 0 && c === 0)
                                                };
                                                occupied[`${targetR},${targetC}`] = true;
                                            }
                                        }
                                        cIdx += colSpan;
                                    });
                                });
                                let maxCols = 0;
                                dataGrid.forEach(r => { if (r.length > maxCols) maxCols = r.length; });
                                const normalizedData = dataGrid.map(r => {
                                    const row = [];
                                    for (let i = 0; i < maxCols; i++) {
                                        row.push(r[i] || { text: '', rowSpan: 1, colSpan: 1, isVisible: true });
                                    }
                                    return row;
                                });
                                if (lastContextInfo) {
                                    const headerRow = Array(maxCols).fill(null).map(() => ({ text: '', rowSpan: 1, colSpan: 1, isVisible: true }));
                                    headerRow[0] = { text: lastContextInfo, rowSpan: 1, colSpan: maxCols, isVisible: true };
                                    for (let k = 1; k < maxCols; k++) headerRow[k] = { text: '', rowSpan: 1, colSpan: 1, isVisible: false };
                                    allRows.push(headerRow);
                                    lastContextInfo = '';
                                }
                                normalizedData.forEach(r => allRows.push(r));
                            }
                        });
                        setWordGrid(allRows);
                        setMessage({ type: 'success', text: `Parsed document successfully.` });
                    } else {
                        setMessage({ type: 'error', text: 'No tables found in Word document.' });
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setMessage({ type: 'error', text: 'Failed to parse Word file.' });
                    setLoading(false);
                });
        };
        reader.readAsArrayBuffer(file);
    };
    const handleCellChange = (rowIndex, colIndex, value) => {
        const newGrid = [...wordGrid];
        newGrid[rowIndex][colIndex] = { ...newGrid[rowIndex][colIndex], text: value };
        setWordGrid(newGrid);
    };
    const analyzeConstraints = () => {
        const rows = wordGrid.map(r => r.map(c => c.text));
        let currentColMap = null;
        let activeSection = null;
        const found = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowStr = row.join(' ').toUpperCase();
            const secMatch = rowStr.match(/(SECTION|SEC|CLASS)[:\s-]+([A-H])(\s|$)/i);
            if (secMatch) activeSection = secMatch[2].toUpperCase();
            if (rowStr.match(/8\.45|08\.45|8:45/)) {
                const map = {};
                let lastSlot = -1;
                row.forEach((text, idx) => {
                    const t = String(text).trim();
                    if (!t) return;
                    let slot = -1;
                    if (t.match(/8\.45|08\.45|8:45/)) slot = 0;
                    else if (t.match(/9\.40|09\.40|9:40/)) slot = 1;
                    else if (t.match(/10\.55|10:55/)) slot = 2;
                    else if (t.match(/11\.45|11:45/)) slot = 3;
                    else if (t.match(/1\.45|01\.45|1:45|13\.45/)) slot = 4;
                    else if (t.match(/2\.35|02\.35|2:35|14\.35/)) slot = 5;
                    else if (t.match(/3\.25|03\.25|3:25|15\.25/)) slot = 6;
                    if (slot !== -1 && slot !== lastSlot) { map[idx] = slot; lastSlot = slot; }
                });
                currentColMap = map; continue;
            }
            if (currentColMap) {
                const dayText = String(row[0] || '').toUpperCase();
                let dayIdx = -1;
                if (dayText.includes('MON')) dayIdx = 0;
                else if (dayText.includes('TUE')) dayIdx = 1;
                else if (dayText.includes('WED')) dayIdx = 2;
                else if (dayText.includes('THU')) dayIdx = 3;
                else if (dayText.includes('FRI')) dayIdx = 4;
                else if (dayText.includes('SAT')) dayIdx = 5;
                if (dayIdx !== -1) {
                    row.forEach((cellText, cIdx) => {
                        const slot = currentColMap[cIdx];
                        if (slot !== undefined && cellText && String(cellText).length > 2) {
                            const codeRegex = /([A-Z]{2,5}\d{1,6})/gi;
                            let m;
                            while ((m = codeRegex.exec(cellText)) !== null) {
                                const code = m[1].toUpperCase();
                                const textAfter = cellText.substring(m.index + code.length, m.index + code.length + 5);
                                const localSecMatch = textAfter.match(/[-:\s\(]*([A-H])\b/i);
                                const sec = localSecMatch ? localSecMatch[1].toUpperCase() : activeSection;
                                if (sec) {
                                    found.push({ code, sec, d: dayIdx, s: slot, text: cellText.trim() });
                                }
                            }
                        }
                    });
                }
            }
        }
        setExtractedConstraints(found);
    };
    const processWordConstraints = () => {
        if (extractedConstraints.length === 0) return;
        try {
            const grouped = {};
            extractedConstraints.forEach(c => {
                const norm = c.code.replace(/[^A-Za-z0-9]/g, '');
                if (!grouped[norm]) grouped[norm] = {};
                if (!grouped[norm][c.sec]) grouped[norm][c.sec] = [];
                const key = `${c.d}-${c.s}`;
                if (!grouped[norm][c.sec].some(x => `${x.d}-${x.s}` === key)) {
                    grouped[norm][c.sec].push({ d: c.d, s: c.s, duration: 1 });
                }
            });
            Object.keys(grouped).forEach(norm => {
                Object.keys(grouped[norm]).forEach(sec => {
                    const slots = grouped[norm][sec].sort((a, b) => (a.d * 10 + a.s) - (b.d * 10 + b.s));
                    const final = [];
                    if (slots.length > 0) {
                        let cur = { ...slots[0] };
                        for (let i = 1; i < slots.length; i++) {
                            if (slots[i].d === cur.d && slots[i].s === cur.s + cur.duration) {
                                cur.duration++;
                            } else {
                                final.push(cur);
                                cur = { ...slots[i] };
                            }
                        }
                        final.push(cur);
                    }
                    grouped[norm][sec] = final;
                });
            });
            setPreemptiveConstraints({ slots: grouped });
            if (subjects && subjects.length > 0) {
                const updated = subjects.map(sub => {
                    const norm = String(sub.code || '').replace(/[^A-Za-z0-9]/g, '');
                    const fixed = grouped[norm] || null;
                    if (fixed) {
                        return { ...sub, fixedSlots: fixed };
                    }
                    return sub;
                });
                setSubjects(updated);
            }
            setMessage({ type: 'success', text: `Locked ${extractedConstraints.length} hard conditions from Word file.` });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error applying constraints.' });
        }
    };
    return (
        <div style={{ padding: '0', maxWidth: '100%', margin: '0' }}>
            {message && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 999, padding: '1rem',
                    background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: message.type === 'success' ? '#166534' : '#991b1b',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span style={{ fontWeight: 600 }}>{message.text}</span>
                    <button onClick={() => setMessage(null)} style={{ marginLeft: '1rem', border: 'none', background: 'transparent', cursor: 'pointer' }}>X</button>
                </div>
            )}
            <div className="page-header" style={{ padding: '2rem 2rem 0' }}>
                <div>
                    <h1 className="page-title">Word Constraint Engine</h1>
                    <p style={{ color: 'var(--text-light)' }}>Treating Word timetables as <b>Locked Hard Constraints</b></p>
                </div>
                {fileName && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-outline btn-rotate-icon" onClick={handleReset}><RefreshCw size={18} /> Reset</button>
                        <button className="btn btn-primary" onClick={processWordConstraints} disabled={loading || extractedConstraints.length === 0}>
                            <Lock size={18} /> Lock Constraints
                        </button>
                    </div>
                )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: extractedConstraints.length > 0 ? '1fr 300px' : '1fr', gap: '1rem', padding: '1rem 2rem' }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '70vh' }}>
                    {!wordGrid.length ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem' }}>
                            <FileText size={64} style={{ color: '#cbd5e1', marginBottom: '1.5rem' }} />
                            <h3>Upload Word Conditions</h3>
                            <label className="btn btn-primary" style={{ cursor: 'pointer', marginTop: '1rem' }}>
                                <Upload size={18} /> Select WORD Timetable
                                <input type="file" accept=".docx" onChange={handleFileUpload} style={{ display: 'none' }} />
                            </label>
                        </div>
                    ) : (
                        <div className="excel-wrapper" style={{ height: '100%', width: '100%' }}>
                            <div className="excel-container" style={{ overflow: 'auto', width: '100%', height: '100%' }}>
                                <table className="excel-table">
                                    <thead>
                                        <tr>
                                            <th className="excel-row-header" style={{ width: '40px' }}></th>
                                            {wordGrid[0] && wordGrid[0].map((_, i) => <th key={i}>{String.fromCharCode(65 + i)}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {wordGrid.slice(0, 500).map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                <td className="excel-row-header">{rowIndex + 1}</td>
                                                {row.map((cell, colIndex) => {
                                                    if (!cell.isVisible) return null;
                                                    const hasConstraint = extractedConstraints.some(c => c.text === cell.text && cell.text.length > 2);
                                                    const isLabConstraint = hasConstraint && (cell.text.toUpperCase().includes('LAB') || cell.text.toUpperCase().includes('PRACTICAL'));
                                                    return (
                                                        <td key={colIndex} rowSpan={cell.rowSpan} colSpan={cell.colSpan} style={{ background: hasConstraint ? '#eff6ff' : 'white', position: 'relative' }}>
                                                            {isLabConstraint && <Lock size={12} style={{ position: 'absolute', top: 4, right: 4, color: '#2563eb', opacity: 0.7 }} />}
                                                            <input className="excel-input" value={cell.text || ''} onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                                                style={{ fontWeight: cell.colSpan > 1 ? '700' : '400', color: hasConstraint ? '#2563eb' : 'inherit' }} />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
                {extractedConstraints.length > 0 && (
                    <div className="card" style={{ padding: '1rem', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#1e293b' }}>
                            <Lock size={18} />
                            <h4 style={{ margin: 0 }}>Locked Constraints ({extractedConstraints.length})</h4>
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: 'calc(70vh - 100px)' }}>
                            {extractedConstraints.map((c, idx) => (
                                <div key={idx} style={{ padding: '8px', background: 'white', borderRadius: '6px', marginBottom: '6px', fontSize: '0.8rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#2563eb' }}>{c.code} (SEC {c.sec})</div>
                                        <div style={{ color: '#64748b' }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][c.d]} - P{c.s + 1}</div>
                                    </div>
                                    <CheckCircle size={14} color="#10b981" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default WordPreview;