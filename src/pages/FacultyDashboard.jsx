import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Calendar, Layers, Printer } from 'lucide-react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const FacultyDashboard = ({ facultyName }) => {
    const { schedule, department } = useData();

    // Compute the faculty's personal timetable
    const mySchedule = useMemo(() => {
        // Initialize 6 days x 7 periods grid
        const grid = Array(6).fill(null).map(() => Array(7).fill(null));
        const cleanName = facultyName.toLowerCase().replace(/^(dr\.|mr\.|mrs\.|ms\.)\s*/i, '').replace(/[^a-z0-9]/g, '');

        if (!schedule) return grid;

        Object.entries(schedule).forEach(([semester, sections]) => {
            if (!sections || typeof sections !== 'object') return;
            Object.entries(sections).forEach(([section, days]) => {
                if (!days || !Array.isArray(days)) return;
                days.forEach((dayRow, dayIdx) => {
                    dayRow.forEach((cell, periodIdx) => {
                        if (!cell) return;

                        let isMyClass = false;

                        // Check Teacher Name
                        if (cell.type === 'ELECTIVE_GROUP') {
                            if (cell.teacherNames && cell.teacherNames.some(t => {
                                const tClean = t.toLowerCase().replace(/^(dr\.|mr\.|mrs\.|ms\.)\s*/i, '').replace(/[^a-z0-9]/g, '');
                                return tClean === cleanName;
                            })) {
                                isMyClass = true;
                            }
                        } else {
                            if (cell.teacherName) {
                                const tClean = cell.teacherName.toLowerCase().replace(/^(dr\.|mr\.|mrs\.|ms\.)\s*/i, '').replace(/[^a-z0-9]/g, '');
                                if (tClean === cleanName) isMyClass = true;
                            }
                        }

                        if (isMyClass) {
                            // If I have multiple classes at same time (rare, but possible if data error), prioritize or append
                            // Here we just overwrite or create a combined object
                            const classInfo = {
                                ...cell,
                                semester,
                                section,
                                displayCode: cell.type === 'ELECTIVE_GROUP' ? 'ELECTIVE' : cell.code
                            };

                            // If something already there, maybe append? For now, just set.
                            grid[dayIdx][periodIdx] = classInfo;
                        }
                    });
                });
            });
        });
        return grid;
    }, [schedule, facultyName]);

    return (
        <div className="timetable-container">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
                .timetable-container {
                    font-family: 'Outfit', sans-serif;
                    padding: 1.5rem;
                    background: #f1f5f9;
                    min-height: 100vh;
                }
                @media screen {
                    .screen-only { display: block; }
                    .print-only { display: none !important; }
                    .dashboard-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #1e293b;
                        padding: 1.5rem 2rem;
                        border-radius: 16px;
                        color: white;
                        margin-bottom: 2rem;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    }
                    .control-group {
                        display: flex;
                        gap: 1rem;
                        align-items: center;
                    }
                    .btn-premium {
                        padding: 0.6rem 1.5rem;
                        border-radius: 10px;
                        font-weight: 800;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.2s;
                        cursor: pointer;
                        border: none;
                    }
                    .btn-print { background: white; color: #1e293b; }
                    .btn-print:hover { background: #f8fafc; transform: translateY(-2px); }
                   
                    .timetable-glass-card {
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                        overflow: hidden;
                        border: 1px solid #e2e8f0;
                    }
                    .main-grid {
                        width: 100%;
                        border-collapse: separate;
                        border-spacing: 0;
                    }
                    .main-grid th {
                        padding: 1.2rem 0.5rem;
                        background: #f8fafc;
                        color: #64748b;
                        font-size: 0.7rem;
                        font-weight: 600;
                        text-align: center;
                        border-bottom: 1px solid #e2e8f0;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }
                    .main-grid td {
                        padding: 8px;
                        border-bottom: 1px solid #f1f5f9;
                        vertical-align: middle;
                        text-align: center;
                    }
                    .day-column {
                        background: #fff;
                        color: #1e293b;
                        font-weight: 800;
                        font-size: 0.95rem;
                        width: 120px;
                        border-right: 1px solid #f1f5f9;
                    }
                    .subject-box {
                        height: 95px;
                        border-radius: 14px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 0.5rem;
                        transition: all 0.2s;
                        background: #fff;
                    }
                    .box-regular {
                        color: #4338ca;
                        font-weight: 800;
                        font-size: 1.3rem;
                    }
                    .box-lab {
                        background: #f0fdf4;
                        border: 2px solid #bbf7d0;
                        color: #15803d;
                        font-weight: 800;
                        font-size: 1.3rem;
                    }
                    .box-elective {
                        background: #fffbeb;
                        border: 2px solid #fde68a;
                        color: #b45309;
                        font-weight: 800;
                        font-size: 1.1rem;
                    }
                    /* Strips for Break/Lunch */
                    .strip-cell {
                        width: 32px;
                        background: #f8fafc;
                        font-size: 0.65rem;
                        font-weight: 800;
                        color: #94a3b8;
                        writing-mode: vertical-rl;
                        transform: rotate(180deg);
                        text-align: center;
                        border-left: 1px solid #f1f5f9;
                        border-right: 1px solid #f1f5f9;
                    }
                }
                @media print {
                    .screen-only { display: none !important; }
                    .print-only { display: block !important; padding: 0; }
                    body { background: white !important; margin: 0; padding: 0; }
                    @page { size: landscape; margin: 3mm; }
                    .official-table { width: 100%; border-collapse: collapse; border: 1.2px solid black; }
                    .official-table th, .official-table td { border: 1px solid black; text-align: center; height: 26px; font-size: 9px; font-family: "Times New Roman", serif; padding: 1px; }
                    .official-table th { background: #f0f0f0 !important; font-weight: bold; }
                    .legend-table { width: 100%; border-collapse: collapse; margin-top: 5px; border: 1px solid black; font-family: "Times New Roman", serif; }
                    .legend-table th, .legend-table td { border: 1px solid black; padding: 2px; font-size: 8.5px; }
                }
            `}</style>

            <div className="screen-only">
                <header className="dashboard-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: '#3b82f6', padding: '10px', borderRadius: '12px' }}>
                            <Layers color="white" size={24} />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Faculty Dashboard</h1>
                            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.85rem' }}>Full Weekly Schedule for {facultyName}</p>
                        </div>
                    </div>
                    <div className="control-group">
                        <button className="btn-premium btn-print" onClick={() => window.print()}>
                            <Printer size={18} /> Print Official
                        </button>
                    </div>
                </header>

                <div className="timetable-glass-card">
                    <table className="main-grid">
                        <thead>
                            <tr>
                                <th style={{ width: '120px' }}>Day</th>
                                <th>P1<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>08:45-09:40</span></th>
                                <th>P2<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>09:40-10:35</span></th>
                                <th className="strip-cell"></th>
                                <th>P3<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>10:55-11:45</span></th>
                                <th>P4<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>11:45-12:35</span></th>
                                <th className="strip-cell"></th>
                                <th>P5<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>01:45-02:35</span></th>
                                <th>P6<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>02:35-03:25</span></th>
                                <th>P7<br /><span style={{ opacity: 0.6, fontSize: '0.6rem' }}>03:25-04:15</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map((day, dIdx) => (
                                <tr key={day}>
                                    <td className="day-column">{day}</td>
                                    {mySchedule[dIdx].map((cell, sIdx) => {
                                        const items = [];
                                        items.push(
                                            <td key={`${dIdx}-${sIdx}`}>
                                                {cell ? (
                                                    <div className={`subject-box ${cell.type === 'LAB' ? 'box-lab' : (cell.type === 'ELECTIVE_GROUP' ? 'box-elective' : 'box-regular')}`}>
                                                        <div style={{ fontSize: '1.1rem' }}>
                                                            {cell.displayCode}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8, color: cell.type === 'LAB' ? '#166534' : (cell.type === 'ELECTIVE_GROUP' ? '#92400e' : '#475569') }}>
                                                            Sem {cell.semester} - {cell.section}
                                                        </div>
                                                        {cell.type === 'LAB' && <div style={{ fontSize: '0.65rem', marginTop: '2px', opacity: 0.7 }}>(LAB)</div>}
                                                    </div>
                                                ) : (
                                                    <div className="subject-box" style={{ opacity: 0.2 }}>-</div>
                                                )}
                                            </td>
                                        );
                                        if (sIdx === 1) items.push(<td key={`break-${dIdx}`} className="strip-cell">BREAK</td>);
                                        if (sIdx === 3) items.push(<td key={`lunch-${dIdx}`} className="strip-cell">LUNCH</td>);
                                        return <React.Fragment key={`wrapper-${dIdx}-${sIdx}`}>{items}</React.Fragment>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PRINT VIEW (STRICT PSNA OFFICIAL) */}
            <div className="print-only">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '10px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0 }}>
                        {/* Placeholder for Logo if needed, or just plain layout */}
                        <div style={{ width: '60px', height: '60px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '24px', border: '1px solid black' }}>P</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '18pt', margin: 0, fontWeight: 'bold', textTransform: 'uppercase', fontFamily: '"Times New Roman", serif' }}>PSNA COLLEGE OF ENGINEERING AND TECHNOLOGY</h1>
                        <p style={{ fontSize: '10pt', margin: '4px 0', fontStyle: 'italic', fontFamily: '"Times New Roman", serif' }}>(An Autonomous Institution, Affiliated to Anna University, Chennai)</p>
                        <h2 style={{ fontSize: '12pt', margin: '8px 0 0', textDecoration: 'underline', fontWeight: 'bold', fontFamily: '"Times New Roman", serif' }}>INDIVIDUAL FACULTY TIME TABLE</h2>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11pt', marginBottom: '10px', fontFamily: '"Times New Roman", serif' }}>
                    <div>Faculty Name: {facultyName.toUpperCase()}</div>
                    <div>Department: CSE</div>
                </div>

                <table className="official-table">
                    <thead>
                        <tr>
                            <th rowSpan="2" style={{ width: '50px' }}>Day</th>
                            <th>8:45</th>
                            <th>9:40</th>
                            <th rowSpan="2" style={{ width: '25px', padding: 0 }}>
                                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', width: '100%', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>BREAK</div>
                            </th>
                            <th>10:55</th>
                            <th>11:45</th>
                            <th rowSpan="2" style={{ width: '30px', padding: 0 }}>
                                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', width: '100%', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LUNCH</div>
                            </th>
                            <th>01:45</th>
                            <th>02:35</th>
                            <th>03:25</th>
                        </tr>
                        <tr>
                            <th style={{ height: '24px' }}>9:40</th>
                            <th>10:35</th>
                            <th>11:45</th>
                            <th>12:35</th>
                            <th>02:35</th>
                            <th>03:25</th>
                            <th>04:15</th>
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS.map((day, dIdx) => (
                            <tr key={day}>
                                <td style={{ fontWeight: 'bold' }}>{day.substring(0, 3)}</td>
                                {/* P1, P2 */}
                                {[0, 1].map(s => {
                                    const cell = mySchedule[dIdx][s];
                                    return (
                                        <td key={s}>
                                            {cell ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>{cell.displayCode}</div>
                                                    <div style={{ fontSize: '8pt' }}>SEM {cell.semester} CSE-{cell.section}</div>
                                                </div>
                                            ) : ''}
                                        </td>
                                    );
                                })}

                                {/* BREAK COLUMN */}
                                {dIdx === 0 && (
                                    <td rowSpan={6} style={{ background: '#f5f5f5', padding: 0, verticalAlign: 'middle' }}>
                                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '8pt', fontWeight: 'bold', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            BREAK (10:35-10:55)
                                        </div>
                                    </td>
                                )}

                                {/* P3, P4 */}
                                {[2, 3].map(s => {
                                    const cell = mySchedule[dIdx][s];
                                    return (
                                        <td key={s}>
                                            {cell ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>{cell.displayCode}</div>
                                                    <div style={{ fontSize: '8pt' }}>SEM {cell.semester} CSE-{cell.section}</div>
                                                </div>
                                            ) : ''}
                                        </td>
                                    );
                                })}

                                {/* LUNCH COLUMN */}
                                {dIdx === 0 && (
                                    <td rowSpan={6} style={{ background: '#f5f5f5', padding: 0, verticalAlign: 'middle' }}>
                                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '8pt', fontWeight: 'bold', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            LUNCH BREAK (12:35-01:45)
                                        </div>
                                    </td>
                                )}

                                {/* P5, P6, P7 */}
                                {[4, 5, 6].map(s => {
                                    const cell = mySchedule[dIdx][s];
                                    return (
                                        <td key={s}>
                                            {cell ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>{cell.displayCode}</div>
                                                    <div style={{ fontSize: '8pt' }}>SEM {cell.semester} CSE-{cell.section}</div>
                                                </div>
                                            ) : ''}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FacultyDashboard;
