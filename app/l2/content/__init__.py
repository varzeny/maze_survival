# content/__init__.py

# lib
from fastapi import WebSocket
import struct
import copy
from random import randint

# module
from .mazz_maker import *

# attribute
__all__ = []


class User:
    def __init__(self, id:int, name:str, map:np.ndarray, ws:WebSocket) -> None:
        self.id:int = id
        self.name:str = name
        self.map:np.ndarray = map
        self.ws:WebSocket = ws
        self.status1 = 0b0000000000000000
        self.status2 = 0b0000000000000000
        self.row:int = 0
        self.col:int = 0

    async def ws_accept(self):
        await self.ws.accept()
        self.row = randint(0, self.map.shape[0])
        self.col = randint(0, self.map.shape[1])

        try:
            while True:
                resp = await self.ws.receive_bytes()
                cmd = struct.unpack("B", resp)[0]
                print(f"{self.id}번 유저 {self.name} 의 커맨드 : {cmd}")
                await self.cmd(cmd)

        except Exception as e:
            print("ERROR from ws : ", e)

        finally:
            await self.ws.close()



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

    # 이거 백그라운드에서 해야 하지 않나?
    @classmethod
    def add_user(cls, ws:WebSocket):
        if len(cls.instances) == 0:
            cls.instances.append(Game())

        big_game:Game = cls.instances[0]
        for g in cls.instances:
            if len(g.users) > len(big_game.users):
                big_game = g
        
        u = User(
            id=len(big_game.users)+1,
            name=ws.cookies.get("game_token"),
            map=big_game.map,
            ws=ws
        )
        big_game.users.append(u)
        print(f"{u.id}:{u.name} 유저 추가됨")

        return big_game, u
        

        # # 여기서 통신함
        # await u.ws_accept()

        # # 연결 끊김
        # print(f"{u.id}:{u.name} 의 연결이 끊김")
        # big_game.users.remove(u)







    def __init__(self) -> None:
        self.maze:np.ndarray = None
        self.map:np.ndarray = None
        self.users:list = []
        self.create_map(100, 100)
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



