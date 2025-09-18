'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isNear } from './components/Near';
 

import Header from './components/Header';
import NavData from './components/NavData';
import MissionLog from './components/MissionLog';
import ImageSection from './components/ImageSection';
import './styles.css'; // Menggunakan import CSS langsung

const Map = dynamic(() => import('./components/Map'), { ssr: false });

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Pastikan nilai tidak kosong sebelum membuat klien Supabase
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key environment variables');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

import { Waypoints } from './components/Map';

const missionWaypoints: { [key: string]: Waypoints } = {
    'lintasan2': {
        'start': [-7.915141, 112.588725],
        'buoys': [-7.9150685, 112.588907],
        'finish': [-7.769250, 110.383080],
        'image_surface': [-7.915095, 112.588896],
        'image_underwater': [-7.915124, 112.588874]
    },
    'lintasan1': {
        'start': [-7.7696203, 110.382845],
        'buoys': [-7.768950, 110.383400],
        'finish': [-7.769572, 110.382845],
        'image_surface': [-7.915095, 112.588896],
        'image_underwater': [-7.915124, 112.588874]
    }
};

interface NavData {
    latitude: number;
    longitude: number;
    timestamp: string;
    sog_ms: number;
}

interface CogData {
    cog: number;
}

interface MissionImage {
    image_url: string;
    image_slot_name: string;
}

interface MissionStatus {
    mission_persiapan: string;
    mission_start: string;
    mission_buoys: string;
    image_atas: string;
    image_bawah: string;
    mission_finish: string;
}

interface MapState {
    view_type: string;
    is_refreshed: boolean;
}

