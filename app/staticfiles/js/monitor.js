// monitor.js


MAZE = null;

const CONTEXT = {
    remSize:null,
    cellSize:8, // 셀 크기
    rows:100,
    cols:100,
    near_r:4
}

SERVER = {
    ws:null,
    init:function(url){
        this.ws = new WebSocket(url);
        this.ws.binaryType = "arraybuffer";
        this.ws.addEventListener("open", function(ev) {
            console.log("WS is connected !");
        });
        this.ws.addEventListener("close", function(ev) {
            alert(`WS is disconnected. code:${ev.code}, reason:${ev.reason}`);
            window.location.href = "/";
        });
        this.ws.addEventListener("message", function(ev) {
            const resp = ev.data;
            const respData = new DataView(resp);
            const respType = respData.getUint8(0)
            CMD[respType](respData);
        });
        this.ws.addEventListener("error", function(ev) {
            console.error("WS error : ", ev);
        });
    }
}


CMD = {
    20:(respData)=>{
        console.log("맵받음");
        const matrix = new Uint8Array( respData.buffer, 1 );
        const maze = [];
        for (let i = 0; i < CONTEXT.rows; i++) {
            maze.push(matrix.slice(i * CONTEXT.cols, (i + 1) * CONTEXT.cols));
        }
        MAZE = maze;
        // console.log(MAZE);

        // 미로 그리기
        for (let r = 0; r < CONTEXT.rows; r++) {
            for (let c = 0; c < CONTEXT.cols; c++) {
                drawCell(r, c);
            }
        }


    }
}

function drawCell(r, c){
    const x = c * CONTEXT.cellSize;
    const y = r * CONTEXT.cellSize;

    // 캐릭그리기
    if( MAZE[r][c]==0 ){
        mazeCtx.fillStyle = "white";
        mazeCtx.fillRect(x, y, CONTEXT.cellSize, CONTEXT.cellSize);
    }else{
        switch (MAZE[r][c]) {
            case 1:
                mazeCtx.fillStyle = "red";
                break;
            case 2:
                mazeCtx.fillStyle = "blue";
                break;
            case 3:
                mazeCtx.fillStyle = "green";
                break;
            case 4:
                mazeCtx.fillStyle = "yellow";
                break;
            default:
                mazeCtx.fillStyle = "gray"; // 기타 값에 대한 기본 색상
        }
        mazeCtx.fillRect(x, y, CONTEXT.cellSize, CONTEXT.cellSize);
    }

    // 셀 테두리 그리기 (옵션)
    mazeCtx.strokeStyle = "black";
    mazeCtx.strokeRect(x, y, CONTEXT.cellSize, CONTEXT.cellSize);
}



// Maze 캔버스 세팅
let mazeCanvas = null;
let mazeCtx = null;



document.addEventListener("DOMContentLoaded", init);
async function init() {
    SERVER.init("wss://test.varzeny.com/ws-monitor");

    // Maze 캔버스 세팅
    mazeCanvas = document.getElementById("maze-canvas");
    mazeCtx = mazeCanvas.getContext("2d");
    mazeCanvas.width = CONTEXT.cols * CONTEXT.cellSize;
    mazeCanvas.height = CONTEXT.rows * CONTEXT.cellSize;
}