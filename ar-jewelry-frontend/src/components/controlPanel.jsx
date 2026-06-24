import React from 'react';

export default function ControlPanel({ 
  devices, 
  selectedDeviceId, 
  setSelectedDeviceId, 
  isModelLoaded, 
  inventory, 
  setActiveJewelry, 
  handleUpload 
}) {
  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-[95%] max-w-2xl bg-gray-900/70 backdrop-blur-lg border border-gray-600 p-4 rounded-2xl shadow-2xl z-50 flex flex-col gap-4">
      
      <div className="w-full">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Camera Source</label>
        <select 
          className="w-full bg-gray-800/80 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none transition"
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {inventory.length > 0 ? (
            inventory.map((item) => (
              <button 
                key={item.id}
                className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 transition rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg" 
                disabled={!isModelLoaded}
                onClick={() => setActiveJewelry({ type: item.type, url: item.url })}>
                Try {item.name}
              </button>
            ))
          ) : (
            <span className="text-sm text-gray-400 py-2">No database inventory.</span>
          )}
        </div>
        
        <div className="relative overflow-hidden">
          <button className="px-4 py-2 text-sm font-bold bg-violet-600 hover:bg-violet-500 transition rounded-lg disabled:opacity-50 shadow-lg w-full sm:w-auto">
            Upload Custom
          </button>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleUpload} 
            disabled={!isModelLoaded}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
          />
        </div>
      </div>
    </div>
  );
}