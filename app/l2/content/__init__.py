# content/__init__.py

# lib
import os
import asyncio
from fastapi import WebSocket, BackgroundTasks
import struct
import copy
from random import randint
import json

# module
from .mazz_maker import *

# attribute
__all__ = []

"""
보내기
타입 1 : 유저상태송신 = 타입(8), id(8), row(16), col(16)
타입 2 : 미로송신 = 타입(8), 매트릭스(가변)
타입 3 : 지도송신 = 타입(8), 매트릭스(가변)
타입 4 : 주변정보송신 = 타입(8), 리스트[ (id(8), row(16), col(16))*n ]

받기
타입 1 : 유저상태수신 = 타입(8), 
타입 2 : 
"""
SEND_TYPE_0 = 0
SEND_TYPE_1 = 1 # 유저상태송신 = 타입(8), id(8), row(16), col(16)
SEND_TYPE_2 = 2 # JSON송신 = 타입(8), 
SEND_TYPE_3 = 3 # 매트릭스송신 = 타입(8), 매트릭스(가변)
SEND_TYPE_4 = 4 # 주변정보송신 = 타입(8), 리스트[ (id(8), row(16), col(16))*n ]

def send_type_1(id:int, r:int, c:int):
    return struct.pack("BBHH", SEND_TYPE_1, id, r, c)

def send_type_2(dic:dict):
    json_data = json.dumps(dic)
    return struct.pack("B", SEND_TYPE_2) + json_data.encode("utf-8")

def send_type_3(matrix:np.ndarray):
    return struct.pack("B", SEND_TYPE_3) + matrix.tobytes()

def send_type_4():
    return struct.pack("B", SEND_TYPE_3)


class User:
    def __init__(self, id:int, name:str, maze:np.ndarray, map:np.ndarray, ws:WebSocket, row:int, col:int) -> None:
        self.id:int = id
        self.name:str = name
        self.maze:np.ndarray = maze
        self.map:np.ndarray = map
        self.ws:WebSocket = ws
        self.row:int = row
        self.col:int = col

    async def ws_accept(self):
        await self.ws.accept()

        # 미로 보내기
        maze_data = send_type_3(self.maze)
        await self.ws.send_bytes( maze_data )

        # 시작 좌표 배정
        while True:
            row_ = randint(Game.cr, self.map.shape[0]-Game.cr-1)
            col_ = randint(Game.cr, self.map.shape[1]-Game.cr-1)
            if self.map[row_, col_] == 0:
                self.row, self.col = row_, col_
                break

        # 초기화 데이터 보내주기
        ud = {
            "id":self.id,
            "name":self.name,
            "row":self.row,
            "col":self.col
        }
        reset_data = send_type_2( ud )
        await self.ws.send_bytes( reset_data )

        # 맵에 배치
        self.map[self.row, self.col] = self.id

        try:
            while True:
                resp = await self.ws.receive_bytes()
                cmd = struct.unpack("B", resp)[0]
                print(f"{self.id}번 유저 {self.name} 의 커맨드 : {cmd}")
                await self.cmd(cmd)

        except Exception as e:
            print("ERROR from ws : ", e)

        finally:
            try:
                await self.ws.close()
            except Exception as e:
                print(f"WebSocket is already closed: {e}")


    async def cmd(self, cmd):
        nr, nc = self.row, self.col
        # cmd 분석
        if cmd & 0b00000001:
            print("shift", end="")
        if cmd & 0b00000010:
            print("space", end="")
        if cmd & 0b00000100:
            print("q", end="")
        if cmd & 0b00001000:
            print("e", end="")
        if cmd & 0b00010000:
            print("w", end="")
            nr-=1
        if cmd & 0b00100000:
            print("a", end="")
            nc-=1
        if cmd & 0b01000000:
            print("s", end="")
            nr+=1
        if cmd & 0b10000000:
            print("d", end="")
            nc+=1


        if self.map[nr,nc] == 0:
            self.map[nr,nc], self.map[self.row, self.col] = self.id, 0
            self.row, self.col = nr, nc

        msg = struct.pack("HHHH", self.row, self.col, self.status1, self.status2)

        await self.ws.send_bytes(msg)



class Game:
    instances:list["Game"] = []
    rows=int( os.getenv("GAME_ROWS") )
    cols=int( os.getenv("GAME_COLS") )
    colldown=int( os.getenv("GAME_COLLDOWN") )
    capa=100
    cr = 4

    @classmethod
    def find_game(cls)->"Game":
        # 게임 찾기
        tn, tg = 0, None
        for g in cls.instances:
            n = len(g.users)
            if tn < n < cls.capa:
                tn, tg = n, g
        if not tg:
            tg = Game()
        return tg
    
    @classmethod
    async def delete_game(cls, g:"Game"):
        try:
            # 테스크 먼저 정리
            for t in g.tasks:
                t.cancel()
            
            # 인스턴스 리스트에서 제거
            Game.instances.remove(g)
            print("game 제거됨")
            print( "현재 게임들 : ", Game.instances )
            
        except Exception as e:
            print("ERROR from Game's instance.__del__ : ", e)


    def __init__(self) -> None:
        Game.instances.append(self)
        self.maze:np.ndarray = None
        self.map:np.ndarray = None
        self.users:list[User] = []
        self.tasks:list = []
        self.setup()
        print("game 추가됨 : ", len(Game.instances))


    def setup(self):
        self.maze = self.create_maze(Game.rows, Game.cols)
        self.map = np.full((Game.rows, Game.cols), 0, dtype=np.uint8)
        self.tasks.append(
            asyncio.create_task( self.manage() )
        )


    def create_maze(self, row, col):
        m = MazeManager(row-(Game.cr*2), col-(Game.cr*2))
        m.create_maze_by_DFS()
        maze = copy.deepcopy( m.maze )
        # 패딩두르기
        pad_maze = np.pad(maze, pad_width=Game.cr, mode="constant", constant_values=15)
        
        del m
        return pad_maze


    async def add_user(self, ws:WebSocket)->User:
        # 빈 id 찾기
        used = [ u.id for u in self.users ]
        for i in range(1,100):
            if i not in used:
                break

        # 유저생성
        u = User(
            id = i,
            name = ws.cookies.get("game_token"),
            maze = self.maze,
            map = self.map,
            ws = ws,
            row = Game.cr,
            col = Game.cr
        )
        self.users.append(u)
        return u
    
    async def delete_user(self, u:User):
        self.users.remove(u)
        print(f"{u.id}:{u.name} 유저가 삭제됨")
        print("현재 유저들 : ", [u.id for u in self.users])


    async def manage(self):
        print("manage 시작")
        while True:
            for u in self.users:
                # 슬라이싱
                sm = self.map[u.row-Game.cr:u.row+Game.cr+1, u.col-Game.cr:u.col+Game.cr+1]
                print(sm)

                # 근처 유저id 검색
                rs, cs = np.nonzero( sm )
                vs = sm[rs, cs]
                print( rs, cs, vs)



            await asyncio.sleep(1)



