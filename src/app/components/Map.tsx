'use client';

import React, { useEffect, useRef } from 'react';
import L, { LayerGroup } from 'leaflet';
import 'leaflet-rotatedmarker';
import 'leaflet/dist/leaflet.css';

interface NavData {
  latitude: number;
  longitude: number;
}

interface CogData {
  cog: number;
}

interface MapState {
  view_type: string;
  is_refreshed: boolean;
}

export interface Waypoints {
  start: [number, number];
  buoys: [number, number];
  finish: [number, number];
  image_surface: [number, number];
  image_underwater: [number, number];
}

interface MapProps {
  navData: NavData | null;
  cogData: CogData | null;
  mapState: MapState;
  missionWaypoints: { [key: string]: Waypoints };
  supabase: any;
}

/** ===================== ICONS ===================== */
const redBuoyIcon = L.icon({ iconUrl: '/merah.png', iconSize: [10,10], iconAnchor: [12, 12] });
const greenBuoyIcon = L.icon({ iconUrl: '/hijau.png', iconSize: [10, 10], iconAnchor: [12, 12] });
const startIcon = L.icon({ iconUrl: '/start.png', iconSize: [40, 40], iconAnchor: [12, 24] });
const shipIcon = L.icon({ iconUrl: '/kapalasli3.png', iconSize: [30, 30], iconAnchor: [15, 15] });
const Object_surface = L.icon({ iconUrl: '/atas.jpeg', iconSize: [10, 10], iconAnchor: [12, 24] });
const Object_under = L.icon({ iconUrl: '/bawah.png', iconSize: [10, 10], iconAnchor: [12, 24] });


type MissionConfig = {
  center: [number, number];
  latLabels: string[];
  lonLabels: string[];
};

const MISSION_CONFIG: Record<string, MissionConfig> = {
  lintasan1: {
    // -7.765527144208408, 110.37035626576507 = bengkel
    // -7.769460228520795, 110.38284391635815 = Wisdom
    center: [-7.765527144208408, 110.37035626576507],
    
    latLabels: ['1', '2', '3', '4', '5'],
    lonLabels: ['A', 'B', 'C', 'D', 'E'],
  },
  lintasan2: {
    center: [-7.915044, 112.588824],
    latLabels: ['A', 'B', 'C', 'D', 'E'],
    lonLabels: ['1', '2', '3', '4', '5'],
  },
};

// Fallback ke lintasan1 jika tipe tak dikenal
const getConfig = (missionType: string): MissionConfig =>
  MISSION_CONFIG[missionType] ?? MISSION_CONFIG['lintasan1'];

