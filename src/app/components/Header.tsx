'use client';

import React, { useState, useEffect } from 'react';

const Header = () => {
    const [counter, setCounter] = useState<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCounter(prevCounter => prevCounter + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <header className="header">
            <div className="brand">
                <img src="/LOGO.png" alt="Logo" className="logo" />
                <span className="teamName">SAFINAH-ONE NOVITA</span>
            </div>
            <div className="updateInfo">
                Last Update: <span>{counter}</span> detik
            </div>
        </header>
    );
};

export default Header;