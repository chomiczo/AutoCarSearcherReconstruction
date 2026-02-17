"use client";
import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import Scene from "../src/components/Scene";

type SearchResult = { uid: string; name: string; image: string; author: string };
type SceneObject = { id: string; uid: string; url: string; name: string; position?: number[]; rotation?: number[] };

export default function Home() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [sceneModels, setSceneModels] = useState<SceneObject[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [controlMode, setControlMode] = useState<"translate" | "rotate">("translate");

  // --- NOWE STANY ---
  const [projectName, setProjectName] = useState("Bez nazwy");
  const [cameraResetTrigger, setCameraResetTrigger] = useState(0);

  // Funkcja resetująca widok
  const resetCamera = () => setCameraResetTrigger(prev => prev + 1);

  // --- FUNKCJE API ---
  const search = async () => {
    if (!query) return;
    setSearching(true);
    try {
      const res = await fetch(`http://127.0.0.1:8001/api/search?query=${query}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (e) { alert("Błąd szukania"); }
    setSearching(false);
  };

  const saveProject = async () => {
    try {
      const dataToSave = {
        models: sceneModels.map(m => ({
          ...m,
          position: m.position || [0,0,0],
          rotation: m.rotation || [0,0,0]
        }))
      };
      
      const res = await fetch("http://127.0.0.1:8001/api/save-scene", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dataToSave)
      });
      const data = await res.json();
      
      if (data.status === "ok") {
        setProjectName(data.filename); // Ustawiamy nazwę pliku
        alert(data.message);
      }
    } catch (e) { alert("Błąd zapisu!"); }
  };

  const loadProject = async () => {
    if(sceneModels.length > 0 && !confirm("Wczytanie projektu wyczyści obecną scenę. Kontynuować?")) return;
    
    try {
      const res = await fetch("http://127.0.0.1:8001/api/load-scene");
      const data = await res.json();
      
      if (data.status === "ok" && data.models) {
        setSceneModels(data.models);
        setSelectedModelId(null);
        setProjectName(data.filename || "Projekt"); // Ustawiamy nazwę pliku
        
        // AUTOMATYCZNE CENTROWANIE (małe opóźnienie dla pewności)
        setTimeout(() => resetCamera(), 100);
      }
    } catch (e) { alert("Błąd wczytywania!"); }
  };

  const deleteSelected = () => {
    if (selectedModelId) {
      setSceneModels(prev => prev.filter(m => m.id !== selectedModelId));
      setSelectedModelId(null);
    }
  };

  // --- DRAG & DROP ---
  const handleDragStart = (e: React.DragEvent, car: SearchResult) => {
    e.dataTransfer.setData("carUid", car.uid);
    e.dataTransfer.setData("carName", car.name);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const uid = e.dataTransfer.getData("carUid");
    const name = e.dataTransfer.getData("carName");
    if (!uid) return;

    setLoadingModel(true);
    try {
      const res = await fetch(`http://127.0.0.1:8001/api/download/${uid}`);
      if (!res.ok) throw new Error("Błąd");
      const data = await res.json();

      const newCar: SceneObject = {
        id: uuidv4(),
        uid: uid,
        url: data.url,
        name: name,
        position: [0, 0, 0],
        rotation: [0, 0, 0]
      };

      setSceneModels((prev) => [...prev, newCar]);
      setSelectedModelId(newCar.id);
      // Opcjonalnie: resetCamera(); // Możesz odkomentować, jeśli chcesz centrować po każdym dodaniu
    } catch (error) { alert("Nie udało się pobrać."); }
    setLoadingModel(false);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleUpdateModel = (id: string, pos: number[], rot: number[]) => {
    setSceneModels(prev => prev.map(m => m.id === id ? { ...m, position: pos, rotation: rot } : m));
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      
      {/* LEWY PANEL */}
      <div className="w-1/3 min-w-[350px] bg-white border-r shadow-xl flex flex-col z-10">
        <div className="p-4 bg-gray-900 text-white">
          <div className="mb-3">
            <h1 className="text-lg font-bold">Rekonstrukcja</h1>
            {/* Wyświetlanie nazwy pliku */}
            <p className="text-xs text-blue-300 font-mono mt-1 truncate" title={projectName}>
              PLIK: {projectName}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button onClick={saveProject} className="text-xs bg-green-600 hover:bg-green-500 py-2 rounded text-center">📂 Zapisz Jako...</button>
            <button onClick={loadProject} className="text-xs bg-blue-600 hover:bg-blue-500 py-2 rounded text-center">📂 Otwórz...</button>
          </div>
          {/* PRZYCISK CENTROWANIA WIDOKU */}
          <button onClick={resetCamera} className="w-full text-xs bg-gray-700 hover:bg-gray-600 py-2 rounded text-center border border-gray-500">
            🎯 Centruj Widok (Reset)
          </button>
        </div>

        <div className="p-4 border-b flex gap-2">
          <input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Szukaj modelu..."
            className="flex-1 border p-2 rounded text-black text-sm"
          />
          <button onClick={search} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 text-sm">OK</button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50">
          {searchResults.map((car) => (
            <div 
              key={car.uid}
              draggable 
              onDragStart={(e) => handleDragStart(e, car)}
              className="flex items-center gap-3 p-2 bg-white border rounded cursor-grab hover:shadow-md transition"
            >
              <img src={car.image} className="w-14 h-8 object-cover rounded" />
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate text-gray-800">{car.name}</p>
              </div>
            </div>
          ))}
        </div>

        {selectedModelId && (
          <div className="p-4 bg-gray-100 border-t space-y-2">
            <p className="text-xs font-bold text-gray-700">Sterowanie pojazdem</p>
            <div className="flex gap-2 mb-2">
              <button 
                onClick={() => setControlMode("translate")}
                className={`flex-1 py-1 text-xs rounded ${controlMode === "translate" ? "bg-blue-600 text-white" : "bg-white border"}`}
              >
                Przesuwanie ⬌
              </button>
              <button 
                onClick={() => setControlMode("rotate")}
                className={`flex-1 py-1 text-xs rounded ${controlMode === "rotate" ? "bg-blue-600 text-white" : "bg-white border"}`}
              >
                Obracanie ↻
              </button>
            </div>
            <button onClick={deleteSelected} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm">
              Usuń pojazd ze sceny
            </button>
          </div>
        )}
      </div>

      {/* PRAWY PANEL - SCENA */}
      <div className="flex-1 relative bg-gray-900" onDrop={handleDrop} onDragOver={handleDragOver}>
        {loadingModel && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/70 text-white px-6 py-2 rounded-full">
            Pobieranie modelu...
          </div>
        )}
        <Scene 
          models={sceneModels} 
          selectedId={selectedModelId} 
          onSelect={setSelectedModelId} 
          onUpdateModel={handleUpdateModel}
          mode={controlMode}
          resetCameraTrigger={cameraResetTrigger}
        />
      </div>
    </div>
  );
}