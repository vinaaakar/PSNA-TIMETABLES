import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
const DataImporter = () => {
    const { addTeachers, addSubjects, clearTeachers, clearSubjects, addFacultyAccounts, clearFacultyAccounts } = useData();
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');
    const handleFileUpload = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            processFile(selected);
            e.target.value = '';
        }
    };
    const processFile = async (file) => {
        setStatus('processing');
        setMessage('Reading Excel file...');
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                parseAllocationMatrix(jsonData);
            } catch (err) {
                console.error(err);
                setStatus('error');
                setMessage('Failed to parse Excel file. Ensure valid format.');
            }
        };
        reader.readAsArrayBuffer(file);
    };
    const parseAllocationMatrix = (rows) => {
        let headerRowIndex = -1;
        const requiredHeaders = ['CODE', 'NAME'];
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const rowStr = rows[i].map(c => String(c).toUpperCase());
            if (requiredHeaders.every(h => rowStr.some(cell => cell.includes(h)))) {
                headerRowIndex = i;
                break;
            }
        }
        if (headerRowIndex === -1) {
            setStatus('error');
            setMessage('Could not find header row with CODE and NAME columns.');
            return;
        }
        const headers = rows[headerRowIndex].map(h => String(h).trim().toUpperCase());
        const codeIdx = headers.findIndex(h => h.includes('CODE'));
        const nameIdx = headers.findIndex(h => h.includes('NAME'));
        let creditIdx = headers.findIndex(h => h.includes('HOURS') || h.includes('PERIODS'));
        if (creditIdx === -1) {
            creditIdx = headers.findIndex(h => h.includes('ALLOTTED'));
        }
        const lIdx = headers.findIndex(h => h === 'L' || h.includes('LECTURE'));
        const tIdx = headers.findIndex(h => h === 'T' || h.includes('TUTORIAL'));
        const pIdx = headers.findIndex(h => h === 'P' || h.includes('PRACTICAL'));
        if (creditIdx === -1 && lIdx === -1) {
            creditIdx = headers.findIndex(h => h.includes('CREDIT'));
        }
        const satIdx = headers.findIndex(h => h.includes('SATURDAY') || h.includes('SAT'));
        const sessionIdx = headers.findIndex(h => h.includes('SESSION'));
        const semIdx = headers.findIndex(h => h.includes('SEM'));
        console.log('Detected Columns:', { codeIdx, nameIdx, creditIdx, satIdx, sessionIdx, semIdx });
        const sectionMap = {};
        headers.forEach((h, idx) => {
            const match = h.match(/^(?:SEC(?:TION)?[\s\-]*)?([A-H])$/);
            if (match) {
                sectionMap[match[1]] = idx;
            }
        });
        const newSubjects = [];
        const newTeachers = [];
        let currentType = 'Lecture';
        let electiveCreditCache = {};
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            const code = row[codeIdx] ? String(row[codeIdx]).trim() : '';
            const name = row[nameIdx] ? String(row[nameIdx]).trim() : '';

            // Mode Switching Logic (Header Rows)
            const rowString = row.join(' ').toUpperCase();

            // If row has no code, or code is generic/header-like, check for section headers
            const isHeaderRow = !code || ['TOTAL', 'SUB.COD', 'SEMESTER'].some(k => code.toUpperCase().includes(k));

            if (isHeaderRow) {
                if (rowString.includes('PRACTICAL') && !rowString.includes('THEORY OF')) {
                    currentType = 'Lab';
                } else if (rowString.includes('THEORY') && !name.toUpperCase().includes('THEORY OF')) {
                    currentType = 'Lecture';
                }
                continue;
            }

            if (!name) continue;
            const codeUp = code.toUpperCase();
            const nameUp = name.toUpperCase();

            if (
                codeUp === 'SUB.CODE' ||
                codeUp.includes('SUB.CODE') ||
                nameUp === 'SUBJECT NAME' ||
                nameUp.includes('SUBJECT NAME') ||
                codeUp.includes('SEMESTER') ||
                nameUp === 'THEORY' ||
                nameUp === 'PRACTICALS' ||
                codeUp === 'TOTAL' ||
                nameUp.includes('TOTAL')
            ) {
                continue;
            }
            let sem = 'Unknown';
            if (semIdx !== -1 && row[semIdx]) {
                sem = String(row[semIdx]).replace(/\s+/g, ' ').trim();
            }
            let credit = 0;
            const rawCredit = row[creditIdx];
            if (creditIdx !== -1 && rawCredit !== undefined && rawCredit !== null && String(rawCredit).trim() !== '') {
                credit = parseInt(String(rawCredit).trim());
                if (isNaN(credit)) credit = 0;
            } else if (lIdx !== -1) {
                const l = parseInt(row[lIdx]) || 0;
                const t = tIdx !== -1 ? (parseInt(row[tIdx]) || 0) : 0;
                const p = pIdx !== -1 ? (parseInt(row[pIdx]) || 0) : 0;
                if (p > 0 && (l + t) === 0) credit = p;
                else credit = l + t + p; // Sum all for safety
            } else if (creditIdx !== -1) {
                credit = parseInt(row[creditIdx]) || 0;
            }
            const satCount = satIdx !== -1 && row[satIdx] ? parseInt(row[satIdx]) || 0 : 0;
            const sessions = sessionIdx !== -1 && row[sessionIdx] ? parseInt(row[sessionIdx]) || 1 : 1;
            const romanMatch = name.match(/ (I|II|III|IV)\s*\*?\s*$/i) || name.match(/[-–—]\s*(I|II|III|IV)\s*\*?\s*$/i);
            const isElective = romanMatch !== null || name.toUpperCase().includes('ELECTIVE');
            let resolvedType = currentType;
            let finalCredit = credit;
            let finalSatCount = satCount;
            if (isElective) {
                resolvedType = 'Elective';
                const romanNum = romanMatch ? romanMatch[1].toUpperCase() : 'General';
                const hasStar = name.includes('*') ? '*' : '';
                const cacheKey = `${sem}-${romanNum}${hasStar}`;

                if (credit > 0 || satCount > 0) {
                    electiveCreditCache[cacheKey] = { credit, satCount };
                } else if (electiveCreditCache[cacheKey]) {
                    finalCredit = electiveCreditCache[cacheKey].credit;
                    finalSatCount = electiveCreditCache[cacheKey].satCount;
                }
            }

            // Subject Base
            const subjectBase = {
                id: uuidv4(),
                code,
                name,
                semester: sem,
                credit: finalCredit,
                satCount: finalSatCount,
                sessions,
                type: resolvedType
            };

            console.log(`Parsed Subject: ${subjectBase.code}, SatCount: ${subjectBase.satCount}, RawSat: ${satIdx !== -1 ? row[satIdx] : 'N/A'}`);

            newSubjects.push(subjectBase);

            // Process Allocation (Teachers) per section
            Object.keys(sectionMap).forEach(sec => {
                const colIdx = sectionMap[sec];
                const teacherName = row[colIdx];

                if (teacherName && typeof teacherName === 'string' && teacherName.trim() !== '' && teacherName.trim() !== '-') {
                    // We found a teacher allocation!
                    // Add to Teacher List (Assignment)
                    newTeachers.push({
                        id: uuidv4(),
                        name: teacherName.trim(),
                        subjectCode: code,
                        subjectName: name,
                        section: sec,
                        semester: sem,
                        dept: 'General' // Placeholder
                    });
                }
            });
        }

        // Clear existing data to prevent staleness/duplication on re-import
        clearSubjects();
        clearTeachers();

        addSubjects(newSubjects);
        addTeachers(newTeachers);

        // Generate Faculty Accounts
        const uniqueNames = [...new Set(newTeachers.map(t => t.name))];
        const accounts = uniqueNames.map(name => {
            // Strip out "Dr." or "Mr." or "Mrs." and spaces, then lowercase
            const cleanName = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '') // Remove prefix if present
                .toLowerCase().replace(/[^a-z0-9]/g, ''); // Keep only alphanumeric
            return {
                id: uuidv4(),
                name: name,
                email: `${cleanName}@psnacet.edu.in`,
                password: cleanName // Start with simple password same as username part
            };
        });
        clearFacultyAccounts();
        addFacultyAccounts(accounts);

        setStatus('success');

        const labCount = newSubjects.filter(s => s.type === 'Lab').length;
        const lecCount = newSubjects.filter(s => s.type === 'Lecture').length;
        const elecCount = newSubjects.filter(s => s.type === 'Elective').length;
        const satSubjectsCount = newSubjects.filter(s => s.satCount > 0).length;

        let msg = `Imported ${newSubjects.length} subjects (${lecCount} Lectures, ${labCount} Labs, ${elecCount} Electives) and ${newTeachers.length} allocations.`;

        if (satIdx === -1) {
            msg += " ⚠️ 'SATURDAY' column NOT found.";
        } else {
            msg += ` ✅ 'SATURDAY' column found (${satSubjectsCount} subjects have Sat hours).`;
        }

        setMessage(msg);
    };

    return (
        <div className="card" style={{ marginTop: '2rem', border: '1px dashed var(--border)', background: '#f8fafc' }}>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ marginBottom: '1rem' }}>
                    {status === 'success' ? <CheckCircle size={48} color="var(--secondary)" /> : <Upload size={48} color="var(--primary)" />}
                </div>
                <h3>Import TimeTable Data</h3>
                <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>Upload the Excel sheet containing subject allocations.</p>

                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="btn btn-primary">
                    Select Excel File
                </label>

                {message && (
                    <div style={{ marginTop: '1rem', color: status === 'error' ? 'var(--danger)' : 'var(--secondary)', fontWeight: '500' }}>
                        {status === 'processing' && '⏳ '}
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataImporter;
