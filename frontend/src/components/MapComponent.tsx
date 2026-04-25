'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationData {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  createdAt: string;
}

interface MapComponentProps {
  latitude: number;
  longitude: number;
  jamaahName: string;
  lastUpdated: string;
  viewMode?: 'live' | 'history';
  historyPoints?: LocationData[];
  selectedHistoryId?: string;
  onHistoryMarkerClick?: (item: LocationData) => void;
}

/** Numbered circle marker — green (latest), blue (selected), gray (others) */
function createNumberedIcon(index: number, isSelected: boolean, isLatest: boolean): L.DivIcon {
  let bg = '#9ca3af'; // gray
  if (isLatest)   bg = '#10b981'; // emerald
  if (isSelected) bg = '#3b82f6'; // blue

  const size = isSelected || isLatest ? 32 : 26;
  const label = isLatest ? '●' : String(index + 1);

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bg};border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:700;font-size:${isLatest ? 14 : 11}px;
      box-shadow:0 2px 8px rgba(0,0,0,0.28);
      border:2.5px solid #fff;
      transition:transform .15s;
      ${isSelected ? 'transform:scale(1.18);' : ''}
    ">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

/** Pulsing live dot */
function createLiveIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:44px;height:44px;background:rgba(16,185,129,.18);border-radius:50%;animation:pr 1.6s ease-out infinite;"></div>
        <div style="width:20px;height:20px;background:#10b981;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.28);"></div>
        <style>@keyframes pr{0%{transform:scale(.5);opacity:.8}100%{transform:scale(2);opacity:0}}</style>
      </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -26],
  });
}

export default function MapComponent({
  latitude,
  longitude,
  jamaahName,
  lastUpdated,
  viewMode = 'live',
  historyPoints = [],
  selectedHistoryId,
  onHistoryMarkerClick,
}: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const layersRef    = useRef<L.Layer[]>([]);

  /* ── Init map once ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* ── Re-render layers on prop change ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous layers
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    if (viewMode === 'live') {
      /* ── LIVE: single pulsing marker ── */
      const m = L.marker([latitude, longitude], { icon: createLiveIcon() })
        .addTo(map)
        .bindPopup(`<b>${jamaahName}</b><br/><small>${lastUpdated}</small>`);
      layersRef.current.push(m);
      map.setView([latitude, longitude], map.getZoom() || 15);

    } else if (historyPoints.length > 0) {
      /* ── HISTORY: polyline + numbered markers ── */

      // Polyline (oldest → newest = reversed array)
      const latlngs = [...historyPoints].reverse().map(p => [p.latitude, p.longitude] as L.LatLngTuple);
      const poly = L.polyline(latlngs, {
        color: '#3b82f6', weight: 2.5, opacity: 0.65, dashArray: '6 4',
      }).addTo(map);
      layersRef.current.push(poly);

      // Markers
      historyPoints.forEach((point, index) => {
        const isLatest   = index === 0;
        const isSelected = point.id === selectedHistoryId;
        const icon       = createNumberedIcon(index, isSelected, isLatest);

        const timeLabel = new Date(point.createdAt).toLocaleString('id-ID', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        });

        const marker = L.marker([point.latitude, point.longitude], {
          icon,
          zIndexOffset: isSelected ? 1000 : isLatest ? 500 : 0,
        })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:150px;font-family:system-ui,sans-serif">
              <b style="font-size:13px">${isLatest ? '📍 Terbaru' : `Titik #${index + 1}`}</b><br/>
              <span style="font-size:11px;color:#6b7280">${timeLabel}</span><br/>
              <span style="font-size:11px;color:#6b7280">${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}</span>
              ${point.accuracy ? `<br/><span style="font-size:11px;color:#9ca3af">±${Math.round(point.accuracy)}m</span>` : ''}
            </div>
          `, { maxWidth: 210 });

        marker.on('click', () => onHistoryMarkerClick?.(point));
        if (isSelected) marker.openPopup();

        layersRef.current.push(marker);
      });

      // Pan/zoom
      if (selectedHistoryId) {
        const sel = historyPoints.find(p => p.id === selectedHistoryId);
        if (sel) map.setView([sel.latitude, sel.longitude], Math.max(map.getZoom() || 15, 16));
      } else {
        const bounds = L.latLngBounds(historyPoints.map(p => [p.latitude, p.longitude]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [viewMode, latitude, longitude, historyPoints, selectedHistoryId, jamaahName, lastUpdated]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}