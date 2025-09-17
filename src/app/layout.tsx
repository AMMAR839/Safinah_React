import './globals.css';
import Header from './components/Header';
import { Poppins } from 'next/font/google';
import React from 'react';

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['400', '600', '700'],
    variable: '--font-poppins',
});

export const metadata = {
    title: 'Sistem Monitoring Misi',
    description: 'Sistem Monitoring Misi SAFINAH-ONE NOVITA',
};

interface RootLayoutProps {
    children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.ico" type="image/x-icon" />
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" defer></script>
                <script src="https://cdn.jsdelivr.net/npm/leaflet-rotatedmarker@0.2.0/leaflet.rotatedMarker.js" defer></script>
            </head>
            <body className={poppins.className}>
                <Header />
                {children}
            </body>
        </html>
    );
}