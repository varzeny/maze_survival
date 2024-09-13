# content/__init__.py

# lib
import asyncio
import numpy as np
from fastapi import WebSocket

# module
from .protocol import *
from .maze import Manager as MAZE

# define
__all__ = []


class User:
    def __init__(self, id:int, name:str, ws:WebSocket) -> None:
        self.id:int = id
        self.name:str = name
        self.ws:WebSocket = ws
        self.row:int = 0
        self.col:int = 0
        self.aou:np.ndarray = []


class Game:
    users:dict[int:User] = {}
    size_r:int = 0
    size_c:int = 0
    max_u:int = 0
    ar:int = 0                  # update range, aou range
    cooldown:int = 0
    maze:np.ndarray = None
    map:np.ndarray = None


    @classmethod
    def setup(cls, size_r:int, size_c:int, max_u:int, ar:int, cooldown:int):
        cls.size_r = size_r
        cls.size_c = size_c
        cls.max_u = max_u
        cls.ar = ar
        cls.cooldown = cooldown
        cls.maze = np.pad(
            array = MAZE.create_maze_by_DFS(size_r-(cls.ar*2), size_c-(cls.ar*2)),
            pad_width=cls.ar,
            mode="constant",
            constant_values=15
        )
        cls.map = np.full( (size_r, size_c), 0, dtype=np.uint8 )

    @classmethod
    def add_user(cls, ws:WebSocket):
        used = [ k for k in cls.users.keys() ]
        for i in range(1, cls.max_u):
            if not i in used:
                break

        u = User(i, ws.cookies.get("game_token"), ws)
        cls.users[i] = u
        return u
    
    @classmethod
    async def play(cls, u:User):
        try:
            # 연결승인
            await u.ws.accept()

            # 미로보내기
            ok = await send_type_3(u.ws, cls.maze)
            if not ok:
                raise Exception("send Maze error")
            
            # 게정 불러오기
            pass
            
            # 시작 좌표 배정
            u.row, u.col = cls.find_starting()

            # 유저 데이터 전달
            ok = await send_type_2(
                u.ws, {"id":u.id, "name":u.name, "row":u.row, "col":u.col}
            )
            if not ok:
                raise Exception("send User error")
            
            # 게임 시작 신호
            ok = await send_type_255(u.ws)
            if not ok:
                raise Exception("send start error")
            
            # 유저를 맵에 배치
            cls.map[u.row, u.col] = u.id

            while True:
                resp = await u.ws.receive_bytes()
                cmd, msg = resp[0], resp[1:]
                print("cmd : ",cmd, "    ", "msg : ",msg)
                if cmd == 1:
                    print(1)
                elif cmd == 2:
                    print(2)
                

        except Exception as e:
            print("ERROR from play : ", e)

        finally:
            try:
                cls.map[u.row, u.col] = 0
                u = cls.users.pop(u.id)
                await u.ws.close()
            except Exception as e:
                print(e)
    

    @classmethod
    def find_starting(cls):
        while True:
            r = np.random.randint(cls.ar, cls.size_r-cls.ar)
            c = np.random.randint(cls.ar, cls.size_c-cls.ar)
            sm = cls.map[r-cls.ar:r+cls.ar, c-cls.ar:c+cls.ar]
            rs, cs = np.nonzero(sm)
            if rs.size == 0:
                break
        return r, c
    

    @classmethod
    async def check_ar(cls):
        while True:
            asyncio.sleep(0.5)
            for u in cls.users.values():
                sm = cls.map[u.row-cls.ar:u.row+cls.ar, u.col-cls.ar:u.col+cls.ar]
                rs, cs = np.nonzero(cls.map)
                if rs.size > 1:
                    mask = ~((rs == 4) & (cs == 4))
                    rs, cs = rs[mask], cs[mask]
                    u.aou = sm[rs, cs]



                    

