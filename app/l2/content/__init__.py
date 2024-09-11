# content/__init__.py

# lib
import os
import asyncio
from fastapi import WebSocket
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
            row_ = randint(0, self.map.shape[0]-1)
            col_ = randint(0, self.map.shape[1]-1)
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
    instances:list = []
    rows=int( os.getenv("GAME_ROWS") )
    cols=int( os.getenv("GAME_COLS") )
    colldown=int( os.getenv("GAME_COLLDOWN") )
    capa=100
    vr = 4

    @classmethod
    async def add_user(cls, ws:WebSocket):
        # 게임 찾기
        tn, tg = 0, None
        for g in cls.instances:
            n = len(g.users)
            if tn < n < cls.capa:
                tn, tg = n, g
        if not tg:
            tg = Game()
            cls.instances.append(tg)
            tg.count += 1
                
        # 유저의 자리 찾기
        for i in range(1,cls.capa): # 0은 지도행렬에서 비었음을 의미함
            if not tg.users[i]:
                id_=i
                break
        
        # 유저생성
        u = User(
            id = id_,
            name = ws.cookies.get("game_token"),
            maze = tg.maze,
            map = tg.map,
            ws = ws,
            row=0,
            col=0
        )
        tg.users[id_] = u

        print(f"{u.id}:{u.name} 유저 추가됨")
        print("전체 유저 : ", tg.users)

        # 송수신대기
        await u.ws_accept()

        # 연결 끊김
        print(f"{u.id}:{u.name} 의 연결이 끊김")
        tg.users.remove(u)
        tg.count -= 1


    def __init__(self) -> None:
        self.maze:np.ndarray = None
        self.map:np.ndarray = None
        self.users:list = [None]*100
        self.count = 0
        self.is_active = asyncio.Event()


        self.create_map(Game.rows, Game.cols)
        Game.instances.append(self)
        print("game 추가됨 : ", len(Game.instances))


    def __del__(self):
        print("game 제거됨 : ", len(Game.instances))


    def create_map(self, row, col):
        m = MazeManager(row, col)
        m.create_maze_by_DFS()
        self.maze = copy.deepcopy( m.maze )
        del m
        self.map = np.full( (row, col), 0, dtype=np.uint8 )


    async def manage(self):
        while True:
            await self.is_active.wait()
            for u in  self.users:

                rs = np.clip(u.row - Game.vs, 0, Game.rows)
                re = np.clip(u.row + Game.vs, 0, Game.rows )
                cs = np.clip(u.col - Game.vs, 0, Game.cols)
                ce = np.clip(u.col + Game.vs, 0, Game.cols )

                result = np.nonzero( self.map[rs:re, cs:ce] )
                print(result)
            
            await asyncio.sleep(1)





