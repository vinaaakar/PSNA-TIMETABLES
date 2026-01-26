export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SLOTS = 7;
const isBlockSubject = (subject) => {
    if (!subject) return false;
    const type = String(subject.type || '').toUpperCase();
    const name = String(subject.name || '').toUpperCase();
    if (type.includes('THEORY') || type === 'LECTURE') return false;
    return (
        type.includes('LAB') ||
        type.includes('PRACTICAL') ||
        type.includes('INTEGRATED') ||
        name.includes('GRAPHICS') ||
        name.includes('LAB') ||
        name.includes('PRACTICAL') ||
        (type.includes('ELECTIVE') && (name.includes('LAB') || name.includes('PROJECT')))
    );
};
export const generateClassTimetable = (semester, section, rawSubjects, reservedSlots = {}, syncElectives = {}, relaxed = false, globalLabUsage = {}) => {
    const grid = Array(6).fill(null).map(() => Array(SLOTS).fill(null));
    const subjects = rawSubjects.map(s => ({ ...s }));
    const counts = subjects.map((s, idx) => {
        return { ...s, subIdx: idx, remWk: s.credit, remSat: s.satCount };
    });
    const isElective = (s) => (s.type && s.type.toUpperCase().includes('ELECTIVE')) || (s.name && s.name.toUpperCase().includes('ELECTIVE'));
    counts.forEach(sub => {
        let targets = (sub.fixedSlots && (Array.isArray(sub.fixedSlots) ? sub.fixedSlots : sub.fixedSlots[section] || sub.fixedSlots['_ALL'])) || [];
        targets.forEach(slot => {
            const d = slot.d, s = slot.s, duration = slot.duration || 1;
            for (let k = 0; k < duration; k++) {
                if (s + k < SLOTS && d < 6) {
                    grid[d][s + k] = { ...sub, isFixedFromWord: true, isStart: k === 0, duration };
                    if (d === 5) sub.remSat--; else sub.remWk--;
                }
            }
        });
    });
    counts.filter(isElective).forEach(sub => {
        if (syncElectives[sub.code] && Array.isArray(syncElectives[sub.code])) {
            syncElectives[sub.code].forEach(slot => {
                const { d, s } = slot;
                if (d < 6 && s < SLOTS && !grid[d][s]) {
                    grid[d][s] = { ...sub, duration: 1, isStart: true, isSync: true };
                    if (d === 5) sub.remSat--; else sub.remWk--;
                }
            });
        }
    });
    const sectionChar = String(section).replace(/[^A-Za-z]/g, '').toUpperCase();
    const sectionOffset = (sectionChar.charCodeAt(0) || 65) - 65;
    const preferredFreeDay = sectionOffset % 5;
    const dayOrder = [0, 1, 2, 3, 4].filter(d => d !== preferredFreeDay);
    dayOrder.push(preferredFreeDay);
    counts.filter(isBlockSubject).forEach(lab => {
        let attempt = 0;
        while (lab.remWk >= 2 && attempt < 10) {
            attempt++;
            let duration = (lab.remWk >= 4) ? 4 : (lab.remWk >= 3 ? 3 : 2);
            let found = false;
            for (const d of dayOrder) {
                if (grid[d].some(c => c && isBlockSubject(c))) continue;
                if (globalLabUsage[`${d}-${lab.code}`]) continue;
                let validStarts = (duration === 4) ? [1, 3] : (duration === 3 ? [1, 4] : [1, 2, 4]);
                validStarts.sort((a, b) => {
                    const countA = grid.filter(row => row[a] && row[a].isStart && (row[a].isLab || isBlockSubject(row[a]))).length;
                    const countB = grid.filter(row => row[b] && row[b].isStart && (row[b].isLab || isBlockSubject(row[b]))).length;
                    return countA - countB;
                });
                for (let s of validStarts) {
                    if (s + duration > SLOTS) continue;
                    const slotKey = `${d}-${s}`;
                    if (reservedSlots[slotKey] && reservedSlots[slotKey].has('LAB_START')) continue;
                    let free = true;
                    for (let k = 0; k < duration; k++) if (grid[d][s + k]) free = false;
                    if (free) {
                        for (let k = 0; k < duration; k++) {
                            const labelSuffix = lab.type.includes('INTEGRATED') ? ' (Int.)' : ' (Lab)';
                            grid[d][s + k] = { ...lab, isStart: k === 0, duration, isLab: true, displayCode: lab.code + (k === 0 ? labelSuffix : '') };
                        }
                        lab.remWk -= duration;
                        found = true; break;
                    }
                }
                if (found) break;
            }
            if (!found) {
                for (const d of dayOrder) {
                    if (grid[d].some(c => c && isBlockSubject(c))) continue;
                    if (globalLabUsage[`${d}-${lab.code}`]) continue;
                    let validStarts = (duration === 4) ? [1, 3] : (duration === 3 ? [1, 4] : [1, 2, 4]);
                    validStarts.sort((a, b) => {
                        const countA = grid.filter(row => row[a] && row[a].isStart && (row[a].isLab || isBlockSubject(row[a]))).length;
                        const countB = grid.filter(row => row[b] && row[b].isStart && (row[b].isLab || isBlockSubject(row[b]))).length;
                        return countA - countB;
                    });
                    for (let s of validStarts) {
                        if (s + duration > SLOTS) continue;
                        let free = true;
                        for (let k = 0; k < duration; k++) if (grid[d][s + k]) free = false;
                        if (free) {
                            for (let k = 0; k < duration; k++) {
                                const labelSuffix = lab.type.includes('INTEGRATED') ? ' (Int.)' : ' (Lab)';
                                grid[d][s + k] = { ...lab, isStart: k === 0, duration, isLab: true, displayCode: lab.code + (k === 0 ? labelSuffix : '') };
                            }
                            lab.remWk -= duration;
                            found = true; break;
                        }
                    }
                    if (found) break;
                }
            }
            if (!found) break;
        }
        if (lab.remSat >= 2 && !grid[5].some(c => c && isBlockSubject(c))) {
            const d = 5;
            let duration = (lab.remSat >= 4) ? 4 : (lab.remSat >= 3 ? 3 : 2);
            let validStarts = (duration === 4) ? [1, 3] : (duration === 3 ? [1, 4] : [1, 2, 4]);
            let foundSat = false;
            for (let s of validStarts) {
                if (s + duration > SLOTS) continue;
                if (reservedSlots[`5-${s}`] && reservedSlots[`5-${s}`].has('LAB_START')) continue;
                let free = true;
                for (let k = 0; k < duration; k++) if (grid[d][s + k]) free = false;
                if (free) {
                    for (let k = 0; k < duration; k++) grid[d][s + k] = { ...lab, isStart: k === 0, duration, isLab: true };
                    lab.remSat -= duration;
                    foundSat = true; break;
                }
            }
            if (!foundSat) {
                for (let s of validStarts) {
                    if (s + duration > SLOTS) continue;
                    let free = true;
                    for (let k = 0; k < duration; k++) if (grid[d][s + k]) free = false;
                    if (free) {
                        for (let k = 0; k < duration; k++) grid[d][s + k] = { ...lab, isStart: k === 0, duration, isLab: true };
                        lab.remSat -= duration;
                        break;
                    }
                }
            }
        }
    });
    const theoryPoolWk = [];
    const theoryPoolSat = [];
    counts.forEach(sub => {
        for (let i = 0; i < Math.max(0, sub.remWk); i++) theoryPoolWk.push({ ...sub });
        for (let i = 0; i < Math.max(0, sub.remSat); i++) theoryPoolSat.push({ ...sub });
    });
    theoryPoolWk.sort(() => Math.random() - 0.5);
    for (let d = 0; d < 6; d++) {
        const pool = (d === 5) ? theoryPoolSat : theoryPoolWk;
        for (let s = 0; s < SLOTS; s++) {
            if (!grid[d][s] && pool.length > 0) {
                const getSlotConflicts = (subject) => {
                    return grid.filter((row, rIdx) => rIdx !== d && row[s] && row[s].code === subject.code).length;
                };
                let candidates = pool.filter(t => !grid[d].some(c => c && c.code === t.code));
                if (candidates.length === 0) candidates = pool;
                let bestSubject = null;
                let minConflicts = Infinity;
                for (const sub of candidates) {
                    const conflicts = getSlotConflicts(sub);
                    if (conflicts === 0) {
                        bestSubject = sub;
                        break;
                    }
                    if (conflicts < minConflicts) {
                        minConflicts = conflicts;
                        bestSubject = sub;
                    }
                }
                if (!bestSubject && candidates.length > 0) bestSubject = candidates[0];
                if (bestSubject) {
                    const idx = pool.indexOf(bestSubject);
                    if (idx > -1) {
                        grid[d][s] = { ...pool.splice(idx, 1)[0], duration: 1, isStart: true };
                        if (isElective(bestSubject)) {
                            if (!syncElectives[bestSubject.code]) syncElectives[bestSubject.code] = [];
                            const alreadySynced = syncElectives[bestSubject.code].some(slot => slot.d === d && slot.s === s);
                            if (!alreadySynced) syncElectives[bestSubject.code].push({ d, s });
                        }
                    }
                }
            }
        }
    }
    for (let d = 0; d < 6; d++) {
        for (let s = 0; s < SLOTS; s++) {
            if (grid[d][s] === null) {
                for (let j = s + 1; j < SLOTS; j++) {
                    if (grid[d][j] && (!grid[d][j].duration || grid[d][j].duration === 1)) {
                        grid[d][s] = grid[d][j];
                        grid[d][j] = null;
                        break;
                    }
                    if (grid[d][j] && grid[d][j].duration > 1) break;
                }
            }
        }
    }
    return grid;
};