import os
import json
import uuid
import socket
import time
import threading
import datetime
import mimetypes
from pathlib import Path
from typing import List, Optional
import requests
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from tunnel_client import tunnel_manager
except Exception:
    tunnel_manager = None

try:
    from cloudflare_tunnel import cloudflare_manager
except Exception:
    cloudflare_manager = None

try:
    from ngrok_tunnel import ngrok_manager
except Exception:
    ngrok_manager = None

# Supabase 클라우드 설정
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://vnbadllwmdatrowzunex.supabase.co").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_cBeCGUigQ2Gj7jBCTJ972A_MDTARqws")

# 사진 저장 폴더 경로 (현재 폴더 내 Anti_PIC 우선 참조, 없을 시 바탕화면 참조)
BASE_DIR = Path(__file__).resolve().parent
LOCAL_PIC_DIR = BASE_DIR / "Anti_PIC"
if LOCAL_PIC_DIR.exists():
    ANTI_PIC_DIR = LOCAL_PIC_DIR
else:
    ANTI_PIC_DIR = Path.home() / "Desktop" / "Anti_PIC"

DATA_FILE = ANTI_PIC_DIR / "album_data.json"

# 정적 웹 파일 경로
STATIC_DIR = BASE_DIR / "static"

# Anti_PIC 폴더 생성 (없을 경우)
ANTI_PIC_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="몽글몽글 사진첩", description="7인을 위한 포근한 감성 사진첩")

IS_RENDER = bool(os.environ.get("RENDER"))

@app.on_event("startup")
def start_background_tunnel():
    if IS_RENDER:
        print(f"[Server] Running in Render cloud environment ($PORT={os.environ.get('PORT', '8000')}). Skipping local tunnels.")
        return
    def init_tunnels():
        # 서버 포트(8000) 바인딩 대기 후 터널 연결
        time.sleep(1.0)
        if ngrok_manager:
            print("[Server] Starting ngrok permanent static tunnel ...")
            ngrok_manager.start()
        if cloudflare_manager:
            print("[Server] Starting Cloudflare zero-password tunnel ...")
            cloudflare_manager.start()
    threading.Thread(target=init_tunnels, daemon=True).start()

@app.on_event("shutdown")
def stop_background_tunnel():
    if not IS_RENDER:
        if ngrok_manager:
            ngrok_manager.stop()
        if cloudflare_manager:
            cloudflare_manager.stop()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".jfif", ".heic", ".heif", ".svg"}

DEFAULT_MEMBERS = [
    {"id": "m1", "name": "연수", "avatar": "🌸", "color": "#FFB5A7", "desc": "대고련 7기"},
    {"id": "m2", "name": "남현", "avatar": "🌿", "color": "#B8E0D2", "desc": "대고련 7기"},
    {"id": "m3", "name": "채현", "avatar": "🎀", "color": "#FCD5CE", "desc": "대고련 7기"},
    {"id": "m4", "name": "하연", "avatar": "🌷", "color": "#D8E2DC", "desc": "대고련 7기"},
    {"id": "m5", "name": "형준", "avatar": "🌊", "color": "#DDF0F8", "desc": "대고련 7기"},
    {"id": "m6", "name": "지혜", "avatar": "☀️", "color": "#FFF1C5", "desc": "대고련 7기"},
    {"id": "m7", "name": "정률", "avatar": "⭐", "color": "#E8D7F1", "desc": "대고련 7기"}
]

DEFAULT_SHARED = {
    "id": "all",
    "avatar": "🌈",
    "name": "모두의 추억",
    "desc": "대고련 7기 친구들의 모든 소중한 순간들이 모여있어요 💖",
    "color": "#FFB5A7"
}

DEFAULT_ALBUMS = [
    {
        "id": "album_all_default",
        "name": "소중한 일상 추억 💖",
        "member_id": "all",
        "created_at": 1700000000.0
    }
]

