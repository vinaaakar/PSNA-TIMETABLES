const XLSX = require('xlsx');

// Data based on the user's provided structure
const data = [
    // Header Row
    ["SEMESTER", "SUB.COD", "SUBJECT NAME", "A", "B", "C", "D", "E", "No of Section", "Sub Hand Dept", "Tutorial", "No.of Hours allotted", "SATURDAY"],

    // Semester II - Theory
    ["II CSE", "HS2221", "Communicative English", "HAJIRA B", "M.KSUBA", "HAJIRA B", "M.KSUBA", "VIJAY", 5, "ENG", "NO", 2, 0],
    ["II CSE", "MA2224", "Probability, Statistics and Linear Algebra", "M1", "M2", "M3", "M4", "M5", 5, "MAT", "YES", 3, 1],
    ["II CSE", "PH2221", "Quantum Physics", "P1", "P2", "P3", "P4", "P5", 5, "PHY", "NO", 3, 1],
    ["II CSE", "CS2221", "Programming in C", "AJ", "LED", "NI", "TD", "MK", 5, "CSE", "NO", 3, 1],

    // Semester II - Practicals
    ["II CSE", "GE2281", "Engineering Practice Laboratory", "EP1", "EP2", "EP3", "EP4", "EP5", 5, "MECH/ECE", 0, 4, 0],
    ["II CSE", "CS2281", "Programming in C Laboratory", "AJ", "LED", "NI", "TD", "MK", 5, "CSE", 0, 3, 0],

    // Semester VI - Theory & Electives
    ["VI CSE", "CS2611", "Cryptography and cyber security (Integrated)", "MST", "GM", "VP", "ND", "", 4, "CSE", "NO", 4, 0],
    ["VI CSE", "CS2612", "Internet of Things (Integrated)", "ATP", "SSB", "CS", "MJ", "", 4, "CSE", "NO", 3, 1],
    ["VI CSE", "EC2014", "Software Defined Networks -Open Elective - I*", "SD1", "", "SD2", "", "", 2, "ECE", "NO", 3, 1],
    ["VI CSE", "ME2011", "Renewable Energy Technologies -Open Elective - I*", "RET1", "", "RET2", "", "", 2, "MECH", "NO", 3, 1],
    ["VI CSE", "CS2V62", "Image Processing - Professional Elective - III", "DMDP", "VNK", "", "", "", 2, "CSE", "NO", 4, 1],

    // Semester VI - Practicals (Explicitly using H-index column 7 for hours if needed by logic)
    ["VI CSE", "CS2611", "Cryptography and cyber security (Integrated Lab)", "MST", "GM", "VP", "ND", "", 4, "CSE", "NO", 2, 0],
    ["VI CSE", "CS2612", "Internet of Things (Integrated Lab)", "ATP", "SSB", "CS", "MJ", "", 4, "CSE", "NO", 2, 0],
    ["VI CSE", "CS2698", "MiniProject", "SAA", "RAS", "RSK", "RSA", "", 4, "CSE", "NO", 3, 0]
];

// Create Workbook
const wb = XLSX.utils.book_new();

// Create Worksheet
const ws = XLSX.utils.aoa_to_sheet(data);

// Set column widths
ws['!cols'] = [
    { wch: 10 }, // Semester
    { wch: 10 }, // Code
    { wch: 40 }, // Name
    { wch: 10 }, // A
    { wch: 10 }, // B
    { wch: 10 }, // C
    { wch: 10 }, // D
    { wch: 10 }, // E
    { wch: 12 }, // Num Sec
    { wch: 10 }, // Dept
    { wch: 8 },  // Tutorial
    { wch: 15 }, // Hours
    { wch: 10 }  // Saturday
];

XLSX.utils.book_append_sheet(wb, ws, "Allocations");

// Write File
const filePath = 'sample_timetable_data.xlsx';
XLSX.writeFile(wb, filePath);

console.log(`Successfully created ${filePath}`);
