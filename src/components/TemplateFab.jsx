import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, X } from 'lucide-react';
const TemplateFab = () => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleOpen = () => setIsOpen(!isOpen);
    const downloadFile = (file, name) => {
        const link = document.createElement('a');
        link.href = file;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    return (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '10px' }}>
            <div className="fab-options" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '10px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
                pointerEvents: isOpen ? 'auto' : 'none',
                visibility: isOpen ? 'visible' : 'hidden'
            }}>
                <button
                    onClick={() => downloadFile('/sample_timetable_data.xlsx', 'Template_Excel.xlsx')}
                    className="btn-template"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px 20px', borderRadius: '15px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white', border: 'none',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                        cursor: 'pointer', fontWeight: 'bold',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateX(-8px) scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.35)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateX(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
                    }}
                >
                    <FileSpreadsheet size={18} /> Excel Template
                </button>
                <button
                    onClick={() => downloadFile('/Lab_Timetable_Template.doc', 'Lab_Timetable_Template.doc')}
                    className="btn-template"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px 20px', borderRadius: '15px',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white', border: 'none',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                        cursor: 'pointer', fontWeight: 'bold',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateX(-8px) scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.35)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateX(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)';
                    }}
                >
                    <FileText size={18} /> Word Template
                </button>
            </div>
            <button
                onClick={toggleOpen}
                style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white', border: 'none',
                    boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.transform = isOpen ? 'rotate(180deg) scale(1.1)' : 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(99, 102, 241, 0.5)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = isOpen ? 'rotate(180deg) scale(1)' : 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.4)';
                }}
            >
                {isOpen ? <X size={28} /> : <Download size={28} />}
            </button>
        </div>
    );
};
export default TemplateFab;