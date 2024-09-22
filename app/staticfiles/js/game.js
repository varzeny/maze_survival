// home.js
'use strict';
document.addEventListener("DOMContentLoaded", init);

const CONFIG = {
    rows:100,
    cols:100,
    near_r:4
}

const SERVER = {
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
        this.ws.addEventListener("open", (ev)=>{
            console.log("WS is connected !");
        });
        this.ws.addEventListener("close", (ev)=>{
            alert(`WS is disconnected. code:${ev.code}, reason:${ev.reason}`);
            window.location.href = "/";
        });
        this.ws.addEventListener("message", (ev)=>{
            const resp = ev.data;
            const respData = new DataView(resp);
            const respType = respData.getUint8(0)

            this.CMD[respType](respData);
        });
        this.ws.addEventListener("error", (ev)=>{
            console.error("WS error : ", ev);
        });
    },
    send_13:function(r,c){
        this.protocol.sendType1.v.setUint8(0, 13);
        this.protocol.sendType1.v.setUint16(1, r);
        this.protocol.sendType1.v.setUint16(3, c);
        this.ws.send( this.protocol.sendType1.b );
    },
    send_33:function(choice){ // choice 1:r, 2:s, 3:p
        this.protocol.sendType2.v.setUint8(0, 33);
        this.protocol.sendType2.v.setUint8(1, choice);
        this.ws.send( this.protocol.sendType2.b );
    },
    CMD:{
        // 0~9 시스템 //////////////////////////////////////////////////////////
        0:(respData)=>{ // 게임 init
            console.log("게임세팅 시작");
            // 게임설정 받기
        },
        1:(respData)=>{ // 게임 deinit
            try{
                SERVER.ws.close();
            }catch(err){
                console.log("게임 종료 오류");
            }
        },
        2:(respData)=>{ // 게임 시작
    
        },
    
        // 10~19 user //////////////////////////////////////////////////////////
        10:(respData)=>{ // user init
            const jsonStr = new TextDecoder("utf-8").decode( new Uint8Array(respData.buffer).slice(1) );
            const dic = JSON.parse( jsonStr );
            GAME.USER.id = dic.id
            GAME.USER.name = dic.name
            document.getElementById("id-u").innerHTML = GAME.USER.id;
            console.log("유저 데이터 수신함 : ", GAME.USER);
        },
        11:(respData)=>{ // user deinit
    
        },
        13:(respData)=>{ // 유저 배치
            GAME.USER.row = respData.getUint16(1);
            GAME.USER.col = respData.getUint16(3);
        },
        14:(respData)=>{ // 근접정보
            if(GAME.USER.state==1){
                GAME.DRAW.eraseObjAll();
                const len = respData.getUint8(1)
                for(let i=0; i<len;i++){
                    let temp = i*5
                    const v = respData.getUint8(2+temp);
                    const r = respData.getUint16(3+temp);
                    const c = respData.getUint16(5+temp);
    
                    console.log(`${v} 가 ${r},${c} 에 있음!`);
                    GAME.DRAW.drawObjs(v, r, c);
                }
            }
        },
    
        // 20~29 maze //////////////////////////////////////////////////////////
        20:(respData)=>{ // maze init
            const matrix = new Uint8Array( respData.buffer, 1 );
            const maze = [];
            for (let i = 0; i < CONFIG.rows; i++) {
                maze.push(matrix.slice(i * CONFIG.cols, (i + 1) * CONFIG.cols));
            }
            GAME.MAZE = maze;
    
            console.log("미로 수신함");
    
            // 미로 그리기
            for (let r = 0; r < CONFIG.rows; r++) {
                for (let c = 0; c < CONFIG.cols; c++) {
                    GAME.DRAW.drawCell(r, c);
                }
            }
            console.log("미로 그려냄");
        },
        21:(respData)=>{ // maze deinit
    
        },
        22:(respData)=>{ // maze 시작
            GAME.USER.row = respData.getUint16(1)
            GAME.USER.col = respData.getUint16(3)
            GAME.USER.state = 1;
    
            // 미로에 유저 표시
            GAME.DRAW.drawObjs(GAME.USER.id, GAME.USER.row, GAME.USER.col);
            GAME.EVENT.moveViewToCharacter(GAME.USER);
            PAGE.TAB.changeTab("maze");
            console.log("maze 시작");
        },
        23:(respData)=>{ // maze 갱신
            console.log("미로 갱신 요청 받음");
            const val = respData.getUint8(1);
            const row = respData.getUint16(2);
            const col = respData.getUint16(4);
            GAME.MAZE[row][col] = (GAME.MAZE[row][col] & 0x0f) | (val<<4)
    
            // 셀 지우고 다시그리기
            GAME.DRAW.eraseCell(row, col);
            GAME.DRAW.drawCell(row, col);
            console.log("미로 갱신 완료");


        },
    
        // 30~39 contact //////////////////////////////////////////////////////////
        30:(respData)=>{ // contact init
            if(GAME.USER.state == 1){
                GAME.USER.row = respData.getUint16(1);
                GAME.USER.col = respData.getUint16(3);
                console.log("contact : ", GAME.USER.row, GAME.USER.col);   

                // 화면전환
                PAGE.TAB.changeTab("loading");
                setTimeout( ()=>{ PAGE.TAB.changeTab("contact") }, 2000 );
        
                // 맵 정리
                GAME.DRAW.eraseObjAll();
        
            }else{ // 매복당함
                console.log("매복당함!");

            }
            // 공통작업 ////////////////////////////////////////////////
            GAME.USER.state = 2;
            const jsonStr = new TextDecoder("utf-8").decode( new Uint8Array(respData.buffer).slice(5) );
            const o = JSON.parse( jsonStr );
            console.log(o);
            GAME.OPPO.name = o.name
    
            // 화면에 표시
            document.getElementById("name-u").innerHTML = GAME.USER.name;
            document.getElementById("name-o").innerHTML = GAME.OPPO.name;
            GAME.CONTACT.announce.innerHTML = "Ready~";
        },
        31:(respData)=>{ // contact deinit
    
        },
        32:(respData)=>{ // turn 시작
            GAME.CONTACT.announce.innerHTML = "Start !";
            GAME.CONTACT.turnStart();
        },
        33:(respData)=>{ // 턴 종료 & 결과
            const result = respData.getUint8(1);
            console.log(">>>>>>>결과<<<<<<<<", result);
            if(result==0){ // 패배
                PAGE.MODAL.open("lose");
                setTimeout( ()=>{window.location.href="/"}, 2000 );
            }else if(result==1){ // 무승부
                GAME.CONTACT.announce.innerHTML="DRAW";
                GAME.CONTACT.turnStart();
            }else{ // 승리
                GAME.USER.schedule = setTimeout( ()=>{
                    if(GAME.USER.state==0){ // 출구에 매복 없으면
                        PAGE.TAB.changeTab("maze");
                        GAME.USER.state = 1;
                        PAGE.MODAL.close();
                    }else{ // 출구에 매복 있으면
                        PAGE.MODAL.close();
                    }
                }, 2000 );
                GAME.USER.state = 0 // 대기상태
                PAGE.MODAL.open("win");

                // 맵 정리
                GAME.DRAW.eraseObjAll();
                GAME.DRAW.drawObjs(GAME.USER.id, GAME.USER.row, GAME.USER.col);
                GAME.EVENT.moveViewToCharacter(GAME.USER);
            }
        }
    }    
}


