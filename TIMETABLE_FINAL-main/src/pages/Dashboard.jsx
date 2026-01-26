import React from 'react';
import { Users, BookOpen } from 'lucide-react';
import { useData } from '../context/DataContext';
import DataImporter from '../components/DataImporter';

const Dashboard = () => {
    const { teachers, subjects } = useData();

    // Calculate distinct counts
    const distinctSubjects = new Set(subjects.map(s => s.code)).size;
    const distinctTeachers = new Set(teachers.map(t => t.name)).size;

    const stats = [
        { title: 'Faculty Members', value: distinctTeachers, icon: Users, subtitle: `${teachers.length} Assignments` },
        { title: 'Unique Subjects', value: distinctSubjects, icon: BookOpen, subtitle: `${subjects.length} Total Entries` },
    ];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Dashboard</h1>
                    <p style={{ color: 'var(--text-light)' }}>Welcome back, Administrator.</p>
                </div>
                <div>
                    <DataImporter />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {stats.map((stat, index) => (
                    <div key={index} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'var(--bg-body)'
                        }}>
                            <stat.icon size={24} color="var(--primary)" />
                        </div>
                        <div>
                            <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.875rem' }}>{stat.title}</p>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>{stat.value}</h3>
                            {stat.subtitle && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)', opacity: 0.8 }}>{stat.subtitle}</p>}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '2rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Recent Activity</h3>
                    <p style={{ color: 'var(--text-light)' }}>No recent activity.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
