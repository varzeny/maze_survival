// home.js
document.addEventListener("DOMContentLoaded", init);

const CONTEXT = {
    remSize:null,
    cellSize:null, // 셀 크기
    rows:100,
    cols:100,
    near_r:4
}
const TIME = {
    limit:10,
    last:null
}
let MAZE = null;

const USER = {
    id:null,
    name:null,
    row:null,
    col:null,
    state:0     // 0:로딩, 1:map, 8:contact
}

const OPPO = {
    name:null
}

const TAB = {
    tabs:{
        loading:null,
        maze:null,
        contact:null,
    },
    init:function(){
        this.tabs.loading = document.getElementsByClassName("loading")[0];
        this.tabs.maze = document.getElementsByClassName("maze")[0];
        this.tabs.contact = document.getElementsByClassName("contact")[0];
    },
    changeTab:function(name){
        for(let t in this.tabs){
            if(t==name){ this.tabs[t].style.display = "block"; }
            else{ this.tabs[t].style.display="none"; }
        }
    }
}


// Maze 캔버스 세팅
let mazeCanvas = null;
let mazeCtx = null;

// Obj 캔버스 세팅
let objCanvas = null;
let objCtx = null;


SERVER = {
    protocol:{
        sendType1:{ b:null, v:null },
        sendType2:{ b:null, v:null }
    },
    ws:null,
    init:function(url){
        // Protocol 설정
        this.protocol.sendType1.b = new ArrayBuffer(5);
        this.protocol.sendType1.v = new DataView(this.protocol.sendType1.b);

        this.protocol.sendType2.b = new ArrayBuffer(2);
        this.protocol.sendType2.v = new DataView(this.protocol.sendType2.b);

        // WebSocket 설정
        this.ws = new WebSocket(url);
        this.ws.binaryType = "arraybuffer";
        SERVER.ws.addEventListener("open", function(ev) {
            console.log("WS is connected !");
        });
        SERVER.ws.addEventListener("close", function(ev) {
            alert(`WS is disconnected. code:${ev.code}, reason:${ev.reason}`);
            window.location.href = "/";
        });
        SERVER.ws.addEventListener("message", function(ev) {
            const resp = ev.data;
            const respData = new DataView(resp);
            const respType = respData.getUint8(0)

            CMD[respType](respData);
        });
        SERVER.ws.addEventListener("error", function(ev) {
            console.error("WS error : ", ev);
        });
    },
    send_1:function(r,c){
        this.protocol.sendType1.v.setUint8(0, 1);
        this.protocol.sendType1.v.setUint16(1, r);
        this.protocol.sendType1.v.setUint16(3, c);
        this.ws.send( this.protocol.sendType1.b );
    },
    send_2:function(choice){ // choice 1:r, 2:s, 3:p
        this.protocol.sendType2.v.setUint8(0, 2);
        this.protocol.sendType2.v.setUint8(1, choice);
        this.ws.send( this.protocol.sendType2.b );
    }
}


const CONTACT = {
    turn:0,
    time:5,
    announce:null,
    rsp:{ r:null, s:null, p:null },
    choice:0,
    init:function(){
        document.getElementById("r").addEventListener("click",()=>{
            this.choice = 1; console.log("너의 선택 : ", this.choice);
        });
        document.getElementById("s").addEventListener("click",()=>{ 
            this.choice = 2; console.log("너의 선택 : ", this.choice);
        });
        document.getElementById("p").addEventListener("click",()=>{ 
            this.choice = 3; console.log("너의 선택 : ", this.choice);
        });
        this.announce = document.getElementById("announce");
    },
    turnStart:function(){
        this.time = 5;
        this.choice = Math.floor(Math.random()*3)+1;
        let interval = setInterval(()=>{
            if(this.time==0){
                // choice 를 서버로 보내기
                SERVER.send_2(this.choice);
                console.log(this.choice,"보냄!");
                clearInterval(interval);
            }
            this.announce.innerHTML = this.time;
            this.time--;
        }, 1000);
    },
}


