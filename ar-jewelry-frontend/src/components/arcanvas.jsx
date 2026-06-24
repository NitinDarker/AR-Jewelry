import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';
import ControlPanel from './controlPanel';
import { useInventory } from '../hooks/useInventory';

export default function ARCanvas() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [fatalError, setFatalError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [activeJewelry, setActiveJewelry] = useState(null);
  
  const { inventory } = useInventory(); // Custom Hook execution at the top level
  
  const jewelryRef = useRef(null); 
  const trackingDataRef = useRef({ faceLandmarker: null, handLandmarker: null, animationFrameId: null });
  const smoothedPoints = useRef({});
  const ALPHA = 0.25;

  const applyEMA = (key, nextVal) => {
    if (!smoothedPoints.current[key]) {
      smoothedPoints.current[key] = nextVal;
    } else {
      smoothedPoints.current[key] = {
        x: ALPHA * nextVal.x + (1 - ALPHA) * smoothedPoints.current[key].x,
        y: ALPHA * nextVal.y + (1 - ALPHA) * smoothedPoints.current[key].y,
      };
    }
    return smoothedPoints.current[key];
  };

  useEffect(() => {
    jewelryRef.current = activeJewelry;
  }, [activeJewelry]);

  useEffect(() => {
    async function getCameras() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true }); 
        const dev = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = dev.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) setSelectedDeviceId(videoDevices[0].deviceId);
      } catch (err) {
        setFatalError("Camera permission denied. Cannot list devices.");
      }
    }
    getCameras();
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) return;

    async function initTrackingPipeline() {
      try {
        setIsModelLoaded(false);
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm");
        
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

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { deviceId: { exact: selectedDeviceId } } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn("AutoPlay blocked", e));
        }
      } catch (err) {
        setFatalError(err.message || "Hardware access denied.");
      }
    }

    initTrackingPipeline();
    
    return () => {
        if (trackingDataRef.current.animationFrameId) cancelAnimationFrame(trackingDataRef.current.animationFrameId);
    };
  }, [selectedDeviceId]);

  const handleVideoLoad = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsModelLoaded(true);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    const imgElement = new Image();

    function render() {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const now = performance.now();
      const currentJewelry = jewelryRef.current;

      if (currentJewelry && imgElement.src !== currentJewelry.url) {
          imgElement.src = currentJewelry.url;
      }

      if (currentJewelry && imgElement.complete && imgElement.naturalWidth > 0) {
        const { faceLandmarker, handLandmarker } = trackingDataRef.current;

        if ((currentJewelry.type === 'necklace' || currentJewelry.type === 'earrings') && faceLandmarker) {
          const result = faceLandmarker.detectForVideo(video, now);
          if (result.faceLandmarks && result.faceLandmarks.length > 0) {
            const landmarks = result.faceLandmarks[0];
            
            if (currentJewelry.type === 'earrings') {
              const leftEar = applyEMA('leftEar', { x: landmarks[127].x * canvas.width, y: landmarks[127].y * canvas.height });
              ctx.drawImage(imgElement, leftEar.x - 15, leftEar.y, 30, 40);
            } 
            
            if (currentJewelry.type === 'necklace') {
              const chin = applyEMA('chin', { x: landmarks[152].x * canvas.width, y: landmarks[152].y * canvas.height });
              const forehead = landmarks[10].y * canvas.height;
              const faceLength = chin.y - forehead;
              
              const neckY = chin.y + (faceLength * 0.25); 
              const jewelWidth = faceLength * 0.8;
              ctx.drawImage(imgElement, chin.x - (jewelWidth / 2), neckY, jewelWidth, jewelWidth * 0.6);
            }
          }
        }

        if (currentJewelry.type === 'ring' && handLandmarker) {
          const result = handLandmarker.detectForVideo(video, now);
          if (result.landmarks && result.landmarks.length > 0) {
            const landmarks = result.landmarks[0];
            const mcpJoint = applyEMA('mcp', { x: landmarks[13].x * canvas.width, y: landmarks[13].y * canvas.height });
            const pipJoint = applyEMA('pip', { x: landmarks[14].x * canvas.width, y: landmarks[14].y * canvas.height });
            
            const ringSize = Math.hypot(pipJoint.x - mcpJoint.x, pipJoint.y - mcpJoint.y) * 1.2;
            ctx.save();
            ctx.translate(pipJoint.x, pipJoint.y);
            const angle = Math.atan2(pipJoint.y - mcpJoint.y, pipJoint.x - mcpJoint.x);
            ctx.rotate(angle + Math.PI / 2);
            ctx.drawImage(imgElement, -ringSize / 2, -ringSize / 2, ringSize, ringSize);
            ctx.restore();
          }
        }
      }
      trackingDataRef.current.animationFrameId = requestAnimationFrame(render);
    }
    render();
  };

  const handleUpload = (e) => {
    if (!e.target.files?.[0]) return;
    setIsProcessing(true);
    const worker = new Worker(new URL('../workers/bgRemoval.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      if (event.data.success) {
        setActiveJewelry({ type: 'necklace', url: URL.createObjectURL(event.data.blob) });
      }
      setIsProcessing(false);
      worker.terminate(); 
    };
    worker.postMessage(e.target.files[0]);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white">
      <video ref={videoRef} onLoadedData={handleVideoLoad} className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none -z-10" playsInline muted autoPlay />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] z-0" />

      {!isModelLoaded && selectedDeviceId && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black px-6 py-3 rounded-lg shadow-2xl z-50 font-bold animate-pulse">
          Initializing Stream & AI Pipeline...
        </div>
      )}

      {fatalError && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
          <div className="bg-red-600 p-6 rounded-lg max-w-xl text-center border-2 border-red-400">
            <h2 className="text-2xl font-bold mb-2">System Failure</h2><p className="text-red-100">{fatalError}</p>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-md z-40">
          <span className="text-xl font-bold animate-pulse">Segmenting asset background via WASM...</span>
        </div>
      )}

      <ControlPanel 
        devices={devices} 
        selectedDeviceId={selectedDeviceId} 
        setSelectedDeviceId={setSelectedDeviceId} 
        isModelLoaded={isModelLoaded} 
        inventory={inventory} 
        setActiveJewelry={setActiveJewelry} 
        handleUpload={handleUpload} 
      />
    </div>
  );
}