# content/__init__.py

# lib
import asyncio
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect

# module
from .protocol import *
from .maze import Manager as MAZE

# define
__all__ = []


class User:
    instances:dict[int,"User"] = {}

    @classmethod
    def create_user(cls, name:str, ws:WebSocket):
        used_id = list(cls.instances.keys())
        for i in range( 1, len(cls.instances)+2 ):
            if i not in used_id:
                cls.instances[i] = cls(i, name, ws)
                print(f"새로운 유저의 ID 는 {i}, 현재유저목록 : {cls.instances.keys()}")
                return cls.instances[i]

    @classmethod
    async def delete_user(cls, u_id:int):
        # 자원정리
        u = cls.instances.pop(u_id)
        del u

            
    def __init__(self, id:int, name:str, ws:WebSocket) -> None:
        self.id:int = id
        self.name:str = name
        self.ws:WebSocket = ws
        self.row:int = 0
        self.col:int = 0
        self.state:int = 0      # 0:로딩, 1:map, 2:contact
        self.stage:Stage = None

    async def activate(self):
        try:
            # 연결승인
            await self.ws.accept()

            # 게임 init
            ok = await send_0(self.ws)
            if not ok:
                raise Exception("game init error")
            
            # 유저 init
            ok = await send_10(
                self.ws,
                {
                    "id":self.id,
                    "name":self.name
                }
            )
            if not ok:
                raise Exception("user init error")

            # 미로 init
            ok = await send_20(self.ws, Game.maze)
            if not ok:
                raise Exception("maze init error")

            # 게임 시작
            self.row, self.col = Game.find_starting() # 시작 좌표 배정
            ok = await send_22(self.ws, self.row, self.col)
            if not ok:
                raise Exception("game start error")
            
            # 지도에 유저 배치
            await Game.deploy_obj(self.row, self.col, self)
            self.state = 1
            print(f"{self.id}:{self.name} 의 게임이 시작됨")
            
            # 게임 중 msg 수신
            while True:
                msg = await self.ws.receive_bytes()
                await self.cmd(msg[0], msg[1:])

        except Exception as e:
            print(f"ERROR from {self.id}:{self.name}'s activate : ", e)

        finally:
            print(f"{self.id}:{self.name} 가 {self.state} 상태에서 종료됨")
            if self.state == 0:
                print()
            elif self.state == 1:
                Game.map[ np.where(Game.map==self.id) ] = 0
                Game.near.discard( self.id )
            elif self.state == 2:
                # 스테이지 폐쇄 절차
                if self.stage:
                    await Stage.disconnect(self)
                
                print()
            try:
                await self.ws.close()
            except Exception as e:
                print(f"{self.id}:{self.name} 의 웹소켓은 이미 닫힘 : ", e)


    async def cmd(self, cmd:int, data):
        # 0~9 게임 #################################################
        if cmd == 0:
            return
        # 10~19 유저 #################################################
        elif cmd == 13: # 유저 갱신
            if self.state == 1:
                nr, nc = struct.unpack(">HH", data)
                await Game.deploy_obj(nr, nc, self)
                if self.id not in Game.near:
                    Game.check_near(self)

        # 20~29 미로 #################################################
        elif cmd == 20:
            return
        # 30~39 컨택 #################################################
        elif cmd == 30:
            return
        elif cmd == 33:
            if self.state == 2:
                choice = struct.unpack(">B", data)[0]
                result = await self.stage.match(self.id, choice)





class Stage:
    instances:dict[int:"Stage"] = {}

    @classmethod
    def create_stage(cls, row:int, col:int, host:User, guest:User):
        used_id = [ k for k in cls.instances.keys() ]
        for i in range( 1, len(cls.instances)+2 ):
            if i not in used_id:
                stage = cls(i, row, col, host, guest)
                host.stage, guest.stage = stage, stage
                cls.instances[i] = stage
                print(f"스테이지 {i} 가 생성됨")


    @classmethod
    def delete_stage(cls, stage_id:int):
        try:
            stage = cls.instances.pop(stage_id)

            # 모든 유저의 미로 갱신
            asyncio.create_task( Game.change_maze( 0, stage.row, stage.col ) )

            # 참여 유저들 해제
            for u in stage.users.values():
                u.stage = None

            del stage

            print(f"스테이지 {stage_id} 제거됨. 현재 스테이지 : {cls.instances.keys()}")
        except:
            print(f"스테이지 {stage_id} 제거 실패")


    @classmethod
    async def disconnect(cls, u:User):
        stage = u.stage
        stage.users.pop(u.id)

        # 남은 놈 승리
        for w in stage.users.values():
            await send_33(w.ws,2)


    
    def __init__(self, id:int, row:int, col:int, host:User, guest:User):
        self.id:int = id
        self.row:int = row
        self.col:int = col
        self.users:dict[int,User] = {host.id:host, guest.id:guest}
        self.choice:int = None
    
    async def match(self, u_id, choice):
        print(f"{u_id} 가 {choice} 를 제출함")
        winner = None
        loser = None
        
        # 첫 제출자면
        if self.choice is None:
            print("첫 제출자")
            self.choice = choice
            return
        
        # 전원 제출이면
        print("두번째 제출자")
        u = self.users[u_id]
        for k, v in self.users.items():
            if k != u_id:
                o = v
        o_choice = self.choice

        # 비겼으면
        if choice == o_choice:
            await send_33(u.ws, 1)
            await send_33(o.ws, 1)
            self.choice = None
            return
        
        else:
            if choice==1:
                if o_choice == 2:
                    winner, loser = u,o
                else:
                    winner, loser = o,u
                
            elif choice==2:
                if o_choice == 1:
                    winner, loser = o,u
                else:
                    winner, loser = u,o
                
            else:
                if o_choice == 1:
                    winner, loser = u,o
                else:
                    winner, loser = o,u

            # 클라이언트에 승패 전송
            await send_33(winner.ws, 2)
            await send_33(loser.ws, 0)

            # 서버에서 매치 뒷처리
            Stage.delete_stage(self.id)
            await Game.deploy_obj(winner.row, winner.col, winner)
            winner.state = 1
            return



