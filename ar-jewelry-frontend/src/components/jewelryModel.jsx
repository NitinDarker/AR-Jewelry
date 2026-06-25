import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const FingerOccluder = ({ length, thickness }) => (
  <mesh rotation={[Math.PI / 2, 0, 0]}>
    <cylinderGeometry args={[thickness, thickness, length, 32]} />
    <meshBasicMaterial colorWrite={false} depthWrite={true} />
  </mesh>
);

export default function JewelryModel({ trackingDataRef, activeJewelry }) {
  const necklaceGroupRef = useRef();
  const ringGroupRef = useRef();
  const flatRingRef = useRef();
  const { viewport } = useThree(); // <--- This hook is what crashed your app because you put this component in the wrong place.

  const texLoader = new THREE.TextureLoader();
  const texNecklace = useMemo(() => activeJewelry?.url ? texLoader.load(activeJewelry.url) : new THREE.Texture(), [activeJewelry?.url]);
  const texRingTop = useMemo(() => activeJewelry?.urlTop ? texLoader.load(activeJewelry.urlTop) : new THREE.Texture(), [activeJewelry?.urlTop]);
  const texRingBottom = useMemo(() => activeJewelry?.urlBottom ? texLoader.load(activeJewelry.urlBottom) : new THREE.Texture(), [activeJewelry?.urlBottom]);

  useFrame(() => {
    if (!trackingDataRef.current || !activeJewelry) return;
    const { faceLandmarks, handLandmarks } = trackingDataRef.current;

    if (activeJewelry.type === 'necklace' && faceLandmarks && necklaceGroupRef.current && texNecklace.image) {
      const chin = faceLandmarks[152];
      const leftJaw = faceLandmarks[132];
      const rightJaw = faceLandmarks[361];

      const faceWidth = Math.abs(rightJaw.x - leftJaw.x);
      const imgWidth = texNecklace.image.width;
      const imgHeight = texNecklace.image.height;
      const aspectRatio = imgHeight / imgWidth;

      const targetWidth = faceWidth * viewport.width * 1.8;
      const targetHeight = targetWidth * aspectRatio;

      const x = (chin.x - 0.5) * viewport.width;
      const y = -(chin.y - 0.5) * viewport.height;
      const z = (faceWidth * 10) - 5; 
      const roll = Math.atan2(rightJaw.y - leftJaw.y, rightJaw.x - leftJaw.x);

      necklaceGroupRef.current.position.lerp(new THREE.Vector3(-x, y, z), 0.4);
      necklaceGroupRef.current.rotation.z = -roll;
      necklaceGroupRef.current.scale.lerp(new THREE.Vector3(targetWidth, targetHeight, 1), 0.4);
    }

    if (activeJewelry.type === 'ring' && handLandmarks) {
      const mcp = handLandmarks[13]; 
      const pip = handLandmarks[14]; 

      const x = (pip.x - 0.5) * viewport.width;
      const y = -(pip.y - 0.5) * viewport.height;
      const segmentLen = Math.hypot(pip.x - mcp.x, pip.y - mcp.y);
      const z = (segmentLen * 20) - 5;
      const angle = Math.atan2(-(pip.y - mcp.y), -(pip.x - mcp.x)); 

      if (flatRingRef.current && activeJewelry.url && texNecklace.image) {
        const aspectRatio = texNecklace.image.height / texNecklace.image.width;
        const targetWidth = segmentLen * viewport.width * 4;
        const targetHeight = targetWidth * aspectRatio;

        flatRingRef.current.position.lerp(new THREE.Vector3(-x, y, z), 0.4);
        flatRingRef.current.rotation.z = angle + Math.PI / 2;
        flatRingRef.current.scale.lerp(new THREE.Vector3(targetWidth, targetHeight, 1), 0.4);
      }

      if (ringGroupRef.current && activeJewelry.urlTop && texRingTop.image) {
        const aspectRatio = texRingTop.image.height / texRingTop.image.width;
        const targetWidth = segmentLen * viewport.width * 4;
        const targetHeight = targetWidth * aspectRatio;

        ringGroupRef.current.position.lerp(new THREE.Vector3(-x, y, z), 0.4);
        ringGroupRef.current.rotation.z = angle + Math.PI / 2;
        ringGroupRef.current.scale.lerp(new THREE.Vector3(targetWidth, targetHeight, 1), 0.4);
      }
    }
  });

  if (!activeJewelry) return null;

  return (
    <>
      <group ref={necklaceGroupRef} visible={activeJewelry.type === 'necklace'}>
        <mesh>
          <planeGeometry args={[1, 1]} onUpdate={self => self.translate(0, -0.5, 0)} />
          <meshBasicMaterial map={texNecklace} transparent={true} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
      </group>

      {activeJewelry.type === 'ring' && activeJewelry.urlTop && (
        <group ref={ringGroupRef}>
          <mesh position={[0, 0, -0.15]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={texRingBottom} transparent={true} depthTest={true} /></mesh>
          <FingerOccluder length={2} thickness={0.15} />
          <mesh position={[0, 0, 0.15]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={texRingTop} transparent={true} depthTest={true} /></mesh>
        </group>
      )}

      {activeJewelry.type === 'ring' && activeJewelry.url && (
        <group ref={flatRingRef}>
          <mesh position={[0, 0, 0]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={texNecklace} transparent={true} side={THREE.DoubleSide} depthTest={false} /></mesh>
        </group>
      )}
    </>
  );
}