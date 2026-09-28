import os
import json
import base64
import uuid
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from .config import (
    BASE_DIR, FRONTEND_DIR, UPLOADS_DIR, OUTPUTS_DIR, CONFIG_FILE, DEFAULT_SALON_CONFIG
)
from .nail_engine import (
    TRENDING_NAIL_PRESETS,
    SKIN_TONE_RECOMMENDATIONS,
    analyze_skin_tone_from_image,
    generate_ai_nail_design
)

app = FastAPI(
    title="NailSnap AI API",
    description="Virtual Nail Try-On & AI Nail Styling Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_salon_config():
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return DEFAULT_SALON_CONFIG
    return DEFAULT_SALON_CONFIG


def save_salon_config(data: dict):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class AIDesignRequest(BaseModel):
    prompt: str
    skin_tone: str = "warm_light"


class SaveSnapshotRequest(BaseModel):
    image_base64: str
    preset_name: str
    nail_shape: str
    primary_color: str


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "NailSnap AI", "version": "1.0.0"}


@app.get("/api/presets")
def get_presets():
    return {"presets": TRENDING_NAIL_PRESETS}


@app.post("/api/analyze-skin")
async def analyze_skin(file: UploadFile = File(...)):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Không có dữ liệu ảnh")
    
    # Lưu ảnh vào uploads để debug nếu cần
    filename = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    filepath = UPLOADS_DIR / filename
    with open(filepath, "wb") as f:
        f.write(contents)
        
    analysis = analyze_skin_tone_from_image(contents)
    return {
        "status": "success",
        "analysis": analysis,
        "image_url": f"/uploads/{filename}"
    }


@app.post("/api/ai-design")
def create_ai_design(req: AIDesignRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập mô tả ý tưởng nail")
    design = generate_ai_nail_design(req.prompt, req.skin_tone)
    return {"status": "success", "design": design}


@app.get("/api/salon-config")
def get_salon():
    return load_salon_config()


@app.post("/api/salon-config")
def update_salon(config: dict):
    current = load_salon_config()
    current.update(config)
    save_salon_config(current)
    return {"status": "success", "config": current}


@app.post("/api/save-snapshot")
def save_snapshot(req: SaveSnapshotRequest):
    try:
        # Tách header data:image/png;base64,
        if "," in req.image_base64:
            base64_data = req.image_base64.split(",")[1]
        else:
            base64_data = req.image_base64
            
        image_bytes = base64.b64decode(base64_data)
        file_id = f"nailsnap_{uuid.uuid4().hex[:8]}.png"
        filepath = OUTPUTS_DIR / file_id
        
        with open(filepath, "wb") as f:
            f.write(image_bytes)
            
        # Lưu kèm metadata
        meta_file = OUTPUTS_DIR / f"{file_id}.json"
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump({
                "file": file_id,
                "preset_name": req.preset_name,
                "nail_shape": req.nail_shape,
                "primary_color": req.primary_color
            }, f, ensure_ascii=False, indent=2)
            
        return {
            "status": "success",
            "file_id": file_id,
            "download_url": f"/outputs/{file_id}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Mount static folders
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
