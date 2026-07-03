import React, { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';

import CameraBar from './cameraBar';
import ActionSidebar from './actionSidebar';
import TrackingVisualizer from './jewelryModel';
import { useInventory } from '../hooks/useInventory';
import { useMediaPipe } from '../hooks/useMediaPipe';

export default function ARCanvas() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [activeJewelry, setActiveJewelry] = useState(null);
  const [fatalError, setFatalError] = useState(null);
  
  const { inventory } = useInventory();
  const { videoRef, trackingDataRef, isModelLoaded, handleVideoLoad } = useMediaPipe(selectedDeviceId);

  useEffect(() => {
    async function getCameras() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const dev = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = dev.filter(d => d.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
          throw new Error("No video input devices found on this machine.");
        }
        
        setDevices(videoDevices);
        setSelectedDeviceId(videoDevices[0].deviceId);
      } catch (err) {
        setFatalError(`${err.name}: ${err.message}`);
      }
    }
    getCameras();
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans">
      
      {fatalError ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-900/90 backdrop-blur-md flex-col text-center p-8">
          <h1 className="text-4xl font-bold mb-4 text-white">Camera Access Denied</h1>
          <p className="font-mono text-red-200 bg-black/50 p-4 rounded mb-4">{fatalError}</p>
          <p className="text-lg">Check your browser site permissions, disable strict tracking protection, or close whatever app is hogging your webcam.</p>
        </div>
      ) : (
        <video ref={videoRef} onLoadedData={handleVideoLoad} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] z-0" playsInline muted autoPlay />
      )}

      <div className="absolute inset-0 z-10 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }} gl={{ alpha: true }}>
          <Suspense fallback={null}>
             <TrackingVisualizer trackingDataRef={trackingDataRef} activeJewelry={activeJewelry} />
          </Suspense>
        </Canvas>
      </div>

      {!isModelLoaded && selectedDeviceId && !fatalError && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black px-6 py-3 rounded-lg shadow-2xl z-50 font-bold animate-pulse">
          Initializing Camera & AI...
        </div>
      )}

      <ActionSidebar inventory={inventory} setActiveJewelry={setActiveJewelry} isModelLoaded={isModelLoaded} />
      <CameraBar devices={devices} selectedDeviceId={selectedDeviceId} setSelectedDeviceId={setSelectedDeviceId} />
    </div>
  );
}