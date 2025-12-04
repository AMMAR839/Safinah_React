'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Map, { Waypoints } from './Map'; // sesuaikan path-nya

// ENV Supabase
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// mission names yang dipakai Map
const MISSION_NAMES = ['lintasan1', 'lintasan2'] as const;
type MissionName = (typeof MISSION_NAMES)[number];

// center yang sama dengan MISSION_CONFIG di Map.tsx
const MISSION_CENTERS: Record<MissionName, [number, number]> = {
  lintasan1: [-7.9154834, 112.5891244],
  lintasan2: [-7.9150524, 112.5888965],
};

const makeDefaultWaypoints = (center: [number, number]): Waypoints => ({
  start: center,
  buoys: center,
  finish: center,
  image_surface: center,
  image_underwater: center,
});

const MissionMapContainer: React.FC = () => {
  const [missionWaypoints, setMissionWaypoints] = useState<Record<string, Waypoints>>(() => {
    const initial: Record<string, Waypoints> = {};
    MISSION_NAMES.forEach((name) => {
      initial[name] = makeDefaultWaypoints(MISSION_CENTERS[name]);
    });
    return initial;
  });

  const [mapState, setMapState] = useState<{
    view_type: MissionName;
    is_refreshed: boolean;
  }>({
    view_type: 'lintasan1',
    is_refreshed: false,
  });

  // navData & cogData kalau belum ada bisa null dulu
  const navData = null;
  const cogData = null;

  /** ===================== LOAD MISSION WAYPOINTS DARI DB ===================== */
  useEffect(() => {
    const loadWaypoints = async () => {
      const { data, error } = await supabase.from('mission_waypoints').select('*');

      if (error) {
        console.error('Gagal load mission_waypoints:', error);
        return;
      }

      // bentuk data: { mission_name, waypoint_type, latitude, longitude }
      const byMission: Record<string, Waypoints> = { ...missionWaypoints };

      data.forEach(
        (row: {
          mission_name: string;
          waypoint_type: string;
          latitude: number;
          longitude: number;
        }) => {
          if (!MISSION_NAMES.includes(row.mission_name as MissionName)) {
            return;
          }

          const missionName = row.mission_name as MissionName;
          if (!byMission[missionName]) {
            byMission[missionName] = makeDefaultWaypoints(MISSION_CENTERS[missionName]);
          }

          const key = row.waypoint_type as keyof Waypoints;
          if (key in byMission[missionName]) {
            byMission[missionName] = {
              ...byMission[missionName],
              [key]: [row.latitude, row.longitude],
            };
          }
        }
      );

      setMissionWaypoints(byMission);
    };

    loadWaypoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ===================== HANDLE DRAG WAYPOINT (UPDATE STATE + DB) ===================== */
  const handleMissionWaypointsChange = async (missionType: string, newWaypoints: Waypoints) => {
    // Update state dulu supaya UI responsif
    setMissionWaypoints((prev) => ({
      ...prev,
      [missionType]: newWaypoints,
    }));

    // Siapkan rows untuk upsert ke Supabase
    const rows = (Object.keys(newWaypoints) as (keyof Waypoints)[]).map((key) => ({
      mission_name: missionType,
      waypoint_type: key,
      latitude: newWaypoints[key][0],
      longitude: newWaypoints[key][1],
    }));

    const { error } = await supabase
      .from('mission_waypoints')
      .upsert(rows, {
        onConflict: 'mission_name,waypoint_type',
      });

    if (error) {
      console.error('Gagal upsert mission_waypoints:', error);
    }
  };

  /** ===================== GANTI LINTASAN (contoh tombol sederhana) ===================== */
  const toggleMission = () => {
    setMapState((prev) => ({
      view_type: prev.view_type === 'lintasan1' ? 'lintasan2' : 'lintasan1',
      is_refreshed: false,
    }));
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div style={{ padding: '8px', display: 'flex', gap: '8px' }}>
        <button
          onClick={toggleMission}
          style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4 }}
        >
          Switch Lintasan (Sekarang: {mapState.view_type})
        </button>
      </div>

      <div style={{ width: '100%', height: '90vh' }}>
        <Map
          navData={navData}
          cogData={cogData}
          mapState={mapState}
          missionWaypoints={missionWaypoints}
          supabase={supabase}
          onMissionWaypointsChange={handleMissionWaypointsChange}
        />
      </div>
    </div>
  );
};

export default MissionMapContainer;