const CMD = {
    // 0~9 시스템 //////////////////////////////////////////////////////////
    0:(respData)=>{ // 게임 init
        console.log("게임세팅 시작");
    },
    1:(respData)=>{ // 게임 deinit

    },
    2:(respData)=>{ // 

    },

    // 10~19 user //////////////////////////////////////////////////////////
    10:(respData)=>{ // user init
        const jsonStr = new TextDecoder("utf-8").decode( new Uint8Array(respData.buffer).slice(1) );
        const dic = JSON.parse( jsonStr );
        USER.id = dic.id
        USER.name = dic.name
        console.log("유저 데이터 수신함 : ", USER);
    },
    11:(respData)=>{ // user deinit

    },

    // 20~29 maze //////////////////////////////////////////////////////////
    20:(respData)=>{ // maze init
        const matrix = new Uint8Array( respData.buffer, 1 );
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
    },
    21:(respData)=>{ // maze deinit

    },
    22:(respData)=>{ // maze 시작
        USER.row = respData.getUint16(1)
        USER.col = respData.getUint16(3)
        USER.state = 1;

        // 미로에 유저 표시
        drawObj(USER.row, USER.col);
        moveViewToCharacter(USER);
        TAB.changeTab("maze");
        console.log("maze 시작");
    },
    23:(respData)=>{ // 근접정보
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
    },
    24:(respData)=>{ // maze 수정
        const val = respData.getUint8(1);
        const row = respData.getUint16(2);
        const col = respData.getUint16(4);
        MAZE[row][col] |= (val<<4)

        // 셀 지우기
        mazeCtx.clearRect(col * CONTEXT.cellSize, row * CONTEXT.cellSize, CONTEXT.cellSize, CONTEXT.cellSize);
        drawCell(row, col);
    },

    // 30~39 contact //////////////////////////////////////////////////////////
    30:(respData)=>{ // contact init
        USER.state = 2;
        USER.row = respData.getUint16(1);
        USER.col = respData.getUint16(3);
        console.log("contact : ", USER.row, USER.col);   

        // 화면전환
        TAB.changeTab("loading");
        setTimeout( TAB.changeTab("contact"), 2000 );

        // 맵 정리
        objCtx.clearRect(0, 0, CONTEXT.rows*CONTEXT.cellSize, CONTEXT.cols*CONTEXT.cellSize);

        // 상대 정보 
        const jsonStr = new TextDecoder("utf-8").decode( new Uint8Array(respData.buffer).slice(5) );
        const o = JSON.parse( jsonStr );
        console.log(o);
        OPPO.name = o.name

        // 화면에 표시
        document.getElementById("name-u").innerHTML = USER.name;
        document.getElementById("name-o").innerHTML = OPPO.name;
        CONTACT.announce.innerHTML = "Ready~";

    },
    31:(respData)=>{ // contact deinit

    },
    32:(respData)=>{ // turn 시작
        CONTACT.announce.innerHTML = "Start !";
        CONTACT.turnStart();
    },
    33:(respData)=>{ // 턴 종료 & 결과
        const result = respData.getUint8(1);
        console.log(">>>>>>>결과<<<<<<<<", result);
        if(result==0){
            TAB.changeTab("lose");
            setTimeout( ()=>{window.location.href="/"}, 2000 );
        }else if(result==1){
            CONTACT.announce.innerHTML="DRAW";
            CONTACT.turnStart();
        }else{
            TAB.changeTab("win");
            setTimeout( TAB.changeTab("maze"), 2000 );
            drawObj(USER.row, USER.col);
            moveViewToCharacter(USER);
            USER.state = 1;
        }
    }
    
}


async function init() {
    // context 불러오기 /////////////////////////////////////////////
    // CONTEXT.name = document.getElementById("context").getAttribute("data-name");
    CONTEXT.remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    CONTEXT.cellSize = CONTEXT.remSize * 2

    // 주요 변수들 세팅 ////////////////////////////////////////////////
    // 탭 세팅
    TAB.init();
    TAB.changeTab("loading");

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


    // SERVER 세팅
    SERVER.init("wss://test.varzeny.com/ws-game");


    // contact 세팅
    CONTACT.init();


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
                    if (USER.row > CONTEXT.near_r) {
                        eraseObj(USER.row, USER.col);
                        USER.row--;
                        drawObj(USER.row, USER.col);
                        move();
                    }
                    break;
        
                case "a":
                    if(cooldown()){ break; }
                    if (USER.col > CONTEXT.near_r) {
                        eraseObj(USER.row, USER.col);
                        USER.col--;
                        drawObj(USER.row, USER.col);
                        move();
                    }
                    break;
        
                case "s":
                    if(cooldown()){ break; }
                    if (USER.row < CONTEXT.rows-CONTEXT.near_r-1) {
                        eraseObj(USER.row, USER.col);
                        USER.row++;
                        drawObj(USER.row, USER.col);
                        move();
                    }
                    break;
        
                case "d":
                    if(cooldown()){ break; }
                    if (USER.col < CONTEXT.rows-CONTEXT.near_r-1) {
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
    SERVER.send_1(USER.row, USER.col);
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
