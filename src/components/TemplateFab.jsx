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
            {isOpen && (
                <div className="fab-options" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                    <button
                        onClick={() => downloadFile('/sample_timetable_data.xlsx', 'Template_Excel.xlsx')}
                        className="btn-template"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 16px', borderRadius: '12px',
                            background: '#10b981', color: 'white', border: 'none',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        <FileSpreadsheet size={18} /> Excel Template
                    </button>
                    <button
                        onClick={() => alert("Word Template not available yet.")}
                        className="btn-template"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 16px', borderRadius: '12px',
                            background: '#3b82f6', color: 'white', border: 'none',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        <FileText size={18} /> Word Template
                    </button>
                </div>
            )}
            <button
                onClick={toggleOpen}
                style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: '#6366f1', color: 'white', border: 'none',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'transform 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                {isOpen ? <X size={24} /> : <Download size={24} />}
            </button>
        </div>
    );
};

export default TemplateFab;
