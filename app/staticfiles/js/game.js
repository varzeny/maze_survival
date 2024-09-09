// home.js
document.addEventListener("DOMContentLoaded", init);

let WS;
let keysPressed = 0;  // 비트 플래그로 눌린 키들을 저장 (1바이트로 관리)

const CONTEXT = {}
const USER = {
    id:null,
    name:null,
    ws:null,
    row:null,
    col:null
}
let MAZE = null;
let MAP = null;

const remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
const cellSize = remSize * 2;  // 셀 크기
const rows = 100;
const cols = 100;



// 각 키에 대한 비트 매핑 (파이썬 코드 순서와 맞춤)
const keyMap = {
    "Shift": 0,  // Shift는 첫 번째 비트
    " ": 1,      // Space는 두 번째 비트
    "q": 2,      // Q는 세 번째 비트
    "e": 3,      // E는 네 번째 비트
    "w": 4,      // W는 다섯 번째 비트
    "a": 5,      // A는 여섯 번째 비트
    "s": 6,      // S는 일곱 번째 비트
    "d": 7       // D는 여덟 번째 비트
};

async function init() {
    //context 불러오기
    CONTEXT.name = document.getElementById("context").getAttribute("data-name");

    // 필수 오브젝트들 구성
    USER.name = CONTEXT.name
    USER.ws = new WebSocket("wss://test.varzeny.com/ws-game");
    USER.ws.binaryType = "arraybuffer";
    
    // WebSocket 이벤트 설정
    USER.ws.addEventListener("open", function(ev) {
        console.log("WS is connected !");

    });

    USER.ws.addEventListener("close", function(ev) {
        console.log("WS is disconnected !");
        window.location.href = "/";
    });

    USER.ws.addEventListener("message", function(ev) {
        const resp = ev.data;
        const respData = new DataView(resp);
        const respType = respData.getUint8(0, true)

        switch(respType){
            case 1: // 유저상태 수신
                USER.id = respData.getUint8(1, true);
                USER.name = CONTEXT.name;
                USER.row = respData.getUint16(2, true);
                USER.col = respData.getUint16(4, true);
                console.log(USER);
                break;
            case 2:
                const matrix = new Uint8Array( resp, 1 );
                const maze = [];
                for (let i = 0; i < rows; i++) {
                    maze.push(matrix.slice(i * cols, (i + 1) * cols));
                }
                MAZE = maze;
                // showMaze(MAZE,rows,cols);
                console.log(USER);

                // 미로그리기
                drawFullMaze(MAZE);
                drawCharacter(USER.row, USER.col);
                moveViewToCharacter(USER.row, USER.col);

                break;
            case 3:
                break;
            default:
                console.log("알 수 없는 타입");
        }
    });

    USER.ws.addEventListener("error", function(ev) {
        console.error("WS error : ", ev);
    });

    // 키 이벤트 리스너 설정
    document.addEventListener("keydown", keyDown);
    // document.addEventListener("keyup", keyUp);

    console.log("home.js 로드 완료");
}









function drawFullMaze(maze){
    const mazeCanvas = document.getElementById("maze-canvas");
    const ctx = mazeCanvas.getContext("2d");

    // 캔버스 크기를 미로 크기에 맞게 설정
    mazeCanvas.width = cols * cellSize;
    mazeCanvas.height = rows * cellSize;

    // 미로 그리기
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * cellSize;
            const y = r * cellSize;

            ctx.fillStyle = "white";
            ctx.fillRect(x, y, cellSize, cellSize);

            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;

            // 오른쪽 벽 (비트 2)
            if (maze[r][c] & 2) {
                ctx.beginPath();
                ctx.moveTo(x + cellSize, y);
                ctx.lineTo(x + cellSize, y + cellSize);
                ctx.stroke();
            }

            // 아래쪽 벽 (비트 4)
            if (maze[r][c] & 4) {
                ctx.beginPath();
                ctx.moveTo(x, y + cellSize);
                ctx.lineTo(x + cellSize, y + cellSize);
                ctx.stroke();
            }
        }
    }

}


function drawCharacter(row, col) {
    const characterCanvas = document.getElementById("obj-canvas");
    const ctx = characterCanvas.getContext("2d");

    // 캐릭터 캔버스 크기 설정 (미로 크기와 동일)
    characterCanvas.width = cols * cellSize;
    characterCanvas.height = rows * cellSize;

    // 캐릭터 위치 업데이트
    ctx.clearRect(0, 0, characterCanvas.width, characterCanvas.height);  // 이전 캐릭터 지우기
    const x = col * cellSize;
    const y = row * cellSize;

    // 캐릭터 그리기
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();
}


function moveViewToCharacter(row, col) {
    const mazeCanvas = document.getElementById("maze-canvas");
    const characterCanvas = document.getElementById("obj-canvas");

    // 중앙에 위치할 캐릭터의 좌표 계산
    const offsetX = (col * cellSize) - (5 * cellSize);  // 화면의 중앙이 (4, 4)이므로 그에 맞춰 이동
    const offsetY = (row * cellSize) - (5 * cellSize);

    // 미로와 캐릭터의 위치 이동 (CSS transform 사용)
    mazeCanvas.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
    characterCanvas.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
}









function showMaze(maze, rows, cols) {
    let mazeStr = "\n\n" + "+" + "---+".repeat(cols) + "\n";  // 상단 벽

    for (let r = 0; r < rows; r++) {
        // 각 행의 세로 벽
        mazeStr += "|";
        for (let c = 0; c < cols; c++) {
            // 셀 내부 공백 및 오른쪽 벽 확인 (비트 2 확인)
            mazeStr += (maze[r][c] & 2) ? "   |" : "    ";
        }
        mazeStr += "\n";

        // 각 행의 가로 벽
        mazeStr += "+";
        for (let c = 0; c < cols; c++) {
            // 아래쪽 벽 확인 (비트 4 확인)
            mazeStr += (maze[r][c] & 4) ? "---+" : "   +";
        }
        mazeStr += "\n";
    }

    console.log(mazeStr);
}


function keyDown(ev) {
    let moved = false;

    if (keyMap.hasOwnProperty(ev.key)) {
        switch (ev.key) {
            case "w":
                if (USER.row > 0) USER.row--;
                moved = true;
                break;
            case "a":
                if (USER.col > 0) USER.col--;
                moved = true;
                break;
            case "s":
                if (USER.row < 99) USER.row++;
                moved = true;
                break;
            case "d":
                if (USER.col < 99) USER.col++;
                moved = true;
                break;
        }

        if (moved) {
            console.log(ev.key);
            drawCharacter(USER.row, USER.col);  // 캐릭터 위치 업데이트
            moveViewToCharacter(USER.row, USER.col);  // 미로 이동
        }
    }
}











// function keyDown(ev) {
//     if (keyMap.hasOwnProperty(ev.key)) {
//         keysPressed |= (1 << keyMap[ev.key]);  // 해당 비트를 1로 설정
//         console.log(Date.now(), keysPressed)
//         // sendState();
//     }
// }

// function keyUp(ev) {
//     if (keyMap.hasOwnProperty(ev.key)) {
//         keysPressed &= ~(1 << keyMap[ev.key]);  // 해당 비트를 0으로 설정
//         // console.log(Date.now(), keysPressed)

//         // sendState();
//     }
// }