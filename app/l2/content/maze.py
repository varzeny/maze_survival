# content/maze.py

# lib
import numpy as np

# define
class Manager:
    direction = [ (-1,0,1,4), (0,1,2,8), (1,0,4,1), (0,-1,8,2) ]

    @classmethod
    def create_maze_by_DFS(cls, size_r:int, size_c:int, near_r:int)->np.ndarray:
        rows, cols = size_r-(near_r*2), size_c-(near_r*2)
        maze = np.full( (rows, cols), 15, dtype=np.uint8 )

        # 벽배치
        sr, sc = np.random.randint(0, rows), np.random.randint(0, cols)
        stack = [ (sr, sc) ]
        while stack:
            r, c = stack.pop()
            seq = cls.direction[:]
            np.random.shuffle(seq)

            for dr, dc, cv, nv in seq:
                nr, nc = r + dr, c + dc
                if (0 <= nr < rows) and (0<=nc<cols):
                    if maze[nr, nc] & 15 == 15:
                        maze[r, c] -= cv  # 벽을 깸
                        maze[nr, nc] -= nv
                        stack.append((nr, nc))  # 다음 좌표를 스택에 추가

        # obj 배치
        ## 위계단
        cls.random_position(maze, 0, rows, 0, cols, 1)

        ## 아래계단
        cls.random_position(maze, 0, rows, 0, cols, 2)

        ## 상자
        for i in range( int(rows*cols/100) ):
            cls.random_position(maze,0,rows,0,cols, 3)
            

        # 패딩(검색연산 줄이기위한)
        result = np.pad(
            array = maze,
            pad_width = near_r,
            mode="constant",
            constant_values=15
        )

        return result
    

    @classmethod
    def random_position(cls, map, sr, er, sc, ec, v):
        while True:
            r = np.random.randint(sr, er)
            c = np.random.randint(sc, ec)
            if (map[r, c] >> 4) == 0:
                map[r,c] |= (v<<4)
                break
