# content/__init__.py

# lib
from fastapi import WebSocket
import struct

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
        self.status1 = None
        self.status2 = None
        self.row:int = 0
        self.col:int = 0

    async def ws_accept(self):
        await self.ws.accept()
        try:
            while True:
                resp = await self.ws.receive_bytes()
                cmd = struct.unpack("B", resp)
                print(f"{self.id}번 유저 {self.name} 의 커맨드 : {cmd}")

                self.cmd(cmd)

        except Exception as e:
            print("ERROR from wd : ", e)


    async def cmd(self, cmd):
        row, col = 0
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

        if cmd & 0b00100000:
            print("a", end="")
        if cmd & 0b01000000:
            print("s", end="")
        if cmd & 0b10000000:
            print("d", end="")
        print()


    


class Game:
    num = 0

    def __init__(self) -> None:
        self.maze = None
        self.users:list = []
        self.setup()
        Game.num += 1
        print("game 추가됨 : ",Game.num)


    def __del__(self):
        Game.num -= 1
        print("game 제거됨 : ",Game.num)


    def setup(self):
        m = MazeManager(100, 100)
        m.create_maze_by_DFS()
        self.maze = m.maze

    def add_user(self):
        pass


class Manager:
    games:list[Game] = [Game()]

    @classmethod
    def add_game(cls):
        cls.games.append(Game())


