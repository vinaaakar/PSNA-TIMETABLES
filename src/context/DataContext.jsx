import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    // Initialize state from localStorage if available, else empty arrays
    const [teachers, setTeachers] = useState(() => JSON.parse(localStorage.getItem('teachers')) || []);
    const [subjects, setSubjects] = useState(() => JSON.parse(localStorage.getItem('subjects')) || []);
    const [classes, setClasses] = useState(() => JSON.parse(localStorage.getItem('classes')) || []);
    const [rooms, setRooms] = useState(() => JSON.parse(localStorage.getItem('rooms')) || []);
    // Added schedule state to prevent crashes
    const [schedule, setSchedule] = useState(() => JSON.parse(localStorage.getItem('timetable_schedule')) || {});

    // Update localStorage whenever state changes
    useEffect(() => localStorage.setItem('teachers', JSON.stringify(teachers)), [teachers]);
    useEffect(() => localStorage.setItem('subjects', JSON.stringify(subjects)), [subjects]);
    useEffect(() => localStorage.setItem('classes', JSON.stringify(classes)), [classes]);
    useEffect(() => localStorage.setItem('rooms', JSON.stringify(rooms)), [rooms]);
    useEffect(() => localStorage.setItem('timetable_schedule', JSON.stringify(schedule)), [schedule]);

    // Helper functions
    const generateId = () => {
        return typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    const addTeacher = (teacher) => setTeachers(prev => [...prev, { ...teacher, id: generateId() }]);
    const addTeachers = (newTeachers) => setTeachers(prev => [...prev, ...newTeachers.map(t => ({ ...t, id: generateId() }))]);
    const updateTeacher = (updated) => setTeachers(prev => prev.map(t => t.id === updated.id ? updated : t));
    const updateTeachers = (updates) => setTeachers(prev => prev.map(t => {
        const match = updates.find(u => u.id === t.id);
        return match ? match : t;
    }));
    const deleteTeacher = (id) => setTeachers(prev => prev.filter(t => t.id !== id));
    const clearTeachers = () => setTeachers([]);

    const addSubject = (subject) => setSubjects(prev => [...prev, { ...subject, id: generateId() }]);
    const addSubjects = (newSubjects) => setSubjects(prev => [...prev, ...newSubjects.map(s => ({ ...s, id: generateId() }))]);
    const updateSubject = (updated) => setSubjects(prev => prev.map(s => s.id === updated.id ? updated : s));
    const deleteSubject = (id) => setSubjects(prev => prev.filter(s => s.id !== id));
    const clearSubjects = () => setSubjects([]);

    const addClass = (cls) => setClasses([...classes, { ...cls, id: generateId() }]);
    const updateClass = (updated) => setClasses(classes.map(c => c.id === updated.id ? updated : c));
    const deleteClass = (id) => setClasses(classes.filter(c => c.id !== id));

    const addRoom = (room) => setRooms([...rooms, { ...room, id: generateId() }]);
    const updateRoom = (updated) => setRooms(rooms.map(r => r.id === updated.id ? updated : r));
    const deleteRoom = (id) => setRooms(rooms.filter(r => r.id !== id));

    const value = {
        teachers, addTeacher, addTeachers, updateTeacher, updateTeachers, deleteTeacher, clearTeachers,
        subjects, addSubject, addSubjects, updateSubject, deleteSubject, clearSubjects,
        classes, addClass, updateClass, deleteClass,
        rooms, addRoom, updateRoom, deleteRoom,
        schedule, setSchedule
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
