# routeers/content.py

# lib
from fastapi.routing import APIRouter
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import Response, FileResponse
from fastapi.websockets import WebSocket
import struct
import asyncio

# module
import app.l2.content as CONT

# attribute
router = APIRouter()
template = Jinja2Templates("app/templates")

# method

# WebSocket 엔드포인트 추가
@router.websocket("/ws-game")
async def websocket_endpoint(ws: WebSocket):
    u = CONT.Game.connect(ws)
    if not u:
        print("인원이 꽉참")
        await ws.close(code=4403, reason="no more space in game")
        return 

    # 플레이 중
    await u.activate()

    # 연결종료
    await CONT.User.delete_user(u.id)
    print("연결 종료")
    print("현재 접속자 : ", list( CONT.User.instances.keys() ))


@router.websocket("/ws-monitor")
async def ws_monitor(ws:WebSocket):

    await ws.accept()
    asyncio.create_task( CONT.Game.monitoring(ws) )

    try:
        while True:
            req = await ws.receive_bytes()
            print(req)
    except Exception as e:
        print("ERROR from monitor : ", e)
    finally:
        try:
            await ws.close()
        except Exception as e:
            print("ERROR from ws-close : ", e)



@router.get("/monitor")
async def get_html_monnitor(req:Request):
    resp = template.TemplateResponse(
        request=req,
        name="monitor.html",
        context={}
    )
    return resp



@router.post("/start")
async def post_start(req:Request):
    reqData = await req.json()
    # print("reqData : ", reqData)    
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
    # print("name : ", name)
    resp = template.TemplateResponse(
        request=req,
        name="game.html",
        context={
            "name":name
        }
    )
    return resp

