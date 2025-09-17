import React from 'react';

interface MissionStatus {
    mission_persiapan: string;
    mission_start: string;
    mission_buoys: string;
    image_atas: string;
    image_bawah: string;
    mission_finish: string;
}

interface MissionLogProps {
    status: MissionStatus | null;
}

const MissionLog: React.FC<MissionLogProps> = ({ status }) => {
    const updateMissionStatus = (missionId: string): string => {
        if (!status) return 'kotak-belum';
        const columnMap: { [key: string]: keyof MissionStatus } = {
            'mission-persiapan': 'mission_persiapan',
            'mission-start': 'mission_start',
            'mission-buoys': 'mission_buoys',
            'mission-imagesurface': 'image_atas',
            'mission-imageunderwater': 'image_bawah',
            'mission-finish': 'mission_finish'
        };
        const statusKey = columnMap[missionId];
        return `kotak-${status[statusKey]}`;
    };

    return (
        <section className="missionSection">
            <h2>Position Log</h2>
            <div className="dataMission">
                <div className={updateMissionStatus('mission-persiapan')}><p>Persiapan</p></div>
                <div className={updateMissionStatus('mission-start')}><p>Start</p></div>
                <div className={updateMissionStatus('mission-buoys')}><p>Floating ball set</p></div>
                <div className={updateMissionStatus('mission-imagesurface')}><p>Surface Imaging</p></div>
                <div className={updateMissionStatus('mission-imageunderwater')}><p>Underwater Imaging</p></div>
                <div className={updateMissionStatus('mission-finish')}><p>Finish</p></div>
            </div>
        </section>
    );
};

export default MissionLog;