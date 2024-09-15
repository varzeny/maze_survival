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
    near_r:int = 0
    cooldown:int = 0
    maze:np.ndarray = None
    map:np.ndarray = None
    near:set[int] = set()
    flag_near = asyncio.Event()


    @classmethod
    def setup(cls, size_r:int, size_c:int, max_u:int, near_r:int, cooldown:int):
        cls.size_r = size_r
        cls.size_c = size_c
        cls.max_u = max_u
        cls.near_r = near_r
        cls.cooldown = cooldown
        cls.maze = np.pad(
            array = MAZE.create_maze_by_DFS(size_r-(cls.near_r*2), size_c-(cls.near_r*2)),
            pad_width=cls.near_r,
            mode="constant",
            constant_values=15
        )
        cls.map = np.full( (size_r, size_c), 0, dtype=np.uint8 )
        asyncio.create_task( cls.update_near() )


    @classmethod
    async def update_near(cls):
        print("update_near 시작됨")
        while True:
            await cls.flag_near.wait()
            await asyncio.sleep(0.1)
            for id in list(cls.near):
                u = cls.users[id]
                base_r, base_c = u.row-cls.near_r, u.col-cls.near_r
                sm = cls.map[u.row-cls.near_r:u.row+cls.near_r+1, u.col-cls.near_r:u.col+cls.near_r+1]
                rs, cs = np.nonzero(sm)
                vs = sm[rs, cs]

                # print(f"{u.id} : {sm}")
                if rs.size > 1:
                    # print(f"{u.id} 에 근접있음")
                    cls.near.update(vs)
                    send_type_1(u.ws, vs, rs, cs, base_r, base_c)
                    
                else:
                    # print(f"{u.id} 에 근접없음")
                    send_type_1(u.ws, vs, rs, cs, base_r, base_c)
                    cls.near.discard(id)
                    print(f"{id} 가 update_near 에서 벗어남!")
                    if len(cls.near) == 0:
                        cls.flag_near.clear()
                        print("near가 비었음. 플래그 내림")


    @classmethod
    def add_user(cls, ws:WebSocket):
        used = [ k for k in cls.users.keys() ]
        for i in range(1, cls.max_u):
            if not i in used:
                u = User(i, ws.cookies.get("game_token"), ws)
                cls.users[i] = u
                return u
        return False
            

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
                cmd = resp[0]
                if cmd == 1:
                    nr, nc = struct.unpack(">HH", resp[1:])
                    if cls.map[nr,nc] == 0:
                        cls.map[u.row, u.col] = 0
                        u.row, u.col = nr, nc
                        cls.map[nr,nc] = u.id
                        print(f"{u.id} : {nr}, {nc}, {cls.near}")

                        # 주변확인
                        if u.id not in cls.near:
                            sm = cls.map[u.row-cls.near_r:u.row+cls.near_r+1, u.col-cls.near_r:u.col+cls.near_r+1]
                            rs, cs = np.nonzero(sm)
                            if rs.size > 1:
                                vs = sm[rs, cs]
                                cls.near.update(vs)
                                if not cls.flag_near.is_set():
                                    cls.flag_near.set()
                    else:
                        print("겹침 !!")
                        o_id = cls.map[nr, nc]
                        o:User = cls.users[ o_id ]
                        asyncio.create_task( cls.contact_stage( nr, nc, o, u ) )

                elif cmd == 2:
                    print(2)
                
        except Exception as e:
            print("ERROR from play : ", e)

        finally:
            try:
                cls.map[u.row, u.col] = 0
                cls.near.discard(u.id)
                u = cls.users.pop(u.id)
                await u.ws.close()
            except Exception as e:
                print(e)


    @classmethod
    def find_starting(cls):
        while True:
            r = np.random.randint(cls.near_r, cls.size_r-cls.near_r)
            c = np.random.randint(cls.near_r, cls.size_c-cls.near_r)
            sm = cls.map[r-cls.near_r:r+cls.near_r+1, c-cls.near_r:c+cls.near_r+1]
            rs, cs = np.nonzero(sm)
            if rs.size == 0:
                break
        return r, c
    

    @classmethod
    async def contact_stage(cls, row:int, col:int, o:User, u:User):
        ok = await send_type_250(row, col, o.ws, u.ws)
        if not ok:
            return
        
        o.row, u.row = row, row
        o.col, u.col = col, col
        
        # 지도정리
        sm = cls.map[row-cls.near_r:row+cls.near_r, col-cls.near_r:col+cls.near_r]
        op_r, op_c = np.where( (sm==o.id) )
        up_r, up_c = np.where( (sm==u.id) )
        # print(">>>>>>>>>>>>>>>>>>>>>>>>>op : ", op_r, op_c)
        # print(">>>>>>>>>>>>>>>>>>>>>>>>>up : ", up_r, up_c)
        cls.map[op_r, op_c] = 0
        cls.map[up_r, up_c] = 0
        cls.map[row, col] = 250

        

        return
