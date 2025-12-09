import React, { useState, useEffect } from 'react';
import { User, MotoboyStatus, PublicMotoboy } from '../types';
import { User as UserIcon, Phone, MapPin, Bike, CheckCircle, Power, ArrowLeft } from 'lucide-react';

interface AvailabilityScreenProps {
  user: User;
  onBack: () => void;
}

const CABREUVA_REGIONS = [
  "Jacaré",
  "Centro",
  "Pinhal",
  "Bonfim",
  "Vilarejo",
  "Bananal",
  "Caí",
  "Vale Verde",
  "Outra"
];

export default function AvailabilityScreen({ user, onBack }: AvailabilityScreenProps) {
  const [region, setRegion] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for existing status
    const savedStatus = localStorage.getItem(`motoboyStatus_${user.phone}`);
    if (savedStatus) {
      const status: MotoboyStatus = JSON.parse(savedStatus);
      // Only keep active if less than 8 hours old
      if (Date.now() - status.lastUpdated < 8 * 60 * 60 * 1000) {
        setIsAvailable(status.isAvailable);
        setRegion(status.region);
      }
    }
  }, [user.phone]);

  const handleToggleAvailability = () => {
    if (!region && !isAvailable) {
      setSuccessMsg(null);
      alert("Por favor, selecione uma região.");
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const newStatus = !isAvailable;
      setIsAvailable(newStatus);
      const now = Date.now();
      
      const statusData: MotoboyStatus = {
        isAvailable: newStatus,
        region: region,
        lastUpdated: now
      };

      // 1. Save Personal Status
      if (newStatus) {
        localStorage.setItem(`motoboyStatus_${user.phone}`, JSON.stringify(statusData));
        setSuccessMsg(`Você está visível para corridas em ${region}!`);
      } else {
        localStorage.removeItem(`motoboyStatus_${user.phone}`);
        setSuccessMsg(null);
      }

      // 2. Update Public List (for "Find Motoboy" screen)
      const publicListJson = localStorage.getItem('alertaJaMotoboys');
      let publicList: PublicMotoboy[] = publicListJson ? JSON.parse(publicListJson) : [];

      // Remove current user from list first (to avoid duplicates or remove if going offline)
      publicList = publicList.filter(m => m.phone !== user.phone);

      if (newStatus) {
        // Add to list
        publicList.push({
          username: user.username,
          phone: user.phone,
          region: region,
          lastUpdated: now
        });
      }

      localStorage.setItem('alertaJaMotoboys', JSON.stringify(publicList));

      setLoading(false);
    }, 600);
  };

  return (
    <div className="w-full h-full bg-gray-100 flex flex-col overflow-y-auto">
      {/* Header Mobile */}
      <div className="bg-white p-4 shadow-sm flex items-center md:hidden">
        <button onClick={onBack} className="mr-3 text-gray-600">
          <ArrowLeft />
        </button>
        <h2 className="font-bold text-gray-800">Área do Motoboy</h2>
      </div>

      <div className="flex-1 p-4 md:p-8 flex items-start justify-center">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          
          {/* Hero Header */}
          <div className="bg-[#1a1a1a] p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Bike size={120} />
            </div>
            <div className="relative z-10">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bike className="text-orange-500" />
                Anunciar Disponibilidade
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Informe sua região para receber chamadas de corridas e entregas.
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            
            {/* Status Indicator */}
            <div className={`rounded-xl p-4 flex items-center gap-4 transition-colors ${isAvailable ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`p-3 rounded-full ${isAvailable ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                {isAvailable ? <CheckCircle size={24} /> : <Power size={24} />}
              </div>
              <div>
                <h3 className={`font-bold ${isAvailable ? 'text-green-800' : 'text-gray-700'}`}>
                  {isAvailable ? 'Disponível para Corridas' : 'Indisponível (Offline)'}
                </h3>
                <p className="text-sm text-gray-500">
                  {isAvailable 
                    ? `Sua localização está visível em ${region}.` 
                    : 'Ative para aparecer na lista de motoboys.'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Read Only Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Motoboy</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={user.username}
                      readOnly
                      className="block w-full pl-10 pr-3 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Telefone</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={user.phone}
                      readOnly
                      className="block w-full pl-10 pr-3 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Region Selection */}
              <div className="space-y-2 pt-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <MapPin size={16} className="text-orange-600" />
                  Onde você está aguardando corridas?
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  disabled={isAvailable}
                  className={`block w-full p-3 border rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${isAvailable ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300'}`}
                >
                  <option value="" disabled>Selecione sua região/bairro</option>
                  {CABREUVA_REGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Success Message */}
              {successMsg && isAvailable && (
                <div className="bg-green-100 text-green-700 p-3 rounded-lg text-sm text-center font-medium animate-pulse">
                  {successMsg}
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4">
                <button
                  onClick={handleToggleAvailability}
                  disabled={loading}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
                    isAvailable 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' 
                      : 'bg-green-600 hover:bg-green-700 shadow-green-900/20'
                  } ${loading ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {loading ? (
                    'Processando...'
                  ) : isAvailable ? (
                    <>
                      <Power /> Ficar Indisponível (Sair)
                    </>
                  ) : (
                    <>
                      <Bike /> Anunciar Disponibilidade
                    </>
                  )}
                </button>
              </div>

              {!isAvailable && (
                <button onClick={onBack} className="w-full py-3 text-gray-500 font-medium hover:text-gray-800 transition-colors">
                  Cancelar e voltar ao mapa
                </button>
              )}
            </div>
          </div>
          
          {/* Footer Info */}
          <div className="bg-gray-50 p-4 border-t border-gray-100 text-xs text-center text-gray-500">
            Ao ficar disponível, seu número de telefone ficará visível para usuários que buscam entregadores nesta região.
          </div>
        </div>
      </div>
    </div>
  );
}