import os
import sys
import threading
import uvicorn
import webview
import httpx
import zipfile
import io
import json
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any

# --- KONFIGURACJA ---
SKETCHFAB_TOKEN = "efc936e45b554e3195cb19d38c2092ea"
PORT = 8001
HOST = "127.0.0.1"

def resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Dokumenty użytkownika (tam będziemy też zapisywać projekty)
USER_DOCS = os.path.join(os.path.expanduser("~"), "Documents", "AutoSearcherModels")
MODELS_DIR = USER_DOCS
# Plik zapisu sesji (domyślny)
SAVE_FILE = os.path.join(USER_DOCS, "saved_scene.json")

os.makedirs(MODELS_DIR, exist_ok=True)

if hasattr(sys, '_MEIPASS'):
    FRONTEND_DIR = resource_path("frontend_out")
else:
    FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend", "out")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELE DANYCH ---
class SceneItem(BaseModel):
    id: str
    uid: str
    url: str
    name: str
    position: List[float]
    rotation: List[float]

class SceneData(BaseModel):
    models: List[SceneItem]

# --- API ---

@app.get("/api/search")
async def search_car(query: str):
    print(f"Szukam: {query}")
    url = "https://api.sketchfab.com/v3/search"
    headers = {"Authorization": f"Token {SKETCHFAB_TOKEN}"}
    params = {
        "type": "models", "q": f"{query} car", "downloadable": "true",
        "count": 12, "sort_by": "-like_count",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers, params=params)
        if resp.status_code != 200: return []
        data = resp.json()
        results = []
        for item in data.get("results", []):
            img = item["thumbnails"]["images"][0]["url"] if item["thumbnails"]["images"] else ""
            results.append({
                "name": item["name"], "uid": item["uid"],
                "image": img, "author": item["user"]["username"]
            })
        return results

@app.get("/api/download/{uid}")
async def download_model(uid: str):
    model_path = os.path.join(MODELS_DIR, uid)
    
    # Funkcja pomocnicza do szukania pliku
    def find_gltf(path):
        for root, dirs, files in os.walk(path):
            for file in files:
                if file.endswith(".gltf") or file.endswith(".glb"):
                    rel = os.path.relpath(os.path.join(root, file), MODELS_DIR).replace("\\", "/")
                    return f"http://{HOST}:{PORT}/models/{rel}"
        return None

    if os.path.exists(model_path):
        link = find_gltf(model_path)
        if link: return {"url": link}

    url = f"https://api.sketchfab.com/v3/models/{uid}/download"
    headers = {"Authorization": f"Token {SKETCHFAB_TOKEN}"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200: raise HTTPException(400, "Błąd linku")
        
        gltf_data = resp.json().get("gltf")
        if not gltf_data: raise HTTPException(404, "Brak GLTF")
        
        zip_resp = await client.get(gltf_data["url"])
        try:
            z = zipfile.ZipFile(io.BytesIO(zip_resp.content))
            z.extractall(model_path)
        except: raise HTTPException(500, "Błąd ZIP")

        link = find_gltf(model_path)
        if link: return {"url": link}
        raise HTTPException(404, "Brak modelu w paczce")

# --- ZAPIS I ODCZYT ---

@app.post("/api/save-scene")
async def save_scene(data: SceneData):
    try:
        with open(SAVE_FILE, "w") as f:
            f.write(data.model_dump_json())
        return {"status": "ok", "message": "Zapisano pomyślnie"}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/api/load-scene")
async def load_scene():
    if not os.path.exists(SAVE_FILE):
        return {"models": []}
    try:
        with open(SAVE_FILE, "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        return {"models": []}

app.mount("/models", StaticFiles(directory=MODELS_DIR), name="models")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

def start_server():
    uvicorn.run(app, host=HOST, port=PORT, log_level="error")

if __name__ == "__main__":
    t = threading.Thread(target=start_server, daemon=True)
    t.start()
    webview.create_window("Rekonstrukcja Wypadków", f"http://{HOST}:{PORT}", width=1280, height=800)
    webview.start()