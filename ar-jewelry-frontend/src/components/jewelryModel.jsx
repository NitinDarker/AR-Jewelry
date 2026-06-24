import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function JewelryModel({ trackingDataRef, activeJewelry }) {
  const meshRef = useRef();
  const { viewport } = useThree();

  // Dynamically load the 2D texture. Returns a blank texture if URL is null.
  const texture = useMemo(() => {
    if (!activeJewelry?.url) return new THREE.Texture();
    const loader = new THREE.TextureLoader();
    return loader.load(activeJewelry.url);
  }, [activeJewelry?.url]);

  useFrame(() => {
    if (!meshRef.current || !trackingDataRef.current || !activeJewelry) return;

    const { faceLandmarks } = trackingDataRef.current;
    
    if (activeJewelry.type === 'necklace' && faceLandmarks) {
      const chin = faceLandmarks[152];
      const leftJaw = faceLandmarks[132];
      const rightJaw = faceLandmarks[361];

      // Coordinate mapping from normalized MediaPipe to Three.js world space
      const x = (chin.x - 0.5) * viewport.width;
      const y = -(chin.y - 0.5) * viewport.height - (viewport.height * 0.15); // Offset down
      
      const faceWidth = Math.abs(rightJaw.x - leftJaw.x);
      const z = (faceWidth * 10) - 5; // Fake depth
      const roll = Math.atan2(rightJaw.y - leftJaw.y, rightJaw.x - leftJaw.x);

      // Lerp for smooth tracking
      meshRef.current.position.lerp(new THREE.Vector3(-x, y, z), 0.4);
      meshRef.current.rotation.z = -roll;
      
      // Scale plane to match face width relative to viewport
      const scale = faceWidth * viewport.width * 1.2;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, 1), 0.4);
    }
  });

  if (!activeJewelry || activeJewelry.type !== 'necklace') return null;

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      {/* Basic material ensures it doesn't need 3D lights to be visible, DoubleSide shows it from behind */}
      <meshBasicMaterial map={texture} transparent={true} side={THREE.DoubleSide} depthTest={false} />
    </mesh>
  );
}