import React from 'react';
import { X, Zap, Rocket, Plane, Wind } from 'lucide-react';
import { usePlaneStore, PLANES, type PlaneType } from '@/hooks/use-plane-selection';

interface PlaneSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlaneSelector({ isOpen, onOpenChange }: PlaneSelectorProps) {
  const { selectedPlane, setSelectedPlane } = usePlaneStore();

  const getPlaneIcon = (id: PlaneType) => {
    switch (id) {
      case 'rocket': return <Rocket className="w-5 h-5" />;
      case 'jet': return <Plane className="w-5 h-5" />;
      case 'spaceship': return <Zap className="w-5 h-5" />;
      case 'helicopter': return <Wind className="w-5 h-5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider font-mono">Select Vehicle</h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase">Choose your aircraft</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        
        <div className="p-4 grid grid-cols-2 gap-3">
          {PLANES.map((plane) => (
            <button
              key={plane.id}
              onClick={() => {
                setSelectedPlane(plane.id);
                onOpenChange(false);
              }}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-200
                ${selectedPlane === plane.id 
                  ? 'border-amber-500 bg-amber-500/10 scale-105' 
                  : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'
                }
              `}
            >
              {selectedPlane === plane.id && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
              )}
              <div 
                className="w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${plane.color}20` }}
              >
                <div style={{ color: plane.color }}>
                  {getPlaneIcon(plane.id)}
                </div>
              </div>
              <p className="font-mono text-xs font-bold text-center">{plane.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
