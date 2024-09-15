# content/protocol.py

# lib
import asyncio
import struct
import numpy as np
from fastapi import WebSocket
import json
# define

# send
def send_type_1(ws:WebSocket, vs:np.ndarray, rs:np.ndarray, cs:np.ndarray, base_r:int, base_c:int)->bool:  # 갱신
    try:
        data = b""
        for i in range(vs.size):
            data += struct.pack(">BHH", vs[i],base_r+rs[i], base_c+cs[i])

        asyncio.create_task(
            ws.send_bytes( struct.pack(">BB", 1, i+1) + data )
        )
        return True
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

async def send_type_250(row:int, col:int, o_ws:WebSocket, u_ws:WebSocket):  # 겹침
    try:
        msg = struct.pack(">BHH",250, row, col)
        await o_ws.send_bytes( msg )
        await u_ws.send_bytes( msg )
        return True
    except Exception as e:
        print("ERROR from send_type_250 : ", e)
        await o_ws.close(code=4403, reason="contact error")
        await u_ws.close(code=4403, reason="contact error")
        return False

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
