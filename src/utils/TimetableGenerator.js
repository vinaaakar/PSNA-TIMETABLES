export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SLOTS = 7;
const isLab = (subject) => {
    if (subject.type === 'Lab' || subject.type === 'Practical') return true;
    const name = String(subject.name).toUpperCase();
    const code = String(subject.code).toUpperCase();
    return name.includes('LAB') || name.includes('PRACTICAL') || code.includes('LAB');
};
const isElective = (subject) => {
    if (subject.type === 'Elective') return true;
    const name = String(subject.name);
    // Strict Rule: Must have Hyphen or Dash before Roman Numeral
    // e.g. "Professional Elective - I" (Valid)
    // e.g. "Mathematics II" (Invalid)
    return /[-–—]\s*(I|II|III|IV)\s*\*?\s*$/i.test(name) || name.toUpperCase().includes('ELECTIVE');
};
/**
 * BASIC TIMETABLE GENERATOR
 * Constraints:
 * 1. Weekday hours -> Mon-Fri (Days 0-4)
 * 2. Saturday hours -> Saturday (Day 5)
 * 3. Teacher Conflicts -> Respect `reservedSlots`
 * 4. No Overlapping -> One class per slot
 */
export const generateClassTimetable = (semester, section, subjects, reservedSlots = {}, syncElectives = {}, relaxed = false, maxIterations = 500000, reservedLabDays = {}, globalLabLoad = [0, 0, 0, 0, 0, 0]) => {
    const grid = Array(6).fill(null).map(() => Array(SLOTS).fill(null));
    const labs = [];
    const theoryQueue = [];
    const electiveGroups = {};
    subjects.forEach(sub => {
        if (isLab(sub)) {
            const hrs = parseInt(sub.credit) || 0;
            const sess = parseInt(sub.sessions) || 1;
            const length = Math.ceil(hrs / sess);
            const satCount = parseInt(sub.satCount) || 0;
            const isSatLab = satCount > 0;
            for (let i = 0; i < sess; i++) {
                labs.push({
                    ...sub,
                    type: 'LAB',
                    duration: length,
                    allowedDays: isSatLab ? [5] : [0, 1, 2, 3, 4]
                });
            }
        } else if (isElective(sub)) {
            // Extract Group Key strictly looking for Roman Numeral at end
            const romanMatch = sub.name.match(/[-–—]\s*(I|II|III|IV)\s*(\*)?\s*$/i);
            const romanNum = romanMatch ? romanMatch[1].toUpperCase() : 'GEN';
            const hasStar = (romanMatch && romanMatch[2]) ? '*' : '';
            const groupKey = `${romanNum}${hasStar}`;

            if (!electiveGroups[groupKey]) electiveGroups[groupKey] = [];
            electiveGroups[groupKey].push(sub);
        } else {
            let wkHrs = parseInt(sub.credit) || 0;
            const satHrs = parseInt(sub.satCount) || 0;
            if (wkHrs === 0 && satHrs > 0) wkHrs = 0;
            else if (wkHrs === 0) wkHrs = 3;
            for (let i = 0; i < wkHrs; i++) {
                theoryQueue.push({
                    ...sub,
                    type: 'REGULAR',
                    allowedDays: [0, 1, 2, 3, 4]
                });
            }
            for (let i = 0; i < satHrs; i++) {
                theoryQueue.push({
                    ...sub,
                    type: 'REGULAR',
                    allowedDays: [5]
                });
            }
        }
    });
    Object.keys(electiveGroups).forEach(gk => {
        const members = electiveGroups[gk];
        const maxCr = Math.max(...members.map(m => parseInt(m.credit) || 3));
        const maxSat = Math.max(...members.map(m => parseInt(m.satCount) || 0));

        const virtual = {
            code: members.map(m => m.code).join(' / '),
            groupKey: gk,
            name: `Elective ${gk}`,
            isElectiveGroup: true,
            alternatives: members,
            teacherNames: members.map(m => m.teacherName).filter(Boolean),
            type: 'ELECTIVE_GROUP'
        };
        for (let i = 0; i < maxCr; i++) {
            theoryQueue.push({ ...virtual, allowedDays: [0, 1, 2, 3, 4] });
        }
        for (let i = 0; i < maxSat; i++) {
            theoryQueue.push({ ...virtual, allowedDays: [5] });
        }
    });
    labs.sort((a, b) => b.duration - a.duration);
    const counts = {};
    theoryQueue.forEach(u => counts[u.code] = (counts[u.code] || 0) + 1);
    theoryQueue.sort((a, b) => counts[b.code] - counts[a.code]);
    let iterations = 0;

    const solve = (labIdx, theoryIdx) => {
        iterations++;
        if (iterations > maxIterations) return false;
        if (labIdx === labs.length && theoryIdx === theoryQueue.length) return true;
        if (labIdx < labs.length) {
            const lab = labs[labIdx];
            const days = lab.allowedDays;
            let validMoves = [];

            for (let d of days) {
                for (let s = 0; s <= SLOTS - lab.duration; s++) {
                    // Constraint: Lab shouldn't start at P1 (Time 08:45, Index 0) unless relaxed
                    if (!relaxed && s === 0) continue;

                    if (lab.duration === 4) {
                        if (s !== 3) continue;
                    } else if (lab.duration === 3) {
                        if (s === 2 || s === 3) continue;
                    } else if (lab.duration === 2) {
                        if (s === 1 || s === 3) continue;
                    }
                    let fits = true;
                    for (let k = 0; k < lab.duration; k++) {
                        if (grid[d][s + k] !== null) { fits = false; break; }
                        const key = `${d}-${s + k}`;
                        if (reservedSlots[key]) {
                            if (reservedSlots[key].has(lab.teacherName)) { fits = false; break; }
                            if (reservedSlots[key].has(`LAB_${lab.code}`)) { fits = false; break; }
                        }
                    }
                    if (!fits) continue;
                    let score = 0;
                    // Preference: Global Load Balancing (Evenly spread labs across week)
                    // If globalLabLoad[d] is high, score is lower.
                    score += ((10 - (globalLabLoad[d] || 0)) * 100);

                    // Random Noise to vary results on re-generation
                    score += Math.random() * 50;

                    // Preference: Empty Days (Max 1 Lab per Day)
                    // In relaxed mode, we reduce the bonus for empty days to allow stacking more easily. 
                    // If relaxed, bonus is 0 (we don't care if there's already a lab).
                    const dayHasLab = grid[d].some(cell => cell && cell.type === 'LAB');
                    if (!dayHasLab) score += relaxed ? 0 : 10000;
                    let startSlotUsed = false;
                    for (let checkD = 0; checkD < 6; checkD++) {
                        const cell = grid[checkD][s];
                        const prev = s > 0 ? grid[checkD][s - 1] : null;
                        if (cell && cell.type === 'LAB' && (!prev || prev.code !== cell.code)) {
                            startSlotUsed = true; break;
                        }
                    }
                    if (!startSlotUsed) score += 500;
                    validMoves.push({ d, s, score });
                }
            }
            validMoves.sort((a, b) => b.score - a.score);
            for (const move of validMoves) {
                const { d, s } = move;
                for (let k = 0; k < lab.duration; k++) grid[d][s + k] = { ...lab };
                if (solve(labIdx + 1, theoryIdx)) return true;
                for (let k = 0; k < lab.duration; k++) grid[d][s + k] = null;
            }
            return false;
        }
        const unit = theoryQueue[theoryIdx];
        const days = unit.allowedDays;
        const validMoves = [];
        for (let d of days) {
            // Check existing placements of this subject on this day
            let existingSlots = [];
            for (let checkS = 0; checkS < SLOTS; checkS++) {
                if (grid[d][checkS] && grid[d][checkS].code === unit.code) {
                    existingSlots.push(checkS);
                }
            }

            for (let s = 0; s < SLOTS; s++) {
                if (grid[d][s] !== null) continue;
                const key = `${d}-${s}`;
                if (reservedSlots[key]) {
                    if (unit.isElectiveGroup) {
                        if (unit.teacherNames.some(t => reservedSlots[key].has(t))) continue;
                    } else if (unit.teacherName && reservedSlots[key].has(unit.teacherName)) {
                        continue;
                    }
                }

                // calculate score
                let score = Math.random() * 50; // Random noise

                if (existingSlots.length > 0) {
                    // Subject already exists on this day
                    const isMorning = s < 4; // Indices 0,1,2,3
                    const isAfternoon = s >= 4; // Indices 4,5,6

                    const hasMorning = existingSlots.some(idx => idx < 4);
                    const hasAfternoon = existingSlots.some(idx => idx >= 4);

                    // CONSTRAINT: Max 2 hours of theory per day per subject
                    if (existingSlots.length >= 2) {
                        score -= 50000; // Strong avoid 3+ hours
                    }

                    if ((isMorning && hasMorning) || (isAfternoon && hasAfternoon)) {
                        // Same Half Collision (e.g. Two Morning slots) -> Strongly Avoid
                        score -= 20000;
                    } else {
                        // Split Session (Morning + Afternoon) -> Allowed as Fallback
                        // Still prefer different days, but this is better than failing.
                        score -= 5000; // Increased penalty for split sessions to encourage unique days
                    }
                } else {
                    // Unique Day -> Preferred
                    score += 5000;
                }

                // CONSTRAINT: Avoid Theory on the same day as Lab for the same subject
                const hasLabOnDay = grid[d].some(cell => cell && cell.code === unit.code && cell.type === 'LAB');
                if (hasLabOnDay) {
                    score -= relaxed ? 1000 : 40000; // In relaxed mode, allow theory on lab day slightly more
                }

                // Preference: Stagger Slots (Don't have MATH at 9am every day)
                // Check if this subject is at slot 's' on ANY other day
                const slotUsedOnOtherDays = grid.some(dayRow => dayRow[s] && dayRow[s].code === unit.code);
                if (slotUsedOnOtherDays) {
                    score -= 2000;
                }

                validMoves.push({ d, s, score });
            }
        }

        // Sort: High score first
        validMoves.sort((a, b) => b.score - a.score);

        for (const move of validMoves) {
            const { d, s } = move;
            grid[d][s] = { ...unit };
            if (solve(labIdx, theoryIdx + 1)) return true;
            grid[d][s] = null;
        }
        return false;
    };
    if (solve(0, 0)) {
        return grid;
    } else {
        return null;
    }
};