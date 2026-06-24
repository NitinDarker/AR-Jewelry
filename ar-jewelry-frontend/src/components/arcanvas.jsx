import React, { useEffect, useRef, useState } from 'react'
import {
  FilesetResolver,
  FaceLandmarker,
  HandLandmarker
} from '@mediapipe/tasks-vision'
import { Canvas } from '@react-three/fiber'
import ControlPanel from './ControlPanel'
import { useInventory } from '../hooks/useInventory'
import JewelryModel from './jewelryModel'
import BgWorker from '../workers/bgRemoval.js?worker'

export default function ARCanvas () {
  const videoRef = useRef(null)

  const [isProcessing, setIsProcessing] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [fatalError, setFatalError] = useState(null)
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [activeJewelry, setActiveJewelry] = useState(null)

  const { inventory } = useInventory()

  // Decoupled state for the 3D loop
  const trackingDataRef = useRef({
    faceLandmarker: null,
    handLandmarker: null,
    animationFrameId: null,
    faceLandmarks: null,
    handLandmarks: null
  })

  useEffect(() => {
    async function getCameras () {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true })
        const dev = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = dev.filter(d => d.kind === 'videoinput')
        setDevices(videoDevices)
        if (videoDevices.length > 0)
          setSelectedDeviceId(videoDevices[0].deviceId)
      } catch (err) {
        setFatalError('Camera permission denied. Cannot list devices.')
      }
    }
    getCameras()
  }, [])

  useEffect(() => {
    if (!selectedDeviceId) return

    async function initTrackingPipeline () {
      try {
        setIsModelLoaded(false)
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
        )

        trackingDataRef.current.faceLandmarker =
          await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`
            },
            runningMode: 'VIDEO',
            outputFaceBlendshapes: false
          })

        trackingDataRef.current.handLandmarker =
          await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`
            },
            runningMode: 'VIDEO',
            numHands: 1
          })

        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(track => track.stop())
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedDeviceId } }
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current
            .play()
            .catch(e =>
              console.warn(
                'Firefox aborted fetch during React reconciliation. Safe to ignore.',
                e
              )
            )
        }
      } catch (err) {
        setFatalError(err.message || 'Hardware access denied.')
      }
    }

    initTrackingPipeline()

    return () => {
      if (trackingDataRef.current.animationFrameId)
        cancelAnimationFrame(trackingDataRef.current.animationFrameId)
    }
  }, [selectedDeviceId])

  // Stripped out the 2D canvas drawing entirely. This loop ONLY crunches ML coordinates now.
  const handleVideoLoad = () => {
    if (!videoRef.current) return
    setIsModelLoaded(true)
    const video = videoRef.current

    function renderTracking () {
      const now = performance.now()
      const { faceLandmarker, handLandmarker } = trackingDataRef.current

      // Only run inference if the video has actual dimensions
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        if (faceLandmarker) {
          const faceResult = faceLandmarker.detectForVideo(video, now)
          trackingDataRef.current.faceLandmarks =
            faceResult.faceLandmarks?.length > 0
              ? faceResult.faceLandmarks[0]
              : null
        }
        if (handLandmarker) {
          const handResult = handLandmarker.detectForVideo(video, now)
          trackingDataRef.current.handLandmarks =
            handResult.landmarks?.length > 0 ? handResult.landmarks[0] : null
        }
      }
      trackingDataRef.current.animationFrameId =
        requestAnimationFrame(renderTracking)
    }
    renderTracking()
  }

  const handleUpload = e => {
    if (!e.target.files?.[0]) return
    setIsProcessing(true)
    const worker = new BgWorker()
    worker.onmessage = event => {
      if (event.data.success) {
        setActiveJewelry({
          type: 'necklace',
          url: URL.createObjectURL(event.data.blob)
        })
      }
      setIsProcessing(false)
      worker.terminate()
    }
    worker.postMessage(e.target.files[0])
  }

  return (
    <div className='relative w-screen h-screen overflow-hidden bg-black text-white'>
      {/* 1. Base Layer: Visible, Mirrored Fullscreen Video Feed */}
      <video
        ref={videoRef}
        onLoadedData={handleVideoLoad}
        className='absolute inset-0 w-full h-full object-cover transform scale-x-[-1] z-0'
        playsInline
        muted
        autoPlay
      />

      {/* 2. WebGL Layer: Transparent 3D Canvas Rendering on Top */}
      <div className='absolute inset-0 z-10 pointer-events-none'>
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }} gl={{ alpha: true }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <JewelryModel
            trackingDataRef={trackingDataRef}
            activeJewelry={activeJewelry}
          />
        </Canvas>
      </div>

      {/* 3. UI Layer: Modals and Loaders */}
      {!isModelLoaded && selectedDeviceId && (
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black px-6 py-3 rounded-lg shadow-2xl z-50 font-bold animate-pulse'>
          Initializing Stream & AI Pipeline...
        </div>
      )}

      {fatalError && (
        <div className='absolute inset-0 bg-black/90 flex items-center justify-center z-100 p-4'>
          <div className='bg-red-600 p-6 rounded-lg max-w-xl text-center border-2 border-red-400'>
            <h2 className='text-2xl font-bold mb-2'>System Failure</h2>
            <p className='text-red-100'>{fatalError}</p>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className='absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-md z-40'>
          <span className='text-xl font-bold animate-pulse'>
            Segmenting asset background via WASM...
          </span>
        </div>
      )}

      {/* 4. Controls Layer */}
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
  )
}
