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
                        padding: '10px 16px', borderRadius: '12px',
                        background: '#10b981', color: 'white', border: 'none',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'pointer', fontWeight: 'bold',
                        transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-5px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                >
                    <FileSpreadsheet size={18} /> Excel Template
                </button>
                <button
                    onClick={() => downloadFile('/Lab_Timetable_Template.doc', 'Lab_Timetable_Template.doc')}
                    className="btn-template"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 16px', borderRadius: '12px',
                        background: '#3b82f6', color: 'white', border: 'none',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'pointer', fontWeight: 'bold',
                        transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-5px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                >
                    <FileText size={18} /> Word Template
                </button>
            </div>
            <button
                onClick={toggleOpen}
                style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: '#6366f1', color: 'white', border: 'none',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = isOpen ? 'rotate(180deg) scale(1.1)' : 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = isOpen ? 'rotate(180deg)' : 'scale(1)'}
            >
                {isOpen ? <X size={24} /> : <Download size={24} />}
            </button>
        </div>
    );
};
export default TemplateFab;