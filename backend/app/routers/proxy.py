"""Proxy router: forward requests to tk server and face recognition service."""
import httpx
from fastapi import APIRouter, Query, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/proxy", tags=["proxy"])

TK_BASE = "https://tk.pmk.ac.th/dutycheckin/api"
FACE_BASE = "http://127.0.0.1:8003"


# ── tk server proxy ──────────────────────────────────────────
@router.get("/tk/duties")
async def proxy_tk_duties(
    duty_date: str = Query(...),
    tk_token: str = Query(...),
):
    url = f"{TK_BASE}/dashboard/duties"
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(
                url,
                params={"duty_date": duty_date},
                headers={"Authorization": f"Bearer {tk_token}"},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail="tk server error")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"ไม่สามารถเชื่อมต่อ tk server: {e}")


# ── face recognition service proxy ───────────────────────────
@router.get("/face/enroll")
async def face_list_enrolled():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{FACE_BASE}/enroll")
        return resp.json()


@router.post("/face/enroll/{employee_id}")
async def face_enroll(
    employee_id: int,
    employee_code: str = Form(...),
    full_name: str = Form(...),
    file: UploadFile = File(...),
):
    data = await file.read()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{FACE_BASE}/enroll/{employee_id}",
            data={"employee_code": employee_code, "full_name": full_name},
            files={"file": (file.filename, data, file.content_type)},
        )
        return JSONResponse(status_code=resp.status_code, content=resp.json())


@router.delete("/face/enroll/{employee_id}")
async def face_delete_enroll(employee_id: int):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.delete(f"{FACE_BASE}/enroll/{employee_id}")
        return resp.json()


@router.post("/face/recognize")
async def face_recognize(file: UploadFile = File(...)):
    data = await file.read()
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{FACE_BASE}/recognize",
            files={"file": (file.filename, data, file.content_type)},
        )
        return JSONResponse(status_code=resp.status_code, content=resp.json())


@router.post("/face/learn")
async def face_learn(
    file: UploadFile = File(...),
    confirmations: str = Form(...),
):
    data = await file.read()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{FACE_BASE}/learn",
            data={"confirmations": confirmations},
            files={"file": (file.filename, data, file.content_type)},
        )
        return JSONResponse(status_code=resp.status_code, content=resp.json())


@router.get("/face/health")
async def face_health():
    async with httpx.AsyncClient(timeout=5) as client:
        resp = await client.get(f"{FACE_BASE}/health")
        return resp.json()
