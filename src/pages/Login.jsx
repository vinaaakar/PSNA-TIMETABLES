import React, { useState } from 'react';
import { User, Lock, ArrowRight } from 'lucide-react';
const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (email === 'admin@example.com' && password === 'admin') {
            onLogin();
        } else {
            setError('Invalid credentials');
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
                                placeholder="admin@example.com"
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