'use client';

import React, { useEffect, useRef } from 'react';
import L, { LayerGroup, Polyline, Marker } from 'leaflet';
import 'leaflet-rotatedmarker';

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
    buoys: number[];
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

const redBuoyIcon = L.icon({ iconUrl: '/merah.png', iconSize: [5, 5], iconAnchor: [12, 12] });
const greenBuoyIcon = L.icon({ iconUrl: '/hijau.png', iconSize: [5, 5], iconAnchor: [12, 12] });
const startIcon = L.icon({ iconUrl: '/start.png', iconSize: [40, 40], iconAnchor: [12, 24] });
const finishIcon = L.icon({ iconUrl: '/finish.png', iconSize: [25, 25], iconAnchor: [12, 24] });
const shipIcon = L.icon({ iconUrl: '/kapalasli.png', iconSize: [10, 20], iconAnchor: [5, 10] });
const Object_surface = L.icon({ iconUrl: '/atas.jpeg', iconSize: [10, 10], iconAnchor: [12, 24] });
const Object_under = L.icon({ iconUrl: '/bawah.png', iconSize: [10, 10], iconAnchor: [12, 24] });

const Map: React.FC<MapProps> = ({ navData, cogData, mapState, missionWaypoints, supabase }) => {
    const mapRef = useRef<L.Map | null>(null);
    const shipMarkerRef = useRef<L.Marker | null>(null);
    const pathRef = useRef<L.Polyline | null>(null);
    const trackCoordinatesRef = useRef<number[][]>([]);
    const gridLayers1Ref = useRef<LayerGroup>(L.layerGroup());
    const gridLayers2Ref = useRef<LayerGroup>(L.layerGroup());
    const waypointLayersRef = useRef<LayerGroup>(L.layerGroup());

    const metersToLatLon = (centerLat: number, meters: number): { dLat: number, dLon: number } => {
        const metersPerDegLat = 111320;
        const metersPerDegLon = 111320 * Math.cos(centerLat * Math.PI / 180);
        return {
            dLat: meters / metersPerDegLat,
            dLon: meters / metersPerDegLon
        };
    };

    const drawGrid = (mapInstance: L.Map, missionType: string) => {
        const layersToDraw = missionType === 'lintasan1' ? gridLayers1Ref.current : gridLayers2Ref.current;
        const centerPoint = missionType === 'lintasan1' ? [-7.769522, 110.382875] : [-7.915044, 112.588824];
        const latLabels = missionType === 'lintasan1' ? ['1', '2', '3', '4', '5'] : ['A', 'B', 'C', 'D', 'E'];
        const lonLabels = missionType === 'lintasan1' ? ['A', 'B', 'C', 'D', 'E'] : ['1', '2', '3', '4', '5'];
        const numDivisions = 5;
        const { dLat, dLon } = metersToLatLon(centerPoint[0], 5);
        const totalDeltaLat = dLat * numDivisions;
        const totalDeltaLon = dLon * numDivisions;
        const newBounds = L.latLngBounds(
            [centerPoint[0] - totalDeltaLat / 2, centerPoint[1] - totalDeltaLon / 2],
            [centerPoint[0] + totalDeltaLat / 2, centerPoint[1] + totalDeltaLon / 2]
        );

        layersToDraw.clearLayers();
        for (let i = 0; i <= numDivisions; i++) {
            const lat = newBounds.getSouth() + (i * (totalDeltaLat / numDivisions));
            L.polyline([[lat, newBounds.getWest()], [lat, newBounds.getEast()]], { color: '#888', weight: 0.5 }).addTo(layersToDraw);
            
            const lon = newBounds.getWest() + (i * (totalDeltaLon / numDivisions));
            L.polyline([[newBounds.getSouth(), lon], [newBounds.getNorth(), lon]], { color: '#888', weight: 0.5 }).addTo(layersToDraw);
        }

        for (let i = 0; i < numDivisions; i++) {
            const lat = newBounds.getSouth() + ((i + 1) * (totalDeltaLat / numDivisions));
            const lon = newBounds.getWest() + ((i + 1) * (totalDeltaLon / numDivisions));
            L.marker([lat, newBounds.getWest()], {
                icon: L.divIcon({ className: 'gridLabel1', html: latLabels[i], iconAnchor: [10, 10] })
            }).addTo(layersToDraw);
            L.marker([newBounds.getSouth(), lon], {
                icon: L.divIcon({ className: 'gridLabel2', html: lonLabels[i], iconAnchor: [10, 10] })
            }).addTo(layersToDraw);
        }
    };

    const drawWaypoints = (mapInstance: L.Map, missionType: string) => {
        waypointLayersRef.current.clearLayers();
        const waypoints = missionWaypoints[missionType];
        if (!waypoints) return;

        L.marker(waypoints.start, { icon: startIcon, opacity: 1 }).addTo(waypointLayersRef.current).bindPopup('Titik Start');
        L.marker(waypoints.image_surface, { icon: Object_surface, opacity: 0.4 }).addTo(waypointLayersRef.current).bindPopup('image surface');
        L.marker(waypoints.image_underwater, { icon: Object_under, opacity: 0.4 }).addTo(waypointLayersRef.current).bindPopup('image underwater');
        L.marker(waypoints.finish, { icon: finishIcon, opacity: 0.4 }).addTo(waypointLayersRef.current).bindPopup('Finish');
        
        waypointLayersRef.current.addTo(mapInstance);
    };

    const fetchBuoyData = async (mapInstance: L.Map) => {
        const { data: buoys, error } = await supabase.from('buoys').select('*');
        if (error) {
            console.error('Failed to fetch buoy data:', error);
            return;
        }
        buoys.forEach((buoy: { color: string; latitude: number; longitude: number; }) => {
            const icon = buoy.color === 'red' ? redBuoyIcon : greenBuoyIcon;
            L.marker([buoy.latitude, buoy.longitude], { icon: icon }).addTo(mapInstance).bindPopup(`Pelampung ${buoy.color}`);
        });
    };

    useEffect(() => {
        if (!mapRef.current) {
            const mapInstance = L.map('map', {
                center: [-7.769522, 110.382875],
                zoom: 23,
                scrollWheelZoom: false,
                dragging: false,
                doubleClickZoom: false,
                boxZoom: false,
                touchZoom: false,
                zoomControl: false,
            });
            mapRef.current = mapInstance;
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', { maxZoom: 21.2, minZoom: 21.2 }).addTo(mapInstance);
            
            drawGrid(mapInstance, 'lintasan1');
            drawGrid(mapInstance, 'lintasan2');
            fetchBuoyData(mapInstance);
        }
    }, []);

    useEffect(() => {
        if (!mapRef.current || !mapState) return;

        const { dLat, dLon } = metersToLatLon(mapState.view_type === 'lintasan1' ? -7.769522 : -7.915044, 12.5);
        const centerPoint = mapState.view_type === 'lintasan1' ? [-7.769522, 110.382875] : [-7.915044, 112.588824];

        const bounds = L.latLngBounds(
            [centerPoint[0] - dLat, centerPoint[1] - dLon],
            [centerPoint[0] + dLat, centerPoint[1] + dLon]
        );

        mapRef.current.setMaxBounds(bounds);
        mapRef.current.fitBounds(bounds);

        gridLayers1Ref.current.remove();
        gridLayers2Ref.current.remove();
        if (mapState.view_type === 'lintasan1') {
            gridLayers1Ref.current.addTo(mapRef.current);
            drawWaypoints(mapRef.current, 'lintasan1');
        } else {
            gridLayers2Ref.current.addTo(mapRef.current);
            drawWaypoints(mapRef.current, 'lintasan2');
        }

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

    useEffect(() => {
        if (!mapRef.current || !navData) return;
        
        const latestPosition: [number, number] = [navData.latitude, navData.longitude];
        
        if (shipMarkerRef.current) {
            (shipMarkerRef.current as any).setLatLng(latestPosition);
        } else {
            (shipMarkerRef.current as any) = L.marker(latestPosition, { icon: shipIcon }).addTo(mapRef.current);
            if (cogData) {
                (shipMarkerRef.current as any).setRotationAngle(cogData.cog);
            }
        }
        
        if (cogData && shipMarkerRef.current) {
            (shipMarkerRef.current as any).setRotationAngle(cogData.cog);
        }

        trackCoordinatesRef.current.push(latestPosition);
        if (trackCoordinatesRef.current.length < 2) return;

        if (pathRef.current) {
            pathRef.current.setLatLngs(trackCoordinatesRef.current as [number, number][]);
        } else {
            pathRef.current = L.polyline(trackCoordinatesRef.current as [number, number][], { color: 'blue', weight: 0.5, dashArray: '2, 2' }).addTo(mapRef.current);
        }
    }, [navData, cogData]);

    return <div id="map" className="map"></div>;
};

export default Map;