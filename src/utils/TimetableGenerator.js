/**
 * Timetable Generation Logic
 * Validates constraints and generates a schedule for a single class.
 */

export const generateClassTimetable = (
    classId,       // e.g., "Year 1 - Section A"
    assignments,   // List of { subject, teacher, periodsPerWeek, type }
    masterSchedule // Current global schedule object to check for clashes
) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const times = [
        '08:45 - 09:40', '09:40 - 10:35', '10:55 - 11:45',
        '11:45 - 12:35', '13:45 - 14:35', '14:35 - 15:25', '15:25 - 16:15'
    ];

    // 0. Safety: If no assignments, return empty immediately
    if (!assignments || assignments.length === 0) return { schedule: {}, errors: ["No assignments provided."] };

    const newClassSchedule = {};
    const log = []; // For debug output

    // 1. Expand Requirements into a Pool of Slots
    let slotPool = [];
    const theoryCodes = new Set(
        assignments.filter(a => a.type !== 'Lab').map(a => a.subject.code.toUpperCase())
    );
    const addedLabs = new Set();

    assignments.forEach(assign => {
        const isLab = assign.type === 'Lab';
        const subCode = (assign.subject.code || '').toUpperCase();
        const subName = (assign.subject.name || '').toLowerCase().replace(/\s+/g, '');

        if (isLab) {
            // CONSTRAINT: One subject should have one lab for a week.
            // We use subject name for more robust de-duplication.
            if (addedLabs.has(subName)) return;
            addedLabs.add(subName);

            // Integrated Lab: Matching code OR "IL" in name/code = 2 periods; Regular Lab = 3 periods
            const isIL = subCode.includes('IL') || subName.includes('il');
            const isCodeMatch = Array.from(theoryCodes).some(tc => tc === subCode);
            const isIntegrated = isIL || isCodeMatch;
            const duration = isIntegrated ? 2 : 3;

            slotPool.push({
                ...assign,
                poolId: `${subCode}-0`,
                isLab: true,
                duration: duration,
                isIntegrated
            });
        } else {
            // Theory assignments - expand into multiple single periods
            const rawCredits = String(assign.subject.credits || '0');
            const credits = isNaN(parseInt(rawCredits)) ? 0 : parseInt(rawCredits);
            const sessionCount = Math.min(5, (credits > 0 ? (credits + 1) : 3));

            for (let i = 0; i < sessionCount; i++) {
                const isZeroCredit = credits === 0;
                // NEW RULE: 0 credit subject should have 1 period on Saturday
                const shouldForceSaturday = isZeroCredit && i === 0;

                slotPool.push({
                    ...assign,
                    poolId: `${assign.subject.code}-${i}`,
                    isLab: false,
                    duration: 1,
                    forceDay: shouldForceSaturday ? 'Saturday' : undefined,
                    isZeroCredit: isZeroCredit
                });
            }
        }
    });

    // Special Requirement: Mandatory 1 period of an "Editable Subject" on Saturday
    slotPool.push({
        subject: { code: 'EDITABLE', name: 'Editable Subject' },
        teacher: { id: 'special', name: 'Staff' },
        isLab: false,
        duration: 1,
        forceDay: 'Saturday'
    });

    // 2. Sort Pool: Labs (Hardest to fit) FIRST, then Forced Slots, then others
    slotPool.sort((a, b) => {
        // High Priority: Labs (3 periods) must be placed while the schedule is empty
        if (a.isLab && !b.isLab) return -1;
        if (!a.isLab && b.isLab) return 1;

        // Next: Forced days (Saturday specials)
        if (a.forceDay && !b.forceDay) return -1;
        if (!a.forceDay && b.forceDay) return 1;

        return b.duration - a.duration;
    });

    // Helper: Check Teacher Availability
    const isTeacherFree = (teacherId, day, time) => {
        if (!teacherId || teacherId === 'simulate') return true;

        // Exact match for Day and Time suffix to prevent staff clashes
        const targetSuffix = `-${day}-${time}`;

        return !Object.entries(masterSchedule).some(([key, entry]) => {
            return key.endsWith(targetSuffix) && entry.teacherId === teacherId;
        });
    };

    // Helper: Check Class Availability
    const isSlotFree = (day, timeIdx, duration) => {
        for (let k = 0; k < duration; k++) {
            if (timeIdx + k >= times.length) return false; // Out of bounds
            const timeKey = times[timeIdx + k];
            const key = `Sem${classId.split(' ')[1]}-S${classId.split(' ').pop().replace('Section ', '')}-${day}-${timeKey}`;
            // Actually, we are building `newClassSchedule` locally first.
            if (newClassSchedule[`${day}-${timeKey}`]) return false;
        }
        return true;
    };

    // 3. Allocation Loop
    // Tracking usage to spread subjects evenly
    const subjectDayUsage = {}; // subjectCode -> day -> count
    const subjectSessionUsage = {}; // subjectCode -> day -> { FN: bool, AN: bool }
    const subjectTimeFreq = {}; // subjectCode -> timeIdx -> count (to prevent same pattern)

    // Tracking Global Lab constraints
    const totalLabsOnDay = {}; // day -> count
    const labStartTimes = {}; // tIdx -> count
    const usedStartTimes = {}; // tIdx -> boolean (to prevent same flow)

    // Create a matrix of Day x Time
    const matrix = {};
    days.forEach(d => {
        times.forEach(t => { matrix[`${d}-${t}`] = null; });
    });

    // Attempt to place slots
    for (const slot of slotPool) {
        let placed = false;
        const subCode = slot.subject.code;

        if (!subjectDayUsage[subCode]) subjectDayUsage[subCode] = {};
        if (!subjectSessionUsage[subCode]) subjectSessionUsage[subCode] = {};
        if (!subjectTimeFreq[subCode]) subjectTimeFreq[subCode] = {};

        // Heuristic: Prefer days with fewer sessions for this subject
        let dayIndices = [0, 1, 2, 3, 4, 5].sort((a, b) => {
            const usageA = subjectDayUsage[subCode][days[a]] || 0;
            const usageB = subjectDayUsage[subCode][days[b]] || 0;
            if (usageA !== usageB) return usageA - usageB;

            // If it's a lab, prioritize days that HAVE NO LABS YET
            if (slot.isLab) {
                const labA = totalLabsOnDay[days[a]] || 0;
                const labB = totalLabsOnDay[days[b]] || 0;
                if (labA !== labB) return labA - labB;
            }

            return Math.random() - 0.5; // Randomize same-level days
        });

        // If forceDay is specified (e.g., Saturday), only try that day
        if (slot.forceDay) {
            const forcedIdx = days.indexOf(slot.forceDay);
            if (forcedIdx !== -1) dayIndices = [forcedIdx];
        }

        for (const dIdx of dayIndices) {
            if (placed) break;
            const day = days[dIdx];

            // CONSTRAINT: Only one lab per day
            if (slot.isLab && (totalLabsOnDay[day] || 0) > 0) continue;

            if (slot.isLab && day === 'Saturday') continue;
            if (!subjectSessionUsage[subCode][day]) subjectSessionUsage[subCode][day] = { FN: false, AN: false };

            // Determine preference: If we already have FN, try AN first, and vice-versa
            // Also prioritize time indices where this subject HAS NOT been placed yet
            let timeIndices = [0, 1, 2, 3, 4, 5, 6].sort((a, b) => {
                // Prioritize different starting positions for variety
                const freqA = subjectTimeFreq[subCode][a] || 0;
                const freqB = subjectTimeFreq[subCode][b] || 0;
                if (freqA !== freqB) return freqA - freqB;

                // If it's a lab, avoid starting at the same flow/index as other labs
                if (slot.isLab) {
                    const startA = labStartTimes[a] || 0;
                    const startB = labStartTimes[b] || 0;
                    if (startA !== startB) return startA - startB;
                }

                return Math.random() - 0.5;
            });

            const hasFN = subjectSessionUsage[subCode][day].FN;
            const hasAN = subjectSessionUsage[subCode][day].AN;

            // Re-sort based on FN/AN preference if applicable
            if (hasFN && !hasAN) {
                timeIndices = [...timeIndices.filter(i => i >= 4), ...timeIndices.filter(i => i < 4)];
            } else if (!hasFN && hasAN) {
                timeIndices = [...timeIndices.filter(i => i < 4), ...timeIndices.filter(i => i >= 4)];
            }

            for (const tIdx of timeIndices) {
                if (tIdx > times.length - slot.duration) continue;

                // NEW CONSTRAINT: Editable or 0-credit subject should not come at 1st period (index 0)
                if ((subCode === 'EDITABLE' || slot.isZeroCredit) && tIdx === 0) continue;

                // NEW CONSTRAINT: Lab periods should not start at 4th period (index 3)
                if (slot.isLab && tIdx === 3) continue;

                // NEW CONSTRAINT: Prevent "Same Flow" - if a lab already starts at this index on another day, try another
                if (slot.isLab && (labStartTimes[tIdx] || 0) > 0 && Math.random() > 0.3) {
                    // We allow some overlap if strictly necessary, but prefer unique start times
                    continue;
                }

                const time = times[tIdx];

                // 1. Valid Slot?
                let collides = false;
                for (let k = 0; k < slot.duration; k++) {
                    if (matrix[`${day}-${times[tIdx + k]}`]) collides = true;
                    // LUNCH BREAK CONSTRAINT: Session cannot cross from period 4 (idx 3) to period 5 (idx 4)
                    if (tIdx < 4 && (tIdx + k) >= 4) collides = true;

                    // NEW GLOBAL LAB CONSTRAINT: Allow parallel labs (multple rooms) 
                    // Limit to 3 labs at the same time across all sections to prevent room shortages
                    if (slot.isLab) {
                        const targetSuffix = `-${day}-${times[tIdx + k]}`;
                        const concurrentLabs = Object.entries(masterSchedule).filter(([key, entry]) => {
                            return key.endsWith(targetSuffix) && entry.type === 'Lab';
                        }).length;

                        if (concurrentLabs >= 3) collides = true;
                    }
                }
                if (collides) continue;

                // NEW STRICT CONSTRAINT: No duplicate subjects on the same day (excluding Labs)
                const alreadyOnDay = (subjectDayUsage[subCode][day] || 0) > 0;
                if (!slot.isLab && alreadyOnDay) {
                    continue;
                }

                // NEW STRICT CONSTRAINT: Staggering (Same subject cannot be in the same slot on different days)
                const alreadyAtThisTime = (subjectTimeFreq[subCode][tIdx] || 0) > 0;
                if (!slot.isLab && alreadyAtThisTime) {
                    continue;
                }

                // 2. Teacher Available?
                let teacherClash = false;
                if (slot.teacher?.id !== 'special') {
                    for (let k = 0; k < slot.duration; k++) {
                        if (!isTeacherFree(slot.teacher?.id, day, times[tIdx + k])) teacherClash = true;
                    }
                }
                if (teacherClash) continue;

                // 3. Place it
                for (let k = 0; k < slot.duration; k++) {
                    const exactTime = times[tIdx + k];
                    matrix[`${day}-${exactTime}`] = slot;

                    // Update tracking
                    subjectDayUsage[subCode][day] = (subjectDayUsage[subCode][day] || 0) + 1;
                    subjectTimeFreq[subCode][tIdx + k] = (subjectTimeFreq[subCode][tIdx + k] || 0) + 1;
                    if (tIdx + k < 4) subjectSessionUsage[subCode][day].FN = true;
                    else subjectSessionUsage[subCode][day].AN = true;

                    if (slot.isLab) {
                        totalLabsOnDay[day] = (totalLabsOnDay[day] || 0) + 1;
                        if (k === 0) labStartTimes[tIdx] = (labStartTimes[tIdx] || 0) + 1;
                    }
                }
                placed = true;
                break;
            }
        }

        if (!placed) {
            log.push(`Could not place ${slot.subject.code} (${slot.type}). Constraints too tight.`);
        }
    }

    // Convert local matrix to Global Schedule Key format
    // Expected Key: Sem<Semester>-S<Sec>-<Day>-<Time>
    // classId format: "Sem II - Section A"
    const [semPart, sPart] = classId.split(' - ');
    const sem = semPart.replace('Sem ', '');
    const section = sPart.replace('Section ', '');

    const finalSchedule = {};
    Object.keys(matrix).forEach(k => {
        const [day, time] = k.split(/-(.+)/); // Split only on first hyphen
        const val = matrix[k];
        if (val) {
            const key = `Sem${sem}-S${section}-${day}-${time}`;
            finalSchedule[key] = {
                subject: `${val.subject.code} - ${val.subject.name}`,
                code: val.subject.code,
                name: val.subject.name,
                type: val.type,
                teacherName: val.teacher.name,
                teacherId: val.teacher.id,
                room: (val.teacher.room || val.subject.room || "")
            };
        }
    });

    return { schedule: finalSchedule, errors: log };
};

export const findSubstitute = (
    absentTeacherId,
    date,
    period,
    dayName, // "Monday"
    masterSchedule,
    teachers,
    subjects
) => {
    // 1. Identify Subject of the absent class
    // We need the class context. But usually substitutes are found BY slot.
    // ...
    // Simplified: Return list of available teachers who match the department or subject

    // Filter teachers who are FREE at this time
    const time = period; // "08:45 - 09:40"

    const available = teachers.filter(t => {
        if (t.id === absentTeacherId) return false;

        // Check availability
        for (const key in masterSchedule) {
            if (key.includes(`${dayName}-${time}`) && masterSchedule[key].teacherId === t.id) {
                return false; // Busy
            }
        }
        return true;
    });

    // Score them:
    // 1. Same Department (High Priority)
    // 2. Same Subject Skill (Best)
    // 3. Workload (Less is better)

    // (Mock ranking for now)
    return available.map(t => ({
        ...t,
        matchScore: 10 // Placeholder
    }));
};