class Game:
    size_r:int = 0
    size_c:int = 0
    max_u:int = 0
    near_r:int = 0
    cooldown:int = 0
    maze:np.ndarray = None
    map:np.ndarray = None
    near:set[int] = set()
    flag_near = asyncio.Event()


    @classmethod
    def setup(cls, size_r:int, size_c:int, max_u:int, near_r:int, cooldown:int):
        cls.size_r = size_r
        cls.size_c = size_c
        cls.max_u = max_u
        cls.near_r = near_r
        cls.cooldown = cooldown
        cls.maze = MAZE.create_maze_by_DFS(size_r, size_c, cls.near_r)
        cls.map = np.full( (size_r, size_c), 0, dtype=np.uint8 )
        asyncio.create_task( cls.update_near() )

    
    @classmethod
    def connect(cls, ws:WebSocket):
        # 맥스 유저 체크
        print(f"현재 접속중인 유저들 : {User.instances.keys()}")

        if len(User.instances) > 99:
            return False
        
        # 유저 만들기
        u = User.create_user(
            name=ws.cookies.get("game_token"),
            ws= ws
        )
        return u
    

    @classmethod
    async def update_near(cls):
        while True:
            await cls.flag_near.wait()
            await asyncio.sleep(0.1)
            for id in list(cls.near):
                u = User.instances[id]
                data = cls.check_near(u)
                send_14( u.ws, data[0], data[1], data[2], data[3], data[4] )


    @classmethod
    def check_near(cls, u:User):
        base_r, base_c = u.row-cls.near_r, u.col-cls.near_r
        sm = cls.map[base_r:u.row+cls.near_r+1, base_c:u.col+cls.near_r+1]
        rs, cs = np.nonzero(sm)
        vs = sm[rs, cs]
        if rs.size > 1:
            # 근접리스트 등록
            cls.near.update(vs)
            cls.flag_near.set()
        else:
            # 근접리스트에서 제거
            cls.near.discard(u.id)
            # print(f"{u.id} 가 update_near 에서 벗어남!")
            if len(cls.near) == 0:
                cls.flag_near.clear()
                # print("near가 비었음. 플래그 내림")

        return vs, rs, cs, base_r, base_c
        # # 클라이언트 ui 표시
        # send_14(u.ws, vs, rs, cs, base_r, base_c)
        

    @classmethod
    async def deploy_obj(cls, nr:int, nc:int, u:User):
        target_id = cls.map[nr, nc]
        if target_id == 0: # 해당 위치가 비었으면
            cls.map[u.row, u.col] = 0
            cls.map[nr, nc] = u.id
            u.row, u.col = nr, nc
            cls.check_near(u)
            # print(f"{u.id}:{u.name} 이 {u.row},{u.col} 에 배치됨")
            
        else: # 해당 위치에 선객이 있으면
            print(f"{u.row},{u.col} 에 션객이 있어서 {u.id}:{u.name} 가 contact")
            await cls.contact(nr, nc, User.instances[target_id], u)
            

    @classmethod
    async def contact(cls, row:int, col:int, host:User, guest:User):
        # 스테이지 중 이동요청 차단
        host.state, guest.state = 2, 2
        ok = await send_30(row, col, host, guest)
        if not ok:
            print("스테이지 구성 실패")
            send_1(host.ws)
            send_1(guest.ws)

        # 지도에서 두 유저 지우기( 혹시 뭔가 씹혔을 수 있으니 찾아서 지운다. )
        cls.map[ np.where(cls.map==host.id) ] = 0
        cls.map[ np.where(cls.map==guest.id) ] = 0

        # 근접리스트에서 지우기
        cls.near.discard(host.id)
        cls.near.discard(guest.id)

        # 두 유저의 위치정보를 Stage 로 변경
        host.row, guest.row = row, row
        host.col, guest.col = col, col

        # 모든 유저의 미로 갱신
        asyncio.create_task( cls.change_maze( 8, row, col ) )

        # 스테이지 시작
        Stage.create_stage(row, col, host, guest)
        await send_32(host.ws)
        await send_32(guest.ws)


    ########################################################################
    @classmethod
    async def change_maze(cls, val:int, row:int, col:int):
        print("미로 갱신 시작")
        # 미로 갱신
        cls.maze[row, col] = (cls.maze[row, col] & 0x0F) | (val << 4)


        # 모든 유저의 미로에 contact 지점 표시
        for u in User.instances.values():
            send_23(u.ws, val, row, col)

        print("미로 갱신 완료")
        return
    



    @classmethod
    def find_starting(cls):
        while True:
            r = np.random.randint(cls.near_r, cls.size_r-cls.near_r)
            c = np.random.randint(cls.near_r, cls.size_c-cls.near_r)
            sm = cls.map[r-cls.near_r:r+cls.near_r+1, c-cls.near_r:c+cls.near_r+1]
            rs, cs = np.nonzero(sm)
            if rs.size == 0:
                break
        return r, c
    

    @classmethod
    async def monitoring(cls, ws:WebSocket):
        try:
            while True:
                await asyncio.sleep(1)
                # print("맵 전송")
                ok = await send_20(ws, cls.map)
                if not ok:
                    raise Exception("모니터링용 지도 전송 실패")
        except Exception as e:
            print("ERROR from monitoring : ", e)
        finally:
            try:
                await ws.close()
            except Exception as e:
                print("모니터링 소켓 종료 에러")