export default function HomePage() {
    const [navData, setNavData] = useState<NavData | null>(null);
    const [cogData, setCogData] = useState<CogData | null>(null);
    const [missionImages, setMissionImages] = useState<MissionImage[]>([]);
    const [missionStatus, setMissionStatus] = useState<MissionStatus | null>(null);
    const [mapState, setMapState] = useState<MapState>({ view_type: 'lintasan1', is_refreshed: false });
    const [errorMessage, setErrorMessage] = useState<string>('');

    

    const updateMissionStatusInSupabase = async (missionId: keyof MissionStatus, status: string) => {
        try {
            const updateData = { [missionId]: status };
            const { error } = await supabase
                .from('data_mission')
                .update(updateData)
                .eq('id', 1);

            if (error) throw error;
            console.log(`Status misi '${missionId}' berhasil diperbarui menjadi ${status}.`);
        } catch (error) {
            console.error('Gagal memperbarui status misi:', error);
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const { data: nav, error: navError } = await supabase.from('nav_data').select('*').order('timestamp', { ascending: false }).limit(1);
                if (navError) throw navError;
                setNavData(nav[0] || null);

                const { data: cog, error: cogError } = await supabase.from('cog_data').select('*').order('timestamp', { ascending: false }).limit(1);
                if (cogError) throw cogError;
                setCogData(cog[0] || null);

                const { data: images, error: imagesError } = await supabase.from('image_mission').select('*');
                if (imagesError) throw imagesError;
                setMissionImages(images);

                const { data: mission, error: missionError } = await supabase.from('data_mission').select('*').eq('id', 1).single();
                if (missionError) throw missionError;
                setMissionStatus(mission);

                const { data: map, error: mapError } = await supabase.from('map_state').select('*').eq('id', 1).single();
                if (mapError) throw mapError;
                setMapState(map);

                setErrorMessage('');
            } catch (error: any) {
                setErrorMessage(`Failed to fetch initial data: ${error.message}`);
                console.error('Error fetching initial data:', error);
            }
        };

        fetchInitialData();

        const navSubscription = supabase
            .channel('nav_data_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nav_data' }, payload => {
                setNavData(payload.new as NavData);
                const currentPosition: [number, number] = [payload.new.latitude, payload.new.longitude];
                const tolerance = 5; 
                const waypoints = missionWaypoints[mapState.view_type];

                if(isNear(currentPosition, waypoints.start, tolerance)) {
                    updateMissionStatusInSupabase('mission_persiapan', 'selesai');
                    updateMissionStatusInSupabase('mission_start', 'proses');
                }
                if(isNear(currentPosition, waypoints.buoys, tolerance)) {
                    updateMissionStatusInSupabase('mission_start', 'selesai');
                    updateMissionStatusInSupabase('mission_buoys', 'proses');
                }

                if(isNear(currentPosition, waypoints.image_surface, tolerance)) {
                    updateMissionStatusInSupabase('mission_buoys', 'selesai');
                    updateMissionStatusInSupabase('image_atas', 'proses');
                }

                if(isNear(currentPosition, waypoints.image_underwater, tolerance)) {
                    updateMissionStatusInSupabase('image_atas', 'selesai');
                    updateMissionStatusInSupabase('image_bawah', 'proses');
                }

                if(isNear(currentPosition, waypoints.finish, tolerance)) {
                    updateMissionStatusInSupabase('image_bawah', 'selesai');
                    updateMissionStatusInSupabase('mission_finish', 'proses');
                }
                              
            })
            .subscribe();

        const cogSubscription = supabase
            .channel('cog_data_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cog_data' }, payload => {
                setCogData(payload.new as CogData);
            })
            .subscribe();

        const imageSubscription = supabase
            .channel('mission_images_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'image_mission' }, async () => {
                const { data: images, error } = await supabase.from('image_mission').select('*');
                if (error) {
                    console.error('Error fetching mission images after realtime update:', error);
                    return;
                }
                setMissionImages(images as MissionImage[]);
            })
            .subscribe();

        const missionSubscription = supabase
            .channel('mission_log_changes')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'data_mission' }, payload => {
                setMissionStatus(payload.new as MissionStatus);
            })
            .subscribe();

        const mapSubscription = supabase
            .channel('map_state_changes')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'map_state' }, payload => {
                setMapState(payload.new as MapState);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(navSubscription);
            supabase.removeChannel(cogSubscription);
            supabase.removeChannel(imageSubscription);
            supabase.removeChannel(missionSubscription);
            supabase.removeChannel(mapSubscription);
        };
    }, []);

    const handleSelectLintasan = async (lintasan: string) => {
        try {
            const { error } = await supabase
                .from('map_state')
                .update({ view_type: lintasan })
                .eq('id', 1);
            if (error) throw error;
        } catch (error: any) {
            console.error('Failed to update map state:', error);
        }
    };

    const handleRefresh = async () => {
        try {
            const { error } = await supabase
                .from('map_state')
                .update({ is_refreshed: true })
                .eq('id', 1);
            if (error) throw error;
        } catch (error: any) {
            console.error('Failed to trigger refresh:', error);
        }
    };

    return (
        <main className="main">
            <section className="gabungan">
                <NavData data={navData} cogData={cogData} errorMessage={errorMessage} />
                <MissionLog status={missionStatus} />
                <img src="/ornamen.png" alt="hiasan" className="ornamen" />
            </section>

            <ImageSection missionImages={missionImages} />

            <section className="mapSection">
                <h2>Lokasi Misi</h2>
                <Map 
                    navData={navData}
                    cogData={cogData}
                    mapState={mapState}
                    missionWaypoints={missionWaypoints}
                    supabase={supabase}
                />
                <div className="mapControls">
                    <button 
                        id="lintasan1" 
                        className={`tombolLintasan ${mapState.view_type === 'lintasan1' ? 'aktif' : ''}`}
                        onClick={() => handleSelectLintasan('lintasan1')}
                    >
                        Lintasan 1
                    </button>
                    <button 
                        id="lintasan2" 
                        className={`tombolLintasan ${mapState.view_type === 'lintasan2' ? 'aktif' : ''}`}
                        onClick={() => handleSelectLintasan('lintasan2')}
                    >
                        Lintasan 2
                    </button>
                    <button id="tombol_refresh" className="tombolRefresh" onClick={handleRefresh}>
                        Refresh
                    </button>
                </div>
            </section>
        </main>
    );
}