/** ===================== COMPONENT ===================== */
const Map: React.FC<MapProps> = ({ navData, cogData, mapState, missionWaypoints, supabase }) => {
  const mapRef = useRef<L.Map | null>(null);
  const shipMarkerRef = useRef<L.Marker | null>(null);
  const pathRef = useRef<L.Polyline | null>(null);
  const trackCoordinatesRef = useRef<[number, number][]>([]);
  const gridLayersRef = useRef<Record<string, LayerGroup>>({
    lintasan1: L.layerGroup(),
    lintasan2: L.layerGroup(),
  });
  const waypointLayersRef = useRef<LayerGroup>(L.layerGroup());

  const metersToLatLon = (centerLat: number, meters: number): { dLat: number; dLon: number } => {
    const metersPerDegLat = 111320;
    const metersPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);
    return {
      dLat: meters / metersPerDegLat,
      dLon: meters / metersPerDegLon,
    };
  };

  const drawGrid = (mapInstance: L.Map, missionType: string) => {
    const { center, latLabels, lonLabels } = getConfig(missionType);
    const layersToDraw =
      gridLayersRef.current[missionType] ??
      (gridLayersRef.current[missionType] = L.layerGroup());

    const numDivisions = 5;
    const { dLat, dLon } = metersToLatLon(center[0], 5);
    const totalDeltaLat = dLat * numDivisions;
    const totalDeltaLon = dLon * numDivisions;

    const newBounds = L.latLngBounds(
      [center[0] - totalDeltaLat / 2, center[1] - totalDeltaLon / 2],
      [center[0] + totalDeltaLat / 2, center[1] + totalDeltaLon / 2]
    );

    layersToDraw.clearLayers();

    // Grid lines
    for (let i = 0; i <= numDivisions; i++) {
      const lat = newBounds.getSouth() + i * (totalDeltaLat / numDivisions);
      L.polyline(
        [
          [lat, newBounds.getWest()],
          [lat, newBounds.getEast()],
        ],
        { color: 'black', weight: 0.1 }
      ).addTo(layersToDraw);

      const lon = newBounds.getWest() + i * (totalDeltaLon / numDivisions);
      L.polyline(
        [
          [newBounds.getSouth(), lon],
          [newBounds.getNorth(), lon],
        ],
        { color: 'black', weight: 0.1 }
      ).addTo(layersToDraw);
    }

    // Labels
  const cellHeight = totalDeltaLat / numDivisions;
  const cellWidth = totalDeltaLon / numDivisions;

  for (let row = 0; row < numDivisions; row++) {
    for (let col = 0; col < numDivisions; col++) {
      // titik tengah kotak (row, col)
      const cellLatCenter = newBounds.getSouth() + (row + 0.5) * cellHeight;
      const cellLonCenter = newBounds.getWest() + (col + 0.5) * cellWidth;

      // gabungan label
      const label = `${lonLabels[col]}${latLabels[row]}`; 

      L.marker([cellLatCenter, cellLonCenter], {
        icon: L.divIcon({
          className: 'gridCellLabel',
          html: label,
          iconAnchor: [10, 10],
        }),
        
      }).addTo(layersToDraw);
    }}

  };

  const drawWaypoints = (mapInstance: L.Map, missionType: string) => {
    waypointLayersRef.current.clearLayers();
    const waypoints = missionWaypoints[missionType];
    if (!waypoints) return;

    L.marker(waypoints.start, { icon: startIcon, opacity: 1 })
      .addTo(waypointLayersRef.current)
      .bindPopup('Titik Start');

    L.marker(waypoints.image_surface, { icon: Object_surface, opacity: 1 })
      .addTo(waypointLayersRef.current)
      .bindPopup('image surface');

    L.marker(waypoints.image_underwater, { icon: Object_under, opacity: 1 })
      .addTo(waypointLayersRef.current)
      .bindPopup('image underwater');

    waypointLayersRef.current.addTo(mapInstance);
  };

  const fetchBuoyData = async (mapInstance: L.Map) => {
    const { data: buoys, error } = await supabase.from('buoys').select('*');
    if (error) {
      console.error('Failed to fetch buoy data:', error);
      return;
    }
    buoys.forEach((buoy: { color: string; latitude: number; longitude: number }) => {
      const icon = buoy.color === 'red' ? redBuoyIcon : greenBuoyIcon;
      L.marker([buoy.latitude, buoy.longitude], { icon }).addTo(mapInstance).bindPopup(`Pelampung ${buoy.color}`);
    });
  };

  /** ===================== INIT MAP ===================== */
  useEffect(() => {
    if (mapRef.current) return;

    const initialCenter = getConfig('lintasan1').center;

    const mapInstance = L.map('map', {
      center: initialCenter,
      // zoom: 23,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoom: false,
      zoomControl: false,
    });
    mapRef.current = mapInstance;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
      maxZoom: 21.8,
      minZoom: 21.8,
    }).addTo(mapInstance);

    // Draw both grids once; show one at a time via view switcher
    drawGrid(mapInstance, 'lintasan1');
    drawGrid(mapInstance, 'lintasan2');

    fetchBuoyData(mapInstance);

    // Example rectangles around each mission center
    const deltaLat = 0.1;
    const deltaLon = 0.1;
    const centers = Object.values(MISSION_CONFIG).map(({ center }) => ({ x: center[0], y: center[1] }));

    centers.forEach(({ x, y }) => {
      const MaxgetBounds: L.LatLngBoundsExpression = [
        [x - (1 + deltaLat), y - (1 + deltaLon)],
        [x + 2 * deltaLat, y + 1 + deltaLon],
      ];
      L.rectangle(MaxgetBounds, {
        color: 'blue',
        weight: 1,
        fillColor: '#82d6fdff',
        fillOpacity: 1,
      }).addTo(mapInstance);
    });
  }, []);

  //RESPOND TO STATE CHANGES //
  useEffect(() => {
    if (!mapRef.current || !mapState) return;

    const { center } = getConfig(mapState.view_type);
    const { dLat, dLon } = metersToLatLon(center[0], 12.5);

    const bounds = L.latLngBounds(
      [center[0] - dLat, center[1] - dLon],
      [center[0] + dLat, center[1] + dLon]
    );

    mapRef.current.setMaxBounds(bounds);
    mapRef.current.fitBounds(bounds);

    // Toggle grid layers per view
    Object.values(gridLayersRef.current).forEach((lg) => lg.remove());
    const activeGrid = gridLayersRef.current[mapState.view_type] ?? gridLayersRef.current['lintasan1'];
    activeGrid.addTo(mapRef.current);

    drawWaypoints(mapRef.current, mapState.view_type);

    if (mapState.is_refreshed) {
      if (pathRef.current) {
        mapRef.current.removeLayer(pathRef.current);
        pathRef.current = null;
      }
      if (shipMarkerRef.current) {
        mapRef.current.removeLayer(shipMarkerRef.current);
        shipMarkerRef.current = null;
      }
      trackCoordinatesRef.current = [];
    }
  }, [mapState]);

  /** ===================== NAV & COG ===================== */
  useEffect(() => {
    if (!mapRef.current || !navData) return;

    const latestPosition: [number, number] = [navData.latitude, navData.longitude];

    if (shipMarkerRef.current) {
      (shipMarkerRef.current as any).setLatLng(latestPosition);
    } else {
      shipMarkerRef.current = L.marker(latestPosition, { icon: shipIcon }).addTo(mapRef.current);
      if (cogData) (shipMarkerRef.current as any).setRotationAngle(cogData.cog);
    }

    if (cogData && shipMarkerRef.current) {
      (shipMarkerRef.current as any).setRotationAngle(cogData.cog);
    }

    trackCoordinatesRef.current.push(latestPosition);
    if (trackCoordinatesRef.current.length < 2) return;

    if (pathRef.current) {
      pathRef.current.setLatLngs(trackCoordinatesRef.current as [number, number][]);
    } else {
      pathRef.current = L.polyline(trackCoordinatesRef.current as [number, number][], {
        color: 'red',
        weight: 0.5,
        dashArray: '2, 1',
      }).addTo(mapRef.current);
    }
  }, [navData, cogData]);

  return <div id="map" className="map"></div>;
};

export default Map;
