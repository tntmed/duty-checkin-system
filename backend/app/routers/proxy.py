"""Proxy router: forward requests to production tk server (avoids CORS)."""
import httpx
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/proxy", tags=["proxy"])

TK_BASE = "https://tk.pmk.ac.th/dutycheckin/api"


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
