"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, TransformControls, Grid, useGLTF, Environment } from "@react-three/drei";
import { Suspense, useEffect, useState, useMemo } from "react";
import * as THREE from "three";

// --- KOMPONENT STERUJĄCY KAMERĄ ---
function CameraHandler({ resetTrigger }: { resetTrigger: number }) {
  const { camera, controls } = useThree() as any;

  useEffect(() => {
    if (resetTrigger > 0 && controls) {
      // ZMIANA: Zbliżamy kamerę!
      // Było: (5, 4, 8) -> Jest: (3, 2, 4)
      // To znacznie przybliży widok do środka sceny
      camera.position.set(3, 2, 4);
      camera.lookAt(0, 0, 0);
      
      if (controls.target) {
          controls.target.set(0, 0, 0);
          controls.update();
      }
    }
  }, [resetTrigger, camera, controls]);

  return null;
}

function CarModel({ 
  data, 
  isSelected, 
  onClick, 
  onTransform,
  mode 
}: { 
  data: any; 
  isSelected: boolean; 
  onClick: () => void;
  onTransform: (pos: [number, number, number], rot: [number, number, number]) => void;
  mode: "translate" | "rotate";
}) {
  const { scene } = useGLTF(data.url) as any;
  const clone = useMemo(() => scene.clone(), [scene]);
  const [yOffset, setYOffset] = useState(0);

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(clone);
    const minY = box.min.y;
    setYOffset(-minY + 0.01);
  }, [clone]);

  return (
    <>
      <TransformControls 
        object={clone}
        mode={mode}
        enabled={isSelected} 
        showX={isSelected} 
        showY={isSelected} 
        showZ={isSelected}
        space="local"
        onObjectChange={(e: any) => {
           const o = e.target.object;
           if (o.position.y < yOffset) {
             o.position.y = yOffset;
           }
           onTransform(
             [o.position.x, o.position.y, o.position.z], 
             [o.rotation.x, o.rotation.y, o.rotation.z]
           );
        }}
      />
      <primitive 
        object={clone} 
        position={data.position ? [data.position[0], Math.max(data.position[1], yOffset), data.position[2]] : [0, yOffset, 0]} 
        rotation={data.rotation ? data.rotation : [0, 0, 0]}
        scale={1.0} 
        onClick={(e: any) => {
          e.stopPropagation();
          onClick();
        }}
      />
    </>
  );
}

interface SceneProps {
  models: any[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateModel: (id: string, pos: number[], rot: number[]) => void;
  mode: "translate" | "rotate";
  resetCameraTrigger: number; 
}

export default function Scene({ models, selectedId, onSelect, onUpdateModel, mode, resetCameraTrigger }: SceneProps) {
  return (
    <Canvas camera={{ position: [5, 5, 5], fov: 50 }} shadows>
      <CameraHandler resetTrigger={resetCameraTrigger} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
      <Environment preset="city" />

      <Grid infiniteGrid sectionColor="gray" cellColor="#444" fadeDistance={40} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow onClick={() => onSelect(null)}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      <Suspense fallback={null}>
        {models.map((model) => (
          <CarModel 
            key={model.id} 
            data={model}
            isSelected={selectedId === model.id}
            onClick={() => onSelect(model.id)}
            onTransform={(pos, rot) => onUpdateModel(model.id, pos, rot)}
            mode={mode}
          />
        ))}
      </Suspense>

      <OrbitControls makeDefault />
    </Canvas>
  );
}