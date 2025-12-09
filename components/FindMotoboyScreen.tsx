import React, { useState, useEffect } from 'react';
import { PublicMotoboy } from '../types';
import { ArrowLeft, User, Phone, MapPin, Search, Clock, MessageCircle } from 'lucide-react';

interface FindMotoboyScreenProps {
  onBack: () => void;
}

export default function FindMotoboyScreen({ onBack }: FindMotoboyScreenProps) {
  const [motoboys, setMotoboys] = useState<PublicMotoboy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load motoboys from local storage
    const loadMotoboys = () => {
        const data = localStorage.getItem('alertaJaMotoboys');
        if (data) {
            const list: PublicMotoboy[] = JSON.parse(data);
            // Filter out stale entries (> 8 hours)
            const now = Date.now();
            const active = list.filter(m => (now - m.lastUpdated) < 8 * 60 * 60 * 1000);
            
            // Clean up storage if we filtered anything
            if (active.length !== list.length) {
                localStorage.setItem('alertaJaMotoboys', JSON.stringify(active));
            }
            setMotoboys(active);
        }
        setIsLoading(false);
    };

    // Simulate network fetch
    setTimeout(loadMotoboys, 500);
  }, []);

  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes} min atrás`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h atrás`;
  };

  const openWhatsApp = (phone: string, name: string) => {
    // Strip non-digits and ensure country code (assuming BR +55)
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    
    const text = `Olá ${name}, vi sua disponibilidade no AlertaJá Cabreúva. Gostaria de solicitar uma corrida.`;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredMotoboys = motoboys.filter(m => 
    m.region.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full h-full bg-gray-100 flex flex-col overflow-y-auto">
      {/* Header Mobile */}
      <div className="bg-white p-4 shadow-sm flex items-center md:hidden sticky top-0 z-10">
        <button onClick={onBack} className="mr-3 text-gray-600">
          <ArrowLeft />
        </button>
        <h2 className="font-bold text-gray-800">Encontrar Motoboy</h2>
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col items-center">
        <div className="w-full max-w-3xl">
            
          {/* Header Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 hidden md:block mb-2">Motoboys Disponíveis</h1>
            <p className="text-gray-500 mb-4">Encontre motoboys próximos aguardando corridas na sua região.</p>
            
            {/* Search Bar */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Filtrar por nome ou região..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm"
                />
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
             <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm animate-pulse h-32">
                        <div className="flex items-center space-x-4">
                            <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                            <div className="flex-1 space-y-2 py-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    </div>
                ))}
             </div>
          ) : filteredMotoboys.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="text-orange-400 w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Nenhum motoboy encontrado</h3>
                <p className="text-gray-500 max-w-sm mx-auto mt-1">
                    {searchTerm 
                        ? `Não encontramos resultados para "${searchTerm}".` 
                        : "Não há motoboys disponíveis no momento. Tente novamente mais tarde."}
                </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {filteredMotoboys.map((motoboy, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-gray-100 p-2.5 rounded-full">
                                        <User className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{motoboy.username}</h3>
                                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                            <Clock className="w-3 h-3 mr-1" />
                                            <span>Atualizado {formatTimeAgo(motoboy.lastUpdated)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded-md font-semibold border border-orange-100 flex items-center">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {motoboy.region}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-50">
                            <button
                                onClick={() => openWhatsApp(motoboy.phone, motoboy.username)}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors active:scale-95"
                            >
                                <MessageCircle className="w-5 h-5" />
                                <span>Chamar no WhatsApp</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}