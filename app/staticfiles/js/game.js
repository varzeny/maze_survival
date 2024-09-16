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
    state:0     // 0:로딩, 1:map, 8:contact
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
                if(USER.state==1){
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
                }
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

                // 미로에 유저 표시
                drawObj(USER.row, USER.col);
                moveViewToCharacter(USER);
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

                // 미로 그리기
                for (let r = 0; r < CONTEXT.rows; r++) {
                    for (let c = 0; c < CONTEXT.cols; c++) {
                        drawCell(r, c);
                    }
                }
                console.log("미로 그려냄");

                break;

            case 8: // 지도 갱신
                const row = respData.getUint16(2);
                const col = respData.getUint16(4);
                MAZE[row][col] |= (8<<4)

                // 셀 지우기
                mazeCtx.clearRect(col * CONTEXT.cellSize, row * CONTEXT.cellSize, CONTEXT.cellSize, CONTEXT.cellSize);
                drawCell(row, col);
                break;

            case 250:   // contact
                USER.state = 8;
                eraseObj(USER.row, USER.col);

                USER.row = respData.getUint16(1);
                USER.col = respData.getUint16(3);

                // 맵 정리
                objCtx.clearRect(0, 0, CONTEXT.rows*CONTEXT.cellSize, CONTEXT.cols*CONTEXT.cellSize);
                console.log("contact : ", USER.row, USER.col);   
                break;

            case 255:
                console.log("로딩 완료 !")
                document.getElementsByClassName("loading")[0].style.display = "none";
                document.getElementsByClassName("maze")[0].style.display = "block";
                USER.state = 1;
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
    }else{
        console.log();
    }

    objCtx.beginPath();
    objCtx.arc(x + CONTEXT.cellSize / 2, y + CONTEXT.cellSize / 2, CONTEXT.cellSize / 3, 0, Math.PI * 2);
    objCtx.fill();
}

function keyDown(ev) {
    switch(USER.state){
        case 0: // 로딩 중
            break;
        case 1: // map 상에 있음
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
            break;
        case 2: // 예비
            break;
        case 8: // contact
            console.log(ev.key);
            switch (ev.key){
                case '1':
                    break;
            }
            break;
    }

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
            drawCell(r, c);
        }
    }
}


function drawCell(r, c){
    const x = c * CONTEXT.cellSize;
    const y = r * CONTEXT.cellSize;

    mazeCtx.fillStyle = "white";
    mazeCtx.fillRect(x, y, CONTEXT.cellSize, CONTEXT.cellSize);

    mazeCtx.strokeStyle = "black";
    mazeCtx.lineWidth = 2;

    // 외곽 패딩 처리
    if ((MAZE[r][c]&15) == 15){
        mazeCtx.fillStyle = "black";
        mazeCtx.fillRect(x, y, CONTEXT.cellSize, CONTEXT.cellSize);
        return; // 패딩 처리된 셀은 벽이나 지형지물을 그리지 않음
    }

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

    // 지형지물
    mazeObj = MAZE[r][c]>>4
    switch (mazeObj) {
        case 0: // 없음
            break;
        case 1: // 위층으로 (검은색 정삼각형)
            mazeCtx.fillStyle = "black";
            mazeCtx.beginPath();
            mazeCtx.moveTo(x + CONTEXT.cellSize / 2, y);  // 꼭대기
            mazeCtx.lineTo(x + CONTEXT.cellSize, y + CONTEXT.cellSize);  // 오른쪽 아래
            mazeCtx.lineTo(x, y + CONTEXT.cellSize);  // 왼쪽 아래
            mazeCtx.closePath();
            mazeCtx.fill();
            break;
        case 2: // 아래층으로 (검은색 역삼각형)
            mazeCtx.fillStyle = "black";
            mazeCtx.beginPath();
            mazeCtx.moveTo(x, y);  // 왼쪽 위
            mazeCtx.lineTo(x + CONTEXT.cellSize, y);  // 오른쪽 위
            mazeCtx.lineTo(x + CONTEXT.cellSize / 2, y + CONTEXT.cellSize);  // 아래쪽 중앙
            mazeCtx.closePath();
            mazeCtx.fill();
            break;
        case 3: // 상자 (갈색 네모)
            mazeCtx.fillStyle = "brown";
            mazeCtx.fillRect(x + CONTEXT.cellSize / 4, y + CONTEXT.cellSize / 4, CONTEXT.cellSize / 2, CONTEXT.cellSize / 2);
            break;
        case 4: // 함정 (주황 마름모)
            mazeCtx.fillStyle = "orange";
            mazeCtx.beginPath();
            mazeCtx.moveTo(x + CONTEXT.cellSize / 2, y);  // 위쪽 중앙
            mazeCtx.lineTo(x + CONTEXT.cellSize, y + CONTEXT.cellSize / 2);  // 오른쪽 중앙
            mazeCtx.lineTo(x + CONTEXT.cellSize / 2, y + CONTEXT.cellSize);  // 아래쪽 중앙
            mazeCtx.lineTo(x, y + CONTEXT.cellSize / 2);  // 왼쪽 중앙
            mazeCtx.closePath();
            mazeCtx.fill();
            break;
        case 8: // contact (빨간 엑스)
            mazeCtx.strokeStyle = "red";
            mazeCtx.lineWidth = 3;
            mazeCtx.beginPath();
            mazeCtx.moveTo(x + CONTEXT.cellSize / 4, y + CONTEXT.cellSize / 4);
            mazeCtx.lineTo(x + 3 * CONTEXT.cellSize / 4, y + 3 * CONTEXT.cellSize / 4);
            mazeCtx.stroke();
    
            mazeCtx.beginPath();
            mazeCtx.moveTo(x + 3 * CONTEXT.cellSize / 4, y + CONTEXT.cellSize / 4);
            mazeCtx.lineTo(x + CONTEXT.cellSize / 4, y + 3 * CONTEXT.cellSize / 4);
            mazeCtx.stroke();
            break;
        default:
            console.log("알 수 없는 지형지물");
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
