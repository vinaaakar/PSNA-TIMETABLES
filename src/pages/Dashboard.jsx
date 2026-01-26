import React from 'react';
import { useData } from '../context/DataContext';
import { Users, BookOpen, Layers, Clock, Activity } from 'lucide-react';
const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: color + '20', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={28} />
        </div>
        <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: '600', marginBottom: '0.25rem' }}>{title}</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>{value}</div>
        </div>
    </div>
);
const Dashboard = () => {
    const { teachers, subjects, clearTeachers, clearSubjects, clearFacultyAccounts, clearPreemptiveConstraints, updateSchedule } = useData();
    const handleResetAll = () => {
        if (window.confirm('CRITICAL: This will delete ALL imported Excel and Word data. Are you sure?')) {
            clearTeachers();
            clearSubjects();
            clearFacultyAccounts();
            clearPreemptiveConstraints();
            localStorage.removeItem('timetable_schedule');
            window.location.reload();
        }
    };
    const teacherCount = new Set(teachers.map(t => t.name)).size;
    const subjectCount = subjects.length;
    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Welcome back, Administrator</h1>
                    <p style={{ color: 'var(--text-light)' }}>Here is what's happening today.</p>
                </div>
                <button className="btn btn-danger" onClick={handleResetAll} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Reset All Data
                </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <StatCard title="Faculty Members" value={teacherCount} icon={Users} color="#4338ca" />
                <StatCard title="Total Subjects" value={subjectCount} icon={BookOpen} color="#10b981" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Activity size={20} color="var(--text-light)" />
                        <h3 style={{ fontSize: '1.125rem' }}>Recent Activity</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Placeholder Items */}
                        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)' }}></div>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>System updated subject allocations</span>
                            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-light)' }}>2 mins ago</span>
                        </div>
                        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>New teacher data imported</span>
                            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-light)' }}>1 hour ago</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Dashboard;