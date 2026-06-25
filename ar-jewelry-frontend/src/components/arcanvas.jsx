import React, { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';

import CameraBar from './cameraBar';
import ActionSidebar from './actionSidebar';
import JewelryModel from './jewelryModel';
import { useInventory } from '../hooks/useInventory';
import { useMediaPipe } from '../hooks/useMediaPipe';

export default function ARCanvas() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [activeJewelry, setActiveJewelry] = useState(null);
  
  const { inventory } = useInventory();
  
  // Custom Hook replaces 60 lines of bloated ML logic
  const { videoRef, trackingDataRef, isModelLoaded, handleVideoLoad } = useMediaPipe(selectedDeviceId);

  useEffect(() => {
    async function getCameras() {
      const dev = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = dev.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0) setSelectedDeviceId(videoDevices[0].deviceId);
    }
    navigator.mediaDevices.getUserMedia({ video: true }).then(getCameras).catch(console.error);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans">
      <video ref={videoRef} onLoadedData={handleVideoLoad} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] z-0" playsInline muted autoPlay />

      <div className="absolute inset-0 z-10 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }} gl={{ alpha: true }}>
          <Suspense fallback={null}>
             {/* JewelryModel is safely inside the Canvas context now */}
             <JewelryModel trackingDataRef={trackingDataRef} activeJewelry={activeJewelry} />
          </Suspense>
        </Canvas>
      </div>

      {!isModelLoaded && selectedDeviceId && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black px-6 py-3 rounded-lg shadow-2xl z-50 font-bold animate-pulse">
          Initializing Camera & AI...
        </div>
      )}

      <ActionSidebar inventory={inventory} setActiveJewelry={setActiveJewelry} isModelLoaded={isModelLoaded} />
      <CameraBar devices={devices} selectedDeviceId={selectedDeviceId} setSelectedDeviceId={setSelectedDeviceId} />
    </div>
  );
}