# ── Supabase 클라우드 연동 헬퍼 ─────────────────────────────
def supabase_upload_photo(filename: str, file_bytes: bytes, content_type: str = "image/jpeg"):
    """Supabase Storage 버킷(photos)에 사진 업로드"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": content_type,
            "x-upsert": "true"
        }
        res = requests.post(f"{SUPABASE_URL}/storage/v1/object/photos/{filename}", headers=headers, data=file_bytes, timeout=20)
        if res.status_code in (200, 201):
            print(f"[Supabase Storage] ✅ {filename} 클라우드 저장 완료!")
        else:
            print(f"[Supabase Storage Warning] 상태 {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[Supabase Storage Upload Error] {e}")

def supabase_delete_photo(filename: str):
    """Supabase Storage 버킷(photos)에서 사진 삭제"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        }
        res = requests.delete(f"{SUPABASE_URL}/storage/v1/object/photos/{filename}", headers=headers, timeout=10)
        print(f"[Supabase Storage] 삭제 완료 {filename}: {res.status_code}")
    except Exception as e:
        print(f"[Supabase Storage Delete Error] {e}")

def supabase_save_data_sync(data: dict):
    """Supabase Database(album_data)에 JSON 메타데이터 동기화"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": application/json,
            "Prefer": "resolution=merge-duplicates"
        }
        payload = {
            "id": "main",
            "data": data,
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        res = requests.post(f"{SUPABASE_URL}/rest/v1/album_data", headers=headers, json=payload, timeout=8)
        if res.status_code not in (200, 201):
            print(f"[Supabase DB Save Warning] 상태 {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[Supabase DB Save Error] {e}")

def load_data():
    """1차로 Supabase 클라우드에서 최신 데이터를 가져오고, 불가 시 로컬 파일 로드"""
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}"
            }
            res = requests.get(f"{SUPABASE_URL}/rest/v1/album_data?id=eq.main&select=data", headers=headers, timeout=6)
            if res.status_code == 200:
                rows = res.json()
                if rows and "data" in rows[0]:
                    cloud_data = rows[0]["data"]
                    # 로컬 캐시 업데이트
                    try:
                        with open(DATA_FILE, "w", encoding="utf-8") as f:
                            json.dump(cloud_data, f, ensure_ascii=False, indent=2)
                    except Exception:
                        pass
                    return validate_and_migrate_data(cloud_data)
        except Exception as e:
            print(f"[Supabase Load Warning] 클라우드 로드 실패, 로컬 캐시 사용: {e}")

    # 2. 로컬 캐시/파일 로드
    if not DATA_FILE.exists():
        initial_data = {
            "shared": DEFAULT_SHARED,
            "members": DEFAULT_MEMBERS,
            "albums": DEFAULT_ALBUMS.copy(),
            "photos": []
        }
        save_data(initial_data)
        return initial_data
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return validate_and_migrate_data(data)
    except Exception as e:
        print(f"데이터 로드 오류: {e}")
        return {"shared": DEFAULT_SHARED, "members": DEFAULT_MEMBERS, "albums": DEFAULT_ALBUMS.copy(), "photos": []}

def validate_and_migrate_data(data):
    """데이터 무결성 검증 및 기본값 보정"""
    if "shared" not in data:
        data["shared"] = DEFAULT_SHARED
    if "members" not in data or len(data["members"]) == 0:
        data["members"] = DEFAULT_MEMBERS
    
    if "albums" not in data or not data["albums"]:
        data["albums"] = [
            {
                "id": "album_all_default",
                "name": "소중한 일상 추억 💖",
                "member_id": "all",
                "created_at": 1700000000.0
            }
        ]

    existing_album_members = {a.get("member_id") for a in data["albums"]}
    for m in data.get("members", DEFAULT_MEMBERS):
        if m["id"] not in existing_album_members:
            data["albums"].append({
                "id": f"album_{m['id']}_default",
                "name": f"{m['name']}의 추억 앨범 ✨",
                "member_id": m["id"],
                "created_at": 1700000000.0
            })

    if "photos" not in data:
        data["photos"] = []

    album_ids = {a["id"] for a in data["albums"]}
    modified = False
    for p in data["photos"]:
        if "comments" not in p:
            p["comments"] = []
        if not p.get("album_id") or p.get("album_id") not in album_ids:
            m_id = p.get("member_id", "all")
            fallback_id = f"album_{m_id}_default" if m_id != "all" else "album_all_default"
            p["album_id"] = fallback_id if fallback_id in album_ids else "album_all_default"
            modified = True

    if modified:
        save_data(data)

    return data

def save_data(data):
    """로컬 캐시에 즉시 저장하고, 백그라운드 스레드로 Supabase 클라우드에 비동기 저장"""
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"데이터 로컬 캐시 저장 오류: {e}")
    threading.Thread(target=supabase_save_data_sync, args=(data,), daemon=True).start()

def sync_disk_photos(data):
    """로컬 Anti_PIC 폴더에 새로 복사된 사진이 있다면 자동 감지하여 Supabase와 동기화"""
    existing_filenames = {p["filename"]: p for p in data.get("photos", [])}
    disk_files = []
    
    if ANTI_PIC_DIR.exists():
        for entry in ANTI_PIC_DIR.iterdir():
            if entry.is_file() and entry.suffix.lower() in SUPPORTED_EXTENSIONS:
                disk_files.append(entry.name)

    updated = False
    
    # 디스크에 새로 들어온 파일 감지 -> 자동 등록 및 Supabase 업로드
    for fname in disk_files:
        if fname not in existing_filenames:
            stat = (ANTI_PIC_DIR / fname).stat()
            mod_time = datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M")
            new_photo = {
                "id": str(uuid.uuid4())[:8],
                "filename": fname,
                "author": "공용 추억",
                "member_id": "all",
                "album_id": "album_all_default",
                "caption": "Anti_PIC 폴더에서 직접 추가된 사진",
                "date": mod_time,
                "created_at": stat.st_mtime,
                "likes": 0,
                "comments": []
            }
            data["photos"].append(new_photo)
            updated = True

            # 클라우드로 자동 백업
            try:
                with open(ANTI_PIC_DIR / fname, "rb") as fp:
                    b = fp.read()
                mime, _ = mimetypes.guess_type(fname)
                threading.Thread(target=supabase_upload_photo, args=(fname, b, mime or "image/jpeg"), daemon=True).start()
            except Exception:
                pass

    if updated:
        save_data(data)
    return data

@app.get("/api/info")
def get_info():
    """서버 정보 및 접속 가능 IP, 외부 터널 주소 반환"""
    local_ips = []
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                local_ips.append(ip)
    except Exception:
        pass
    
    data = load_data()
    render_url = os.environ.get("RENDER_EXTERNAL_URL")
    cf_url = cloudflare_manager.url if cloudflare_manager else None
    cf_active = cloudflare_manager.active if cloudflare_manager else False
    ng_url = ngrok_manager.url if ngrok_manager else None
    ng_active = ngrok_manager.active if ngrok_manager else False
    lt_url = tunnel_manager.url if tunnel_manager else None
    lt_pwd = tunnel_manager.tunnel_password if tunnel_manager else ""
    lt_active = tunnel_manager.active if tunnel_manager else False

    if IS_RENDER and render_url:
        primary_tunnel_url = render_url
        is_active = True
    else:
        primary_tunnel_url = cf_url if cf_active else (ng_url or lt_url)
        is_active = cf_active or ng_active or lt_active

    port_val = int(os.environ.get("PORT", 8000))
    
    return {
        "storage_path": str(ANTI_PIC_DIR),
        "local_ips": local_ips if local_ips else ["127.0.0.1"],
        "port": port_val,
        "photo_count": len(data.get("photos", [])),
        "tunnel_url": primary_tunnel_url,
        "cloudflare_url": cf_url,
        "cloudflare_active": cf_active,
        "ngrok_url": ng_url,
        "ngrok_active": ng_active,
        "localtunnel_url": lt_url,
        "tunnel_password": lt_pwd,
        "tunnel_active": is_active,
        "is_render": IS_RENDER,
        "supabase_connected": bool(SUPABASE_URL and SUPABASE_KEY)
    }

@app.get("/api/members")
def get_members():
    data = load_data()
    return {
        "shared": data.get("shared", DEFAULT_SHARED),
        "members": data.get("members", DEFAULT_MEMBERS)
    }

class MemberUpdate(BaseModel):
    members: List[dict]
    shared: Optional[dict] = None

@app.post("/api/members")
def update_members(payload: MemberUpdate):
    data = load_data()
    data["members"] = payload.members
    if payload.shared:
        data["shared"] = payload.shared
    save_data(data)
    return {
        "status": "ok",
        "members": data["members"],
        "shared": data.get("shared", DEFAULT_SHARED)
    }

@app.get("/api/albums")
def get_albums(member_id: Optional[str] = None):
    data = load_data()
    data = sync_disk_photos(data)
    albums = data.get("albums", [])
    photos = data.get("photos", [])

    # 사진 최신순 정렬 후 앨범별 매핑
    sorted_photos = sorted(photos, key=lambda x: x.get("created_at", 0), reverse=True)
    album_photos_map = {}
    for p in sorted_photos:
        aid = p.get("album_id", "album_all_default")
        if aid not in album_photos_map:
            album_photos_map[aid] = []
        album_photos_map[aid].append(p)

    result = []
    for a in albums:
        a_mem = a.get("member_id", "all")
        if member_id and member_id != "all" and a_mem != member_id:
            continue
        if member_id == "all" and a_mem != "all":
            continue

        p_list = album_photos_map.get(a["id"], [])
        covers = [p["filename"] for p in p_list[:3]]
        result.append({
            "id": a["id"],
            "name": a["name"],
            "member_id": a_mem,
            "created_at": a.get("created_at", 0),
            "photo_count": len(p_list),
            "covers": covers
        })
    return result

class AlbumCreate(BaseModel):
    name: str
    member_id: str = "all"

@app.post("/api/albums")
def create_album(payload: AlbumCreate):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="앨범 이름을 입력해주세요.")
    data = load_data()
    new_id = "album_" + str(uuid.uuid4())[:8]
    now = datetime.datetime.now()
    new_album = {
        "id": new_id,
        "name": name,
        "member_id": payload.member_id or "all",
        "created_at": now.timestamp()
    }
    data["albums"].append(new_album)
    save_data(data)
    return {"status": "ok", "album": new_album}

class AlbumUpdate(BaseModel):
    name: str

@app.put("/api/albums/{album_id}")
def update_album(album_id: str, payload: AlbumUpdate):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="앨범 이름을 입력해주세요.")
    data = load_data()
    for a in data.get("albums", []):
        if a["id"] == album_id:
            a["name"] = name
            save_data(data)
            return {"status": "ok", "album": a}
    raise HTTPException(status_code=404, detail="앨범을 찾을 수 없습니다.")

@app.delete("/api/albums/{album_id}")
def delete_album(album_id: str):
    if album_id == "album_all_default" or album_id.endswith("_default"):
        raise HTTPException(status_code=400, detail="기본 앨범은 삭제할 수 없습니다.")
    data = load_data()
    target_idx = None
    target_member_id = "all"
    for idx, a in enumerate(data.get("albums", [])):
        if a["id"] == album_id:
            target_idx = idx
            target_member_id = a.get("member_id", "all")
            break
    if target_idx is None:
        raise HTTPException(status_code=404, detail="앨범을 찾을 수 없습니다.")

    fallback_album_id = f"album_{target_member_id}_default" if target_member_id != "all" else "album_all_default"
    for p in data.get("photos", []):
        if p.get("album_id") == album_id:
            p["album_id"] = fallback_album_id

    data["albums"].pop(target_idx)
    save_data(data)
    return {"status": "deleted"}

@app.get("/api/photos")
def get_photos(member_id: Optional[str] = None, album_id: Optional[str] = None):
    data = load_data()
    data = sync_disk_photos(data)
    photos = data.get("photos", [])
    
    # 시간순 정렬 (최신순)
    photos.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    
    if album_id:
        photos = [p for p in photos if p.get("album_id") == album_id]
    elif member_id and member_id != "all":
        photos = [p for p in photos if p.get("member_id") == member_id]
        
    return photos

@app.post("/api/upload")
async def upload_photo(
    file: UploadFile = File(...),
    member_id: str = Form("all"),
    album_id: str = Form("album_all_default"),
    author: str = Form("익명"),
    caption: str = Form(""),
    date: Optional[str] = Form(None)
):
    filename = file.filename or "photo.jpg"
    ext = Path(filename).suffix.lower()
    if not ext and file.content_type:
        if "png" in file.content_type:
            ext = ".png"
        elif "webp" in file.content_type:
            ext = ".webp"
        elif "gif" in file.content_type:
            ext = ".gif"
        else:
            ext = ".jpg"

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"지원되지 않는 이미지 형식입니다 ({ext}). JPG, PNG, GIF, WEBP 등을 지원합니다.")

    now = datetime.datetime.now()
    timestamp_str = now.strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:6]
    safe_filename = f"{timestamp_str}_{unique_id}{ext}"
    dest_path = ANTI_PIC_DIR / safe_filename

    # 1. 파일 바이트 읽기
    file_bytes = await file.read()

    # 2. 로컬 캐시 디스크에 저장
    try:
        with open(dest_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        print(f"로컬 파일 저장 예외 (무시 가능): {e}")

    # 3. Supabase Storage 클라우드에 영구 업로드
    content_type = file.content_type or (mimetypes.guess_type(safe_filename)[0] or "image/jpeg")
    threading.Thread(target=supabase_upload_photo, args=(safe_filename, file_bytes, content_type), daemon=True).start()

    # 4. 메타데이터 기록
    data = load_data()
    display_date = date if date else now.strftime("%Y-%m-%d %H:%M")
    photo_entry = {
        "id": unique_id,
        "filename": safe_filename,
        "author": author,
        "member_id": member_id,
        "album_id": album_id,
        "caption": caption.strip(),
        "date": display_date,
        "created_at": now.timestamp(),
        "likes": 0,
        "comments": []
    }
    data["photos"].append(photo_entry)
    save_data(data)

    return {"status": "success", "photo": photo_entry}

@app.post("/api/photos/{photo_id}/like")
def like_photo(photo_id: str):
    data = load_data()
    for p in data["photos"]:
        if p["id"] == photo_id:
            p["likes"] = p.get("likes", 0) + 1
            save_data(data)
            return {"status": "ok", "likes": p["likes"]}
    raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다.")

class CommentCreate(BaseModel):
    author: str
    member_id: str = "all"
    content: str

@app.post("/api/photos/{photo_id}/comments")
def add_comment(photo_id: str, payload: CommentCreate):
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="댓글 내용을 입력해주세요.")
    data = load_data()
    for p in data["photos"]:
        if p["id"] == photo_id:
            now = datetime.datetime.now()
            new_comment = {
                "id": str(uuid.uuid4())[:8],
                "author": payload.author.strip() or "익명",
                "member_id": payload.member_id or "all",
                "content": content,
                "date": now.strftime("%Y-%m-%d %H:%M"),
                "created_at": now.timestamp()
            }
            if "comments" not in p:
                p["comments"] = []
            p["comments"].append(new_comment)
            save_data(data)
            return {"status": "ok", "comment": new_comment, "comments": p["comments"]}
    raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다.")

@app.delete("/api/photos/{photo_id}/comments/{comment_id}")
def delete_comment(photo_id: str, comment_id: str):
    data = load_data()
    for p in data["photos"]:
        if p["id"] == photo_id:
            comments = p.get("comments", [])
            initial_len = len(comments)
            p["comments"] = [c for c in comments if c["id"] != comment_id]
            if len(p["comments"]) == initial_len:
                raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
            save_data(data)
            return {"status": "deleted", "comments": p["comments"]}
    raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다.")

@app.delete("/api/photos/{photo_id}")
def delete_photo(photo_id: str):
    data = load_data()
    target_idx = None
    target_filename = None
    for idx, p in enumerate(data["photos"]):
        if p["id"] == photo_id:
            target_idx = idx
            target_filename = p["filename"]
            break
            
    if target_idx is None:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다.")

    # 1. 로컬 캐시 파일 삭제
    file_path = ANTI_PIC_DIR / target_filename
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            print(f"로컬 파일 삭제 예외: {e}")

    # 2. Supabase Storage 클라우드에서 삭제
    threading.Thread(target=supabase_delete_photo, args=(target_filename,), daemon=True).start()

    data["photos"].pop(target_idx)
    save_data(data)
    return {"status": "deleted"}

# 사진 서빙: 로컬 캐시 파일이 있으면 즉시 반환, 없으면 Supabase Storage Public CDN으로 307 리다이렉트
@app.get("/photos/{filename}")
async def serve_photo(filename: str):
    local_path = ANTI_PIC_DIR / filename
    if local_path.exists() and local_path.is_file():
        return FileResponse(local_path)
    # Supabase Public CDN URL로 즉시 리다이렉트
    supabase_url = f"{SUPABASE_URL}/storage/v1/object/public/photos/{filename}"
    return RedirectResponse(url=supabase_url, status_code=307)

# 웹 UI 정적 서빙
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print("=" * 60)
    print(" 몽글몽글 감성 사진첩 서버가 실행되었습니다! ")
    print(f" 저장소 경로: {ANTI_PIC_DIR}")
    print(f" Supabase 클라우드 연동: {SUPABASE_URL}")
    print(f" 로컬 주소: http://localhost:{port}")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=port)
