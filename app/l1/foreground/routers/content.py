# routeers/content.py

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

# WebSocket 엔드포인트 추가
@router.websocket("/ws-game")
async def websocket_endpoint(ws: WebSocket):
    name = ws.cookies.get("game_token")
    print("ws-name : ", name)



    await ws.accept()  # WebSocket 연결을 수락
    try:
        while True:
            # 클라이언트로부터 메시지를 받음
            data = await ws.receive_text()
            print(f"Received message: {data}")
            
            # 클라이언트로 메시지를 다시 보냄
            await ws.send_text(f"Message received: {data}")
    except Exception as e:
        print(f"WebSocket connection error: {e}")



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