const PAGE = {
    TAB:{
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
    },
    MODAL:{
        modals:{
            win:null,
            lose:null,
        },
        init:function(){
            this.modals.win = document.getElementById("win");
            this.modals.lose = document.getElementById("lose");
        },
        open:function(name){
            for(let m in this.modals){
                if(m==name){ this.modals[m].style.display = "flex"; }
                else{ this.modals[m].style.display="none"; }
            }
        },
        close:function(){
            for(let m in this.modals){ this.modals[m].style.display = "none"; }
        }
    }
}




const GAME = {
    MAZE:null,
    USER:{
        id:null,
        name:null,
        row:null,
        col:null,
        state:0,     // 0:로딩, 1:map, 2:contact
        schedule:null
    },
    OPPO:{
        name:null
    },
    DRAW:{
        remSize:null,
        cellSize:null,
    
        mazeCanvas:null,
        mazeCtx:null,
    
        objCanvas:null,
        objCtx:null,

        imgs:{
            wall:new Image(),
            user: new Image(),
            enemy: new Image(),
            contact: new Image()
        },
    
        init:function(){
            // context 읽기
            this.remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
            this.cellSize = this.remSize * 3
    
            // Maze 캔버스 세팅
            this.mazeCanvas = document.getElementById("maze-canvas");
            this.mazeCanvas.width = CONFIG.cols * this.cellSize;
            this.mazeCanvas.height = CONFIG.rows * this.cellSize;
            this.mazeCtx = this.mazeCanvas.getContext("2d");
    
            // Obj 캔버스 세팅
            this.objCanvas = document.getElementById("obj-canvas");
            this.objCanvas.width = CONFIG.cols * this.cellSize;
            this.objCanvas.height = CONFIG.rows * this.cellSize;
            this.objCtx = this.objCanvas.getContext("2d");

            // 이미지 세팅
            this.imgs.wall.src = "static/image/obj/wall.jpg";
            this.imgs.user.src = "static/image/obj/user.png";
            this.imgs.enemy.src = "static/image/obj/enemy.png";
            this.imgs.contact.src = "static/image/obj/contact.png";
        },
        drawObjs:function(v, r, c){
            const x = c * this.cellSize;
            const y = r * this.cellSize;
        
            // 캐릭터 그리기
            if(0<v && v<101){   // 유저
                if(v==GAME.USER.id){
                    this.objCtx.drawImage(this.imgs.user, x+(this.cellSize/5), y+(this.cellSize/5), this.cellSize*0.8, this.cellSize*0.8);
                }
                else{
                    this.objCtx.drawImage(this.imgs.enemy, x+(this.cellSize/5), y+(this.cellSize/5), this.cellSize*0.8, this.cellSize*0.8);
                }
            }else if(101<v && v<201){
                console.log();
            }else{
                console.log();
            }
        },
        eraseObj:function(r, c){
            const x = c * this.cellSize;
            const y = r * this.cellSize;
            this.objCtx.clearRect(x, y, this.cellSize, this.cellSize);
        },
        eraseObjAll:function(){
            this.objCtx.clearRect(0, 0, this.objCanvas.width, this.objCanvas.height);
        },
        drawCell:function(r, c){
            const x = c * this.cellSize;
            const y = r * this.cellSize;

            const cellVal = GAME.MAZE[r][c] & 15

            if(cellVal == 15){
                this.mazeCtx.fillStyle = "black";
                this.mazeCtx.fillRect(x, y, this.cellSize, this.cellSize);
                return; // 패딩 처리된 셀은 벽이나 지형지물을 그리지 않음
            }else{
                if(cellVal & 1){
                    this.mazeCtx.drawImage(this.imgs.wall, x, y, this.cellSize, this.cellSize/5);
                }
                if(cellVal & 2){
                    this.mazeCtx.drawImage(this.imgs.wall, x+this.cellSize, y, this.cellSize/5, this.cellSize);
                }
                if(cellVal & 4){
                    this.mazeCtx.drawImage(this.imgs.wall, x, y+this.cellSize, this.cellSize, this.cellSize/5);
                }
                if(cellVal & 8){
                    this.mazeCtx.drawImage(this.imgs.wall, x, y, this.cellSize/5, this.cellSize);
                }
            }

        
            // 지형지물
            const mazeObj = GAME.MAZE[r][c]>>4
            switch (mazeObj) {
                case 0: // 없음
                    break;
                case 1: // 위층으로 (검은색 정삼각형)
                    this.mazeCtx.fillStyle = "black";
                    this.mazeCtx.beginPath();
                    this.mazeCtx.moveTo(x + this.cellSize / 2, y);  // 꼭대기
                    this.mazeCtx.lineTo(x + this.cellSize, y + this.cellSize);  // 오른쪽 아래
                    this.mazeCtx.lineTo(x, y + this.cellSize);  // 왼쪽 아래
                    this.mazeCtx.closePath();
                    this.mazeCtx.fill();
                    break;
                case 2: // 아래층으로 (검은색 역삼각형)
                    this.mazeCtx.fillStyle = "black";
                    this.mazeCtx.beginPath();
                    this.mazeCtx.moveTo(x, y);  // 왼쪽 위
                    this.mazeCtx.lineTo(x + this.cellSize, y);  // 오른쪽 위
                    this.mazeCtx.lineTo(x + this.cellSize / 2, y + this.cellSize);  // 아래쪽 중앙
                    this.mazeCtx.closePath();
                    this.mazeCtx.fill();
                    break;
                case 3: // 상자 (갈색 네모)
                    this.mazeCtx.fillStyle = "brown";
                    this.mazeCtx.fillRect(x + this.cellSize / 4, y + this.cellSize / 4, this.cellSize / 2, this.cellSize / 2);
                    break;
                case 4: // 함정 (주황 마름모)
                    this.mazeCtx.fillStyle = "orange";
                    this.mazeCtx.beginPath();
                    this.mazeCtx.moveTo(x + this.cellSize / 2, y);  // 위쪽 중앙
                    this.mazeCtx.lineTo(x + this.cellSize, y + this.cellSize / 2);  // 오른쪽 중앙
                    this.mazeCtx.lineTo(x + this.cellSize / 2, y + this.cellSize);  // 아래쪽 중앙
                    this.mazeCtx.lineTo(x, y + this.cellSize / 2);  // 왼쪽 중앙
                    this.mazeCtx.closePath();
                    this.mazeCtx.fill();
                    break;
                case 8: // contact (빨간 엑스)
                    this.mazeCtx.drawImage(this.imgs.contact, x, y, this.cellSize, this.cellSize);
                    break;
                default:
                    console.log("알 수 없는 지형지물");
            }
        },
        eraseCell:function(r, c){
            const x = c * this.cellSize;
            const y = r * this.cellSize;
            this.mazeCtx.clearRect(x, y, this.cellSize, this.cellSize);
        }
    },
    CONTACT:{
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
                if(this.time<=0){
                    // choice 를 서버로 보내기
                    SERVER.send_33(this.choice);
                    console.log(this.choice,"보냄!");
                    clearInterval(interval);
                }
                this.announce.innerHTML = this.time;
                this.time--;
            }, 1000);
        },
    },
    EVENT:{
        lastTime:null,
        limitTime:null,
        init:function(){
            this.lastTime = 0;
            this.limitTime = 10;
            document.addEventListener("keydown", GAME.EVENT.keyDown.bind(GAME.EVENT));
        },
        keyDown:function(ev){
            switch(GAME.USER.state){
                case 0: // 로딩 중
                    break;
                case 1: // map 상에 있음
                    switch (ev.key) {
                        case "w":
                            if(this.cooldown()){ break; }
                            if (GAME.USER.row > CONFIG.near_r) {
                                GAME.DRAW.eraseObj(GAME.USER.row, GAME.USER.col);
                                GAME.USER.row--;
                                GAME.DRAW.drawObjs(GAME.USER.id, GAME.USER.row, GAME.USER.col);
                                this.move();
                            }
                            break;
                
                        case "a":
                            if(this.cooldown()){ break; }
                            if (GAME.USER.col > CONFIG.near_r) {
                                GAME.DRAW.eraseObj(GAME.USER.row, GAME.USER.col);
                                GAME.USER.col--;
                                GAME.DRAW.drawObjs(GAME.USER.id, GAME.USER.row, GAME.USER.col);
                                this.move();
                            }
                            break;
                
                        case "s":
                            if(this.cooldown()){ break; }
                            if (GAME.USER.row < CONFIG.rows-CONFIG.near_r-1) {
                                GAME.DRAW.eraseObj(GAME.USER.row, GAME.USER.col);
                                GAME.USER.row++;
                                GAME.DRAW.drawObjs(GAME.USER.id, GAME.USER.row, GAME.USER.col);
                                this.move();
                            }
                            break;
                
                        case "d":
                            if(this.cooldown()){ break; }
                            if (GAME.USER.col < CONFIG.rows-CONFIG.near_r-1) {
                                GAME.DRAW.eraseObj(GAME.USER.row, GAME.USER.col);
                                GAME.USER.col++;
                                GAME.DRAW.drawObjs(GAME.USER.id, GAME.USER.row, GAME.USER.col);
                                this.move();
                            }
                            break;
                    }
                    console.log(GAME.USER.row, GAME.USER.col)
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
        },
        move:function(){
            SERVER.send_13(GAME.USER.row, GAME.USER.col);
            this.moveViewToCharacter(GAME.USER);  // 미로 이동
        },
        moveViewToCharacter:function(obj) {
            // 중앙에 위치할 캐릭터의 좌표 계산
            const offsetX = (obj.col * GAME.DRAW.cellSize) - (4 * GAME.DRAW.cellSize);  // 화면의 중앙에 맞춰 이동
            const offsetY = (obj.row * GAME.DRAW.cellSize) - (4 * GAME.DRAW.cellSize);
        
            // 미로와 캐릭터의 위치 이동 (CSS transform 사용)
            GAME.DRAW.mazeCanvas.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
            GAME.DRAW.objCanvas.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
        },
        cooldown:function(){
            const now = new Date().getTime();
            if(now - this.lastTime > this.limitTime){
                this.lastTime = now;
                return false;
            }
            else{ return true; }
        }
    }
}



async function init() {
    // 탭 세팅
    PAGE.TAB.init();
    PAGE.TAB.changeTab("loading");

    // 모달
    PAGE.MODAL.init();

    // SERVER 세팅
    SERVER.init("wss://test.varzeny.com/ws-game");

    GAME.DRAW.init();

    GAME.EVENT.init();

    // contact 세팅
    GAME.CONTACT.init();

    console.log("home.js 로드 완료");
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
