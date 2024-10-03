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
        # cls.random_position(maze, 0, rows, 0, cols, 1)

        # ## 아래계단
        # cls.random_position(maze, 0, rows, 0, cols, 2)

        ## 상자
        # for i in range( int(rows*cols/100) ):
        #     cls.random_position(maze,0,rows,0,cols, 3)
            

        # 패딩(검색연산 줄이기위한)
        result = np.pad(
            array = maze,
            pad_width = near_r,
            mode="constant",
            constant_values=15
        )
        return result
    

    # @classmethod
    # def random_position(cls, map, sr, er, sc, ec, v):
    #     while True:
    #         r = np.random.randint(sr, er)
    #         c = np.random.randint(sc, ec)
    #         if (map[r, c] >> 4) == 0:
    #             map[r,c] |= (v<<4)
    #             break





    # def create_maze_by_prim(self):
    #     # 초기화: 모든 셀을 벽으로 둘러싼 상태로 설정
    #     self.maze = np.full((self.row, self.col), 15, dtype=np.uint8)
        
    #     # 시작점 설정
    #     walls = []
    #     r = np.random.randint(0, self.row)
    #     c = np.random.randint(0, self.col)
        
    #     # 현재 셀을 방문 처리하고 그 주변 벽을 리스트에 추가
    #     self.maze[r, c] = 0
    #     walls.append((r, c))

    #     while walls:
    #         # 무작위로 벽을 선택
    #         r, c = walls.pop(np.random.randint(len(walls)))

    #         # 주위에 아직 방문하지 않은 셀이 있으면 벽을 허문다
    #         for dr, dc, cv, nv in self.direction:
    #             nr, nc = r + dr, c + dc
    #             if (0 <= nr < self.row) and (0 <= nc < self.col):
    #                 if self.maze[nr, nc] == 15:
    #                     self.maze[r, c] -= cv
    #                     self.maze[nr, nc] -= nv
    #                     walls.append((nr, nc))


    # def show_maze(self):
    #     # 상단 벽 출력
    #     maze_str = "+" + "------+" * self.col + "\n"

    #     for r in range(self.row):
    #         # 각 행의 세로 벽 출력
    #         maze_str += "|"
    #         for c in range(self.col):
    #             # 셀 내부는 공백으로 채우고, 오른쪽에 벽이 있는지 확인
    #             maze_str += "      |" if (self.maze[r, c] & 2) else "       "
            
    #         maze_str += "\n"

    #         # 각 행의 가로 벽 출력
    #         maze_str += "+"
    #         for c in range(self.col):
    #             # 아래쪽에 벽이 있는지 확인하고 출력
    #             maze_str += "------+" if (self.maze[r, c] & 4) else "      +"
    #         maze_str += "\n"

    #     print(maze_str)


if __name__ == "__main__":
    r = Manager.create_maze_by_DFS(10,10,2)
    print(r)