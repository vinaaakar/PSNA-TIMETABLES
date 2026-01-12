import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

const Rooms = () => {
    // Start with empty data
    const [rooms, setRooms] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRoom, setCurrentRoom] = useState({
        id: null,
        name: '',
        capacity: '',
        type: 'Lecture Hall',
        building: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRooms = rooms.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.building.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openAddModal = () => {
        setIsEditing(false);
        setCurrentRoom({ id: null, name: '', capacity: '', type: 'Lecture Hall', building: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (room) => {
        setIsEditing(true);
        setCurrentRoom(room);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        // Removed confirmation alert
        setRooms(rooms.filter(room => room.id !== id));
    };

    const handleSaveRoom = () => {
        if (isEditing) {
            setRooms(rooms.map(r => r.id === currentRoom.id ? currentRoom : r));
        } else {
            setRooms([...rooms, { ...currentRoom, id: Date.now() }]);
        }
        setIsModalOpen(false);
    };

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: '900', letterSpacing: '-0.025em', color: '#0f172a' }}>Rooms</h1>
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Manage classrooms, labs, and other facilities.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary" onClick={openAddModal} style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', fontWeight: '700', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <Plus size={18} style={{ marginRight: '0.5rem' }} />
                        Add Room
                    </button>
                </div>
            </div>

            <div className="toolbar" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: '#fff', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Search rooms..."
                        className="input-field"
                        style={{ paddingLeft: '38px', width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '0.9rem' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Room Name</th>
                            <th>Type</th>
                            <th>Capacity</th>
                            <th>Building</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRooms.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                                    No rooms found. Add one to get started.
                                </td>
                            </tr>
                        ) : (
                            filteredRooms.map((room) => (
                                <tr key={room.id}>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{room.name}</div>
                                    </td>
                                    <td>
                                        <span className="badge badge-info">{room.type}</span>
                                    </td>
                                    <td>{room.capacity} students</td>
                                    <td>{room.building}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => handleEdit(room)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(room.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? "Edit Room" : "Add New Room"}
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSaveRoom}>{isEditing ? "Save Changes" : "Add Room"}</button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">Room Name</label>
                        <input
                            type="text"
                            className="input-field w-full"
                            placeholder="e.g. Lecture Hall 101"
                            value={currentRoom.name}
                            onChange={(e) => setCurrentRoom({ ...currentRoom, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Room Type</label>
                        <select
                            className="form-select"
                            value={currentRoom.type}
                            onChange={(e) => setCurrentRoom({ ...currentRoom, type: e.target.value })}
                        >
                            <option value="Lecture Hall">Lecture Hall</option>
                            <option value="Computer Lab">Computer Lab</option>
                            <option value="Science Lab">Science Lab</option>
                            <option value="Seminar Room">Seminar Room</option>
                            <option value="Hall">Hall</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Capacity (Students)</label>
                        <input
                            type="number"
                            className="input-field w-full"
                            placeholder="e.g. 60"
                            value={currentRoom.capacity}
                            onChange={(e) => setCurrentRoom({ ...currentRoom, capacity: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Building / Block</label>
                        <input
                            type="text"
                            className="input-field w-full"
                            placeholder="e.g. Block A"
                            value={currentRoom.building}
                            onChange={(e) => setCurrentRoom({ ...currentRoom, building: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Rooms;
