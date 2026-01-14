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
            const existingEmails = new Set(prev.map(a => a.email));
            const uniqueNew = newAccounts.filter(a => !existingEmails.has(a.email));
            return [...prev, ...uniqueNew];
        });
    };

    const clearFacultyAccounts = () => setFacultyAccounts([]);

    const updateSchedule = (semester, newSchedule) => {
        setSchedule(prev => ({
            ...prev,
            [semester]: newSchedule
        }));
    };

    return (
        <DataContext.Provider value={{
            teachers,
            subjects,
            schedule,
            facultyAccounts,
            addTeachers,
            deleteTeachers,
            clearTeachers,
            addSubjects,
            deleteSubjects,
            clearSubjects,
            updateSchedule,
            addFacultyAccounts,
            clearFacultyAccounts
        }}>
            {children}
        </DataContext.Provider>
    );
};