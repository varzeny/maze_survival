// home.js
document.addEventListener("DOMContentLoaded", init);

const CONTEXT = {
    remSize:null,
    cellSize:null, // 셀 크기
    rows:100,
    cols:100,
    vc:4
}
const TIME = {
    limit:10,
    last:null
}
let MAZE = null;

const USER = {
    id:null,
    name:null,
    ws:null,
    row:null,
    col:null,
    aou:{}
}


const b1 = new ArrayBuffer(5);
const v1 = new DataView(b1);
function reqType1(r,c){
    v1.setUint8(0, 1);
    v1.setUint16(1, r);
    v1.setUint16(3, c);
    USER.ws.send(b1);
}


// Maze 캔버스 세팅
let mazeCanvas = null;
let mazeCtx = null;

// Obj 캔버스 세팅
let objCanvas = null;
let objCtx = null;



async function init() {
    // context 불러오기 /////////////////////////////////////////////
    // CONTEXT.name = document.getElementById("context").getAttribute("data-name");
    CONTEXT.remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    CONTEXT.cellSize = CONTEXT.remSize * 2

    // 주요 변수들 세팅 ////////////////////////////////////////////////
    // Maze 캔버스 세팅
    mazeCanvas = document.getElementById("maze-canvas");
    mazeCtx = mazeCanvas.getContext("2d");
    mazeCanvas.width = CONTEXT.cols * CONTEXT.cellSize;
    mazeCanvas.height = CONTEXT.rows * CONTEXT.cellSize;

    // Obj 캔버스 세팅
    objCanvas = document.getElementById("obj-canvas");
    objCtx = objCanvas.getContext("2d");
    objCanvas.width = CONTEXT.cols * CONTEXT.cellSize;
    objCanvas.height = CONTEXT.rows * CONTEXT.cellSize;


    // USER 세팅
    USER.name = CONTEXT.name
    USER.ws = new WebSocket("wss://test.varzeny.com/ws-game");
    USER.ws.binaryType = "arraybuffer";
    
    // WebSocket 이벤트 설정
    USER.ws.addEventListener("open", function(ev) {
        console.log("WS is connected !");

    });

    USER.ws.addEventListener("close", function(ev) {
        alert(`WS is disconnected. code:${ev.code}, reason:${ev.reason}`);
        window.location.href = "/";
    });

    USER.ws.addEventListener("message", function(ev) {
        try {

        }catch(error){
            console.error("통신 중 뭔가 오류 발생!!!!!!");
            
        }
        const resp = ev.data;
        const respData = new DataView(resp);
        const respType = respData.getUint8(0)

        switch(respType){
            case 1: //
                objCtx.clearRect(0, 0, objCanvas.width, objCanvas.height);
                const len = respData.getUint8(1)
                for(let i=0; i<len;i++){
                    temp = i*5
                    const v = respData.getUint8(2+temp);
                    const r = respData.getUint16(3+temp);
                    const c = respData.getUint16(5+temp);

                    console.log(`${v} 가 ${r},${c} 에 있음!`);
                    drawObjs(v, r, c);

                }
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
                for (let i = 0; i < CONTEXT.rows; i++) {
                    maze.push(matrix.slice(i * CONTEXT.cols, (i + 1) * CONTEXT.cols));
                }
                MAZE = maze;
                // showMaze(MAZE,CONTEXT.rows,CONTEXT.cols);

                console.log("미로 수신함");
                break;
            case 250:
                USER.row = respData.getUint16(1);
                USER.col = respData.getUint16(3);
                console.log("contact : ", USER.row, USER.col);
                

                break;
            case 255:
                console.log("로딩 완료 !")
                document.getElementsByClassName("loading")[0].style.display = "none";
                document.getElementsByClassName("maze")[0].style.display = "block";
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

function drawObjs(v, r, c){
    const x = c * CONTEXT.cellSize;
    const y = r * CONTEXT.cellSize;

    // 캐릭터 그리기
    if(0<v && v<101){   // 유저
        if(v==USER.id){ objCtx.fillStyle = "blue"; }
        else{ objCtx.fillStyle = "red"; }
    }else if(101<v && v<201){
        console.log();
    }else if(201<v && v<256){
        if(v==250){ objCtx.fillStyle = "black"; }
    }else{
        console.log();
    }

    objCtx.beginPath();
    objCtx.arc(x + CONTEXT.cellSize / 2, y + CONTEXT.cellSize / 2, CONTEXT.cellSize / 3, 0, Math.PI * 2);
    objCtx.fill();
}


function screenSetup(){
    drawMaze();
    drawObj(USER.row, USER.col);
    moveViewToCharacter(USER);
}

function keyDown(ev) {

    switch (ev.key) {
        case "w":
            if(cooldown()){ break; }
            if (USER.row > CONTEXT.vc) {
                eraseObj(USER.row, USER.col);
                USER.row--;
                drawObj(USER.row, USER.col);
                move();
            }
            break;

        case "a":
            if(cooldown()){ break; }
            if (USER.col > CONTEXT.vc) {
                eraseObj(USER.row, USER.col);
                USER.col--;
                drawObj(USER.row, USER.col);
                move();
            }
            break;

        case "s":
            if(cooldown()){ break; }
            if (USER.row < CONTEXT.rows-CONTEXT.vc-1) {
                eraseObj(USER.row, USER.col);
                USER.row++;
                drawObj(USER.row, USER.col);
                move();
            }
            break;

        case "d":
            if(cooldown()){ break; }
            if (USER.col < CONTEXT.rows-CONTEXT.vc-1) {
                eraseObj(USER.row, USER.col);
                USER.col++;
                drawObj(USER.row, USER.col);
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

function eraseObj(r, c){
    const x = c * CONTEXT.cellSize;
    const y = r * CONTEXT.cellSize;

    objCtx.clearRect(x, y, CONTEXT.cellSize, CONTEXT.cellSize)
}

function drawObj(r, c){
    const x = c * CONTEXT.cellSize;
    const y = r * CONTEXT.cellSize;

    objCtx.fillStyle = "blue";
    objCtx.beginPath();
    objCtx.arc(x + CONTEXT.cellSize / 2, y + CONTEXT.cellSize / 2, CONTEXT.cellSize / 3, 0, Math.PI * 2);
    objCtx.fill();
}

function move(){
    reqType1(USER.row, USER.col);
    moveViewToCharacter(USER);  // 미로 이동
}


function moveViewToCharacter(obj) {

    // 중앙에 위치할 캐릭터의 좌표 계산
    const offsetX = (obj.col * CONTEXT.cellSize) - (5 * CONTEXT.cellSize);  // 화면의 중앙에 맞춰 이동
    const offsetY = (obj.row * CONTEXT.cellSize) - (5 * CONTEXT.cellSize);

    // 미로와 캐릭터의 위치 이동 (CSS transform 사용)
    mazeCanvas.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
    objCanvas.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
}


function drawMaze(){
    // 미로 그리기
    for (let r = 0; r < CONTEXT.rows; r++) {
        for (let c = 0; c < CONTEXT.cols; c++) {
            const x = c * CONTEXT.cellSize;
            const y = r * CONTEXT.cellSize;

            mazeCtx.fillStyle = "white";
            mazeCtx.fillRect(x, y, CONTEXT.cellSize, CONTEXT.cellSize);

            mazeCtx.strokeStyle = "black";
            mazeCtx.lineWidth = 2;

            // 오른쪽 벽 (비트 2)
            if (MAZE[r][c] & 2) {
                mazeCtx.beginPath();
                mazeCtx.moveTo(x + CONTEXT.cellSize, y);
                mazeCtx.lineTo(x + CONTEXT.cellSize, y + CONTEXT.cellSize);
                mazeCtx.stroke();
            }

            // 아래쪽 벽 (비트 4)
            if (MAZE[r][c] & 4) {
                mazeCtx.beginPath();
                mazeCtx.moveTo(x, y + CONTEXT.cellSize);
                mazeCtx.lineTo(x + CONTEXT.cellSize, y + CONTEXT.cellSize);
                mazeCtx.stroke();
            }
        }
    }
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
