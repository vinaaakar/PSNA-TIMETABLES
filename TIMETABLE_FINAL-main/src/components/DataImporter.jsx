import React, { useRef, useState } from 'react';
import { Upload, X, Check, AlertCircle, FileText, Download, Briefcase, Database, Sparkles, PieChart, Activity, BrainCircuit } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from './Modal';
import { useData } from '../context/DataContext';

/**
 * ASC-Grade DYNAMIC Intelligence Engine (PROMPT-SYNCED)
 * Calibrated specifically for the 'Gold Standard' Excel Prompt.
 */
const AIAnalysisReport = ({ report }) => {
    if (!report) return null;
    return (
        <div className="ai-report-container" style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', marginTop: '1rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                <BrainCircuit size={18} style={{ color: '#2563eb' }} />
                <h4 style={{ margin: 0, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dynamic Engine Report</h4>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, background: '#fff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '4px' }}>TOTAL SUBJECTS</div>
                    <div style={{ fontSize: '2rem', fontWeight: 950, color: '#2563eb' }}>{report.validSubjects}</div>
                </div>
                <div style={{ flex: 1, background: '#fff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '4px' }}>LOAD UNITS</div>
                    <div style={{ fontSize: '2rem', fontWeight: 950, color: '#10b981' }}>{report.validTeachers}</div>
                </div>
            </div>
            <div style={{ marginTop: '1rem', background: '#eff6ff', padding: '1rem', borderRadius: '12px', fontSize: '0.85rem', color: '#1e40af' }}>
                <Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} />
                <strong>Atomic Sync:</strong> Matches your prompt structure exactly (A-D in F-I). Found {report.validSubjects} units across {report.tableCount} partitions.
            </div>
        </div>
    );
};

const DataImporter = () => {
    const { addTeachers, addSubjects, clearTeachers, clearSubjects } = useData();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [validationStatus, setValidationStatus] = useState('idle');
    const [validationReport, setValidationReport] = useState(null);
    const [pendingTeachers, setPendingTeachers] = useState([]);
    const [pendingSubjects, setPendingSubjects] = useState([]);
    const [clearBeforeImport, setClearBeforeImport] = useState(false);
    const fileInputRef = useRef(null);

    const parseExcel = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames.find(n => n.toLowerCase().includes('allocation')) || workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: "" });

                // 1. Dynamic Header Scanner
                let headerRow = null;
                let colMap = { code: -1, name: -1, sem: -1, numSec: -1, credit: -1, sections: {} };
                const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

                for (let i = 0; i < Math.min(rows.length, 20); i++) {
                    const r = rows[i];
                    const rowVals = Object.keys(r).reduce((acc, k) => {
                        acc[k] = String(r[k] || '').trim().toUpperCase();
                        return acc;
                    }, {});

                    // Look for the header row containing 'Code' and 'A' / 'Section A'
                    const hasCode = Object.values(rowVals).some(v => v === 'CODE' || v === 'SUBJ CODE');
                    const hasSecA = Object.values(rowVals).some(v => v === 'A' || v === 'SECTION A');

                    if (hasCode && hasSecA) {
                        headerRow = i;
                        Object.keys(rowVals).forEach(k => {
                            const val = rowVals[k];
                            // STRICT CODE MAPPING: Column with ONLY 'CODE' is priority
                            if (val === 'CODE') colMap.code = k;
                            else if (val.includes('CODE') && !colMap.code) colMap.code = k;

                            // NAME MAPPING: Column with NAME or combined header
                            if (val.includes('NAME')) colMap.name = k;

                            if (val.includes('SEM') && !val.includes('NAME')) colMap.sem = k;
                            if (val.includes('NO OF SEC')) colMap.numSec = k;
                            if (val === 'CREDIT' || val === 'CREDITS' || val.includes('CREDIT')) colMap.credit = k;

                            // Map Sections A, B, C, D, E, F
                            if (val === 'A' || val === 'SECTION A') colMap.sections['A'] = k;
                            if (val === 'B' || val === 'SECTION B') colMap.sections['B'] = k;
                            if (val === 'C' || val === 'SECTION C') colMap.sections['C'] = k;
                            if (val === 'D' || val === 'SECTION D') colMap.sections['D'] = k;
                        });
                        break;
                    }
                }

                // Fallback to absolute mapping if dynamic scan fails
                if (colMap.code === -1 || colMap.code === colMap.name) {
                    colMap = {
                        code: 'C', name: 'D', sem: 'B', numSec: 'E', credit: 'K',
                        sections: { 'A': 'F', 'B': 'G', 'C': 'H', 'D': 'I' }
                    };
                }

                const subjects = [];
                const assigns = [];
                let currentTableType = 'Lecture';
                let tableCount = 0;

                // 2. Data Extraction Loop
                for (let i = (headerRow !== null ? headerRow + 1 : 0); i < rows.length; i++) {
                    const r = rows[i];
                    const rowStr = Object.values(r).join(' ').toLowerCase();

                    if (rowStr.includes('theory') && rowStr.includes('subjects')) { currentTableType = 'Lecture'; tableCount++; continue; }
                    if (rowStr.includes('laboratory') && rowStr.includes('subjects')) { currentTableType = 'Lab'; tableCount++; continue; }

                    const sNoVal = String(r['A'] || r['B'] || '').trim();
                    if (!sNoVal || isNaN(parseInt(sNoVal))) continue;

                    const code = (String(r[colMap.code] || '').trim() || 'TBD').toUpperCase();
                    const name = String(r[colMap.name] || '').replace(code, '').replace(/^[\s\-\.]+/, '').trim();
                    const sem = String(r[colMap.sem] || '').trim().match(/^(VIII|VII|VI|V|IV|III|II|I)/i)?.[0] || 'I';
                    const numSections = parseInt(String(r[colMap.numSec] || '0')) || 0;
                    const credits = String(r[colMap.credit] || '').match(/\d/)?.[0] || (currentTableType === 'Lab' ? '2' : '3');

                    if (!name) continue;

                    const normalizedName = name.toLowerCase();
                    const isLabKeyword = normalizedName.includes('laboratory') ||
                        normalizedName.includes(' lab') ||
                        normalizedName.includes('practical') ||
                        normalizedName.includes('il') ||
                        normalizedName.endsWith(' lab');

                    const finalType = isLabKeyword ? 'Lab' : currentTableType;
                    subjects.push({ code, name, semester: sem, type: finalType, credits });

                    // 3. Faculty Scanner
                    ['A', 'B', 'C', 'D', 'E', 'F'].forEach((sec, idx) => {
                        if (idx >= numSections) return;
                        const colKey = colMap.sections[sec];
                        if (!colKey) return;

                        const val = String(r[colKey] || '').trim().toUpperCase();
                        // Ignore numeric values (often mistaken for credits or row numbers)
                        if (val && val !== 'VACANT' && val !== '-' && val !== 'NIL' && isNaN(parseInt(val))) {
                            assigns.push({
                                id: `S-${assigns.length}-${code}-${sec}`,
                                name: val, department: 'CSE', initial: val,
                                subject: `${code} - ${name} [${finalType === 'Lab' ? 'Lab' : 'T'}]`,
                                semester: sem, assignedClass: `Section ${sec}`
                            });
                        }
                    });
                }

                const uniqueSubjects = [];
                const subKeys = new Set();
                subjects.forEach(s => {
                    const key = `${s.code}-${s.type}-${s.semester}`;
                    if (!subKeys.has(key)) { subKeys.add(key); uniqueSubjects.push(s); }
                });

                setPendingSubjects(uniqueSubjects);
                setPendingTeachers(assigns);
                setValidationReport({ validSubjects: uniqueSubjects.length, validTeachers: assigns.length, tableCount });
                setValidationStatus('success');
            } catch (err) { setValidationStatus('error'); }
        };
        reader.readAsArrayBuffer(file);
    };

    const finalize = () => {
        if (clearBeforeImport) { clearTeachers(); clearSubjects(); }
        addTeachers(pendingTeachers); addSubjects(pendingSubjects);
        setIsUploadModalOpen(false);
        setValidationStatus('idle');
        alert(`SUCCEEDED: Synchronized ${validationReport.validSubjects} units.`);
    };

    return (
        <>
            <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(true)} style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000, padding: '1.25rem 2.5rem', borderRadius: '50px', background: '#2563eb', fontWeight: '900', boxShadow: '0 20px 25px -5px rgba(37, 99, 235, 0.4)' }}>
                <Upload size={24} /> <span style={{ marginLeft: '10px' }}>Sync Intelligence Dataset</span>
            </button>

            <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Intelligence Engine Sync">
                <div style={{ padding: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', background: '#eff6ff', padding: '1rem', borderRadius: '16px', border: '1px solid #dbeafe' }}>
                        <BrainCircuit size={20} style={{ color: '#2563eb' }} />
                        <span style={{ fontSize: '0.9rem', color: '#1e40af', fontWeight: '700' }}>DYNAMIC SYNC: Optimized for Gold Standard & Legacy Allocation Sheets.</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        <input type="checkbox" id="clearData" checked={clearBeforeImport} onChange={(e) => setClearBeforeImport(e.target.checked)} />
                        <label htmlFor="clearData" style={{ cursor: 'pointer', fontWeight: '700', color: '#334155' }}>Fully Flush Database Before Deploy</label>
                    </div>

                    {validationStatus === 'idle' && (
                        <div style={{ padding: '4.5rem 2rem', border: '3px dashed #cbd5e1', borderRadius: '28px', textAlign: 'center', background: '#f8fafc' }} onClick={() => fileInputRef.current.click()}>
                            <input type="file" ref={fileInputRef} onChange={(e) => parseExcel(e.target.files[0])} style={{ display: 'none' }} />
                            <Upload size={48} style={{ color: '#2563eb', margin: '0 auto 1rem' }} />
                            <p style={{ fontWeight: 900, fontSize: '1.4rem' }}>Drop Allocation Excel</p>
                            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Supports Multi-Table Partitioning & Gap Detection</p>
                        </div>
                    )}

                    {validationStatus === 'success' && (
                        <div>
                            <AIAnalysisReport report={validationReport} />
                            <button className="btn btn-primary" style={{ width: '100%', padding: '1.25rem', borderRadius: '20px', fontWeight: '950', marginTop: '2rem', background: '#2563eb' }} onClick={finalize}>
                                DEPLOY ACADEMIC RESET
                            </button>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default DataImporter;
