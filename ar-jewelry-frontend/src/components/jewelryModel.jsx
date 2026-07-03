import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function TrackingVisualizer({ trackingDataRef }) {
  const fingerMarkerRef = useRef();
  const neckMarkerRef = useRef();
  const { viewport } = useThree();

  useFrame(() => {
    if (!trackingDataRef.current) return;
    const { handLandmarks, faceLandmarks } = trackingDataRef.current;

    // --- FINGER TRACKING (RED) ---
    if (handLandmarks && fingerMarkerRef.current) {
      const mcp = handLandmarks[13]; 
      const pip = handLandmarks[14]; 

      const x = (pip.x - 0.5) * viewport.width;
      const y = -(pip.y - 0.5) * viewport.height;
      const angle = Math.atan2(-(pip.y - mcp.y), -(pip.x - mcp.x)); 

      fingerMarkerRef.current.position.lerp(new THREE.Vector3(-x, y, 1), 0.4);
      fingerMarkerRef.current.rotation.z = angle + Math.PI / 2;
    } else if (fingerMarkerRef.current) {
      // Throw it off-screen when no hand is detected
      fingerMarkerRef.current.position.lerp(new THREE.Vector3(999, 999, -10), 1);
    }

    // --- NECK TRACKING (GREEN) ---
    if (faceLandmarks && neckMarkerRef.current) {
      const chin = faceLandmarks[152];
      const lowerLip = faceLandmarks[17];
      const leftJaw = faceLandmarks[132];
      const rightJaw = faceLandmarks[361];

      // Measure the face to build a dynamic bounding box
      const faceWidth = Math.abs(rightJaw.x - leftJaw.x);
      const jawHeight = Math.abs(chin.y - lowerLip.y); 

      // Offset downward by 1.5x the jaw height to target the collarbone
      const x = (chin.x - 0.5) * viewport.width;
      const y = -(chin.y - 0.5 + (jawHeight * 1.5)) * viewport.height;
      const roll = Math.atan2(rightJaw.y - leftJaw.y, rightJaw.x - leftJaw.x);

      // Scale the green box dynamically relative to the face size
      const targetWidth = faceWidth * viewport.width * 1.8;
      const targetHeight = jawHeight * viewport.height * 2.5;

      neckMarkerRef.current.position.lerp(new THREE.Vector3(-x, y, 1), 0.4);
      neckMarkerRef.current.rotation.z = -roll;
      neckMarkerRef.current.scale.lerp(new THREE.Vector3(targetWidth, targetHeight, 1), 0.4);
    } else if (neckMarkerRef.current) {
      neckMarkerRef.current.position.lerp(new THREE.Vector3(999, 999, -10), 1);
    }
  });

  return (
    <>
      {/* FINGER HIGHLIGHT (Static Size) */}
      <mesh ref={fingerMarkerRef}>
        <planeGeometry args={[0.8, 1.6]} />
        <meshBasicMaterial color="#FF0000" depthTest={false} transparent={true} opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* NECK HIGHLIGHT (Dynamically Scaled) */}
      <mesh ref={neckMarkerRef}>
        <planeGeometry args={[0.6, 1]} />
        <meshBasicMaterial color="#00FF00" depthTest={false} transparent={true} opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}