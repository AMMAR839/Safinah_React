import React from 'react';

interface NavDataProps {
    data: { timestamp: string, latitude: number, longitude: number, sog_ms: number } | null;
    cogData: { cog: number } | null;
    errorMessage: string;
}

const NavData: React.FC<NavDataProps> = ({ data, cogData, errorMessage }) => {
    const formatA = (lat: number, lon: number): string => {
        const getCardinalDirection = (value: number, type: 'lat' | 'lon'): 'N' | 'S' | 'E' | 'W' | 'N/A' => {
        if (type === 'lat') return value >= 0 ? 'N' : 'S';
        if (type === 'lon') return value >= 0 ? 'E' : 'W';
        return 'N/A';
};

        const latDirection = getCardinalDirection(lat, 'lat');
        const lonDirection = getCardinalDirection(lon, 'lon');
        const absLat = Math.abs(lat).toFixed(6);
        const absLon = Math.abs(lon).toFixed(6);
        return `${latDirection} ${absLat} ${lonDirection} ${absLon}`;
    };

    const msToKmh = (sog_ms: number): string => {
        if (typeof sog_ms !== 'number' || isNaN(sog_ms)) return '0';
        return (sog_ms * 3.6).toFixed(2);
    };

    return (
        <section className="dataSection">
            <h2>Data Navigasi</h2>
            {errorMessage && <div className="errorMessage">{errorMessage}</div>}
            <div className="isiData">
                <div className="kotak"><h3>Timestamp</h3><p>{data ? new Date(data.timestamp).toLocaleString() : 'N/A'}</p></div>
                <div className="kotak"><h3>Koordinat (DD,DDDD)</h3><p>{data ? formatA(data.latitude, data.longitude) : 'N/A'}</p></div>
                <div className="kotak">
                    <h3>SOG</h3>
                    <p><span>{data ? msToKmh(data.sog_ms) : 'N/A'}</span> km/h</p></div>
                <div className="kotak"><h3>COG</h3><p><span>{cogData && cogData.cog ? cogData.cog.toFixed(2) : 'N/A'}</span>°</p></div>
            </div>
        </section>
    );
};

export default NavData;