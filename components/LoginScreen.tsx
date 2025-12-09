import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Phone, User as UserIcon, ShieldCheck, MapPin, Check } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User, remember: boolean) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mask phone number: (11) 91234-5678
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 10) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    } else if (value.length > 0) {
      value = value.replace(/^(\d*)/, '($1');
    }
    
    setPhone(value);
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Simple validation
    if (phone.length < 14) { // (XX) XXXX-XXXX or (XX) XXXXX-XXXX
      setError('Por favor, digite um número de celular válido.');
      return;
    }
    if (username.trim().length < 3) {
      setError('Por favor, digite seu nome de usuário.');
      return;
    }

    setIsSubmitting(true);

    // Simulate network delay for "professional feel"
    setTimeout(() => {
      onLogin({ username, phone }, rememberMe);
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-gray-50 to-orange-50/50">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-orange-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-red-200/20 rounded-full blur-3xl" />

      <div className="w-full max-w-sm bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 p-8 z-10">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="bg-orange-600 p-3 rounded-2xl shadow-lg shadow-orange-500/30 mb-4">
            <MapPin className="text-white w-8 h-8" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AlertaJá <span className="text-orange-600">Cabreúva</span></h1>
          <p className="text-sm text-gray-500 mt-1 text-center">Conectando motoristas e motoboys</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Phone Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider ml-1">Celular</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Username Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider ml-1">Nome de usuário</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Seu apelido ou nome"
                className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 bg-gray-200 rounded-full shadow-inner transition-colors duration-300 ${rememberMe ? 'bg-orange-500' : ''}`}></div>
                <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${rememberMe ? 'translate-x-4' : ''}`}></div>
              </div>
              <span className="ml-3 text-sm text-gray-600 group-hover:text-gray-800 transition-colors select-none">Lembre-se de mim</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm py-2 px-3 rounded-lg flex items-center animate-pulse">
              <ShieldCheck className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-orange-500/30 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              "ENTRAR"
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} AlertaJá Cabreúva. Versão 1.0.0</p>
      </div>
    </div>
  );
}