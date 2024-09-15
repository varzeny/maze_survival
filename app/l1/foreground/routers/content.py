# routeers/content.py

# lib
from fastapi.routing import APIRouter
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import Response, FileResponse
from fastapi.websockets import WebSocket
import struct

# module
import app.l2.content as CONT

# attribute
router = APIRouter()
template = Jinja2Templates("app/templates")

# method

# WebSocket 엔드포인트 추가
@router.websocket("/ws-game")
async def websocket_endpoint(ws: WebSocket):
    name = ws.cookies.get("game_token")
    print("ws-name : ", name)
    print("현재 접속자 : ", list( CONT.Game.users.keys() ))

    u = CONT.Game.add_user(ws)
    if not u:
        print("인원이 꽉참")
        ws.close(code=4403, reason="no more spare in game")
        return 

    # 유저가 있으면
    await CONT.Game.play(u)
    del u
    print("연결 종료")
    print("현재 접속자 : ", list( CONT.Game.users.keys() ))


@router.post("/start")
async def get_html_root(req:Request):
    reqData = await req.json()
    print("reqData : ", reqData)    
    resp = Response(status_code=200)
    resp.set_cookie(
        key="game_token",
        value=reqData.get("name"),
        httponly=True,
        max_age=3600
    )
    return resp


@router.get("/game")
async def get_html_root(req:Request):
    name = req.cookies.get("game_token")
    print("name : ", name)
    resp = template.TemplateResponse(
        request=req,
        name="game.html",
        context={
            "name":name
        }
    )
    return resp

