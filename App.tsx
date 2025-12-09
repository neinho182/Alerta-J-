import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { User } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved session
    const savedUser = localStorage.getItem('alertaJaUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('alertaJaUser');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (user: User, remember: boolean) => {
    setCurrentUser(user);
    if (remember) {
      localStorage.setItem('alertaJaUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('alertaJaUser');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('alertaJaUser');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {currentUser ? (
        <Dashboard user={currentUser} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </div>
  );
}