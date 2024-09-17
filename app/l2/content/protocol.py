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


async def send_10(ws:WebSocket, dic:dict)->bool:  # 유저
    try:
        json_data = json.dumps(dic)
        await ws.send_bytes( struct.pack(">B",10) + json_data.encode("utf-8") )
        return True
    except Exception as e:
        print("ERROR from send_type_2 : ", e)
        return False

async def send_20(ws:WebSocket, matrix:np.ndarray)->bool:  # 미로
    try:
        await ws.send_bytes( struct.pack(">B",20) + matrix.tobytes() )
        return True
    except Exception as e:
        print("ERROR from send_type_3 : ", e)
        return False

async def send_22(ws:WebSocket, row:int, col:int)->bool:
    try:
        await ws.send_bytes( struct.pack(">BHH",22, row, col) )
        return True
    except Exception as e:
        print("ERROR from send_type_255 : ", e)
        return False

def send_23(ws:WebSocket, vs:np.ndarray, rs:np.ndarray, cs:np.ndarray, base_r:int, base_c:int)->bool:  # 갱신
    try:
        data = b""
        for i in range(vs.size):
            data += struct.pack(">BHH", vs[i],base_r+rs[i], base_c+cs[i])

        asyncio.create_task(
            ws.send_bytes( struct.pack(">BB", 23, i+1) + data )
        )
        return True
    except Exception as e:
        print("ERROR from send_type_1 : ", e)

def send_24(ws:WebSocket, val:int, row:int, col:int):
    try:
        asyncio.create_task(
            ws.send_bytes( struct.pack(">BBHH", 24, val, row, col) )
        )
    except Exception as e:
        print("ERROR from send_type_8 : ", e)    
    return

async def send_30(row:int, col:int, o, u)->bool:
    try:
        await o.ws.send_bytes(
            struct.pack(">BHH",30,row,col)+json.dumps(
                { "name":u.name }
            ).encode("utf-8")
        )
        await u.ws.send_bytes(
            struct.pack(">BHH",30,row,col)+json.dumps(
                { "name":o.name }
            ).encode("utf-8")
        )
        return True
    except Exception as e:
        print("ERROR from send_type_250 : ", e)
        return False






async def send_type_4():
    return







# recevie
def receive_type_1():   # 제어
    return

def receive_type_2():   
    return

def receive_type_3():
    return

def receive_type_4():
    return
