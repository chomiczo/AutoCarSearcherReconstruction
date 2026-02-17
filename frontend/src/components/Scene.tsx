"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls, Grid, useGLTF, Environment } from "@react-three/drei";
import { Suspense, useEffect, useState, useMemo } from "react";
import * as THREE from "three";

// Komponent pojedynczego auta
function CarModel({ 
  data, 
  isSelected, 
  onClick, 
  onTransform 
}: { 
  data: any; 
  isSelected: boolean; 
  onClick: () => void;
  onTransform: (pos: [number, number, number], rot: [number, number, number]) => void;
}) {
const { scene } = useGLTF(data.url) as any;
  
  // Klonujemy scenę, żeby móc mieć wiele tych samych aut
  const clone = useMemo(() => scene.clone(), [scene]);
  
  // Automatyczna korekta wysokości (żeby auto nie było zapadnięte)
  const [yOffset, setYOffset] = useState(0);

  useEffect(() => {
    // Obliczamy najniższy punkt modelu
    const box = new THREE.Box3().setFromObject(clone);
    const minY = box.min.y;
    // Jeśli auto jest pod ziemią (minY < 0), podnosimy je o tyle w górę
    // Dodajemy 0.01 żeby opony nie migały z asfaltem
    setYOffset(-minY + 0.01);
  }, [clone]);

  return (
    <>
      <TransformControls 
        object={clone}
        mode="translate" // Możesz zmienić na "rotate" żeby obracać
        enabled={isSelected} 
        showX={isSelected} 
        showY={isSelected} 
        showZ={isSelected}
        onObjectChange={(e: any) => {
           // Kiedy biegły przesuwa auto, zapisujemy nową pozycję
           const o = e.target.object;
           onTransform(
             [o.position.x, o.position.y, o.position.z], 
             [o.rotation.x, o.rotation.y, o.rotation.z]
           );
        }}
      />
      <primitive 
        object={clone} 
        // Używamy pozycji z bazy danych ALBO domyślnej (z korektą wysokości)
        position={data.position ? data.position : [0, yOffset, 0]} 
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
}

export default function Scene({ models, selectedId, onSelect, onUpdateModel }: SceneProps) {
  return (
    <Canvas camera={{ position: [5, 5, 5], fov: 50 }} shadows>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
      <Environment preset="city" />

      {/* Jezdnia */}
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
          />
        ))}
      </Suspense>

      {/* Kamera - wyłączamy ją gdy przesuwamy auto (żeby nie kręciła się w trakcie przesuwania) */}
      <OrbitControls makeDefault />
    </Canvas>
  );
}