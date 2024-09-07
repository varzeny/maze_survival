// home.js
document.addEventListener("DOMContentLoaded", init);

let WS;
let keysPressed = 0;  // 비트 플래그로 눌린 키들을 저장 (1바이트로 관리)
// let LAST = 0;

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
    // WebSocket 연결 정의
    WS = new WebSocket("wss://test.varzeny.com/ws-game");

    // WebSocket 이벤트 설정
    WS.addEventListener("open", function(ev) {
        console.log("WS is connected !");
        // WS.send(111);

        setInterval(sendState, 200);
    });

    WS.addEventListener("close", function(ev) {
        console.log("WS is disconnected !");
    });

    WS.addEventListener("message", function(ev) {
        console.log("server's msg : ", ev.data);
    });

    WS.addEventListener("error", function(ev) {
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