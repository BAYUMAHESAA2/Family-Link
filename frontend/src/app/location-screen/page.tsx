// frontend/src/app/location-screen/page.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { MapPin, Wifi, WifiOff, CheckCircle } from 'lucide-react';

export default function LocationScreen() {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const getGeoErrorMessage = (err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return 'Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di browser.';
      case err.POSITION_UNAVAILABLE:
        return 'Lokasi tidak tersedia. Pastikan GPS/perangkat lokasi aktif.';
      case err.TIMEOUT:
        return 'Permintaan lokasi timeout. Coba lagi di tempat dengan sinyal lebih baik.';
      default:
        return 'Gagal mendapatkan lokasi. Coba lagi.';
    }
  };

  const sendLocation = async (lat: number, lng: number, accuracy: number) => {
    try {
      await api.post('/location', { latitude: lat, longitude: lng, accuracy });
      setLastSent(new Date());
    } catch {
      console.error('Gagal kirim lokasi');
    }
  };

  const startTracking = () => {
    setStatus('requesting');
    setError('');

    // Geolocation hanya berjalan di secure context (HTTPS atau localhost).
    if (!window.isSecureContext) {
      setError('Lokasi butuh koneksi aman (HTTPS/localhost). Buka aplikasi lewat localhost atau HTTPS.');
      setStatus('error');
      return;
    }

    if (!navigator.geolocation) {
      setError('Browser tidak mendukung GPS');
      setStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCoords({ lat: latitude, lng: longitude, accuracy });
        setStatus('active');
        sendLocation(latitude, longitude, accuracy);

        // Kirim lokasi setiap 30 detik
        intervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition((p) => {
            setCoords({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
            sendLocation(p.coords.latitude, p.coords.longitude, p.coords.accuracy);
          });
        }, 30000);
      },
      (err) => {
        setError(getGeoErrorMessage(err));
        setStatus('error');
      },
      { enableHighAccuracy: true },
    );
  };

  const stopTracking = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus('idle');
    setCoords(null);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-emerald-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="mb-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
            status === 'active' ? 'bg-green-100 animate-pulse' : 'bg-gray-100'
          }`}>
            <MapPin className={`w-12 h-12 ${status === 'active' ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <h1 className="text-2xl font-bold text-gray-700">Location Screen</h1>
          <p className="text-gray-500 text-sm mt-1">Family Link — Jamaah Tracker</p>
        </div>

        {/* Status */}
        <div className={`rounded-xl p-4 mb-6 ${
          status === 'active' ? 'bg-green-50 border border-green-200' :
          status === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-gray-50 border border-gray-200'
        }`}>
          {status === 'idle' && <p className="text-gray-600">Tekan tombol untuk mulai berbagi lokasi</p>}
          {status === 'requesting' && <p className="text-blue-600">Meminta izin lokasi...</p>}
          {status === 'active' && coords && (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
                <Wifi className="w-4 h-4" />
                <span>Lokasi Aktif Dibagikan</span>
              </div>
              <p className="text-xs text-gray-500">Lat: {coords.lat.toFixed(6)}</p>
              <p className="text-xs text-gray-500">Lng: {coords.lng.toFixed(6)}</p>
              <p className="text-xs text-gray-500">Akurasi: ±{Math.round(coords.accuracy)}m</p>
              {lastSent && (
                <p className="text-xs text-green-600 mt-2">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Terakhir dikirim: {lastSent.toLocaleTimeString('id-ID')}
                </p>
              )}
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center justify-center gap-2 text-red-600">
              <WifiOff className="w-4 h-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Tombol */}
        {status !== 'active' ? (
          <button
            onClick={startTracking}
            disabled={status === 'requesting'}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition text-lg"
          >
            {status === 'requesting' ? 'Memproses...' : '📍 Mulai Berbagi Lokasi'}
          </button>
        ) : (
          <button
            onClick={stopTracking}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition text-lg"
          >
            ⏹ Hentikan Berbagi
          </button>
        )}

        <p className="text-xs text-gray-400 mt-4">Lokasi diperbarui setiap 30 detik</p>
      </div>
    </div>
  );
}