import React, { createContext, useContext, useState, useEffect } from 'react';
const DataContext = createContext();
export const useData = () => useContext(DataContext);
export const DataProvider = ({ children }) => {
    const safeParse = (key, fallback) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch (e) {
            console.error(`Error parsing ${key}`, e);
            return fallback;
        }
    };
    const [teachers, setTeachers] = useState(safeParse('timetable_teachers', []));
    const [subjects, setSubjects] = useState(safeParse('timetable_subjects', []));
    const [schedule, setSchedule] = useState(safeParse('timetable_schedule', {}));
    useEffect(() => {
        localStorage.setItem('timetable_teachers', JSON.stringify(teachers));
    }, [teachers]);
    useEffect(() => {
        localStorage.setItem('timetable_subjects', JSON.stringify(subjects));
    }, [subjects]);
    useEffect(() => {
        localStorage.setItem('timetable_schedule', JSON.stringify(schedule));
    }, [schedule]);
    const addTeachers = (newTeachers) => {
        setTeachers(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const uniqueNew = newTeachers.filter(t => !existingIds.has(t.id));
            return [...prev, ...uniqueNew];
        });
    };
    const clearTeachers = () => setTeachers([]);
    const addSubjects = (newSubjects) => {
        setSubjects(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const uniqueNew = newSubjects.filter(s => !existingIds.has(s.id));
            return [...prev, ...uniqueNew];
        });
    };
    const clearSubjects = () => setSubjects([]);
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
            addTeachers,
            clearTeachers,
            addSubjects,
            clearSubjects,
            updateSchedule
        }}>
            {children}
        </DataContext.Provider>
    );
};