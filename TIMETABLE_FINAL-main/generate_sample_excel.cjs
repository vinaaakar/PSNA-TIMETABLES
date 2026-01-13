const XLSX = require('xlsx');
const fs = require('fs');

// 1. Teachers Data
const teachersData = [
    { Name: "Dr. Alice Smith", Department: "Computer Science", Workload: 12 },
    { Name: "Prof. Bob Jones", Department: "Electronics", Workload: 10 },
    { Name: "Ms. Carol White", Department: "Mathematics", Workload: 14 },
    { Name: "Dr. David Black", Department: "Physics", Workload: 8 }
];

// 2. Subjects Data
const subjectsData = [
    { Code: "CS101", Name: "Introduction to Programming", Type: "Lecture", Credits: 3 },
    { Code: "CS102", Name: "Data Structures & Algorithms", Type: "Lecture", Credits: 3 },
    { Code: "CS101L", Name: "Programming Lab", Type: "Lab", Credits: 1 }, // Standard Lab
    { Code: "CS102L", Name: "Data Structures Lab", Type: "Lab", Credits: 1 }, // Potential Integrated Lab
    { Code: "MA101", Name: "Calculus I", Type: "Lecture", Credits: 4 },
    { Code: "PH101", Name: "Applied Physics", Type: "Lecture", Credits: 3 }
];

// Create Workbook
const wb = XLSX.utils.book_new();

// Create Worksheets
const wsTeachers = XLSX.utils.json_to_sheet(teachersData);
const wsSubjects = XLSX.utils.json_to_sheet(subjectsData);

// Set column widths for better readability (optional, but nice if user opens it)
const wscols = [
    { wch: 20 }, // Name
    { wch: 20 }, // Department
    { wch: 10 }  // Workload
];
wsTeachers['!cols'] = wscols;

const wscolsSub = [
    { wch: 10 }, // Code
    { wch: 30 }, // Name
    { wch: 10 }, // Type
    { wch: 8 }   // Credits
];
wsSubjects['!cols'] = wscolsSub;

// Append Sheets to Workbook
XLSX.utils.book_append_sheet(wb, wsTeachers, "Teachers");
XLSX.utils.book_append_sheet(wb, wsSubjects, "Subjects");

// Write File
const filePath = 'sample_timetable_data.xlsx';
XLSX.writeFile(wb, filePath);

console.log(`Successfully created ${filePath}`);
