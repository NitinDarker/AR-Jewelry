import React, { useState } from 'react';

export default function ActionSidebar({ inventory, setActiveJewelry, handleUpload, isModelLoaded }) {
  const [uploadType, setUploadType] = useState('necklace');

  return (
    <div className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-gray-900/80 backdrop-blur-md border border-gray-700 p-3 rounded-2xl shadow-2xl z-50 flex flex-col gap-4">
      
      <div className="flex flex-col gap-2">
        {inventory.length > 0 ? inventory.map((item) => (
          <button 
            key={item.id}
            className="w-20 h-20 flex flex-col items-center justify-center gap-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 transition rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg" 
            disabled={!isModelLoaded}
            onClick={() => {
              if (item.type === 'ring') {
                setActiveJewelry({ type: item.type, urlTop: item.urlTop, urlBottom: item.urlBottom });
              } else {
                setActiveJewelry({ type: item.type, url: item.url });
              }
            }}>
            <span className="text-lg">✨</span>
            <span className="truncate w-16 text-center">{item.name}</span>
          </button>
        )) : (
          <div className="w-20 h-20 flex items-center justify-center text-[10px] text-gray-400 text-center p-1 border border-dashed border-gray-600 rounded-xl">
            No DB Items
          </div>
        )}
      </div>

      <div className="w-full h-px bg-gray-600 my-1" />

      {/* Upload Controls for Fallback Flat Images */}
      <div className="flex flex-col gap-2">
        <select 
          className="w-20 bg-black/60 border border-gray-600 text-white text-[10px] rounded focus:ring-blue-500 focus:border-blue-500 p-1 outline-none"
          value={uploadType}
          onChange={(e) => setUploadType(e.target.value)}
        >
          <option value="necklace">Necklace</option>
          <option value="ring">Ring</option>
        </select>

        <div className="relative overflow-hidden w-20 h-16 rounded-xl shadow-lg">
          <button 
            disabled={!isModelLoaded}
            className="w-full h-full flex flex-col items-center justify-center gap-1 text-xs font-bold bg-violet-600 hover:bg-violet-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
            <span>Upload</span>
          </button>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => handleUpload(e, uploadType)} 
            disabled={!isModelLoaded}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
          />
        </div>
      </div>
    </div>
  );
}