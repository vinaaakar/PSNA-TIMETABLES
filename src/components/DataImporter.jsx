import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const DataImporter = () => {
    const { addTeachers, addSubjects, clearTeachers, clearSubjects } = useData();
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, processing, success, error
    const [message, setMessage] = useState('');

    const handleFileUpload = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            processFile(selected);
            e.target.value = ''; // Reset input to allow re-selecting same file
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

                // Process the first sheet
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
        // Logic: Scan for header row containing 'CODE', 'NAME', etc.
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

        // Priority: HOURS > ALLOTTED > CREDIT > (L+T+P)
        let creditIdx = headers.findIndex(h => h.includes('HOURS') || h.includes('PERIODS'));
        if (creditIdx === -1) {
            creditIdx = headers.findIndex(h => h.includes('ALLOTTED'));
        }

        // Check for L T P columns
        const lIdx = headers.findIndex(h => h === 'L' || h.includes('LECTURE'));
        const tIdx = headers.findIndex(h => h === 'T' || h.includes('TUTORIAL'));
        const pIdx = headers.findIndex(h => h === 'P' || h.includes('PRACTICAL'));

        if (creditIdx === -1 && lIdx === -1) {
            creditIdx = headers.findIndex(h => h.includes('CREDIT'));
        }

        const satIdx = headers.findIndex(h => h.includes('SATURDAY') || h.includes('SAT'));
        const sessionIdx = headers.findIndex(h => h.includes('SESSION'));
        const semIdx = headers.findIndex(h => h.includes('SEM'));

        console.log('Detected Columns:', { codeIdx, nameIdx, creditIdx, satIdx, sessionIdx, semIdx }); // Debug

        // Find Section Columns (A, B, C, D, E...)
        // We look for single letters or 'SEC A' in headers
        const sectionMap = {}; // { 'A': colIndex, 'B': colIndex }
        headers.forEach((h, idx) => {
            // Robust regex: Matches 'A', 'SEC A', 'SECTION A', 'E', 'SECTION E'
            const match = h.match(/^(?:SEC(?:TION)?[\s\-]*)?([A-H])$/);
            if (match) {
                sectionMap[match[1]] = idx;
            }
        });

        const newSubjects = [];
        const newTeachers = [];

        // Identify current department context if any (some sheets have merged dept headers above)
        // For simplicity, we skip that unless row-based.

        // Identify current department context if any
        let currentType = 'Lecture'; // Default to Lecture
        let electiveCreditCache = {}; // Cache to store hours for elective groups

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];

            // Check for Context Switch (Theory vs Practical)
            // Join row to check for keywords if they appear in any column (often merged)
            const rowString = row.join(' ').toUpperCase();
            if (rowString.includes('PRACTICAL')) {
                currentType = 'Lab';
                continue;
            }
            if (rowString.includes('THEORY')) {
                currentType = 'Lecture';
                continue;
            }

            const code = row[codeIdx] ? String(row[codeIdx]).trim() : '';
            const name = row[nameIdx] ? String(row[nameIdx]).trim() : '';

            if (!code || !name) continue; // Skip empty rows

            // Aggressive Filter for Header Rows / Metadata Rows
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

            // Extract Semester
            let sem = 'Unknown';
            if (semIdx !== -1 && row[semIdx]) sem = String(row[semIdx]).trim();

            let credit = 0;
            // Explicit check for undefined/empty because '0' is falsy
            const rawCredit = row[creditIdx];
            if (creditIdx !== -1 && rawCredit !== undefined && rawCredit !== null && String(rawCredit).trim() !== '') {
                credit = parseInt(String(rawCredit).trim());
                if (isNaN(credit)) credit = 0;
            } else if (lIdx !== -1) {
                // Calculate from L + T + P
                const l = parseInt(row[lIdx]) || 0;
                const t = tIdx !== -1 ? (parseInt(row[tIdx]) || 0) : 0;
                // Ideally P is separate, often handled by 'type', but for 'Total Hours' tracking we might include it or not.
                // Usually Timetable slots = L + T. Labs handled separately. 
                // BUT if this is a Lab row, P matters.
                const p = pIdx !== -1 ? (parseInt(row[pIdx]) || 0) : 0;

                // If it looks like a Lab (P > 0), use P. Else L + T.
                if (p > 0 && (l + t) === 0) credit = p;
                else credit = l + t + p; // Sum all for safety
            } else if (creditIdx !== -1) {
                credit = parseInt(row[creditIdx]) || 0;
            }

            const satCount = satIdx !== -1 && row[satIdx] ? parseInt(row[satIdx]) || 0 : 0;
            const sessions = sessionIdx !== -1 && row[sessionIdx] ? parseInt(row[sessionIdx]) || 1 : 1;

            // Unified Elective detection: Supports hyphen, en-dash, em-dash and spaces
            const romanMatch = name.match(/ (I|II|III|IV)\s*\*?\s*$/i) || name.match(/[-–—]\s*(I|II|III|IV)\s*\*?\s*$/i);
            const isElective = romanMatch !== null || name.toUpperCase().includes('ELECTIVE');

            let resolvedType = currentType;
            let finalCredit = credit;
            let finalSatCount = satCount;

            if (isElective) {
                resolvedType = 'Elective';
                // Group key based strictly on the Roman Numeral found (e.g. "III*")
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
        setStatus('success');

        const labCount = newSubjects.filter(s => s.type === 'Lab').length;
        const lecCount = newSubjects.filter(s => s.type === 'Lecture').length;
        const satSubjectsCount = newSubjects.filter(s => s.satCount > 0).length;

        let msg = `Imported ${newSubjects.length} subjects (${lecCount} Lectures, ${labCount} Labs) and ${newTeachers.length} allocations.`;

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
