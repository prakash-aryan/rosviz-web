'use client';

import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';

type LatLngTuple = [number, number];

// Component to handle map size updates
function MapResizer() {
  const map = useMap();
  
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size check

    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  return null;
}

const MapContent = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const mapRef = useRef(null);
  
  // Define positions
  const center: LatLngTuple = [40.7580, -73.9855];
  const homePosition: LatLngTuple = [40.7585, -73.9865];
  const robotPosition: LatLngTuple = [40.7575, -73.9845];
  const pointA: LatLngTuple = [40.7570, -73.9860];
  const pointB: LatLngTuple = [40.7580, -73.9840];

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const homeIcon = L.divIcon({
    className: 'custom-home-icon',
    html: `<div style="
      width: 16px;
      height: 16px;
      background-color: #ffffff;
      border: 2px solid #333333;
      border-radius: 50%;
      position: relative;
    ">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 8px;
        height: 8px;
        background-color: #333333;
        border-radius: 50%;
      "></div>
    </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  const robotIcon = L.divIcon({
    className: 'custom-robot-icon',
    html: `<div style="
      width: 16px;
      height: 16px;
      background-color: #00ff00;
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(0,255,0,0.5);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  const waypointIcon = L.divIcon({
    className: 'custom-waypoint-icon',
    html: `<div style="
      width: 12px;
      height: 12px;
      background-color: #00a5ff;
      border: 2px solid #ffffff;
      border-radius: 50%;
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

  // Path from home to robot position
  const pathPoints: LatLngTuple[] = [homePosition, robotPosition];

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="map-view-container">
      <MapContainer 
        center={center}
        zoom={17}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        ref={mapRef}
      >
        <MapResizer />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        
        <Marker position={homePosition} icon={homeIcon}>
          <Popup>Home</Popup>
        </Marker>

        <Marker position={robotPosition} icon={robotIcon}>
          <Popup>TurtleBot3</Popup>
        </Marker>

        <Marker position={pointA} icon={waypointIcon}>
          <Popup>Point A</Popup>
        </Marker>

        <Marker position={pointB} icon={waypointIcon}>
          <Popup>Point B</Popup>
        </Marker>

        <Polyline 
          positions={pathPoints}
          pathOptions={{
            color: '#00ff00',
            weight: 2,
            opacity: 0.7,
            dashArray: '5, 5'
          }}
        />
      </MapContainer>
    </div>
  );
};

export default MapContent;