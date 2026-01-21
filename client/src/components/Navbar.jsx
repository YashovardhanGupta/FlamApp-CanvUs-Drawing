
import React from 'react';
import logo from '../assets/canvus-logo.svg';

const Navbar = () => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 2rem',
            backgroundColor: 'transparent',
            width: '100%',
            boxSizing: 'border-box',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10
        }}>
            {/* Left Side: Logo + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img src={logo} alt="CanvUs Logo" style={{ width: '32px', height: '32px' }} />
                <h1 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    color: '#fff',
                    margin: 0,
                    letterSpacing: '0.5px'
                }}>
                    CanvUs
                </h1>
            </div>

            {/* Right Side: Artists Online Pill */}
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <span style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#4ade80',
                    borderRadius: '50%',
                    display: 'inline-block'
                }}></span>
                <span style={{
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                }}>
                    245 Artists Online
                </span>
            </div>
        </div>
    );
};

export default Navbar;
