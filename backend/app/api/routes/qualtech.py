"""
Proxy / cache para a API Qualtech IRM
Autentica e busca projetos, clientes e plataformas
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
from typing import Optional

from app.db.database import get_db
from app.models.models import Projeto

router = APIRouter()

API_BASE = "https://api.qualitechirm.online"
_token_cache = {"token": None}


async def get_qualtech_token() -> str:
    if _token_cache["token"]:
        return _token_cache["token"]
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{API_BASE}/user/login",
            data={"username": "bi@qualitechirm.com", "password": "Rj2023Hs"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if r.status_code != 200:
            raise HTTPException(401, "Falha na autenticação com API Qualtech")
        _token_cache["token"] = r.json()["access_token"]
        return _token_cache["token"]


@router.get("/api-projects")
async def list_api_projects(search: Optional[str] = None):
    """Lista project numbers da API Qualtech"""
    token = await get_qualtech_token()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{API_BASE}/project/project-number/list",
            headers={"Authorization": f"Bearer {token}"}
        )
    data = r.json()
    if search:
        data = [p for p in data if str(search) in str(p.get("project_number", ""))]
    return data[:100]


@router.get("/api-projects/{project_number}")
async def get_api_project_detail(project_number: int, db: Session = Depends(get_db)):
    """Busca detalhes de um projeto na API e salva localmente"""
    token = await get_qualtech_token()
    async with httpx.AsyncClient() as client:
        # Lista de projetos
        proj_r = await client.get(
            f"{API_BASE}/project/project-number/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        projects = proj_r.json()
        proj = next((p for p in projects if p["project_number"] == project_number), None)
        if not proj:
            raise HTTPException(404, f"WO {project_number} não encontrada na API")

        # Plataformas
        plat_r = await client.get(
            f"{API_BASE}/platform/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        platforms = {p["id"]: p for p in plat_r.json()}

        # Usuários (coordenadores)
        users_r = await client.get(
            f"{API_BASE}/user/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        users = {u["id"]: u for u in users_r.json()}

    platform = platforms.get(proj.get("platform_id"), {})
    user = users.get(proj.get("user_id"), {})

    result = {
        "wo": project_number,
        "api_project_id": proj["id"],
        "client_id": proj.get("client_id"),
        "platform_id": proj.get("platform_id"),
        "client_name": platform.get("platform_name", ""),  # client via platform
        "platform_name": platform.get("platform_name", ""),
        "coordinator_name": user.get("username", ""),
    }

    # Salva/atualiza localmente
    local = db.query(Projeto).filter(Projeto.wo == project_number).first()
    if local:
        for k, v in result.items():
            if v:
                setattr(local, k, v)
    else:
        local = Projeto(**result)
        db.add(local)
    db.commit()

    return result


@router.get("/api-platforms")
async def list_api_platforms():
    token = await get_qualtech_token()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{API_BASE}/platform/list",
            headers={"Authorization": f"Bearer {token}"}
        )
    return r.json()


@router.get("/api-users")
async def list_api_users():
    token = await get_qualtech_token()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{API_BASE}/user/list",
            headers={"Authorization": f"Bearer {token}"}
        )
    return r.json()
