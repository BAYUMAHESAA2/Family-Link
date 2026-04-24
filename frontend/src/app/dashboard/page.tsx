'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import {
  RefreshCw, LogOut, MapPin, Clock, Navigation, Radio, History,
} from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

interface LocationData {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  createdAt: string;
}

type ViewMode = 'live' | 'history';

export default function DashboardPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [history, setHistory] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedHistory, setSelectedHistory] = useState<LocationData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const user = (() => {
    try { return JSON.parse(Cookies.get('user') || '{}'); }
    catch { return {}; }
  })();

  const fetchLocation = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/location/${user.id}`);
      setLocation(res.data);
      setLastRefresh(new Date());
    } catch {
      console.error('Gagal ambil lokasi');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/location/${user.id}/history`);
      setHistory(res.data);
    } catch {
      console.error('Gagal ambil history');
    }
  }, [user?.id]);

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) { router.push('/login'); return; }
    fetchLocation();
    fetchHistory();
    const interval = setInterval(() => {
      fetchLocation();
      fetchHistory();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    router.push('/login');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLoading(true);
    fetchLocation();
    fetchHistory();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleSwitchToLive = () => {
    setViewMode('live');
    setSelectedHistory(null);
  };

  const handleSelectHistory = (item: LocationData) => {
    setSelectedHistory(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayedLocation = viewMode === 'history' && selectedHistory
    ? selectedHistory
    : location;

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ─── Header ─── */}
      <header className="bg-emerald-700 text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Family Link</h1>
            <p className="text-emerald-200 text-sm">Halo, {user?.name || 'Keluarga'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live / Riwayat Toggle */}
          <div className="flex bg-emerald-800/60 rounded-xl p-1 gap-1">
            <button
              onClick={handleSwitchToLive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'live'
                  ? 'bg-white text-emerald-700 shadow'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Live
              {viewMode === 'live' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'history'
                  ? 'bg-white text-emerald-700 shadow'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Riwayat
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 px-3 py-2 rounded-lg text-sm transition"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-4">

        {/* ─── Info Card ─── */}
        {viewMode === 'live' ? (
          <div className="bg-white rounded-2xl shadow p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${location ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                <MapPin className={`w-6 h-6 ${location ? 'text-emerald-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-700">Lokasi Terkini Jamaah</p>
                  <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Live
                  </span>
                </div>
                {location ? (
                  <>
                    <p className="text-xs text-gray-500">
                      Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                    </p>
                    <p className="text-xs text-gray-400">Dikirim: {formatTime(location.createdAt)}</p>
                    {location.accuracy && (
                      <p className="text-xs text-gray-400">Akurasi: ±{Math.round(location.accuracy)}m</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-400">Belum ada data lokasi</p>
                )}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${selectedHistory ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Clock className={`w-6 h-6 ${selectedHistory ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-700">Mode Riwayat</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {history.length} data
                  </span>
                </div>
                {selectedHistory ? (
                  <>
                    <p className="text-xs text-gray-500">
                      Lat: {selectedHistory.latitude.toFixed(6)}, Lng: {selectedHistory.longitude.toFixed(6)}
                    </p>
                    <p className="text-xs text-gray-400">Waktu: {formatTime(selectedHistory.createdAt)}</p>
                    {selectedHistory.accuracy && (
                      <p className="text-xs text-gray-400">Akurasi: ±{Math.round(selectedHistory.accuracy)}m</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-400">Pilih lokasi dari daftar riwayat di bawah</p>
                )}
              </div>
            </div>
            <button
              onClick={handleSwitchToLive}
              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm"
            >
              <Navigation className="w-4 h-4" /> Ke Live
            </button>
          </div>
        )}

        {/* ─── Map (tinggi tetap 450px seperti aslinya) ─── */}
        <div className="bg-white rounded-2xl shadow overflow-hidden" style={{ height: '450px' }}>
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-400" />
                <p>Memuat peta...</p>
              </div>
            </div>
          ) : displayedLocation ? (
            <MapComponent
              latitude={displayedLocation.latitude}
              longitude={displayedLocation.longitude}
              jamaahName={user?.name || 'Jamaah'}
              lastUpdated={formatTime(displayedLocation.createdAt)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <MapPin className="w-12 h-12 text-gray-300" />
              <p>Jamaah belum membagikan lokasi</p>
              <button
                onClick={() => router.push('/location-screen')}
                className="mt-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Buka Location Screen
              </button>
            </div>
          )}
        </div>

        {/* ─── Keterangan bawah peta ─── */}
        <p className="text-center text-xs text-gray-400">
          {viewMode === 'live'
            ? `Peta diperbarui otomatis setiap 15 detik • Terakhir refresh: ${lastRefresh.toLocaleTimeString('id-ID')}`
            : 'Mode riwayat aktif — klik baris di bawah untuk lihat lokasi di peta'}
        </p>

        {/* ─── History Panel (hanya muncul di mode Riwayat) ─── */}
        {viewMode === 'history' && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Riwayat Lokasi</p>
                <p className="text-xs text-gray-400">{history.length} data tersimpan</p>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                Belum ada riwayat lokasi
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {history.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectHistory(item)}
                    className={`w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition text-left ${
                      selectedHistory?.id === item.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1 min-w-[32px]">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? 'bg-emerald-500 text-white'
                          : selectedHistory?.id === item.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index === 0 ? '●' : index + 1}
                      </div>
                      {index < history.length - 1 && (
                        <div className="w-0.5 h-4 bg-gray-200" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-700">
                          {formatTime(item.createdAt)}
                        </p>
                        {index === 0 && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            Terbaru
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                      </p>
                      {item.accuracy && (
                        <p className="text-xs text-gray-400">±{Math.round(item.accuracy)}m akurasi</p>
                      )}
                    </div>

                    <div className={`text-xs flex items-center gap-1 ${
                      selectedHistory?.id === item.id ? 'text-blue-600' : 'text-blue-400'
                    }`}>
                      <MapPin className="w-3 h-3" />
                      <span>Lihat</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {history.length > 0 && (
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                Menampilkan {history.length} lokasi terakhir • Klik baris untuk lihat di peta
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}