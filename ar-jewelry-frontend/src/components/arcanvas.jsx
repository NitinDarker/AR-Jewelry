import React, { useEffect, useRef, useState, Suspense } from 'react';
import { FilesetResolver, FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';
import { Canvas } from '@react-three/fiber';

import CameraBar from './cameraBar';
import ActionSidebar from './actionSidebar';
import JewelryModel from './jewelryModel';
import { useInventory } from '../hooks/useInventory';
import BgWorker from '../workers/bgRemoval.js?worker';

export default function ARCanvas() {
  const videoRef = useRef(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  
  const [activeJewelry, setActiveJewelry] = useState(null);
  const trackingDataRef = useRef({ faceLandmarker: null, handLandmarker: null, animationFrameId: null, faceLandmarks: null, handLandmarks: null });

  const { inventory } = useInventory();

  useEffect(() => {
    async function getCameras() {
      const dev = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = dev.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0) setSelectedDeviceId(videoDevices[0].deviceId);
    }
    navigator.mediaDevices.getUserMedia({ video: true }).then(getCameras).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) return;
    let isActive = true;

    async function initTrackingPipeline() {
      setIsModelLoaded(false);
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm");
      
      if (!isActive) return;
      trackingDataRef.current.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task` },
        runningMode: "VIDEO", outputFaceBlendshapes: false
      });
      
      trackingDataRef.current.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task` },
        runningMode: "VIDEO", numHands: 1
      });

      if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedDeviceId } } });
      if (videoRef.current && isActive) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }
    initTrackingPipeline();
    return () => { isActive = false; };
  }, [selectedDeviceId]);

  const handleVideoLoad = () => {
    if (!videoRef.current) return;
    setIsModelLoaded(true);
    const video = videoRef.current;

    function renderTracking() {
      const now = performance.now();
      const { faceLandmarker, handLandmarker } = trackingDataRef.current;
      
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        if (faceLandmarker) {
          const faceResult = faceLandmarker.detectForVideo(video, now);
          trackingDataRef.current.faceLandmarks = faceResult.faceLandmarks?.[0] || null;
        }
        if (handLandmarker) {
          const handResult = handLandmarker.detectForVideo(video, now);
          trackingDataRef.current.handLandmarks = handResult.landmarks?.[0] || null;
        }
      }
      trackingDataRef.current.animationFrameId = requestAnimationFrame(renderTracking);
    }
    renderTracking();
  };

  const handleUpload = (e, selectedType) => {
    if (!e.target.files?.[0]) return;
    setIsProcessing(true);
    
    const worker = new BgWorker();
    worker.onmessage = (event) => {
      if (event.data.success) {
        setActiveJewelry({ type: selectedType, url: URL.createObjectURL(event.data.blob) });
      } else {
        alert("Background removal failed.");
      }
      setIsProcessing(false);
      worker.terminate(); 
    };
    worker.postMessage(e.target.files[0]);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans">
      <video ref={videoRef} onLoadedData={handleVideoLoad} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] z-0" playsInline muted autoPlay />

      <div className="absolute inset-0 z-10 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }} gl={{ alpha: true }}>
          <Suspense fallback={null}>
             <JewelryModel trackingDataRef={trackingDataRef} activeJewelry={activeJewelry} />
          </Suspense>
        </Canvas>
      </div>

      {!isModelLoaded && selectedDeviceId && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black px-6 py-3 rounded-lg shadow-2xl z-50 font-bold animate-pulse">
          Initializing Camera & AI...
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-100">
          <span className="text-xl font-bold animate-pulse text-violet-400">Removing Image Background...</span>
        </div>
      )}

      <ActionSidebar inventory={inventory} setActiveJewelry={setActiveJewelry} handleUpload={handleUpload} isModelLoaded={isModelLoaded} />
      <CameraBar devices={devices} selectedDeviceId={selectedDeviceId} setSelectedDeviceId={setSelectedDeviceId} />
    </div>
  );
}