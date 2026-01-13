export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SLOTS = 7;
const isLab = (subject) => {
    if (subject.type === 'Lab') return true;
    const code = subject.code.toUpperCase();
    const name = subject.name.toUpperCase();
    return code.includes('LAB') || name.includes('LABORATORY') || name.includes('PRACTICAL');
};
const isElective = (subject) => {
    if (subject.type === 'Elective') return true;
    return /-\s*(I|II|III|IV)\s*\*?\s*$/i.test(subject.name) || subject.name.toUpperCase().includes('ELECTIVE');
};
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};
export const generateClassTimetable = (semester, section, subjects, reservedSlots = {}) => {
    let grid = Array(DAYS.length).fill(null).map(() => Array(SLOTS).fill(null));

    // 1. Separation
    // We strictly identify Labs vs Electives vs Regular Theory
    let labs = [];
    let electives = {};
    let theory = [];

    subjects.forEach(sub => {
        // Adjust credit logic: If explicit credit is 0, keep it 0.
        // If undefined/null, default to heuristic.
        let credit = sub.credit;
        if (credit === undefined || credit === null || credit === '') {
            credit = (sub.code.includes('L') ? 3 : 1);
        } else {
            credit = parseInt(credit);
            if (isNaN(credit)) credit = 1;
        }

        if (isLab(sub)) {
            // Handle multiple sessions
            const sessions = sub.sessions || 1;
            const duration = Math.floor(credit / sessions) || 3; // Default 3 if calc fails

            for (let i = 0; i < sessions; i++) {
                labs.push({ ...sub, credit: duration });
            }
        } else if (isElective(sub)) {
            // Group Key: Use the Roman Numeral part specifically to group them together.
            // Support all dash types: hyphen, en-dash, em-dash
            const romanMatch = sub.name.match(/ (I|II|III|IV)\s*\*?\s*$/i) || sub.name.match(/[-–—]\s*(I|II|III|IV)\s*\*?\s*$/i);

            let groupKey = 'Elective-General';
            if (romanMatch) {
                const romanNum = romanMatch[1].toUpperCase();
                const hasStar = sub.name.includes('*') ? '*' : '';
                groupKey = `Elective - ${romanNum}${hasStar}`;
            } else if (sub.name.toUpperCase().includes('ELECTIVE')) {
                groupKey = 'Elective-General';
            }

            if (!electives[groupKey]) electives[groupKey] = [];
            electives[groupKey].push(sub);
        } else {
            theory.push({ ...sub, credit: credit }); // Use the parsed credit
        }
    });

    // 2. Schedule Labs (The "Big Rocks" first)
    // Rule: Randomly or Sequentially pick a day, but prefer Afternoon (Slot 4,5,6) or Morning (0,1,2).
    // Labs cannot overlap.

    // Shuffle Labs relative to Section ID (char code) to ensure A, B, C start differently
    // Or just pure random shuffle
    labs.sort(() => Math.random() - 0.5);

    // Also offset the starting day based on section to maximize spread
    // A=0, B=1, ...
    let dayOffset = 0;
    if (section && section.length === 1) {
        dayOffset = section.charCodeAt(0) % 5;
    }

    let occupiedDays = new Set();
    let usedStartSlots = {}; // Track how many labs start at a given slot (0, 4, etc.) to balance Morning/Afternoon

    labs.forEach((lab, idx) => {
        const duration = lab.credit; // e.g., 3
        // Find a day with a free block of 'duration'
        let placed = false;

        // Check for Specific Slot Constraints
        let allowedStartSlots = [];

        // "if 3 period then 1st or 5th" -> Index 0 or 4
        // "if 4 period then start only at 4 period" -> Index 3 (since index 3 is 4th period 12:00-1:00?)
        // Let's interpret "Period X" as 1-based.
        // Period 1 = Index 0. Period 5 = Index 4.
        // Period 4 = Index 3. 

        if (duration === 3) {
            allowedStartSlots = [0, 4]; // Morning (1st) or Afternoon (5th)
        } else if (duration === 4) {
            allowedStartSlots = [3]; // Period 4
        } else if (duration === 2) {
            // Constraint: Should not start at Period 2 (Index 1) or Period 4 (Index 3)
            // Allowed: Period 1 (0), Period 3 (2), Period 5 (4), Period 6 (5)
            allowedStartSlots = [0, 2, 4, 5];
        } else {
            // Default: any slot that fits
            for (let k = 0; k <= 7 - duration; k++) allowedStartSlots.push(k);
        }

        // Sort allowedStartSlots by usage count ASC (Prefer unused start times)
        // This answers: "if a lab start at the 1 period then the other lab should not start that 1 period"
        allowedStartSlots.sort((a, b) => (usedStartSlots[a] || 0) - (usedStartSlots[b] || 0));

        // Pass 1: Strict Resource Check (Don't overlap with other sections)
        // CHANGE: Loop Slots FIRST, then Days. This ensures we prioritize the "Time of Day" variety check 
        // across the whole week, rather than taking the first valid slot on Monday.

        let days = [0, 1, 2, 3, 4];
        // Rotate days by offset just to keep section variance
        days = [...days.slice(dayOffset), ...days.slice(0, dayOffset)];

        for (let startSlot of allowedStartSlots) {
            for (let d of days) {
                if (occupiedDays.has(d)) continue;

                // Check Global Resource Constraint
                let resourceConflict = false;
                for (let k = 0; k < duration; k++) {
                    const key = `${d}-${startSlot + k}`;
                    if (reservedSlots[key] && reservedSlots[key].has(lab.code)) {
                        resourceConflict = true;
                        break;
                    }
                }
                if (resourceConflict) continue;

                if (isFree(grid[d], startSlot, duration)) {
                    placeBlock(grid[d], startSlot, duration, lab, 'LAB');
                    occupiedDays.add(d);
                    usedStartSlots[startSlot] = (usedStartSlots[startSlot] || 0) + 1;
                    placed = true;
                    break;
                }
            }
            if (placed) break;
        }

        // Pass 2: Fallback (Allow Resource Overlap if necessary)
        // User said: "let any one of the lab can be repeat the same format but at the different day"
        // Interpretation: If we can't find a unique slot, just find ANY valid slot where the lab is free in THIS grid.
        if (!placed) {
            for (let d of days) {
                if (occupiedDays.has(d)) continue;

                for (let startSlot of allowedStartSlots) {
                    if (isFree(grid[d], startSlot, duration)) {
                        // We do NOT check reservedSlots here. We allow collision.
                        placeBlock(grid[d], startSlot, duration, lab, 'LAB');
                        occupiedDays.add(d);
                        usedStartSlots[startSlot] = (usedStartSlots[startSlot] || 0) + 1;
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
        }
    });

    // 3. Process Elective Groups into Theory/Saturday Units
    const electiveGroups = Object.keys(electives);
    electiveGroups.forEach(groupName => {
        const subs = electives[groupName];
        // For electives, we take the hours (credit/satCount) from the first subject in the group
        // assuming all subjects in the same elective group share the same load.
        const firstSub = subs[0];
        const credit = firstSub.credit || 1;
        const satCount = parseInt(firstSub.satCount) || 0;

        const virtualSubject = {
            type: 'ELECTIVE_GROUP',
            code: 'ELE',
            name: groupName,
            credit: credit,
            satCount: satCount,
            alternatives: subs.map(x => ({ code: x.code, name: x.name, teacher: x.teacherName }))
        };

        // Add to the main distribution pools
        theory.push(virtualSubject);
    });

    // 4. Schedule Theory
    // Distribute evenly.
    // Flatten theories into a list of units (if credit > 1, add multiple times)
    let theoryUnits = []; // Regular Mon-Fri units
    let saturdayUnits = []; // Specific Saturday units

    theory.forEach(t => {
        // Use the credit directly as we already parsed it in step 1.
        // If it's 0, it should be 0.
        let totalHours = t.credit;
        let satHours = parseInt(t.satCount) || 0;

        // 1. Assign to Saturday
        for (let i = 0; i < satHours; i++) {
            saturdayUnits.push(t);
        }

        // 2. Remaining to Weekdays (Mon-Fri)
        // Change: Treat 'credit' as Weekday Hours purely, so Saturday is additional.
        // This solves the issue where subtracting satHours leaves holes in the week.
        let weekdayHours = totalHours;

        // If the user INTENDED Credit to be Total, this might overbook.
        // But since they complain of empty space, we assume Overbook is preferred/correct.
        if (weekdayHours < 0) weekdayHours = 0;

        for (let i = 0; i < weekdayHours; i++) theoryUnits.push(t);
    });

    // Shuffle Theory Units to ensure different placement order for different sections
    // This prevents "Same Subject Same Period" patterns across sections
    theoryUnits.sort(() => Math.random() - 0.5);
    saturdayUnits.sort(() => Math.random() - 0.5);

    // 5. Fill Saturday First (Constraint)
    // Saturday is day index 5.
    let satSlot = 0;
    saturdayUnits.forEach(unit => {
        if (satSlot < SLOTS) {
            if (unit.type === 'ELECTIVE_GROUP') {
                grid[5][satSlot] = { ...unit };
            } else {
                grid[5][satSlot] = {
                    type: 'REGULAR',
                    code: unit.code,
                    name: unit.name,
                    teacher: unit.teacherName
                };
            }
            satSlot++;
        }
    });
    const subjectsToPlace = {};
    theoryUnits.forEach(unit => {
        if (!subjectsToPlace[unit.code]) subjectsToPlace[unit.code] = [];
        subjectsToPlace[unit.code].push(unit);
    });

    // Step 2: Sort subjects by count DESC (Constrained subjects first)
    const sortedCodes = Object.keys(subjectsToPlace).sort((a, b) =>
        subjectsToPlace[b].length - subjectsToPlace[a].length
    );

    // Step 3: Helper to check code on a day (including potential alternatives)
    const hasSubjectOnDay = (d, identifier) => {
        for (let s = 0; s < SLOTS; s++) {
            const slot = grid[d][s];
            if (!slot) continue;

            // If it's a regular subject or lab
            if (slot.code === identifier) return true;

            // If it's an elective group, check if the group name matches (the identifier for electives is the group name)
            if (slot.type === 'ELECTIVE_GROUP' && slot.name === identifier) return true;
        }
        return false;
    };

    const allSlots = [0, 1, 2, 3, 4, 5, 6];

    sortedCodes.forEach(code => {
        const units = subjectsToPlace[code];
        const usedPeriods = new Set();

        units.forEach(unit => {
            let placed = false;

            // Strategy 1: Unique Day AND Unique Period (Spread vertically and horizontally)
            let shuffledSlots = [...allSlots].sort(() => Math.random() - 0.5);
            for (let s of shuffledSlots) {
                if (usedPeriods.has(s)) continue;

                let daysArr = [0, 1, 2, 3, 4];
                daysArr.sort(() => Math.random() - 0.5);

                for (let d of daysArr) {
                    if (!hasSubjectOnDay(d, unit.code === 'ELE' ? unit.name : unit.code)) {
                        if (grid[d][s] === null) {
                            if (unit.type === 'ELECTIVE_GROUP') {
                                grid[d][s] = { ...unit };
                            } else {
                                grid[d][s] = { type: 'REGULAR', code: unit.code, name: unit.name, teacher: unit.teacherName };
                            }
                            usedPeriods.add(s);
                            placed = true;
                            break;
                        }
                    }
                }
                if (placed) break;
            }

            // Strategy 2: Unique Day only (Vertical repetition allowed if variety pass fails)
            if (!placed) {
                for (let s = 0; s < SLOTS; s++) {
                    let daysArr = [0, 1, 2, 3, 4];
                    daysArr.sort(() => Math.random() - 0.5);

                    for (let d of daysArr) {
                        if (!hasSubjectOnDay(d, unit.code === 'ELE' ? unit.name : unit.code)) {
                            if (grid[d][s] === null) {
                                if (unit.type === 'ELECTIVE_GROUP') {
                                    grid[d][s] = { ...unit };
                                } else {
                                    grid[d][s] = { type: 'REGULAR', code: unit.code, name: unit.name, teacher: unit.teacherName };
                                }
                                placed = true;
                                break;
                            }
                        }
                    }
                    if (placed) break;
                }
            }

            // Strategy 3: Try to avoid same day, but allow if absolutely necessary to prevent blank spaces
            if (!placed) {
                let shuffledSlots = [...allSlots].sort(() => Math.random() - 0.5);
                let daysArr = [0, 1, 2, 3, 4];
                daysArr.sort(() => Math.random() - 0.5);

                // Pass A: Try to find a slot on a day where the subject IS NOT yet present
                for (let s of shuffledSlots) {
                    for (let d of daysArr) {
                        if (grid[d][s] === null && !hasSubjectOnDay(d, unit.code === 'ELE' ? unit.name : unit.code)) {
                            if (unit.type === 'ELECTIVE_GROUP') {
                                grid[d][s] = { ...unit };
                            } else {
                                grid[d][s] = { type: 'REGULAR', code: unit.code, name: unit.name, teacher: unit.teacherName };
                            }
                            placed = true;
                            break;
                        }
                    }
                    if (placed) break;
                }

                // Pass B: IF STILL NOT PLACED (Total Fallback), allow repetition on same day
                if (!placed) {
                    for (let s of shuffledSlots) {
                        for (let d of daysArr) {
                            if (grid[d][s] === null) {
                                if (unit.type === 'ELECTIVE_GROUP') {
                                    grid[d][s] = { ...unit };
                                } else {
                                    grid[d][s] = { type: 'REGULAR', code: unit.code, name: unit.name, teacher: unit.teacherName };
                                }
                                placed = true;
                                break;
                            }
                        }
                        if (placed) break;
                    }
                }
            }
        });
    });

    return grid;
};

function isFree(dayRow, startSlot, duration) {
    if (startSlot + duration > 7) return false;
    for (let i = 0; i < duration; i++) {
        if (dayRow[startSlot + i] !== null) return false;
    }
    return true;
}

function placeBlock(dayRow, startSlot, duration, subject, type) {
    for (let i = 0; i < duration; i++) {
        dayRow[startSlot + i] = {
            type: type, // 'LAB' or 'REGULAR'
            code: subject.code,
            name: subject.name,
            teacher: subject.teacherName
        };
    }
}
