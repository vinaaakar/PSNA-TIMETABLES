import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { User, Lock, ArrowRight } from 'lucide-react';
const Login = ({ onLogin }) => {
    const { facultyAccounts, teachers } = useData();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        const emailInput = email.trim().toLowerCase();
        const passInput = password.trim();
        let facultyUser = facultyAccounts?.find(acc => acc.email.toLowerCase() === emailInput && acc.password.toLowerCase() === passInput.toLowerCase());
        if (!facultyUser) {
            const emailHandle = emailInput.split('@')[0];
            const foundTeacher = teachers.find(t => {
                const parts = t.name.trim().split(/\s+/);
                const lastName = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
                return lastName === emailHandle;
            });
            if (foundTeacher && passInput.toLowerCase() === emailHandle) {
                facultyUser = { ...foundTeacher, email: emailInput, name: foundTeacher.name };
            }
        }
        const emailExists = facultyAccounts?.some(acc => acc.email.toLowerCase() === emailInput);

        if (emailInput === 'admin@psnacet.edu.in' && passInput === 'admin') {
            onLogin('admin', { name: 'Admin' });
        } else if (facultyUser) {
            onLogin('faculty', facultyUser);
        } else if (emailExists) {
            setError('Incorrect password');
        } else {
            setError('User not found (Ensure Teacher is added)');
        }
    };
    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '48px', height: '48px', background: 'var(--primary)', borderRadius: '12px', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>P</div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome Back</h1>
                    <p style={{ color: 'var(--text-light)' }}>Sign in to manage timetables</p>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Email</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="email"
                                className="input-field"
                                style={{ width: '100%', paddingLeft: '40px', boxSizing: 'border-box' }}
                                placeholder="admin@psnacet.edu.in or faculty@psnacet.edu.in"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="password"
                                className="input-field"
                                style={{ width: '100%', paddingLeft: '40px', boxSizing: 'border-box' }}
                                placeholder="admin"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    {error && <div style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}
                    <button type="submit" className="btn btn-primary" style={{ height: '44px', fontSize: '1rem' }}>
                        Sign In <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                    </button>
                </form>
            </div>
        </div>
    );
};
export default Login;