# content/protocol.py

# lib
import asyncio
import struct
import numpy as np
from fastapi import WebSocket
import json

# define


# send
async def send_0(ws:WebSocket):
    try:
        await ws.send_bytes( struct.pack(">B", 0) )
        return True
    except Exception as e:
        print("ERROR FROM send_0 : ", e)
        return False
    
async def send_1(ws:WebSocket):
    try:
        await ws.send_bytes( struct.pack(">B", 1) )
        return True
    except Exception as e:
        print("ERROR FROM send_1 : ", e)
        return False

async def send_10(ws:WebSocket, dic:dict)->bool:  # 유저
    try:
        json_data = json.dumps(dic)
        await ws.send_bytes( struct.pack(">B",10) + json_data.encode("utf-8") )
        return True
    except Exception as e:
        print("ERROR from send_10 : ", e)
        return False
    
def send_14(ws:WebSocket, vs:np.ndarray, rs:np.ndarray, cs:np.ndarray, base_r:int, base_c:int)->bool:  # 갱신
    try:
        data = b""
        for i in range(vs.size):
            data += struct.pack(">BHH", vs[i],base_r+rs[i], base_c+cs[i])

        asyncio.create_task(
            ws.send_bytes( struct.pack(">BB", 14, i+1) + data )
        )
        return True
    except Exception as e:
        print("ERROR from send_14 : ", e)

async def send_20(ws:WebSocket, matrix:np.ndarray)->bool:  # 미로
    try:
        await ws.send_bytes( struct.pack(">B",20) + matrix.tobytes() )
        return True
    except Exception as e:
        print("ERROR from send_20 : ", e)
        return False

async def send_22(ws:WebSocket, row:int, col:int)->bool:
    try:
        await ws.send_bytes( struct.pack(">BHH",22, row, col) )
        return True
    except Exception as e:
        print("ERROR from send_22 : ", e)
        return False

def send_23(ws:WebSocket, val:int, row:int, col:int):
    try:
        asyncio.create_task(
            ws.send_bytes( struct.pack(">BBHH", 23, val, row, col) )
        )
    except Exception as e:
        print("ERROR from send_23 : ", e)    
    return

# contact 시작
async def send_30(row:int, col:int, u, o)->bool:
    try:
        await u.ws.send_bytes(
            struct.pack(">BHH", 30, row, col)+json.dumps(
                { "name":o.name }
            ).encode("utf-8")
        )
        await o.ws.send_bytes(
            struct.pack(">BHH", 30, row, col)+json.dumps(
                { "name":u.name }
            ).encode("utf-8")
        )

        return True
    except Exception as e:
        print("ERROR from send_30 : ", e)
        return False

# 턴시작
async def send_32(ws:WebSocket)->bool:
    try:
        await ws.send_bytes( struct.pack(">B", 32) )
        return True
    except Exception as e:
        print("ERROR from send_32 : ", e)
        return False

# 턴 매치 결과
async def send_33(ws:WebSocket, result:int)->bool:
    try:
        await ws.send_bytes( struct.pack(">BB", 33, result) )
        return True
    except Exception as e:
        print("ERROR from send_33 : ", e)
        return False