import React from 'react'

interface VolumeGaugeProps {
  volume: number
}

export const VolumeGauge: React.FC<VolumeGaugeProps> = ({ volume }) => {
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-green-500 transition-all duration-100 ease-in-out"
        style={{ width: `${Math.min(100, volume * 100)}%` }}
      />
    </div>
  )
}

