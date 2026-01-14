const XLSX = require('xlsx');
const fs = require('fs');
const teachersData = [
    { Name: "Dr. Alice Smith", Department: "Computer Science", Workload: 12 },
    { Name: "Prof. Bob Jones", Department: "Electronics", Workload: 10 },
    { Name: "Ms. Carol White", Department: "Mathematics", Workload: 14 },
    { Name: "Dr. David Black", Department: "Physics", Workload: 8 }
];
const subjectsData = [
    { Code: "CS101", Name: "Introduction to Programming", Type: "Lecture", Credits: 3 },
    { Code: "CS102", Name: "Data Structures & Algorithms", Type: "Lecture", Credits: 3 },
    { Code: "CS101L", Name: "Programming Lab", Type: "Lab", Credits: 1 },
    { Code: "CS102L", Name: "Data Structures Lab", Type: "Lab", Credits: 1 },
    { Code: "MA101", Name: "Calculus I", Type: "Lecture", Credits: 4 },
    { Code: "PH101", Name: "Applied Physics", Type: "Lecture", Credits: 3 }
];
const wb = XLSX.utils.book_new();
const wsTeachers = XLSX.utils.json_to_sheet(teachersData);
const wsSubjects = XLSX.utils.json_to_sheet(subjectsData);
const wscols = [
    { wch: 20 },
    { wch: 20 },
    { wch: 10 }
];
wsTeachers['!cols'] = wscols;
const wscolsSub = [
    { wch: 10 },
    { wch: 30 },
    { wch: 10 },
    { wch: 8 }
];
wsSubjects['!cols'] = wscolsSub;
XLSX.utils.book_append_sheet(wb, wsTeachers, "Teachers");
XLSX.utils.book_append_sheet(wb, wsSubjects, "Subjects");
const filePath = 'sample_timetable_data.xlsx';
XLSX.writeFile(wb, filePath);
console.log(`Successfully created ${filePath}`);