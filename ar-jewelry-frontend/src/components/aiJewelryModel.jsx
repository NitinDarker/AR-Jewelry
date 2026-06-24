import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function JewelryModel({ trackingDataRef, activeJewelry }) {
  const necklaceRef = useRef();
  const leftEarRef = useRef();
  const rightEarRef = useRef();
  const ringRef = useRef();
  const { viewport } = useThree();

  // Parse image into WebGL Texture
  const texture = useMemo(() => {
    if (!activeJewelry?.url) return new THREE.Texture();
    const loader = new THREE.TextureLoader();
    return loader.load(activeJewelry.url);
  }, [activeJewelry?.url]);

  useFrame(() => {
    if (!trackingDataRef.current || !activeJewelry) return;
    const { faceLandmarks, handLandmarks } = trackingDataRef.current;

    // --- NECKLACE MATH ---
    if (activeJewelry.type === 'necklace' && faceLandmarks && necklaceRef.current) {
      const chin = faceLandmarks[152];
      const leftJaw = faceLandmarks[132];
      const rightJaw = faceLandmarks[361];

      const x = (chin.x - 0.5) * viewport.width;
      const y = -(chin.y - 0.5) * viewport.height - (viewport.height * 0.15); // Offset to collarbone
      
      const faceWidth = Math.abs(rightJaw.x - leftJaw.x);
      const z = (faceWidth * 10) - 5; 
      const roll = Math.atan2(rightJaw.y - leftJaw.y, rightJaw.x - leftJaw.x);

      necklaceRef.current.position.lerp(new THREE.Vector3(-x, y, z), 0.4);
      necklaceRef.current.rotation.z = -roll;
      
      const scale = faceWidth * viewport.width * 1.5;
      necklaceRef.current.scale.lerp(new THREE.Vector3(scale, scale, 1), 0.4);
    }

    // --- EARRINGS MATH ---
    if (activeJewelry.type === 'earrings' && faceLandmarks && leftEarRef.current && rightEarRef.current) {
      const leftEar = faceLandmarks[356]; 
      const rightEar = faceLandmarks[127]; 

      const faceWidth = Math.abs(faceLandmarks[361].x - faceLandmarks[132].x);
      const z = (faceWidth * 10) - 5;
      const scale = faceWidth * viewport.width * 0.4;

      const lx = (leftEar.x - 0.5) * viewport.width;
      const ly = -(leftEar.y - 0.5) * viewport.height - (viewport.height * 0.05);
      leftEarRef.current.position.lerp(new THREE.Vector3(-lx, ly, z), 0.4);
      leftEarRef.current.scale.lerp(new THREE.Vector3(scale, scale, 1), 0.4);

      const rx = (rightEar.x - 0.5) * viewport.width;
      const ry = -(rightEar.y - 0.5) * viewport.height - (viewport.height * 0.05);
      rightEarRef.current.position.lerp(new THREE.Vector3(-rx, ry, z), 0.4);
      rightEarRef.current.scale.lerp(new THREE.Vector3(scale, scale, 1), 0.4);
    }

    // --- RING MATH ---
    if (activeJewelry.type === 'ring' && handLandmarks && ringRef.current) {
      const mcp = handLandmarks[13]; // Knuckle
      const pip = handLandmarks[14]; // First joint

      const x = (pip.x - 0.5) * viewport.width;
      const y = -(pip.y - 0.5) * viewport.height;
      
      const segmentLen = Math.hypot(pip.x - mcp.x, pip.y - mcp.y);
      const z = (segmentLen * 20) - 5;
      const angle = Math.atan2(-(pip.y - mcp.y), -(pip.x - mcp.x)); 

      ringRef.current.position.lerp(new THREE.Vector3(-x, y, z), 0.4);
      ringRef.current.rotation.z = angle + Math.PI / 2;
      
      const scale = segmentLen * viewport.width * 3;
      ringRef.current.scale.lerp(new THREE.Vector3(scale, scale, 1), 0.4);
    }
  });

  if (!activeJewelry) return null;

  // Reusable plane component mapping the transparent PNG
  const ImagePlane = ({ meshRef, visible }) => (
    <mesh ref={meshRef} visible={visible}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent={true} side={THREE.DoubleSide} depthTest={false} />
    </mesh>
  );

  return (
    <>
      <ImagePlane meshRef={necklaceRef} visible={activeJewelry.type === 'necklace'} />
      <ImagePlane meshRef={leftEarRef} visible={activeJewelry.type === 'earrings'} />
      <ImagePlane meshRef={rightEarRef} visible={activeJewelry.type === 'earrings'} />
      <ImagePlane meshRef={ringRef} visible={activeJewelry.type === 'ring'} />
    </>
  );
}