// frontend/src/components/MapComponent.tsx
'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon default
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function SetView({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16);
  }, [lat, lng]);
  return null;
}

interface MapProps {
  latitude: number;
  longitude: number;
  jamaahName: string;
  lastUpdated: string;
}

export default function MapComponent({ latitude, longitude, jamaahName, lastUpdated }: MapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      style={{ height: '100%', width: '100%', borderRadius: '12px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <SetView lat={latitude} lng={longitude} />
      <Marker position={[latitude, longitude]}>
        <Popup>
          <div className="text-center">
            <p className="font-bold">{jamaahName}</p>
            <p className="text-xs text-gray-500">Update: {lastUpdated}</p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}