export interface User {
  username: string;
  phone: string;
}

export type AlertType = 'accident' | 'blitz' | 'traffic' | 'closed_road' | 'danger';

export interface Alert {
  id: string;
  type: AlertType;
  description: string;
  street: string;
  lat: number;
  lng: number;
  createdAt: number; // timestamp
  votes: number;
  user: string; // username
}

export interface MotoboyStatus {
  isAvailable: boolean;
  region: string;
  lastUpdated: number;
}

export interface PublicMotoboy {
  username: string;
  phone: string;
  region: string;
  lastUpdated: number;
}