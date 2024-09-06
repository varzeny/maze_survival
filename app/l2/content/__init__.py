# content/__init__.py

# lib
from fastapi import WebSocket

# module
from .mazz_maker import *

# attribute
__all__ = []


class User:
    def __init__(self, name:str, ws:WebSocket) -> None:
        self.name:str = name
        self.ws:WebSocket = ws
        self.row:int = 0
        self.col:int = 0

    


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


