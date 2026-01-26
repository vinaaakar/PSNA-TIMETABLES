import React, { createContext, useContext, useState, useEffect } from 'react';
const DataContext = createContext();
export const useData = () => useContext(DataContext);
export const DataProvider = ({ children }) => {
    const safeParse = (key, fallback) => {
        try {
            const item = localStorage.getItem(key);
            if (!item) return fallback;
            const parsed = JSON.parse(item);
            return parsed === null ? fallback : parsed;
        } catch (e) {
            console.error(`Error parsing ${key}`, e);
            return fallback;
        }
    };
    const [teachers, setTeachers] = useState(safeParse('timetable_teachers', []));
    const [subjects, setSubjects] = useState(safeParse('timetable_subjects', []));
    const [schedule, setSchedule] = useState(safeParse('timetable_schedule', {}));
    const [facultyAccounts, setFacultyAccounts] = useState(safeParse('timetable_faculty_accounts', []));
    const [preemptiveConstraints, setPreemptiveConstraints] = useState(safeParse('timetable_preemptive_constraints', {}));
    const [department, setDepartment] = useState(localStorage.getItem('timetable_department') || 'General');
    useEffect(() => {
        localStorage.setItem('timetable_department', department);
    }, [department]);
    useEffect(() => {
        localStorage.setItem('timetable_teachers', JSON.stringify(teachers));
    }, [teachers]);
    useEffect(() => {
        localStorage.setItem('timetable_subjects', JSON.stringify(subjects));
    }, [subjects]);
    useEffect(() => {
        localStorage.setItem('timetable_schedule', JSON.stringify(schedule));
    }, [schedule]);
    useEffect(() => {
        localStorage.setItem('timetable_faculty_accounts', JSON.stringify(facultyAccounts));
    }, [facultyAccounts]);
    useEffect(() => {
        localStorage.setItem('timetable_preemptive_constraints', JSON.stringify(preemptiveConstraints));
    }, [preemptiveConstraints]);
    const addTeachers = (newTeachers) => {
        setTeachers(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const uniqueNew = newTeachers.filter(t => !existingIds.has(t.id));
            return [...prev, ...uniqueNew];
        });
    };
    const deleteTeachers = (id) => setTeachers(prev => prev.filter(t => t.id !== id));
    const clearTeachers = () => setTeachers([]);
    const addSubjects = (newSubjects) => {
        setSubjects(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const uniqueNew = newSubjects.filter(s => !existingIds.has(s.id));
            return [...prev, ...uniqueNew];
        });
    };
    const deleteSubjects = (id) => setSubjects(prev => prev.filter(s => s.id !== id));
    const clearSubjects = () => setSubjects([]);
    const addFacultyAccounts = (newAccounts) => {
        setFacultyAccounts(prev => {
            const accountMap = new Map(prev.map(a => [a.email, a]));
            newAccounts.forEach(acc => accountMap.set(acc.email, acc));
            return Array.from(accountMap.values());
        });
    };
    const clearFacultyAccounts = () => setFacultyAccounts([]);
    const clearPreemptiveConstraints = () => setPreemptiveConstraints({});
    const updateSchedule = (semester, newSchedule) => {
        setSchedule(prev => ({
            ...prev,
            [semester]: newSchedule
        }));
    };
    const updateSubjects = (newSubjects) => setSubjects(newSubjects);
    return (
        <DataContext.Provider value={{
            teachers,
            subjects,
            schedule,
            facultyAccounts,
            preemptiveConstraints,
            addTeachers,
            deleteTeachers,
            clearTeachers,
            addSubjects,
            updateSubjects,
            deleteSubjects,
            clearSubjects,
            updateSchedule,
            addFacultyAccounts,
            clearFacultyAccounts,
            setPreemptiveConstraints,
            clearPreemptiveConstraints,
            setTeachers,
            setSubjects,
            setFacultyAccounts,
            department,
            setDepartment
        }}>
            {children}
        </DataContext.Provider>
    );
};