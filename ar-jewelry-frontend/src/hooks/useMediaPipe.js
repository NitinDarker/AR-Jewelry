import { useEffect, useRef, useState } from 'react'
import {
  FilesetResolver,
  FaceLandmarker,
  HandLandmarker
} from '@mediapipe/tasks-vision'

export function useMediaPipe (selectedDeviceId) {
  const videoRef = useRef(null)
  const trackingDataRef = useRef({
    faceLandmarker: null,
    handLandmarker: null,
    animationFrameId: null,
    faceLandmarks: null,
    handLandmarks: null
  })
  const [isModelLoaded, setIsModelLoaded] = useState(false)

  useEffect(() => {
    if (!selectedDeviceId) return
    let isActive = true

    async function initTrackingPipeline () {
      setIsModelLoaded(false)
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
      )

      if (!isActive) return

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
      if (videoRef.current && isActive) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    }

    initTrackingPipeline()

    return () => {
      isActive = false
      if (trackingDataRef.current.animationFrameId)
        cancelAnimationFrame(trackingDataRef.current.animationFrameId)
    }
  }, [selectedDeviceId])

  const handleVideoLoad = () => {
    if (!videoRef.current) return
    setIsModelLoaded(true)
    const video = videoRef.current

    function renderTracking () {
      const now = performance.now()
      const { faceLandmarker, handLandmarker } = trackingDataRef.current

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        if (faceLandmarker) {
          const faceResult = faceLandmarker.detectForVideo(video, now)
          trackingDataRef.current.faceLandmarks =
            faceResult.faceLandmarks?.[0] || null
        }
        if (handLandmarker) {
          const handResult = handLandmarker.detectForVideo(video, now)
          trackingDataRef.current.handLandmarks =
            handResult.landmarks?.[0] || null
        }
      }
      trackingDataRef.current.animationFrameId =
        requestAnimationFrame(renderTracking)
    }
    renderTracking()
  }

  return { videoRef, trackingDataRef, isModelLoaded, handleVideoLoad }
}
