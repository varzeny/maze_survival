# routeers/common.py

# lib
from fastapi.routing import APIRouter
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import Response, FileResponse
from fastapi.websockets import WebSocket

# module

# attribute
router = APIRouter()
template = Jinja2Templates("app/templates")

# method



@router.get("/")
async def get_html_root(req:Request):
    resp = template.TemplateResponse(
        request=req,
        name="home.html",
        context={}
    )
    return resp


@router.get("/favicon.ico")
async def get_favicon():
    return FileResponse(path="app/staticfiles/image/icon/wgw.ico")