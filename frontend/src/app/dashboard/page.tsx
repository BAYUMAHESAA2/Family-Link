'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import {
  RefreshCw, LogOut, MapPin, Clock, Navigation, Radio, History,
  ChevronDown, ChevronUp, X,
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
  /**
   * Mobile: panel starts CLOSED so the map is the first thing users see.
   * They can tap the collapsible header to reveal the list.
   * Desktop: sidebar is always visible (not controlled by this state).
   */
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

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
    const interval = setInterval(() => { fetchLocation(); fetchHistory(); }, 15000);
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
    setHistoryPanelOpen(false);
  };

  const handleSwitchToHistory = () => {
    setViewMode('history');
    setHistoryPanelOpen(true); // auto-expand list on mobile when switching
  };

  const handleSelectHistory = (item: LocationData) => {
    setSelectedHistory(item);
    // Scroll to map on mobile
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Collapse list so map is visible after selection (mobile)
    if (window.innerWidth < 1024) setHistoryPanelOpen(false);
  };

  const mapCenter = viewMode === 'history' && selectedHistory
    ? selectedHistory
    : location;

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ══════════════ HEADER ══════════════ */}
      <header className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-50">

        {/* Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold leading-tight">Family Link</h1>
            <p className="text-emerald-200 text-xs truncate max-w-[120px] sm:max-w-none">
              Halo, {user?.name || 'Keluarga'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex bg-emerald-800/60 rounded-xl p-1 gap-0.5">
            <button
              onClick={handleSwitchToLive}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'live' ? 'bg-white text-emerald-700 shadow' : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Radio className="w-3 h-3" />
              Live
              {viewMode === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            </button>
            <button
              onClick={handleSwitchToHistory}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'history' ? 'bg-white text-emerald-700 shadow' : 'text-emerald-200 hover:text-white'
              }`}
            >
              <History className="w-3 h-3" />
              Riwayat
            </button>
          </div>

          <button
            onClick={handleLogout}
            title="Keluar"
            className="bg-emerald-800 hover:bg-emerald-900 p-2 rounded-lg transition flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-medium">Keluar</span>
          </button>
        </div>
      </header>

      {/* ══════════════ BODY ══════════════
          Mobile  (<lg): single column, stacked
          Desktop (≥lg): map left + sidebar right
      ══════════════ */}
      <div className="flex flex-col lg:flex-row flex-1 lg:gap-4 lg:p-4 lg:max-w-screen-xl lg:mx-auto w-full">

        {/* ─── LEFT: Map column ─── */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Info bar */}
          <div className="bg-white border-b border-gray-100 lg:rounded-2xl lg:shadow lg:mb-3 px-4 py-3 flex items-center justify-between gap-2">
            {viewMode === 'live' ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-2 rounded-full flex-shrink-0 ${location ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    <MapPin className={`w-4 h-4 ${location ? 'text-emerald-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-gray-700 text-sm">Lokasi Terkini</p>
                      <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        Live
                      </span>
                    </div>
                    {location ? (
                      <p className="text-xs text-gray-400 truncate">
                        {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                        {location.accuracy ? ` · ±${Math.round(location.accuracy)}m` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">Belum ada data lokasi</p>
                    )}
                  </div>
                </div>
                <button onClick={handleRefresh} className="flex items-center gap-1 text-emerald-600 text-xs font-medium flex-shrink-0">
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-2 rounded-full flex-shrink-0 ${selectedHistory ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Clock className={`w-4 h-4 ${selectedHistory ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-gray-700 text-sm">Mode Riwayat</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {history.length} titik
                      </span>
                    </div>
                    {selectedHistory ? (
                      <p className="text-xs text-gray-400 truncate">
                        {selectedHistory.latitude.toFixed(5)}, {selectedHistory.longitude.toFixed(5)}
                        {selectedHistory.accuracy ? ` · ±${Math.round(selectedHistory.accuracy)}m` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">Pilih titik dari peta atau daftar</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedHistory && (
                    <button onClick={() => setSelectedHistory(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={handleSwitchToLive} className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                    <Navigation className="w-3.5 h-3.5" />
                    Live
                  </button>
                </div>
              </>
            )}
          </div>

          {/* MAP
              Height: responsive using clamp()
              Mobile  → min 260px, scales with viewport width (55vw), max 380px
              Desktop → 500px via lg: class override
          */}
          <div
            ref={mapRef}
            className="bg-white lg:rounded-2xl lg:shadow overflow-hidden lg:h-[500px]"
            style={{ height: 'clamp(260px, 55vw, 380px)' }}
          >
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-emerald-400" />
                  <p className="text-sm">Memuat peta...</p>
                </div>
              </div>
            ) : mapCenter ? (
              <MapComponent
                latitude={mapCenter.latitude}
                longitude={mapCenter.longitude}
                jamaahName={user?.name || 'Jamaah'}
                lastUpdated={formatTime(mapCenter.createdAt)}
                viewMode={viewMode}
                historyPoints={viewMode === 'history' ? history : []}
                selectedHistoryId={selectedHistory?.id}
                onHistoryMarkerClick={handleSelectHistory}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 p-4">
                <MapPin className="w-10 h-10 text-gray-300" />
                <p className="text-sm text-center">Jamaah belum membagikan lokasi</p>
                <button
                  onClick={() => router.push('/location-screen')}
                  className="mt-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Buka Location Screen
                </button>
              </div>
            )}
          </div>

          {/* Caption */}
          <p className="text-center text-xs text-gray-400 py-2 px-4">
            {viewMode === 'live'
              ? `Auto-refresh 15 detik · Terakhir: ${lastRefresh.toLocaleTimeString('id-ID')}`
              : selectedHistory
                ? `Titik ${history.findIndex(h => h.id === selectedHistory.id) + 1} dari ${history.length} · Klik titik lain di peta atau daftar`
                : 'Klik titik di peta atau pilih dari daftar riwayat'}
          </p>

          {/* ════ MOBILE-ONLY: History list (inline, below map) ════
              Hidden on lg — desktop uses sidebar instead.
          */}
          {viewMode === 'history' && (
            <div className="lg:hidden bg-white border-t border-gray-100 mb-safe">
              {/* Collapsible header */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                onClick={() => setHistoryPanelOpen(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-1.5 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <p className="font-semibold text-gray-700 text-sm">Riwayat Lokasi</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                    {history.length} titik
                  </span>
                </div>
                {historyPanelOpen
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
              </button>

              {/* Expandable list */}
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: historyPanelOpen ? '60vh' : '0' }}
              >
                {history.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">
                    Belum ada riwayat lokasi
                  </p>
                ) : (
                  <div className="overflow-y-auto divide-y divide-gray-50" style={{ maxHeight: '60vh' }}>
                    {history.map((item, index) => (
                      <HistoryRow
                        key={item.id}
                        item={item}
                        index={index}
                        total={history.length}
                        isSelected={selectedHistory?.id === item.id}
                        onSelect={handleSelectHistory}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                )}
                {history.length > 0 && (
                  <p className="px-4 py-2 text-xs text-center text-gray-400 border-t border-gray-100 bg-gray-50">
                    {history.length} titik · Klik untuk lihat di peta
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT: Sidebar (desktop only, sticky) ─── */}
        {viewMode === 'history' && (
          <aside className="hidden lg:flex lg:w-80 xl:w-96 flex-shrink-0 flex-col bg-white rounded-2xl shadow overflow-hidden self-start sticky top-[72px]"
            style={{ maxHeight: 'calc(100vh - 88px)' }}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
              <div className="bg-blue-100 p-2 rounded-full">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Riwayat Lokasi</p>
                <p className="text-xs text-gray-400">{history.length} titik tersimpan</p>
              </div>
            </div>

            {history.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">Belum ada riwayat lokasi</p>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                {history.map((item, index) => (
                  <HistoryRow
                    key={item.id}
                    item={item}
                    index={index}
                    total={history.length}
                    isSelected={selectedHistory?.id === item.id}
                    onSelect={handleSelectHistory}
                    formatTime={formatTime}
                  />
                ))}
              </div>
            )}

            {history.length > 0 && (
              <p className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center flex-shrink-0">
                {history.length} titik · Klik untuk tampil di peta
              </p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   Shared HistoryRow component
   Used in both mobile panel & desktop sidebar
════════════════════════════════ */
interface HistoryRowProps {
  item: LocationData;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: (item: LocationData) => void;
  formatTime: (d: string) => string;
}

function HistoryRow({ item, index, total, isSelected, onSelect, formatTime }: HistoryRowProps) {
  const isLatest = index === 0;
  return (
    <button
      onClick={() => onSelect(item)}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left border-l-4 ${
        isSelected ? 'bg-blue-50 border-blue-500' : 'border-transparent'
      }`}
    >
      {/* Timeline indicator */}
      <div className="flex flex-col items-center min-w-[28px] self-stretch">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          isLatest
            ? 'bg-emerald-500 text-white'
            : isSelected
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-600'
        }`}>
          {isLatest ? '●' : index + 1}
        </div>
        {index < total - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">
            {formatTime(item.createdAt)}
          </p>
          {isLatest && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
              Terbaru
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
          {item.accuracy ? ` · ±${Math.round(item.accuracy)}m` : ''}
        </p>
      </div>

      {/* Pin icon */}
      <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-300'}`} />
    </button>
  );
}