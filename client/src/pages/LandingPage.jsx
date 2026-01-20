import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // Import toast

const LandingPage = () => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#f472b6');
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!name) {
      // Replaced alert with toast
      return toast.error("Please enter your name first!"); 
    }
    navigate('/canvas', { state: { name, color } });
    toast.success("Welcome to the studio!"); // Nice welcome message
  };

  const colors = ['#f472b6', '#3b82f6', '#4ade80', '#facc15', '#ef4444', '#a855f7'];

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="card">
        <h2>Welcome to CanvUs</h2>
        <p style={{ color: '#666' }}>Customize your presence.</p>

        <div style={{ textAlign: 'left', marginTop: '20px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#666' }}>ARTIST NAME</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Enter name..." 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()} // Allow Enter key
          />
        </div>

        <div style={{ textAlign: 'left', marginTop: '20px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#666' }}>CURSOR GLOW</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '10px' }}>
            {colors.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                style={{ 
                  backgroundColor: c, width: '40px', height: '40px', borderRadius: '8px', 
                  border: color === c ? '3px solid #333' : 'none', cursor: 'pointer', transition: 'transform 0.2s' 
                }}
              />
            ))}
          </div>
        </div>

        <button onClick={handleJoin} className="btn-primary">Join Board →</button>
      </div>
    </div>
  );
};
export default LandingPage;