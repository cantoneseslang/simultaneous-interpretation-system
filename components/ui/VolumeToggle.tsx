import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface VolumeToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}

const VolumeToggle = ({ enabled, onChange, className = '' }: VolumeToggleProps) => {
  return (
    <div className={`toggle relative h-10 w-10 ${className}`}>
      <input
        type="checkbox"
        checked={enabled}
        onChange={e => onChange(e.target.checked)}
        className="absolute inset-0 z-10 cursor-pointer opacity-0"
      />
      <div className="button absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full
        bg-gradient-to-b from-gray-100 to-gray-200
        transition-all duration-300
        shadow-[0_15px_25px_-4px_rgba(0,0,0,0.5),inset_0_-3px_4px_-1px_rgba(0,0,0,0.2),0_-10px_15px_-1px_rgba(255,255,255,0.6),inset_0_3px_4px_-1px_rgba(255,255,255,0.2),inset_0_0_5px_1px_rgba(255,255,255,0.8),inset_0_20px_30px_0_rgba(255,255,255,0.2)]
        active:shadow-[0_12px_25px_-4px_rgba(0,0,0,0.4),inset_0_-8px_30px_1px_rgba(255,255,255,0.9),0_-10px_15px_-1px_rgba(255,255,255,0.6),inset_0_8px_25px_0_rgba(0,0,0,0.4),inset_0_0_10px_1px_rgba(255,255,255,0.6)]
        group-active:filter group-active:blur-[0.5px]"
      />
      <div className="label absolute inset-0 flex items-center justify-center">
        {enabled ? (
          <Volume2 className="h-5 w-5 text-blue-500 transition-colors" />
        ) : (
          <VolumeX className="h-5 w-5 text-gray-400 transition-colors" />
        )}
      </div>
    </div>
  );
};

export default VolumeToggle;