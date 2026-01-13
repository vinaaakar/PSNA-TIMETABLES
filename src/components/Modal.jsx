import React from 'react';
import { X } from 'lucide-react';
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '500px',
                padding: '0',
                border: 'none',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', padding: 0 }}>
                        <X size={20} />
                    </button>
                </div>
                <div style={{ padding: '1.5rem' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};
export default Modal;