import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PlaneType = 'rocket' | 'jet' | 'spaceship' | 'helicopter';

export interface PlaneConfig {
  id: PlaneType;
  name: string;
  svg: string;
  color: string;
}

export const PLANES: PlaneConfig[] = [
  {
    id: 'rocket',
    name: 'Rocket',
    color: '#f59e0b',
    svg: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8IS0tIEJvZHkgLS0+CiAgPHBhdGggZD0iTTMyIDBoNHYxMmgtOHYtMTJ6bTAgMTJoNHYxMmgtOHYtMTJ6IiBmaWxsPSIjZmZmIi8+CiAgPHBhdGggZD0iTTM0IDhoMHYzMmgtOHYtMzJ6IiBmaWxsPSIjZWVlIi8+CiAgPCEtLSBXaW5ncyAtLT4KICA8cGF0aCBkPSJNMjAgMjBoNHYzMmgtNHYtMzJ6IiBmaWxsPSIjZTVlNWU1Ii8+CiAgPHBhdGggZD0iTTQwIDIwaDR2MzJoLTR2LTMyeiIgZmlsbD0iI2U1ZTVlNSIvPgogIDwhLS0gVGFpbCAtLT4KICA8cGF0aCBkPSJNMzIgNDRoNHYxNmgtOHYtMTZ6IiBmaWxsPSIjZTVlNWU1Ii8+CiAgPCEtLSBDb2NrUGl0IC0tPgogIDxwYXRoIGQ9Ik0zMiA4YzEuMSAwIDIgLjkgMiAydjZoLTQgVjEwYzAtMSAuOS0yIDItMnoiIGZpbGw9IiNjY2MiLz4KPC9zdmc+`,
  },
  {
    id: 'jet',
    name: 'Fighter Jet',
    color: '#3b82f6',
    svg: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8IS0tIEJvZHkgLS0+CiAgPHBhdGggZD0iTTEwIDMyaDQwdjJoLTQweiIgZmlsbD0iIzU1NSIvPgogIDxwYXRoIGQ9Ik0xMCAzNGg0MHYySDl2LTJ6IiBmaWxsPSIjMzQ5NWY2Ii8+CiAgPHBhdGggZD0iTTI0IDMyaDZ2OGgtNnoiIGZpbGw9IiM2Njk3ODkiLz4KICA8cGF0aCBkPSJNMzYgMzJoNnY4aC02eiIgZmlsbD0iIzY2OTc4OSIvPgogIDwhLS0gV2luZ3MgLS0+CiAgPHBhdGggZD0iTTIgMjBoNHYxNmgtNHoiIGZpbGw9IiM0NDQiLz4KICA8cGF0aCBkPSJNNDggMjBoNHYxNmgtNHoiIGZpbGw9IiM0NDQiLz4KICA8IS0tIENvY2twaXQgLS0+CiAgPHBhdGggZD0iTTMyIDEyaDZ2OGgtNnoiIGZpbGw9IiMwMDAiLz4KICA8IS0tIEV4aGF1c3QgLS0+CiAgPHBhdGggZD0iTTEwIDMyaDZ2MTBoLTZ6IiBmaWxsPSIjZmY3Ii8+CiAgPHBhdGggZD0iTTQ0IDMyaDZ2MTBoLTZ6IiBmaWxsPSIjZmY3Ii8+Cjwvc3ZnPg==`,
  },
  {
    id: 'spaceship',
    name: 'Spaceship',
    color: '#8b5cf6',
    svg: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8IS0tIEJvZHkgLS0+CiAgPHBhdGggZD0iTTMyIDEyaDZ2NDBoLTZ6IiBmaWxsPSIjZTZlNmU2Ii8+CiAgPHBhdGggZD0iTTI2IDMyaDZ2MjBoLTZ6IiBmaWxsPSIjZTY5M2NmIi8+CiAgPCEtLSBXaW5ncyAtLT4KICA8cGF0aCBkPSJNMzIgNThoNHYyaC00eiIgZmlsbD0iI2U2MTkzYyIvPgogIDxwYXRoIGQ9Ik0yMCAyNGg0djE2aC00eiIgZmlsbD0iI2U2MTkzYyIvPgogIDxwYXRoIGQ9IjQwIDI0aDR2MTZoLTReqIiBmaWxsPSIjZTYxOTNjIi8+CiAgPCEtLSBDb2NrUGl0IC0tPgogIDxwYXRoIGQ9Ik0yOCAxMmg0djhoLTQtMTAtNHoiIGZpbGw9IiMwMDAiLz4KICA8IS0tIERlcmliZSAtLT4KICA8cGF0aCBkPSJNMzIgMjBoNHYyaC00eiIgZmlsbD0iIzMzMyIvPgo8L3N2Zz4=`,
  },
  {
    id: 'helicopter',
    name: 'Helicopter',
    color: '#10b981',
    svg: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8IS0tIFJvdG9yIC0tPgogIDxwYXRoIGQ9Ik0zMiAyMHY0MHYtNDB6IiBmaWxsPSIjNjY2Ii8+CiAgPHBhdGggZD0iTTI4IDIyaDZ2MzRoLTZ6IiBmaWxsPSIjNDQ0Ii8+CiAgPCEtLSBCb2R5IC0tPgogIDxwYXRoIGQ9Ik0yMCAzNGgxNHYxMmgtMTR6IiBmaWxsPSIjMzMzIi8+CiAgPHBhdGggZD0iTTI0IDM2aDl2OGgtOXoiIGZpbGw9IiM0NDQiLz4KICA8IS0tIFRhaWwgLS0+CiAgPHBhdGggZD0iTTMwIDQ2djEyaC00eiIgZmlsbD0iIzU1NSIvPgogIDwhLS0gU2tpbSAtLT4KICA8cGF0aCBkPSJNMzIgMThoNHYyaC00eiIgZmlsbD0iIzMzMyIvPgo8L3N2Zz4=`,
  },
];

interface PlaneStore {
  selectedPlane: PlaneType;
  setSelectedPlane: (plane: PlaneType) => void;
}

export const usePlaneStore = create<PlaneStore>()(
  persist(
    (set) => ({
      selectedPlane: 'rocket',
      setSelectedPlane: (plane) => set({ selectedPlane: plane }),
    }),
    {
      name: 'aviator-plane-selection',
    }
  )
);
