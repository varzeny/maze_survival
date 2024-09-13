# content/protocol.py

# lib
import struct
import numpy as np
from fastapi import WebSocket
import json
# define

# send
async def send_type_1(ws:WebSocket, )->bool:  # 갱신
    try:
        return
    except Exception as e:
        print("ERROR from send_type_1 : ", e)

async def send_type_2(ws:WebSocket, dic:dict)->bool:  # 설정
    try:
        json_data = json.dumps(dic)
        await ws.send_bytes( struct.pack(">B",2) + json_data.encode("utf-8") )
        return True
    except Exception as e:
        print("ERROR from send_type_2 : ", e)
        return False

async def send_type_3(ws:WebSocket, matrix:np.ndarray)->bool:  # 행렬
    try:
        await ws.send_bytes( struct.pack(">B",3) + matrix.tobytes() )
        return True
    except Exception as e:
        print("ERROR from send_type_3 : ", e)
        return False

async def send_type_4():
    return

async def send_type_255(ws:WebSocket)->bool:
    try:
        await ws.send_bytes( struct.pack(">B",255) )
        return True
    except Exception as e:
        print("ERROR from send_type_255 : ", e)
        return False


# recevie
def receive_type_1():   # 제어
    return

def receive_type_2():   
    return

def receive_type_3():
    return

def receive_type_4():
    return
