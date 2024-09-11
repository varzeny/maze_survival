// home.js
document.addEventListener("DOMContentLoaded", init);

const remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
const cellSize = remSize * 2;  // 셀 크기
const rows = 100;
const cols = 100;

let WS;
let keysPressed = 0;  // 비트 플래그로 눌린 키들을 저장 (1바이트로 관리)

const CONTEXT = {}
const TIME = {
    limit:500,
    last:null
}
const USER = {
    id:null,
    name:null,
    icon:null,
    ws:null,
    row:null,
    col:null,
}
let MAZE = null;
// let MAP = new Uint8Array(rows, cols);



// Maze 캔버스 세팅
let mazeCanvas = null;
let mazeCtx = null;

// Obj 캔버스 세팅
let objCanvas = null;
let objCtx = null;



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
    // context 불러오기 /////////////////////////////////////////////
    CONTEXT.name = document.getElementById("context").getAttribute("data-name");


    // 주요 변수들 세팅 ////////////////////////////////////////////////
    // Maze 캔버스 세팅
    mazeCanvas = document.getElementById("maze-canvas");
    mazeCtx = mazeCanvas.getContext("2d");
    mazeCanvas.width = cols * cellSize;
    mazeCanvas.height = rows * cellSize;

    // Obj 캔버스 세팅
    objCanvas = document.getElementById("obj-canvas");
    objCtx = objCanvas.getContext("2d");
    objCanvas.width = cols * cellSize;
    objCanvas.height = rows * cellSize;


    // USER 세팅
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
        try {

        }catch(error){
            console.error("통신 중 뭔가 오류 발생!!!!!!");
            
        }
        const resp = ev.data;
        const respData = new DataView(resp);
        const respType = respData.getUint8(0, true)

        switch(respType){
            case 1: //
                // USER.id = respData.getUint8(1, true);
                // USER.name = CONTEXT.name;
                // USER.row = respData.getUint16(2, true);
                // USER.col = respData.getUint16(4, true);

                // (char, short, short) * n 개의 적들을 objCtx로 그리기
                break;
            case 2: // json
                const jsonStr = new TextDecoder("utf-8").decode(resp.slice(1));
                const dic = JSON.parse( jsonStr );
                USER.id = dic.id
                USER.name = dic.name
                USER.row = dic.row
                USER.col = dic.col
                console.log("유저 데이터 수신함 : ", USER);
                // MAP[USER.row][USER.col] = USER.id

                // 미로그리기
                screenSetup();
                console.log("시작")
                break;
            case 3: // 행렬
                const matrix = new Uint8Array( resp, 1 );
                const maze = [];
                for (let i = 0; i < rows; i++) {
                    maze.push(matrix.slice(i * cols, (i + 1) * cols));
                }
                MAZE = maze;
                // showMaze(MAZE,rows,cols);

                console.log("미로 수신함")
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


function screenSetup(){
    drawMaze();
    drawObj(USER);
    moveViewToCharacter(USER);
}


function drawMaze(){
    // 미로 그리기
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * cellSize;
            const y = r * cellSize;

            mazeCtx.fillStyle = "white";
            mazeCtx.fillRect(x, y, cellSize, cellSize);

            mazeCtx.strokeStyle = "black";
            mazeCtx.lineWidth = 2;

            // 오른쪽 벽 (비트 2)
            if (MAZE[r][c] & 2) {
                mazeCtx.beginPath();
                mazeCtx.moveTo(x + cellSize, y);
                mazeCtx.lineTo(x + cellSize, y + cellSize);
                mazeCtx.stroke();
            }

            // 아래쪽 벽 (비트 4)
            if (MAZE[r][c] & 4) {
                mazeCtx.beginPath();
                mazeCtx.moveTo(x, y + cellSize);
                mazeCtx.lineTo(x + cellSize, y + cellSize);
                mazeCtx.stroke();
            }
        }
    }
}

function drawObj(obj){
    // Obj 캔버스 백지화
    objCtx.clearRect(0, 0, objCanvas.width, objCanvas.height);

    // 재설정
    const x = obj.col * cellSize;
    const y = obj.row * cellSize;

    // 캐릭터 그리기
    objCtx.fillStyle = "blue";
    objCtx.beginPath();
    objCtx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
    objCtx.fill();
}



function moveViewToCharacter(obj) {

    // 중앙에 위치할 캐릭터의 좌표 계산
    const offsetX = (obj.col * cellSize) - (5 * cellSize);  // 화면의 중앙에 맞춰 이동
    const offsetY = (obj.row * cellSize) - (5 * cellSize);

    // 미로와 캐릭터의 위치 이동 (CSS transform 사용)
    mazeCanvas.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
    objCanvas.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
}




function keyDown(ev) {

    switch (ev.key) {
        case "w":
            if(cooldown()){ break; }
            if (USER.row > 0) {
                USER.row--;
                move();
            }
            break;

        case "a":
            if(cooldown()){ break; }
            if (USER.col > 0) {
                USER.col--;
                move();
            }
            break;

        case "s":
            if(cooldown()){ break; }
            if (USER.row < 99) {
                USER.row++;
                move();
            }
            break;

        case "d":
            if(cooldown()){ break; }
            if (USER.col < 99) {
                USER.col++;
                move();
            }
            break;
    }
    console.log(USER.row, USER.col)
}

function cooldown(){
    const now = new Date().getTime();
    if(now - TIME.last > TIME.limit){
        TIME.last = now;
        return false;
    }
    else{ return true; }
}

function move(){
    drawObj(USER);  // 캐릭터 위치 업데이트
    moveViewToCharacter(USER);  // 미로 이동
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