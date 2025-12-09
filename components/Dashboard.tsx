import React, { useState, useEffect, useRef } from 'react';
import { User, Alert, AlertType } from '../types';
import AvailabilityScreen from './AvailabilityScreen';
import FindMotoboyScreen from './FindMotoboyScreen';
import { 
  LogOut, Map as MapIcon, List, Navigation, 
  AlertTriangle, Siren, XOctagon, AlertCircle, 
  Menu, X, Plus, ThumbsDown, RefreshCw, Share2, 
  Clock, MapPin, Bike, Search
} from 'lucide-react';

// Declare Leaflet global
declare const L: any;

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const CABREUVA_COORDS = [-23.3069, -47.1325];

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [currentView, setCurrentView] = useState<'map' | 'availability' | 'find'>('map');
  
  // Modal State
  const [newAlertLocation, setNewAlertLocation] = useState<{lat: number, lng: number} | null>(null);
  const [newAlertAddress, setNewAlertAddress] = useState('');
  const [newAlertType, setNewAlertType] = useState<AlertType>('accident');
  const [newAlertDesc, setNewAlertDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const mapRef = useRef<any>(null);
  const modalMapRef = useRef<any>(null);
  const markersRef = useRef<any>({});
  const modalMarkerRef = useRef<any>(null);

  // Load Alerts & Init
  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem('alertaJaAlerts');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Clean up old alerts (> 4 hours)
      const now = Date.now();
      const valid = parsed.filter((a: Alert) => (now - a.createdAt) < 4 * 60 * 60 * 1000);
      setAlerts(valid);
      if (valid.length !== parsed.length) {
        localStorage.setItem('alertaJaAlerts', JSON.stringify(valid));
      }
    }

    // Auto cleanup interval
    const interval = setInterval(() => {
      setAlerts(prev => {
        const now = Date.now();
        const valid = prev.filter(a => (now - a.createdAt) < 4 * 60 * 60 * 1000);
        if (valid.length !== prev.length) {
          localStorage.setItem('alertaJaAlerts', JSON.stringify(valid));
        }
        return valid;
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Initialize Main Map
  useEffect(() => {
    if (!document.getElementById('main-map')) return;
    if (mapRef.current) return; // Already initialized

    const map = L.map('main-map', {
      zoomControl: false,
      attributionControl: false
    }).setView(CABREUVA_COORDS, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);
    
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    // Invalidate size when sidebar toggles to refill area
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(document.getElementById('main-map')!);

    return () => {
      resizeObserver.disconnect();
      if(mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync Markers with Alerts
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    
    // Clear existing markers that are not in alerts
    Object.keys(markersRef.current).forEach(id => {
      if (!alerts.find(a => a.id === id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    // Add new markers
    alerts.forEach(alert => {
      if (!markersRef.current[alert.id]) {
        const color = getAlertColor(alert.type);
        const iconHtml = `<div class="marker-pin" style="background-color: ${color};"></div>`;
        
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: iconHtml,
          iconSize: [30, 42],
          iconAnchor: [15, 42],
          popupAnchor: [0, -35]
        });

        const marker = L.marker([alert.lat, alert.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div class="font-sans">
              <strong class="block text-sm mb-1">${getAlertLabel(alert.type)}</strong>
              <span class="text-xs text-gray-600 block mb-1">${alert.street}</span>
              <span class="text-xs text-gray-500">${formatTime(alert.createdAt)}</span>
            </div>
          `);
        
        markersRef.current[alert.id] = marker;
      }
    });
  }, [alerts]);

  // Modal Map Initialization with Geolocation
  useEffect(() => {
    if (isModalOpen && !modalMapRef.current && document.getElementById('modal-map')) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        // 1. Initialize map centered on default Cabreúva first
        const map = L.map('modal-map', { zoomControl: false }).setView(CABREUVA_COORDS, 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);
        modalMapRef.current = map;

        // 2. Create draggable marker at center
        const defaultCenter = map.getCenter();
        const marker = L.marker(defaultCenter, { draggable: true }).addTo(map);
        modalMarkerRef.current = marker;

        // Setup marker events
        marker.on('dragend', (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          setNewAlertLocation({ lat, lng });
          fetchAddress(lat, lng);
        });

        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          setNewAlertLocation(e.latlng);
          fetchAddress(e.latlng.lat, e.latlng.lng);
        });

        // 3. Attempt to get User Location
        if (navigator.geolocation) {
          setNewAlertAddress('Obtendo sua localização...');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              // Ensure map is still mounted
              if (!modalMapRef.current) return;

              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              const userPos = new L.LatLng(lat, lng);
              
              // Move map and marker to user location
              map.setView(userPos, 17);
              marker.setLatLng(userPos);
              
              // Update state
              setNewAlertLocation({ lat, lng });
              fetchAddress(lat, lng);
            },
            (error) => {
              console.warn("Geolocation denied or failed", error);
              // Fallback to default
              setNewAlertLocation(defaultCenter);
              fetchAddress(defaultCenter.lat, defaultCenter.lng);
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        } else {
          // No geolocation support
          setNewAlertLocation(defaultCenter);
          fetchAddress(defaultCenter.lat, defaultCenter.lng);
        }

      }, 100);
    }

    if (!isModalOpen && modalMapRef.current) {
      modalMapRef.current.remove();
      modalMapRef.current = null;
      modalMarkerRef.current = null;
    }
  }, [isModalOpen]);

  const fetchAddress = async (lat: number, lng: number) => {
    setNewAlertAddress('Buscando endereço...');
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.address) {
        const street = data.address.road || data.address.pedestrian || 'Rua desconhecida';
        const suburb = data.address.suburb || data.address.neighbourhood || '';
        setNewAlertAddress(`${street}${suburb ? ', ' + suburb : ''}`);
      } else {
        setNewAlertAddress('Endereço não encontrado');
      }
    } catch (e) {
      setNewAlertAddress('Erro ao obter endereço');
    }
  };

  const handleAddAlert = () => {
    if (!newAlertLocation) return;
    
    setIsSubmitting(true);

    const newAlert: Alert = {
      id: Date.now().toString(),
      type: newAlertType,
      street: newAlertAddress || 'Localização no mapa',
      description: newAlertDesc,
      lat: newAlertLocation.lat,
      lng: newAlertLocation.lng,
      createdAt: Date.now(),
      votes: 0,
      user: user.username
    };

    const updated = [newAlert, ...alerts];
    setAlerts(updated);
    localStorage.setItem('alertaJaAlerts', JSON.stringify(updated));

    // Generate WhatsApp Link
    const text = `*AlertaJá Cabreúva* 🚨%0ANova ocorrência: *${getAlertLabel(newAlertType)}*%0ALocal: ${newAlertAddress}%0AObs: ${newAlertDesc || 'Sem detalhes'}`;
    const waLink = `https://wa.me/?text=${text}`;
    
    // Open WA in new tab
    window.open(waLink, '_blank');

    setIsSubmitting(false);
    setIsModalOpen(false);
    
    // Reset form
    setNewAlertDesc('');
    setNewAlertType('accident');
  };

  const handleVote = (id: string, action: 'confirm' | 'remove') => {
    const updated = alerts.map(a => {
      if (a.id !== id) return a;
      if (action === 'confirm') {
        return { ...a, createdAt: Date.now() }; // Refresh timestamp
      } else {
        return { ...a, votes: a.votes + 1 };
      }
    }).filter(a => a.votes < 3); // Remove if 3 votes

    setAlerts(updated);
    localStorage.setItem('alertaJaAlerts', JSON.stringify(updated));
  };

  const focusMapOnAlert = (alert: Alert) => {
    setCurrentView('map');
    // Timeout to allow view switch if needed
    setTimeout(() => {
        if (mapRef.current) {
            mapRef.current.flyTo([alert.lat, alert.lng], 16);
            markersRef.current[alert.id]?.openPopup();
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false); // Close sidebar on mobile
            }
        }
    }, 100);
  };

  // Helper Functions
  const getAlertColor = (type: AlertType) => {
    switch (type) {
      case 'accident': return '#dc2626'; // red-600
      case 'blitz': return '#2563eb'; // blue-600
      case 'traffic': return '#ca8a04'; // yellow-600
      case 'closed_road': return '#9333ea'; // purple-600
      case 'danger': return '#ea580c'; // orange-600
      default: return '#6b7280';
    }
  };

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'accident': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'blitz': return <Siren className="w-5 h-5 text-blue-600" />;
      case 'traffic': return <Navigation className="w-5 h-5 text-yellow-600" />;
      case 'closed_road': return <XOctagon className="w-5 h-5 text-purple-600" />;
      case 'danger': return <AlertCircle className="w-5 h-5 text-orange-600" />;
    }
  };

  const getAlertLabel = (type: AlertType) => {
    switch (type) {
      case 'accident': return 'Acidente';
      case 'blitz': return 'Blitz Policial';
      case 'traffic': return 'Trânsito Intenso';
      case 'closed_road': return 'Rua Fechada';
      case 'danger': return 'Cuidado / Perigo';
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Há ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `Há ${hours} h ${mins % 60} min`;
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      
      {/* Sidebar Toggle Button (Mobile/Desktop) */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-4 left-4 z-[500] p-2 bg-gray-900 text-white rounded-lg shadow-lg hover:bg-gray-800 transition-colors ${!isSidebarOpen && currentView !== 'map' ? 'hidden md:block' : ''}`}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside 
        className={`absolute inset-y-0 left-0 z-[400] w-80 bg-[#1a1a1a] text-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-5 pt-16 border-b border-gray-800">
          <div className="flex items-center space-x-3 mb-1">
            <div className="bg-orange-600 p-2 rounded-lg">
              <MapPin className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none">AlertaJá</h1>
              <p className="text-xs text-gray-500 mt-1">Cabreúva-SP</p>
            </div>
          </div>
        </div>
        
        {/* Main View Navigation (New) */}
        <div className="p-3 border-b border-gray-800 grid grid-cols-1 gap-2">
            <button
                onClick={() => { setCurrentView('map'); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                className={`p-3 rounded-lg flex items-center space-x-3 text-sm font-medium transition-colors ${currentView === 'map' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            >
                <MapIcon className="w-5 h-5 text-gray-500" />
                <span>Mapa de Alertas</span>
            </button>
            
            <div className="pt-2 pb-1 text-[10px] uppercase font-bold text-gray-600 tracking-wider">Serviços</div>

            <button
                onClick={() => { setCurrentView('find'); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                className={`p-3 rounded-lg flex items-center space-x-3 text-sm font-medium transition-colors ${currentView === 'find' ? 'bg-orange-600/10 text-orange-500' : 'text-gray-400 hover:bg-gray-800'}`}
            >
                <Search className={`w-5 h-5 ${currentView === 'find' ? 'text-orange-500' : 'text-gray-500'}`} />
                <span>Encontrar Motoboy</span>
            </button>

            <button
                onClick={() => { setCurrentView('availability'); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                className={`p-3 rounded-lg flex items-center space-x-3 text-sm font-medium transition-colors ${currentView === 'availability' ? 'bg-orange-600/10 text-orange-500' : 'text-gray-400 hover:bg-gray-800'}`}
            >
                <Bike className={`w-5 h-5 ${currentView === 'availability' ? 'text-orange-500' : 'text-gray-500'}`} />
                <span>Sou Motoboy</span>
            </button>
        </div>

        {/* Tab Navigation (Only relevant for Map View) */}
        {currentView === 'map' && (
            <div className="flex p-2 bg-[#1a1a1a]">
            <button 
                onClick={() => setActiveTab('active')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'active' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            >
                Ativos ({alerts.length})
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            >
                Histórico
            </button>
            </div>
        )}

        {/* Alerts List */}
        {currentView === 'map' && (
             <div className="flex-1 overflow-y-auto p-3 space-y-3 hide-scrollbar">
             {alerts.length === 0 ? (
               <div className="text-center py-10 text-gray-600">
                 <p className="text-sm">Nenhuma ocorrência ativa.</p>
                 <p className="text-xs mt-1">A cidade está tranquila!</p>
               </div>
             ) : (
               alerts.map(alert => (
                 <div 
                   key={alert.id}
                   onClick={() => focusMapOnAlert(alert)}
                   className="bg-[#242424] p-3 rounded-lg border border-gray-800 hover:border-gray-600 cursor-pointer transition-colors group"
                 >
                   <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center space-x-2">
                       <div className="p-1.5 rounded-md bg-opacity-20" style={{ backgroundColor: `${getAlertColor(alert.type)}33` }}>
                         {getAlertIcon(alert.type)}
                       </div>
                       <span className="font-semibold text-gray-200 text-sm">{getAlertLabel(alert.type)}</span>
                     </div>
                     <span className="text-[10px] text-gray-500 flex items-center">
                       <Clock size={10} className="mr-1" />
                       {formatTime(alert.createdAt)}
                     </span>
                   </div>
                   
                   <p className="text-xs text-gray-400 line-clamp-2 mb-2">{alert.street}</p>
                   {alert.description && <p className="text-xs text-gray-500 italic mb-2">"{alert.description}"</p>}
   
                   {/* Actions */}
                   <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800">
                      <div className="flex space-x-2">
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleVote(alert.id, 'confirm'); }}
                           className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-md transition-colors"
                           title="Confirmar (Ainda está lá)"
                         >
                           <RefreshCw size={14} />
                         </button>
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleVote(alert.id, 'remove'); }}
                           className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                           title="Votar para remover (Não está mais)"
                         >
                           <ThumbsDown size={14} />
                         </button>
                      </div>
                      <span className="text-[10px] text-gray-600">por {alert.user}</span>
                   </div>
                 </div>
               ))
             )}
           </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-800 space-y-2 mt-auto">
          {currentView === 'map' && (
             <button 
             onClick={() => setIsModalOpen(true)}
             className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-orange-900/20 transition-all active:scale-95"
           >
             <Plus size={20} />
             <span>Adicionar Alerta</span>
           </button>
          )}
          
          <button 
            onClick={onLogout}
            className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 flex items-center justify-center space-x-1"
          >
            <LogOut size={14} />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 relative transition-all duration-300 overflow-hidden ${isSidebarOpen && window.innerWidth > 768 ? 'ml-80' : ''}`}>
        {/* Map View - Hidden via CSS instead of unmounting to preserve Leaflet state */}
        <div id="main-map" className={`w-full h-full bg-gray-200 ${currentView === 'map' ? 'block' : 'hidden'}`}></div>
        
        {/* Availability View */}
        {currentView === 'availability' && (
            <AvailabilityScreen user={user} onBack={() => setCurrentView('map')} />
        )}

        {/* Find Motoboy View */}
        {currentView === 'find' && (
            <FindMotoboyScreen onBack={() => setCurrentView('map')} />
        )}
      </main>

      {/* Add Alert Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center">
                <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                Novo Alerta
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">
              {/* Mini Map */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Localização</label>
                <div className="h-48 rounded-xl overflow-hidden border border-gray-200 relative">
                   <div id="modal-map" className="w-full h-full bg-gray-100"></div>
                   <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-[10px] z-[1000] shadow">
                     Arraste o pino para ajustar
                   </div>
                </div>
                <div className="flex items-center text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                  <MapPin size={14} className="mr-2 text-orange-500 shrink-0" />
                  <span className="truncate">{newAlertAddress || 'Selecione no mapa...'}</span>
                </div>
              </div>

              {/* Type Selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Tipo de Ocorrência</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'accident', label: 'Acidente', color: 'bg-red-50 text-red-600 border-red-200' },
                    { id: 'blitz', label: 'Blitz', color: 'bg-blue-50 text-blue-600 border-blue-200' },
                    { id: 'traffic', label: 'Trânsito', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
                    { id: 'closed_road', label: 'Rua Fechada', color: 'bg-purple-50 text-purple-600 border-purple-200' },
                    { id: 'danger', label: 'Cuidado', color: 'bg-orange-50 text-orange-600 border-orange-200' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setNewAlertType(type.id as AlertType)}
                      className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                        newAlertType === type.id ? `ring-2 ring-offset-1 ${type.color} border-transparent` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Detalhes (Opcional)</label>
                <textarea
                  value={newAlertDesc}
                  onChange={(e) => setNewAlertDesc(e.target.value)}
                  placeholder="Ex: Duas viaturas, faixa da direita bloqueada..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  rows={2}
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex space-x-3 bg-gray-50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddAlert}
                disabled={isSubmitting || !newAlertLocation}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <span>Adicionar & Enviar</span>
                    <Share2 size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}