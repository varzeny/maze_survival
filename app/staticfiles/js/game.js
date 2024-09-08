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
                const rows = 10;
                const cols = 10;
                const maze = [];
                for (let i = 0; i < rows; i++) {
                    maze.push(matrix.slice(i * cols, (i + 1) * cols));
                }
                MAZE = maze;
                showMaze(MAZE,10,10);
                console.log(USER);
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
    document.addEventListener("keyup", keyUp);

    console.log("home.js 로드 완료");

}

function sendState() {
    // 너무 높은 빈도 호출 방지
    // const now = Date.now();
    // if (now - LAST < 200) {
    //     return;
    // }

    // keysPressed를 1바이트 바이너리로 전송 (char 크기)
    if (WS && WS.readyState === WebSocket.OPEN) {
        const buffer = new ArrayBuffer(1); // 1바이트 크기의 버퍼 생성
        const view = new DataView(buffer);
        view.setUint8(0, keysPressed);  // 1바이트로 키 상태 전송 (char 크기)
        WS.send(buffer);  // 바이너리 데이터를 WebSocket으로 전송
        console.log("Sent (1 byte): ", keysPressed.toString(2));  // 이진수 출력
    } else {
        console.log("WebSocket 연결이 열려 있지 않음");
    }
    // LAST = now;
}

function keyDown(ev) {
    if (keyMap.hasOwnProperty(ev.key)) {
        keysPressed |= (1 << keyMap[ev.key]);  // 해당 비트를 1로 설정
        console.log(Date.now(), keysPressed)
        // sendState();
    }
}

function keyUp(ev) {
    if (keyMap.hasOwnProperty(ev.key)) {
        keysPressed &= ~(1 << keyMap[ev.key]);  // 해당 비트를 0으로 설정
        // console.log(Date.now(), keysPressed)

        // sendState();
    }
}



function showMaze(maze, rows, cols) {
    let mazeStr = "+" + "---+".repeat(cols) + "\n";  // 상단 벽

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