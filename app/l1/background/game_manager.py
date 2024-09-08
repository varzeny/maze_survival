# background/game_manager.py

#  lib
from fastapi import WebSocket

# module
import app.l2.content as CONT

# attribute
GAME = None



# method
def activate():
    global GAME
    GAME = CONT.Game()
    
