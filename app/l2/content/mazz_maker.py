# content/maze_maker.py

# lib
import sys
# sys.setrecursionlimit(10000)
import numpy as np
import random

# attribute

class MazeManager:
    def __init__(self, row, col) -> None:
        self.row = row
        self.col = col
        # (행연산, 열연산, 현재위치작업, 다음위치작업)
        self.direction = [ (-1,0,1,4), (0,1,2,8), (1,0,4,1), (0,-1,8,2) ]
        self.maze = None


    def create_maze_by_DFS(self):
        # 틀 생성
        self.maze = np.full( (self.row, self.col), 15, dtype=np.uint8 )
        # self.visit = np.full( (self.row, self.col), 0, dtype=bool )

        # 시작점 정하기
        r = np.random.randint(0, self.row)
        c = np.random.randint(0, self.col)

        # 길만들기
        self.re_pathfinder(r, c)
        # self.show_maze()


    def re_pathfinder(self, start_r, start_c):
        # print( f"행:{r}, 열:{c} = 값:{self.maze[r,c]}" )
        stack = [(start_r, start_c)]  # 스택에 시작 좌표 추가

        while stack:
            r, c = stack.pop()  # 스택에서 좌표를 꺼냄

            seq = self.direction[:]  # 가능한 방향을 섞기
            random.shuffle(seq)

            for dr, dc, cv, nv in seq:
                nr, nc = r + dr, c + dc
                if 0 <= nr < self.row and 0 <= nc < self.col:
                    if self.maze[nr, nc] & 15 == 15:  # 아직 방문하지 않은 경우
                        self.maze[r, c] -= cv  # 벽을 깸
                        self.maze[nr, nc] -= nv
                        stack.append((nr, nc))  # 다음 좌표를 스택에 추가


    def create_maze_by_prim(self):
        # 초기화: 모든 셀을 벽으로 둘러싼 상태로 설정
        self.maze = np.full((self.row, self.col), 15, dtype=np.uint8)
        
        # 시작점 설정
        walls = []
        r = np.random.randint(0, self.row)
        c = np.random.randint(0, self.col)
        
        # 현재 셀을 방문 처리하고 그 주변 벽을 리스트에 추가
        self.maze[r, c] = 0
        walls.append((r, c))

        while walls:
            # 무작위로 벽을 선택
            r, c = walls.pop(np.random.randint(len(walls)))

            # 주위에 아직 방문하지 않은 셀이 있으면 벽을 허문다
            for dr, dc, cv, nv in self.direction:
                nr, nc = r + dr, c + dc
                if (0 <= nr < self.row) and (0 <= nc < self.col):
                    if self.maze[nr, nc] == 15:
                        self.maze[r, c] -= cv
                        self.maze[nr, nc] -= nv
                        walls.append((nr, nc))


    def show_maze(self):
        # 상단 벽 출력
        maze_str = "+" + "------+" * self.col + "\n"

        for r in range(self.row):
            # 각 행의 세로 벽 출력
            maze_str += "|"
            for c in range(self.col):
                # 셀 내부는 공백으로 채우고, 오른쪽에 벽이 있는지 확인
                maze_str += "      |" if (self.maze[r, c] & 2) else "       "
            
            maze_str += "\n"

            # 각 행의 가로 벽 출력
            maze_str += "+"
            for c in range(self.col):
                # 아래쪽에 벽이 있는지 확인하고 출력
                maze_str += "------+" if (self.maze[r, c] & 4) else "      +"
            maze_str += "\n"

        print(maze_str)








if __name__=="__main__":
    m = MazeManager(4, 10)
    m.create_maze_by_DFS()
    # m.create_maze_by_prim()


    m.show_maze()
