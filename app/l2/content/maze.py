# content/maze.py

# lib
import numpy as np

# define
class Manager:
    direction = [ (-1,0,1,4), (0,1,2,8), (1,0,4,1), (0,-1,8,2) ]

    @classmethod
    def create_maze_by_DFS(cls, rows:int, cols:int)->np.ndarray:
        maze = np.full( (rows, cols), 15, dtype=np.uint8 )

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

        return maze