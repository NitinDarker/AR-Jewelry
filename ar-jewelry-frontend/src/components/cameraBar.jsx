import React from 'react';

export default function CameraBar({ devices, selectedDeviceId, setSelectedDeviceId }) {
  if (devices.length === 0) return null;

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-64 bg-gray-900/80 backdrop-blur-md border border-gray-700 p-3 rounded-2xl shadow-2xl z-50">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">Camera Source</label>
      <select 
        className="w-full bg-black/60 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer"
        value={selectedDeviceId}
        onChange={(e) => setSelectedDeviceId(e.target.value)}
      >
        {devices.map((device, idx) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${idx + 1}`}
          </option>
        ))}
      </select>
    </div>
  );
}