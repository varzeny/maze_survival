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
        self.state:int = 0            # 0:로딩, 1:map, 8:contact


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
        cls.maze = MAZE.create_maze_by_DFS(size_r, size_c, cls.near_r)
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
            u.state = 1
            cls.map[u.row, u.col] = u.id

            while True:
                resp = await u.ws.receive_bytes()
                cmd = resp[0]
                if cmd == 1:
                    if u.state == 1:
                        nr, nc = struct.unpack(">HH", resp[1:])
                        if cls.map[nr,nc] == 0:
                            cls.map[u.row, u.col] = 0
                            u.row, u.col = nr, nc
                            cls.map[nr,nc] = u.id
                            print(f"{u.id} : {nr}, {nc}, {cls.near}")

                            # 업데이트 리스트 아니면 주변확인
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

                            # 이동 요청 씹기
                            u.state, o.state = 8, 8

                            # 두 유저에게 정지신호 발신
                            ok = await send_type_250(nr, nc, o.ws, u.ws)
                            if not ok:
                                return

                            # 지도에서 두 유저 지우기
                            sm = cls.map[nr-cls.near_r:nr+cls.near_r, nc-cls.near_r:nc+cls.near_r]
                            op_r, op_c = np.where( (sm==o.id) )
                            up_r, up_c = np.where( (sm==u.id) )
                            # print(">>>>>>>>>>>>>>>>>>>>>>>>>op : ", op_r, op_c)
                            # print(">>>>>>>>>>>>>>>>>>>>>>>>>up : ", up_r, up_c)
                            cls.map[op_r, op_c] = 0
                            cls.map[up_r, up_c] = 0

                            # 근접 업데이트에서 지우기
                            cls.near.discard(u.id); print(f"{u.id} 가 near를 벗어남");
                            cls.near.discard(o.id); print(f"{o.id} 가 near를 벗어남");

                            # 두 유저의 위치정보를 contact 지점으로
                            o.row, u.row = nr, nr
                            o.col, u.col = nc, nc

                            # contact 절차
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
    async def contact_stage(cls, row:int, col:int, o:User, u:User):
        # 미로 갱신
        cls.maze[row, col] |= (8<<4)

        # 모든 유저의 미로에 contact 지점 표시
        for u in cls.users.values():
            send_type_8(u.ws, row, col)



        return
    



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
